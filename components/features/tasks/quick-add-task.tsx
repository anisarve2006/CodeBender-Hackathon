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

export function QuickAddTaskDialog({ open, onOpenChange }: QuickAddDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
          <DialogDescription>Quickly assign or track a caregiving task.</DialogDescription>
        </DialogHeader>
        <div className="py-4 text-sm text-muted-foreground">
          Task creation dialog stub (Member A feature implementation).
        </div>
      </DialogContent>
    </Dialog>
  );
}
