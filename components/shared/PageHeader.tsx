import * as React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-1.5 pb-5 md:flex-row md:items-center md:justify-between border-b border-border/80">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="text-sm sm:text-base text-muted-foreground font-medium max-w-2xl">{subtitle}</p>}
      </div>
      {action && <div className="mt-3 md:mt-0 flex items-center gap-2.5 shrink-0">{action}</div>}
    </div>
  );
}
