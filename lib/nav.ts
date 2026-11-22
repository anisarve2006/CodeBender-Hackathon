export interface NavItem {
  title: string;
  href: (circleId: string) => string;
  iconName: string;
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  {
    title: 'Status Board',
    href: (circleId: string) => `/c/${circleId}`,
    iconName: 'LayoutDashboard',
  },
  {
    title: 'Appointments',
    href: (circleId: string) => `/c/${circleId}/appointments`,
    iconName: 'Calendar',
  },
  {
    title: 'Meds & Refills',
    href: (circleId: string) => `/c/${circleId}/meds`,
    iconName: 'Pill',
  },
  {
    title: 'Vault & Records',
    href: (circleId: string) => `/c/${circleId}/documents`,
    iconName: 'FileText',
  },
  {
    title: 'Tasks',
    href: (circleId: string) => `/c/${circleId}/tasks`,
    iconName: 'CheckSquare',
  },
  {
    title: 'Care Timeline',
    href: (circleId: string) => `/c/${circleId}/timeline`,
    iconName: 'Activity',
  },
  {
    title: 'Family',
    href: (circleId: string) => `/c/${circleId}/family`,
    iconName: 'Users',
  },
  {
    title: 'Care Companion',
    href: (circleId: string) => `/c/${circleId}/care-mode`,
    iconName: 'Heart',
  },
  {
    title: 'Settings',
    href: (circleId: string) => `/c/${circleId}/settings`,
    iconName: 'Settings',
  },
];
