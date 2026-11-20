import prisma from '@/lib/prisma';
import { AIFeature, AIMode, AIExecutionStatus, Prisma } from '@prisma/client';

export async function logAudit(params: {
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId ?? null,
        actorRole: params.actorRole ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        details: (params.details ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        ipAddress: params.ipAddress ?? null,
      },
    });
  } catch (err) {
    console.error('[AuditLog Error]', err);
  }
}

export async function logAIUsage(params: {
  userId?: string | null;
  feature: AIFeature;
  mode: AIMode;
  modelName: string;
  status?: AIExecutionStatus;
  latencyMs: number;
  tokensEstimated?: number;
  errorMessage?: string | null;
}) {
  try {
    await prisma.aIUsageLog.create({
      data: {
        userId: params.userId ?? null,
        feature: params.feature,
        mode: params.mode,
        modelName: params.modelName,
        status: params.status ?? 'SUCCESS',
        latencyMs: Math.max(1, Math.round(params.latencyMs)),
        tokensEstimated: params.tokensEstimated ?? 0,
        errorMessage: params.errorMessage ?? null,
      },
    });
  } catch (err) {
    console.error('[AIUsageLog Error]', err);
  }
}

export async function createNotification(params: {
  userId: string;
  type:
    | 'APPLICATION_RECEIVED'
    | 'APPLICATION_REVIEWED'
    | 'CANDIDATE_SHORTLISTED'
    | 'APPLICATION_STATUS'
    | 'INTERVIEW_INVITATION'
    | 'INTERVIEW_RESCHEDULED'
    | 'JOB_RECOMMENDATION'
    | 'NEW_MESSAGE'
    | 'SYSTEM';
  title: string;
  message: string;
  link?: string;
}) {
  try {
    return await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link ?? null,
      },
    });
  } catch (err) {
    console.error('[Notification Error]', err);
    return null;
  }
}
