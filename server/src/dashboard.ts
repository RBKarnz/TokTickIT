import { Router, Request, Response } from 'express';
import { ActionStatus, Prisma, Priority, Role, TicketStatus } from '@prisma/client';
import { getPrisma } from './prisma.js';
import { requireNormalAuth } from './auth.js';
import { STAFF_ROLES } from './actions.js';

// ---------------------------------------------------------------------------
// Role Dashboards (Lab 4 api-spec §5, specification §5 Dashboards BR-26..32).
// Pure helpers are exported for unit tests.
// ---------------------------------------------------------------------------

// BR-27: Open group = New, Open, In Progress, Waiting for Requester, Reopened.
export const OPEN_GROUP_STATUSES: TicketStatus[] = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'];

export function isOpenGroupStatus(status: TicketStatus): boolean {
  return OPEN_GROUP_STATUSES.includes(status);
}

const ALL_STATUSES: TicketStatus[] = [
  'NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED',
];
const ALL_IT_PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const ALL_ROLES: Role[] = ['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR'];
const OPEN_ACTION_STATUSES: ActionStatus[] = ['PLANNED', 'IN_PROGRESS'];
const RECENT_LIST_LIMIT = 5;

// BR-26: last 7 days is the rolling 168 hours before the request. The instant
// comparison below is timezone-agnostic; "Asia/Bangkok" only labels the
// response for client-side display.
export const ROLLING_WINDOW_MS = 168 * 60 * 60 * 1000;

export function rollingWindowCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - ROLLING_WINDOW_MS);
}

const dashboardRouter = Router();
export { dashboardRouter };

function sendForbidden(res: Response, message: string) {
  return res.status(403).json({ error: { code: 'FORBIDDEN', message } });
}

type TicketListRow = { id: number; ticketNumber: string; summary: string; currentStatus: TicketStatus; itPriority: Priority; updatedAt: Date };

function toRequesterTicketDto(t: TicketListRow) {
  return {
    id: t.id,
    ticketNumber: t.ticketNumber,
    summary: t.summary,
    status: t.currentStatus,
    updatedAt: t.updatedAt,
  };
}

function toStaffTicketDto(t: TicketListRow) {
  return {
    id: t.id,
    ticketNumber: t.ticketNumber,
    summary: t.summary,
    status: t.currentStatus,
    itPriority: t.itPriority,
    updatedAt: t.updatedAt,
  };
}

const ticketListSelect = {
  id: true, ticketNumber: true, summary: true, currentStatus: true, itPriority: true, updatedAt: true,
} satisfies Prisma.TicketSelect;

// ---------------------------------------------------------------------------
// GET /api/dashboard/requester (AC-02, AC-19, AC-20)
// ---------------------------------------------------------------------------
dashboardRouter.get('/api/dashboard/requester', requireNormalAuth, async (req: Request, res: Response) => {
  if (req.sessionUser!.role !== 'REQUESTER') {
    return sendForbidden(res, 'Only Requesters can access the Requester dashboard.');
  }
  const requesterId = req.sessionUser!.id;
  const prisma = getPrisma();

  try {
    const [openTickets, waitingForMe, resolved, closed, recentlyUpdated, resolvedCandidates] = await Promise.all([
      prisma.ticket.count({ where: { requesterId, currentStatus: { in: OPEN_GROUP_STATUSES } } }),
      prisma.ticket.count({ where: { requesterId, currentStatus: 'WAITING_FOR_REQUESTER' } }),
      prisma.ticket.count({ where: { requesterId, currentStatus: 'RESOLVED' } }),
      prisma.ticket.count({ where: { requesterId, currentStatus: 'CLOSED' } }),
      prisma.ticket.findMany({
        where: { requesterId },
        orderBy: { updatedAt: 'desc' },
        take: RECENT_LIST_LIMIT,
        select: ticketListSelect,
      }),
      // BR-31/BR-32: "recently resolved" needs the latest history row per ticket,
      // so the gate below re-checks the actual transition time, not just currentStatus.
      prisma.ticket.findMany({
        where: { requesterId, currentStatus: 'RESOLVED' },
        select: {
          ...ticketListSelect,
          statusHistory: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 1, select: { createdAt: true } },
        },
      }),
    ]);

    const cutoff = rollingWindowCutoff();
    const recentlyResolved = resolvedCandidates
      .filter((t) => t.statusHistory[0] && t.statusHistory[0].createdAt >= cutoff)
      .sort((a, b) => b.statusHistory[0]!.createdAt.getTime() - a.statusHistory[0]!.createdAt.getTime())
      .slice(0, RECENT_LIST_LIMIT)
      .map(toRequesterTicketDto);

    res.status(200).json({
      openTickets: { count: openTickets, drillDown: '/tickets?statusGroup=open' },
      waitingForMe: { count: waitingForMe, drillDown: '/tickets?status=WAITING_FOR_REQUESTER' },
      resolved: { count: resolved, drillDown: '/tickets?status=RESOLVED' },
      closed: { count: closed, drillDown: '/tickets?status=CLOSED' },
      recentlyUpdated: recentlyUpdated.map(toRequesterTicketDto),
      recentlyResolved,
      generatedAt: new Date().toISOString(),
      timeZone: 'Asia/Bangkok',
    });
  } catch (error) {
    console.error('Error building requester dashboard:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load the Requester dashboard.' } });
  }
});

