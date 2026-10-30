import { Router, Request, Response } from 'express';
import { Prisma, ActionStatus } from '@prisma/client';
import { getPrisma } from './prisma.js';
import { requireNormalAuth } from './auth.js';

// ---------------------------------------------------------------------------
// Actions Taken (Lab 4 api-spec §3). Pure helpers are exported for unit tests.
// ---------------------------------------------------------------------------

export const STAFF_ROLES = ['IT_STAFF', 'ADMINISTRATOR'];

// BR-09 action status matrix; COMPLETED and CANCELLED are terminal.
export const ACTION_STATUS_TRANSITIONS: Record<ActionStatus, ActionStatus[]> = {
  PLANNED: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

const ACTION_STATUSES = Object.keys(ACTION_STATUS_TRANSITIONS) as ActionStatus[];
const TERMINAL_TICKET_STATUSES = ['CLOSED', 'CANCELLED'];
export const ACTION_AT_TOLERANCE_MS = 5 * 60 * 1000;

export function isTerminalActionStatus(status: ActionStatus): boolean {
  return ACTION_STATUS_TRANSITIONS[status].length === 0;
}

export function canTransitionAction(from: ActionStatus, to: ActionStatus): boolean {
  return ACTION_STATUS_TRANSITIONS[from].includes(to);
}

// BR-05: at most 5 minutes ahead of the server clock.
export function isActionAtWithinTolerance(actionAt: Date, now: Date = new Date()): boolean {
  return actionAt.getTime() <= now.getTime() + ACTION_AT_TOLERANCE_MS;
}

// BR-07: returns an error message, or null when the pair is valid.
export function validateFollowUp(followUpRequired: boolean, followUpNote: string | null): string | null {
  const note = followUpNote?.trim() ?? '';
  if (followUpRequired) {
    if (note.length === 0) return 'Follow-up note is required when follow-up is required.';
    if (note.length > 1000) return 'Follow-up note cannot exceed 1000 characters.';
    return null;
  }
  return note.length > 0 ? 'Follow-up note must be empty when follow-up is not required.' : null;
}

const actionInclude = {
  performedBy: { select: { id: true, name: true } },
  assignedTo: { select: { id: true, name: true, email: true } },
} satisfies Prisma.ActionTakenInclude;

type ActionWithUsers = Prisma.ActionTakenGetPayload<{ include: typeof actionInclude }>;

function toActionDto(action: ActionWithUsers) {
  return {
    id: action.id,
    ticketId: action.ticketId,
    actionAt: action.actionAt,
    description: action.description,
    result: action.result,
    status: action.status,
    followUpRequired: action.followUpRequired,
    followUpNote: action.followUpNote,
    attachmentNotes: action.attachmentNotes,
    performedBy: action.performedBy,
    assignedTo: action.assignedTo,
    version: action.version,
    createdAt: action.createdAt,
    updatedAt: action.updatedAt,
  };
}

type FieldErrors = Record<string, string>;

function sendValidationError(res: Response, fieldErrors: FieldErrors) {
  return res.status(422).json({
    error: { code: 'VALIDATION_ERROR', message: 'One or more fields are invalid.', fieldErrors },
  });
}

function sendForbidden(res: Response) {
  return res.status(403).json({
    error: { code: 'FORBIDDEN', message: 'Only IT Staff and Administrators can change Actions Taken.' },
  });
}

function parseId(raw: string): number | null {
  return /^\d+$/.test(raw) ? parseInt(raw, 10) : null;
}

// Optional text: undefined = not sent, null = cleared. Blank strings become null.
function readOptionalText(
  body: Record<string, unknown>, field: string, max: number, errors: FieldErrors,
): string | null | undefined {
  const value = body[field];
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') {
    errors[field] = `${field} must be a string.`;
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    errors[field] = `${field} cannot exceed ${max} characters.`;
    return undefined;
  }
  return trimmed.length === 0 ? null : trimmed;
}

