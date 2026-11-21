import * as React from 'react';
import { BatteryLow, MessageCircle, Meh, Smile, Thermometer, type LucideIcon } from 'lucide-react';
import { UPDATE_MOOD_LABELS, isKnownMood, type UpdateMood } from '@/lib/schemas/updates';

/**
 * components/features/updates/mood-display.tsx
 * Owner: Member A
 * Mood shown as an icon plus its text, so it is never colour-only.
 * Older rows may hold free text; those are shown as written, with a neutral icon.
 */

export const MOOD_ICONS: Record<UpdateMood, LucideIcon> = {
  good: Smile,
  okay: Meh,
  tired: BatteryLow,
  unwell: Thermometer,
};

export function MoodTag({ mood, className }: { mood: string | null; className?: string }) {
  if (!mood) return null;

  if (isKnownMood(mood)) {
    const Icon = MOOD_ICONS[mood];
    return (
      <span className={`inline-flex items-center gap-1 text-sm font-medium ${className ?? ''}`}>
        <Icon className="h-4 w-4" aria-hidden />
        {UPDATE_MOOD_LABELS[mood]}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 text-sm text-muted-foreground ${className ?? ''}`}>
      <MessageCircle className="h-4 w-4" aria-hidden />
      {mood}
    </span>
  );
}
