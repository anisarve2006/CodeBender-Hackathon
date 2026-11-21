import * as React from 'react';
import { Lock, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function SensitivityBadge({ sensitivity }: { sensitivity: 'normal' | 'restricted' }) {
  if (sensitivity === 'restricted') {
    return (
      <Badge variant="destructive" className="gap-1 text-[11px]">
        <Lock className="h-3 w-3" />
        Restricted
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="gap-1 text-[11px]">
      <FileText className="h-3 w-3" />
      Normal
    </Badge>
  );
}
