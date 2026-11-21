'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface QuickAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  circleId: string;
}

export function QuickAddUpdateDialog({ open, onOpenChange }: QuickAddDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Post Family Update</DialogTitle>
          <DialogDescription>Share a quick care update with family members.</DialogDescription>
        </DialogHeader>
        <div className="py-4 text-sm text-muted-foreground">
          Update post dialog stub (Member A feature implementation).
        </div>
      </DialogContent>
    </Dialog>
  );
}