function readDescription(body: Record<string, unknown>, errors: FieldErrors): string | undefined {
  const value = body.description;
  if (typeof value !== 'string' || value.trim().length === 0) {
    errors.description = 'Description is required.';
    return undefined;
  }
  if (value.trim().length > 2000) {
    errors.description = 'Description cannot exceed 2000 characters.';
    return undefined;
  }
  return value.trim();
}

function readActionAt(body: Record<string, unknown>, errors: FieldErrors): Date | undefined {
  const value = body.actionAt;
  if (value === undefined || value === null) return undefined;
  const parsed = typeof value === 'string' ? new Date(value) : new Date(NaN);
  if (isNaN(parsed.getTime())) {
    errors.actionAt = 'Action date and time must be a valid ISO-8601 value.';
    return undefined;
  }
  if (!isActionAtWithinTolerance(parsed)) {
    errors.actionAt = 'Action date and time cannot be more than 5 minutes in the future.';
    return undefined;
  }
  return parsed;
}

// BR-04: assignee must be an active IT Staff member or Administrator.
async function checkAssignee(assignedToId: unknown, errors: FieldErrors): Promise<number | undefined> {
  if (typeof assignedToId !== 'number' || !Number.isInteger(assignedToId)) {
    errors.assignedToId = 'Assigned To is required.';
    return undefined;
  }
  const user = await getPrisma().user.findUnique({
    where: { id: assignedToId },
    select: { role: true, isActive: true },
  });
  if (!user || !user.isActive || !STAFF_ROLES.includes(user.role)) {
    errors.assignedToId = 'Assigned To must be an active IT Staff member or Administrator.';
    return undefined;
  }
  return assignedToId;
}

async function findActionDto(where: Prisma.ActionTakenWhereUniqueInput) {
  const action = await getPrisma().actionTaken.findUnique({ where, include: actionInclude });
  return action ? toActionDto(action) : null;
}

function sendReplay(res: Response, action: ReturnType<typeof toActionDto>) {
  res.setHeader('Idempotent-Replay', 'true');
  return res.status(200).json(action);
}

export const actionsRouter = Router();

// GET /api/staff/assignees — active IT Staff and Administrators (BR-04, ui-spec §6.3).
actionsRouter.get('/api/staff/assignees', requireNormalAuth, async (req: Request, res: Response) => {
  if (!STAFF_ROLES.includes(req.sessionUser!.role)) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Forbidden' } });
  }

  try {
    const prisma = getPrisma();
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: ['IT_STAFF', 'ADMINISTRATOR'] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
    res.status(200).json({ users });
  } catch (error) {
    console.error('Error fetching assignees:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch assignees' } });
  }
});

// GET /api/tickets/:ticketId/actions — all roles; Requesters only on their own Tickets.
actionsRouter.get('/api/tickets/:ticketId/actions', requireNormalAuth, async (req: Request, res: Response) => {
  const ticketId = parseId(req.params.ticketId);
  if (ticketId === null) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid ticket ID' } });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { requesterId: true } });
    // Another Requester's Ticket is reported as missing (BR-12, no disclosure).
    if (!ticket || (req.sessionUser!.role === 'REQUESTER' && ticket.requesterId !== req.sessionUser!.id)) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    }

    const actions = await prisma.actionTaken.findMany({
      where: { ticketId },
      include: actionInclude,
      orderBy: [{ actionAt: 'asc' }, { id: 'asc' }],
    });
    res.json({ items: actions.map(toActionDto) });
  } catch (error) {
    console.error('Error listing actions taken:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list actions taken' } });
  }
});

