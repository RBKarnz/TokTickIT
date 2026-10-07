import { Router, Request, Response } from 'express';
import { ActionStatus, Prisma, TicketStatus } from '@prisma/client';
import { getPrisma } from './prisma.js';
import { requireNormalAuth } from './auth.js';
import { STAFF_ROLES } from './actions.js';

// ---------------------------------------------------------------------------
// Ticket workflow (Lab 4 api-spec §4). Pure helpers are exported for unit tests.
// ---------------------------------------------------------------------------

export const STATUS_TO_LABEL: Record<string, string> = {
  NEW: 'New',
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  WAITING_FOR_REQUESTER: 'Waiting for Requester',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  REOPENED: 'Reopened',
  CANCELLED: 'Cancelled',
};

export const LABEL_TO_STATUS: Record<string, string> = {
  ...Object.entries(STATUS_TO_LABEL).reduce(
    (acc, [k, v]) => ({ ...acc, [v.toLowerCase()]: k, [k.toLowerCase()]: k }),
    {} as Record<string, string>
  ),
  waiting_on_requester: 'WAITING_FOR_REQUESTER',
  'waiting on requester': 'WAITING_FOR_REQUESTER',
};

// Final Ticket Status Matrix (specification BR-17); CANCELLED is terminal.
export const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  NEW: ['OPEN', 'CANCELLED'],
  OPEN: ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'CANCELLED'],
  IN_PROGRESS: ['WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
  WAITING_FOR_REQUESTER: ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  CLOSED: ['REOPENED'],
  REOPENED: ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
  CANCELLED: [],
};

export const REASON_MAX_LENGTH = 1000;

export function canTransitionTicket(from: string, to: string): boolean {
  return (ALLOWED_STATUS_TRANSITIONS[from] ?? []).includes(to);
}

export type GateFailure = 'RESOLUTION_SUMMARY_REQUIRED' | 'COMPLETED_ACTION_REQUIRED' | 'PENDING_FOLLOW_UP';

const GATE_MESSAGES: Record<GateFailure, string> = {
  RESOLUTION_SUMMARY_REQUIRED: 'a Resolution Summary is required',
  COMPLETED_ACTION_REQUIRED: 'at least one completed Action Taken is required',
  PENDING_FOLLOW_UP: 'a follow-up action is still pending',
};

// BR-18 to BR-20: returns the failed conditions in a fixed order; empty means the gate passes.
export function evaluateResolutionGate(input: {
  resolutionSummary: string | null | undefined;
  actions: { status: ActionStatus; followUpRequired: boolean }[];
}): GateFailure[] {
  const failures: GateFailure[] = [];
  if (!input.resolutionSummary || input.resolutionSummary.trim().length === 0) {
    failures.push('RESOLUTION_SUMMARY_REQUIRED');
  }
  if (!input.actions.some((a) => a.status === 'COMPLETED')) {
    failures.push('COMPLETED_ACTION_REQUIRED');
  }
  if (input.actions.some((a) => a.followUpRequired && (a.status === 'PLANNED' || a.status === 'IN_PROGRESS'))) {
    failures.push('PENDING_FOLLOW_UP');
  }
  return failures;
}

const historyInclude = {
  changedBy: { select: { id: true, name: true, role: true } },
} satisfies Prisma.TicketStatusHistoryInclude;

type HistoryWithUser = Prisma.TicketStatusHistoryGetPayload<{ include: typeof historyInclude }>;

function toHistoryDto(entry: HistoryWithUser) {
  return {
    id: entry.id,
    fromStatus: entry.fromStatus,
    toStatus: entry.toStatus,
    changedBy: entry.changedBy,
    reason: entry.reason,
    createdAt: entry.createdAt,
  };
}

// BR-24: stable chronological order.
async function listHistory(db: Prisma.TransactionClient, ticketId: number) {
  const entries = await db.ticketStatusHistory.findMany({
    where: { ticketId },
    include: historyInclude,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
  return entries.map(toHistoryDto);
}

// Thrown inside the transaction so a rejected change rolls everything back.
class WorkflowError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

async function staleUpdate(db: Prisma.TransactionClient, ticketId: number): Promise<WorkflowError> {
  const current = await db.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, currentStatus: true, resolutionSummary: true, version: true, updatedAt: true },
  });
  return new WorkflowError(409, 'STALE_UPDATE', 'This ticket was changed by someone else. Reload and try again.', {
    current: current && {
      ticketId: current.id,
      currentStatus: current.currentStatus,
      resolutionSummary: current.resolutionSummary,
      version: current.version,
      updatedAt: current.updatedAt,
    },
  });
}

function parseId(raw: string): number | null {
  return /^\d+$/.test(raw) ? parseInt(raw, 10) : null;
}

export const workflowRouter = Router();

