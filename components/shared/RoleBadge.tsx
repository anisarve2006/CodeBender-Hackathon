import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import type { CircleRole } from '@/lib/types/app';

const roleLabels: Record<CircleRole, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  owner: { label: 'Owner', variant: 'default' },
  coordinator: { label: 'Coordinator', variant: 'secondary' },
  caregiver: { label: 'Caregiver', variant: 'outline' },
  viewer: { label: 'Viewer', variant: 'outline' },
  care_recipient: { label: 'Care Recipient', variant: 'outline' },
};

export function RoleBadge({ role }: { role: CircleRole }) {
  const config = roleLabels[role] || { label: role, variant: 'outline' };
  return <Badge variant={config.variant} className="text-[11px] capitalize">{config.label}</Badge>;
}
