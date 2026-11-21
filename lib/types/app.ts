import type {
  User,
  Session,
  CareCircle,
  CareRecipient,
  CircleMember,
  Task,
  Appointment,
  Medication,
  Refill,
  Document,
  Update,
  ActivityLog,
  Reminder,
} from '@/db/schema';
import type { circleRoleEnum } from '@/db/schema/enums';

export type CircleRole = (typeof circleRoleEnum.enumValues)[number];

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export type CircleContext = {
  circleId: string;
  role: CircleRole;
  userId: string;
  circleName: string;
  recipientName: string;
};

export type {
  User,
  Session,
  CareCircle,
  CareRecipient,
  CircleMember,
  Task,
  Appointment,
  Medication,
  Refill,
  Document,
  Update,
  ActivityLog,
  Reminder,
};