// POST /api/staff/tickets/:id/status (alias PATCH /api/tickets/:id/status) — IT Staff and Administrators.
const handleStatusChange = async (req: Request, res: Response) => {
  if (!STAFF_ROLES.includes(req.sessionUser!.role)) {
    return res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Only IT Staff and Administrators can change ticket status.' },
    });
  }

  const ticketId = parseId(req.params.id);
  if (ticketId === null) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid ticket ID' } });
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  if (!body.status || typeof body.status !== 'string') {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Status is required.' } });
  }
  const target = LABEL_TO_STATUS[body.status.trim().toLowerCase()] as TicketStatus | undefined;
  if (!target) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid status value.' } });
  }

  const fieldErrors: Record<string, string> = {};
  let reason: string | null = null;
  if (body.reason !== undefined && body.reason !== null) {
    if (typeof body.reason !== 'string') fieldErrors.reason = 'reason must be a string.';
    else if (body.reason.trim().length > REASON_MAX_LENGTH) fieldErrors.reason = `reason cannot exceed ${REASON_MAX_LENGTH} characters.`;
    else reason = body.reason.trim() || null;
  }
  const expectedVersion = body.expectedVersion;
  if (expectedVersion !== undefined && (typeof expectedVersion !== 'number' || !Number.isInteger(expectedVersion))) {
    fieldErrors.expectedVersion = 'expectedVersion must be an integer.';
  }
  if (Object.keys(fieldErrors).length > 0) {
    return res.status(422).json({
      error: { code: 'VALIDATION_ERROR', message: 'One or more fields are invalid.', fieldErrors },
    });
  }

  const resolutionSummary = typeof body.resolutionSummary === 'string' ? body.resolutionSummary.trim() : '';

  try {
    const result = await getPrisma().$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket) throw new WorkflowError(404, 'NOT_FOUND', 'Ticket not found');

      // BR-25: a write based on an out-of-date version changes nothing.
      if (expectedVersion !== undefined && expectedVersion !== ticket.version) {
        throw await staleUpdate(tx, ticketId);
      }

      if (target === ticket.currentStatus) {
        throw new WorkflowError(409, 'CONFLICT', 'Ticket is already in the requested status.');
      }
      if (!canTransitionTicket(ticket.currentStatus, target)) {
        throw new WorkflowError(409, 'CONFLICT', `Invalid status transition from ${ticket.currentStatus} to ${target}.`);
      }

      // BR-21: the gate is checked here for every client.
      if (target === 'RESOLVED') {
        const actions = await tx.actionTaken.findMany({
          where: { ticketId },
          select: { status: true, followUpRequired: true },
        });
        const failures = evaluateResolutionGate({ resolutionSummary, actions });
        if (failures.length > 0) {
          throw new WorkflowError(
            409,
            'RESOLUTION_GATE',
            `This ticket cannot be resolved yet: ${failures.map((f) => GATE_MESSAGES[f]).join('; ')}.`,
            { details: failures },
          );
        }
      }

      // Conditional write (§9.1): only applies if nobody changed the ticket since we read it.
      const { count } = await tx.ticket.updateMany({
        where: { id: ticketId, version: ticket.version, currentStatus: ticket.currentStatus },
        data: {
          currentStatus: target,
          ...(resolutionSummary ? { resolutionSummary } : {}),
          version: { increment: 1 },
        },
      });
      if (count === 0) throw await staleUpdate(tx, ticketId);

      // BR-23: exactly one history entry, in the same transaction.
      await tx.ticketStatusHistory.create({
        data: {
          ticketId,
          fromStatus: ticket.currentStatus,
          toStatus: target,
          changedById: req.sessionUser!.id,
          reason,
        },
      });

      const updated = await tx.ticket.findUniqueOrThrow({
        where: { id: ticketId },
        select: { id: true, currentStatus: true, resolutionSummary: true, version: true, updatedAt: true },
      });
      return { updated, history: await listHistory(tx, ticketId) };
    });

    res.status(200).json({
      ticketId: result.updated.id,
      currentStatus: result.updated.currentStatus,
      resolutionSummary: result.updated.resolutionSummary,
      version: result.updated.version,
      updatedAt: result.updated.updatedAt,
      history: result.history,
    });
  } catch (error) {
    if (error instanceof WorkflowError) {
      return res.status(error.status).json({ error: { code: error.code, message: error.message, ...error.extra } });
    }
    console.error('Error changing ticket status:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to change ticket status' } });
  }
};

workflowRouter.post('/api/staff/tickets/:id/status', requireNormalAuth, handleStatusChange);
workflowRouter.patch('/api/tickets/:id/status', requireNormalAuth, handleStatusChange);

// GET /api/tickets/:ticketId/status-history — all roles; Requesters only on their own Tickets.
// History is append-only: there is deliberately no write route.
workflowRouter.get('/api/tickets/:ticketId/status-history', requireNormalAuth, async (req: Request, res: Response) => {
  const ticketId = parseId(req.params.ticketId);
  if (ticketId === null) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid ticket ID' } });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { requesterId: true } });
    if (!ticket || (req.sessionUser!.role === 'REQUESTER' && ticket.requesterId !== req.sessionUser!.id)) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    }
    res.json({ items: await listHistory(prisma, ticketId) });
  } catch (error) {
    console.error('Error listing status history:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list status history' } });
  }
});
