import * as React from 'react';
import { MessageSquare } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { RelativeTime } from '@/components/shared/RelativeTime';
import { MoodTag } from '@/components/features/updates/mood-display';
import type { UpdateView } from '@/lib/data/updates';

/**
 * components/features/family/updates-feed.tsx
 * Owner: Member A
 * Latest family updates, newest first. Mood is shown as icon plus text.
 */
export function UpdatesFeed({ updates }: { updates: UpdateView[] }) {
  if (updates.length === 0) {
    return (
      <EmptyState
        title="No updates yet"
        description="Post a short update so the family knows how things are going."
        icon={MessageSquare}
      />
    );
  }

  return (
    <ol className="space-y-3">
      {updates.map((update) => (
        <li key={update.id} className="space-y-2 rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-medium">{update.authorName ?? 'A family member'}</span>
            <RelativeTime date={update.createdAt} className="text-muted-foreground" />
          </div>
          <p className="whitespace-pre-line text-base">{update.body}</p>
          <MoodTag mood={update.moodTag} />
        </li>
      ))}
    </ol>
  );
}
