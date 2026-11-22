/**
 * components/features/tasks/types.ts
 * Owner: Member A
 * Plain types and display labels shared by the task data layer and the UI.
 * Contains no server-only imports, so client components can use it.
 */

export type TaskView = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  dueAt: Date | null;
  assignedTo: string | null;
  assigneeName: string | null;
  completedBy: string | null;
  completedByName: string | null;
  completedAt: Date | null;
  linkedEntityType: string | null;
  linkedEntityId: string | null;
  recurrenceRule: string | null;
  createdBy: string;
  createdAt: Date;
};

export type CommentView = {
  id: string;
  body: string;
  authorName: string | null;
  createdAt: Date;
};

export type HistoryView = {
  id: number;
  action: string;
  summary: string;
  actorName: string | null;
  createdAt: Date;
};

export type TaskDetail = {
  task: TaskView;
  comments: CommentView[];
  history: HistoryView[];
};

export type DoneCursor = { completedAt: string; id: string };

export type DonePage = {
  items: TaskView[];
  nextCursor: DoneCursor | null;
};

export type MemberOption = {
  userId: string;
  fullName: string;
  role: string;
  avatarUrl: string | null;
};

export const CATEGORY_LABELS: Record<string, string> = {
  medication: 'Medication',
  appointment: 'Appointment',
  errand: 'Errand',
  payment: 'Payment',
  paperwork: 'Paperwork',
  other: 'Other',
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low priority',
  normal: 'Normal priority',
  high: 'High priority',
};

export const RECURRENCE_LABELS: Record<string, string> = {
  none: 'Does not repeat',
  daily: 'Repeats daily',
  weekly: 'Repeats weekly',
  monthly: 'Repeats monthly',
};
