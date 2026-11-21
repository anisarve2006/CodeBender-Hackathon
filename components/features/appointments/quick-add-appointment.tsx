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

export function QuickAddAppointmentDialog({ open, onOpenChange }: QuickAddDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Doctor Appointment</DialogTitle>
          <DialogDescription>Schedule consultation or clinical follow-up.</DialogDescription>
        </DialogHeader>
        <div className="py-4 text-sm text-muted-foreground">
          Appointment scheduling dialog stub (Member B feature implementation).
        </div>
      </DialogContent>
    </Dialog>
  );
}
