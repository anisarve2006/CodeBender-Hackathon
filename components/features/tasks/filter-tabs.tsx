import { cn } from '@/lib/utils';
import { TASK_FILTERS, type TaskFilter } from './filters';

/**
 * components/features/tasks/filter-tabs.tsx
 * Owner: Member A
 * Filter buttons with counts. Each button is at least 44px tall for touch.
 */

type FilterTabsProps = {
  value: TaskFilter;
  counts: Record<TaskFilter, number | null>;
  onChange: (value: TaskFilter) => void;
};

export function FilterTabs({ value, counts, onChange }: FilterTabsProps) {
  return (
    <div role="group" aria-label="Filter tasks" className="flex flex-wrap gap-2">
      {TASK_FILTERS.map((filter) => {
        const selected = filter.value === value;
        const count = counts[filter.value];
        return (
          <button
            key={filter.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(filter.value)}
            className={cn(
              'inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'bg-background hover:bg-muted',
            )}
          >
            {filter.label}
            {count !== null && (
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs',
                  selected ? 'bg-primary-foreground/20' : 'bg-muted text-muted-foreground',
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