// ---------------------------------------------------------------------------
// GET /api/dashboard/staff (AC-16, AC-17, AC-19, AC-20)
// ---------------------------------------------------------------------------
dashboardRouter.get('/api/dashboard/staff', requireNormalAuth, async (req: Request, res: Response) => {
  if (!STAFF_ROLES.includes(req.sessionUser!.role)) {
    return sendForbidden(res, 'Only IT Staff and Administrators can access this dashboard.');
  }
  const me = req.sessionUser!.id;
  const isAdmin = req.sessionUser!.role === 'ADMINISTRATOR';
  const prisma = getPrisma();

  try {
    const [
      unassigned,
      myOwnedOpen,
      myOpenActions,
      pendingFollowUps,
      byStatusGroups,
      byItPriorityGroups,
      urgent,
      recentlyUpdated,
      userGroups,
    ] = await Promise.all([
      prisma.ticket.count({ where: { ownerId: null, currentStatus: { in: OPEN_GROUP_STATUSES } } }),
      prisma.ticket.count({ where: { ownerId: me, currentStatus: { in: OPEN_GROUP_STATUSES } } }),
      prisma.actionTaken.count({ where: { assignedToId: me, status: { in: OPEN_ACTION_STATUSES } } }),
      prisma.actionTaken.count({ where: { followUpRequired: true, status: { in: OPEN_ACTION_STATUSES } } }),
      prisma.ticket.groupBy({ by: ['currentStatus'], _count: { _all: true } }),
      prisma.ticket.groupBy({ by: ['itPriority'], where: { currentStatus: { in: OPEN_GROUP_STATUSES } }, _count: { _all: true } }),
      prisma.ticket.findMany({
        where: { currentStatus: { in: OPEN_GROUP_STATUSES }, itPriority: { in: ['CRITICAL', 'HIGH'] } },
        orderBy: [{ itPriority: 'desc' }, { updatedAt: 'asc' }],
        take: RECENT_LIST_LIMIT,
        select: ticketListSelect,
      }),
      prisma.ticket.findMany({
        orderBy: { updatedAt: 'desc' },
        take: RECENT_LIST_LIMIT,
        select: ticketListSelect,
      }),
      isAdmin ? prisma.user.groupBy({ by: ['role', 'isActive'], _count: { _all: true } }) : Promise.resolve(null),
    ]);

    const byStatus: Record<string, number> = {};
    for (const status of ALL_STATUSES) byStatus[status] = 0;
    for (const row of byStatusGroups) byStatus[row.currentStatus] = row._count._all;

    const byItPriority: Record<string, number> = {};
    for (const priority of ALL_IT_PRIORITIES) byItPriority[priority] = 0;
    for (const row of byItPriorityGroups) {
      if (ALL_IT_PRIORITIES.includes(row.itPriority)) byItPriority[row.itPriority] = row._count._all;
    }

    const body: Record<string, unknown> = {
      unassigned: { count: unassigned, drillDown: '/staff/queue?ownership=unassigned&statusGroup=open' },
      myOwnedOpen: { count: myOwnedOpen, drillDown: '/staff/queue?ownerId=me&statusGroup=open' },
      myOpenActions: { count: myOpenActions, drillDown: '/staff/queue?actionAssignee=me' },
      pendingFollowUps: { count: pendingFollowUps, drillDown: '/staff/queue?followUp=pending' },
      byStatus,
      byItPriority,
      urgent: urgent.map(toStaffTicketDto),
      recentlyUpdated: recentlyUpdated.map(toStaffTicketDto),
      generatedAt: new Date().toISOString(),
      timeZone: 'Asia/Bangkok',
    };

    if (isAdmin) {
      const users: Record<string, { active: number; inactive: number; drillDown: string }> = {};
      for (const role of ALL_ROLES) {
        users[role] = { active: 0, inactive: 0, drillDown: `/admin/users?role=${role}` };
      }
      if (userGroups) {
        for (const row of userGroups) {
          const bucket = users[row.role];
          if (!bucket) continue;
          if (row.isActive) bucket.active = row._count._all;
          else bucket.inactive = row._count._all;
        }
      }
      body.users = users;
    }

    res.status(200).json(body);
  } catch (error) {
    console.error('Error building staff dashboard:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load the dashboard.' } });
  }
});