// POST /api/tickets/:ticketId/actions — IT Staff and Administrators.
actionsRouter.post('/api/tickets/:ticketId/actions', requireNormalAuth, async (req: Request, res: Response) => {
  if (!STAFF_ROLES.includes(req.sessionUser!.role)) return sendForbidden(res);

  const ticketId = parseId(req.params.ticketId);
  if (ticketId === null) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid ticket ID' } });
  }

  const rawKey = req.headers['idempotency-key'];
  const idempotencyKey = typeof rawKey === 'string' ? rawKey.trim() : undefined;
  if (rawKey !== undefined && (!idempotencyKey || idempotencyKey.length > 100)) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Idempotency-Key must be 1 to 100 characters.' } });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { currentStatus: true } });
    if (!ticket) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    }

    // BR-13: a repeated key returns the original Action and creates nothing.
    if (idempotencyKey) {
      const existing = await findActionDto({ ticketId_idempotencyKey: { ticketId, idempotencyKey } });
      if (existing) return sendReplay(res, existing);
    }

    if (TERMINAL_TICKET_STATUSES.includes(ticket.currentStatus)) {
      return res.status(409).json({
        error: { code: 'CONFLICT', message: `Actions cannot be added to a ${ticket.currentStatus} ticket.` },
      });
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const errors: FieldErrors = {};

    const description = readDescription(body, errors);
    const actionAt = readActionAt(body, errors);
    const result = readOptionalText(body, 'result', 2000, errors);
    const attachmentNotes = readOptionalText(body, 'attachmentNotes', 1000, errors);

    let status: ActionStatus = 'PLANNED';
    if (body.status !== undefined) {
      if (typeof body.status !== 'string' || !['PLANNED', 'IN_PROGRESS', 'COMPLETED'].includes(body.status)) {
        errors.status = 'Status must be PLANNED, IN_PROGRESS or COMPLETED.';
      } else {
        status = body.status as ActionStatus;
      }
    }
    if (status === 'COMPLETED' && !result) {
      errors.result = 'Result is required when the action is completed.';
    }

    let followUpRequired = false;
    if (body.followUpRequired !== undefined) {
      if (typeof body.followUpRequired !== 'boolean') errors.followUpRequired = 'followUpRequired must be a boolean.';
      else followUpRequired = body.followUpRequired;
    }
    const followUpNote = readOptionalText(body, 'followUpNote', 1000, errors) ?? null;
    if (!errors.followUpNote && !errors.followUpRequired) {
      const followUpError = validateFollowUp(followUpRequired, followUpNote);
      if (followUpError) errors.followUpNote = followUpError;
    }

    const assignedToId = await checkAssignee(body.assignedToId, errors);

    if (Object.keys(errors).length > 0) return sendValidationError(res, errors);

    try {
      const created = await prisma.actionTaken.create({
        data: {
          ticketId,
          performedById: req.sessionUser!.id, // BR-03: never taken from the client
          assignedToId: assignedToId!,
          actionAt: actionAt ?? new Date(),
          description: description!,
          result: result ?? null,
          status,
          followUpRequired,
          followUpNote: followUpRequired ? followUpNote : null,
          attachmentNotes: attachmentNotes ?? null,
          idempotencyKey: idempotencyKey ?? null,
        },
        include: actionInclude,
      });
      return res.status(201).json(toActionDto(created));
    } catch (error) {
      // A parallel request with the same key won the unique constraint; replay its row.
      if (idempotencyKey && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await findActionDto({ ticketId_idempotencyKey: { ticketId, idempotencyKey } });
        if (existing) return sendReplay(res, existing);
      }
      throw error;
    }
  } catch (error) {
    console.error('Error creating action taken:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create action taken' } });
  }
});

