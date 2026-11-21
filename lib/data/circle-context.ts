import 'server-only';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { eq, and } from 'drizzle-orm';
import { requireVerifiedUser } from '@/lib/auth/session';
import { withUserTx } from '@/db/client';
import * as schema from '@/db/schema';
import type { CircleContext, CircleRole } from '@/lib/types/app';

export const requireCircleRole = cache(
  async (circleId: string, allowed?: CircleRole[]): Promise<CircleContext> => {
    const user = await requireVerifiedUser();

    return withUserTx(user.id, async (tx) => {
      const membership = await tx
        .select({
          role: schema.circleMembers.role,
          circleName: schema.careCircles.name,
          recipientName: schema.careRecipients.fullName,
        })
        .from(schema.circleMembers)
        .innerJoin(schema.careCircles, eq(schema.circleMembers.circleId, schema.careCircles.id))
        .leftJoin(schema.careRecipients, eq(schema.careCircles.id, schema.careRecipients.circleId))
        .where(
          and(
            eq(schema.circleMembers.circleId, circleId),
            eq(schema.circleMembers.userId, user.id),
          ),
        )
        .limit(1);

      if (membership.length === 0) {
        notFound();
      }

      const { role, circleName, recipientName } = membership[0];

      if (allowed && allowed.length > 0 && !allowed.includes(role)) {
        throw new Error('You do not have permission to perform this action in this circle.');
      }

      return {
        circleId,
        role,
        userId: user.id,
        circleName,
        recipientName: recipientName || 'Family Member',
      };
    });
  },
);
