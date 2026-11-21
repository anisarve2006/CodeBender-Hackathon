export const queryKeys = {
  tasks: (circleId: string) => ['tasks', circleId] as const,
  appointments: (circleId: string) => ['appointments', circleId] as const,
  documents: (circleId: string) => ['documents', circleId] as const,
  meds: (circleId: string) => ['meds', circleId] as const,
  refills: (circleId: string) => ['refills', circleId] as const,
  timeline: (circleId: string) => ['timeline', circleId] as const,
  dashboard: (circleId: string) => ['dashboard', circleId] as const,
  members: (circleId: string) => ['members', circleId] as const,
  updates: (circleId: string) => ['updates', circleId] as const,
  activity: (circleId: string) => ['activity', circleId] as const,
};