// PATCH /api/actions/:actionId — IT Staff and Administrators, optimistic version check.
actionsRouter.patch('/api/actions/:actionId', requireNormalAuth, async (req: Request, res: Response) => {
  if (!STAFF_ROLES.includes(req.sessionUser!.role)) return sendForbidden(res);

  const actionId = parseId(req.params.actionId);
  if (actionId === null) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid action ID' } });
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const expectedVersion = body.expectedVersion;
  if (typeof expectedVersion !== 'number' || !Number.isInteger(expectedVersion)) {
    return sendValidationError(res, { expectedVersion: 'expectedVersion is required.' });
  }

  try {
    const prisma = getPrisma();
    const current = await prisma.actionTaken.findUnique({ where: { id: actionId }, include: actionInclude });
    if (!current) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Action not found' } });
    }

    // BR-10: terminal Actions are read-only.
    if (isTerminalActionStatus(current.status)) {
      return res.status(409).json({
        error: { code: 'ACTION_CLOSED', message: `This action is ${current.status} and cannot be changed.`, current: toActionDto(current) },
      });
    }
    if (current.version !== expectedVersion) {
      return res.status(409).json({
        error: { code: 'STALE_UPDATE', message: 'This action was changed by someone else. Reload and try again.', current: toActionDto(current) },
      });
    }

    const errors: FieldErrors = {};
    const data: Prisma.ActionTakenUncheckedUpdateManyInput = {};

    if (body.description !== undefined) data.description = readDescription(body, errors);
    const actionAt = readActionAt(body, errors);
    if (actionAt) data.actionAt = actionAt;
    const result = readOptionalText(body, 'result', 2000, errors);
    if (result !== undefined) data.result = result;
    const attachmentNotes = readOptionalText(body, 'attachmentNotes', 1000, errors);
    if (attachmentNotes !== undefined) data.attachmentNotes = attachmentNotes;

    let nextStatus = current.status;
    if (body.status !== undefined) {
      if (typeof body.status !== 'string' || !ACTION_STATUSES.includes(body.status as ActionStatus)) {
        errors.status = 'Status must be PLANNED, IN_PROGRESS, COMPLETED or CANCELLED.';
      } else if (body.status !== current.status) {
        if (!canTransitionAction(current.status, body.status as ActionStatus)) {
          return res.status(409).json({
            error: { code: 'CONFLICT', message: `Invalid action status transition from ${current.status} to ${body.status}.` },
          });
        }
        nextStatus = body.status as ActionStatus;
        data.status = nextStatus;
      }
    }
    const nextResult = result !== undefined ? result : current.result;
    if (nextStatus === 'COMPLETED' && !nextResult) {
      errors.result = 'Result is required when the action is completed.';
    }

    let nextFollowUp = current.followUpRequired;
    if (body.followUpRequired !== undefined) {
      if (typeof body.followUpRequired !== 'boolean') errors.followUpRequired = 'followUpRequired must be a boolean.';
      else nextFollowUp = body.followUpRequired;
    }
    const sentNote = readOptionalText(body, 'followUpNote', 1000, errors);
    // Turning follow-up off without sending a note clears the old note.
    const nextNote = sentNote !== undefined ? sentNote : (nextFollowUp ? current.followUpNote : null);
    if (!errors.followUpNote && !errors.followUpRequired) {
      const followUpError = validateFollowUp(nextFollowUp, nextNote);
      if (followUpError) errors.followUpNote = followUpError;
    }
    data.followUpRequired = nextFollowUp;
    data.followUpNote = nextFollowUp ? nextNote : null;

    if (body.assignedToId !== undefined && body.assignedToId !== current.assignedToId) {
      const assignedToId = await checkAssignee(body.assignedToId, errors);
      if (assignedToId !== undefined) data.assignedToId = assignedToId;
    }

    if (Object.keys(errors).length > 0) return sendValidationError(res, errors);

    // Conditional write (§9.1): only applies if nobody changed the row since we read it.
    const { count } = await prisma.actionTaken.updateMany({
      where: { id: actionId, version: expectedVersion, status: current.status },
      data: { ...data, version: { increment: 1 } },
    });
    if (count === 0) {
      const latest = (await findActionDto({ id: actionId }))!;
      const closed = isTerminalActionStatus(latest.status);
      return res.status(409).json({
        error: {
          code: closed ? 'ACTION_CLOSED' : 'STALE_UPDATE',
          message: closed
            ? `This action is ${latest.status} and cannot be changed.`
            : 'This action was changed by someone else. Reload and try again.',
          current: latest,
        },
      });
    }

    res.status(200).json(await findActionDto({ id: actionId }));
  } catch (error) {
    console.error('Error updating action taken:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update action taken' } });
  }
});
