import type { CircleRole } from '@/lib/types/app';

export type Capability =
  | 'manage_members'
  | 'invite_members'
  | 'view_dashboard'
  | 'manage_records'
  | 'create_tasks'
  | 'assign_tasks_to_others'
  | 'claim_tasks'
  | 'view_normal_documents'
  | 'view_restricted_documents'
  | 'delete_records'
  | 'view_activity_log'
  | 'export_circle';

export function can(role: CircleRole | undefined, capability: Capability): boolean {
  if (!role) return false;

  switch (capability) {
    case 'manage_members':
      return role === 'owner';
    case 'invite_members':
      return role === 'owner' || role === 'coordinator';
    case 'view_dashboard':
      return true; // all members can view dashboard (care recipient gets simplified view)
    case 'manage_records': // appointments, meds, refills
      return role === 'owner' || role === 'coordinator' || role === 'caregiver';
    case 'create_tasks':
      return role === 'owner' || role === 'coordinator' || role === 'caregiver';
    case 'assign_tasks_to_others':
      return role === 'owner' || role === 'coordinator';
    case 'claim_tasks':
      return role === 'owner' || role === 'coordinator' || role === 'caregiver';
    case 'view_normal_documents':
      return true;
    case 'view_restricted_documents':
      return role === 'owner' || role === 'coordinator';
    case 'delete_records':
      return role === 'owner' || role === 'coordinator' || role === 'caregiver';
    case 'view_activity_log':
      return role !== 'care_recipient';
    case 'export_circle':
      return role === 'owner';
    default:
      return false;
  }
}
