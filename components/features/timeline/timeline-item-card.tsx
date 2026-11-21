'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Calendar,
  Pill,
  FileText,
  MessageSquare,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';
import type { TimelineItem } from '@/lib/data/timeline';

interface TimelineItemCardProps {
  circleId: string;
  item: TimelineItem;
}

function getItemConfig(kind: string) {
  switch (kind) {
    case 'appointment':
      return {
        label: 'Appointment',
        icon: Calendar,
        color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
        dotColor: 'bg-blue-500 ring-blue-100 dark:ring-blue-900',
        linkPrefix: '/appointments',
      };
    case 'prescription':
      return {
        label: 'Prescription',
        icon: Pill,
        color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
        dotColor: 'bg-emerald-500 ring-emerald-100 dark:ring-emerald-900',
        linkPrefix: '/meds',
      };
    case 'document':
      return {
        label: 'Document',
        icon: FileText,
        color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800',
        dotColor: 'bg-purple-500 ring-purple-100 dark:ring-purple-900',
        linkPrefix: '/documents',
      };
    case 'update':
      return {
        label: 'Update',
        icon: MessageSquare,
        color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
        dotColor: 'bg-amber-500 ring-amber-100 dark:ring-amber-900',
        linkPrefix: '', // circle status board
      };
    default:
      return {
        label: 'Activity',
        icon: FileText,
        color: 'text-slate-600 bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800',
        dotColor: 'bg-slate-500 ring-slate-100 dark:ring-slate-900',
        linkPrefix: '',
      };
  }
}

export function TimelineItemCard({ circleId, item }: TimelineItemCardProps) {
  const config = getItemConfig(item.kind);
  const Icon = config.icon;
  const isRestricted = item.sensitivity === 'restricted';
  const targetHref = `/c/${circleId}${config.linkPrefix}`;

  const dateObj = new Date(item.occurredAt);
  const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formattedDate = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });

  return (
    <div className="relative pl-7 sm:pl-9 pb-6 group last:pb-2">
      {/* Vertical connection track */}
      <div className="absolute left-[11px] sm:left-[15px] top-6 bottom-0 w-[2px] bg-border group-last:hidden" />

      {/* Bullet marker */}
      <div
        className={`absolute left-[5px] sm:left-[9px] top-1.5 h-3.5 w-3.5 rounded-full ring-4 ${config.dotColor}`}
      />

      <Link
        href={targetHref}
        className="block rounded-xl border bg-card p-4 hover:border-primary/50 hover:shadow-xs transition-all"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`h-9 w-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${config.color}`}
            >
              <Icon className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${config.color}`}
                >
                  {config.label}
                </span>

                {isRestricted && (
                  <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                    <ShieldAlert className="h-3 w-3" />
                    Restricted document
                  </span>
                )}
              </div>

              <h4 className="font-semibold text-sm mt-1 text-foreground leading-snug line-clamp-2">
                {item.title}
              </h4>

              {item.subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {item.subtitle}
                </p>
              )}

              <p className="text-[11px] text-muted-foreground mt-2">
                By <span className="font-medium text-foreground/80">{item.actorName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-right flex-shrink-0">
            <div className="text-xs text-muted-foreground">
              <div className="font-medium text-foreground">{formattedDate}</div>
              <div className="text-[11px]">{formattedTime}</div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary transition-colors ml-1" />
          </div>
        </div>
      </Link>
    </div>
  );
}
