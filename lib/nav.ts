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
    title: 'Timeline',
    href: (circleId: string) => `/c/${circleId}/timeline`,
    iconName: 'Activity',
  },
  {
    title: 'Tasks',
    href: (circleId: string) => `/c/${circleId}/tasks`,
    iconName: 'CheckSquare',
  },
  {
    title: 'Meds & Refills',
    href: (circleId: string) => `/c/${circleId}/meds`,
    iconName: 'Pill',
  },
  {
    title: 'Family',
    href: (circleId: string) => `/c/${circleId}/family`,
    iconName: 'Users',
  },
  {
    title: 'Settings',
    href: (circleId: string) => `/c/${circleId}/settings`,
    iconName: 'Settings',
  },
];
