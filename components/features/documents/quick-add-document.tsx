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

export function QuickAddDocumentDialog({ open, onOpenChange }: QuickAddDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Medical Record</DialogTitle>
          <DialogDescription>Securely attach prescription or lab report.</DialogDescription>
        </DialogHeader>
        <div className="py-4 text-sm text-muted-foreground">
          Document upload dialog stub (Member B feature implementation).
        </div>
      </DialogContent>
    </Dialog>
  );
}
