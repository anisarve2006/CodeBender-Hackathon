'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PackageCheck, ShoppingCart } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  markRefillOrderedAction,
  markRefillRefilledAction,
} from '@/app/(app)/c/[circleId]/meds/actions';
import { markRefillRefilledSchema } from '@/lib/schemas/refills';
import type { RefillStatus } from '@/lib/utils/refill-math';

/**
 * Refill buttons: Mark ordered, and Mark refilled (asks for the new quantity). Owner: Member B.
 */

interface RefillActionsProps {
  circleId: string;
  refillId: string;
  medicationName: string;
  status: RefillStatus;
}

export function RefillActions({ circleId, refillId, medicationName, status }: RefillActionsProps) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [refilledOpen, setRefilledOpen] = React.useState(false);
  const [quantity, setQuantity] = React.useState('');
  const [quantityError, setQuantityError] = React.useState<string | null>(null);
  const quantityId = `refill-qty-${refillId}`;

  const handleOrdered = async () => {
    setSaving(true);
    const result = await markRefillOrderedAction({ circleId, refillId });
    setSaving(false);
    if (result.ok) {
      toast.success(`${medicationName} marked as ordered`);
      router.refresh();
      return;
    }
    toast.error(result.error);
  };

  const handleRefilled = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = markRefillRefilledSchema.safeParse({ circleId, refillId, newQuantity: quantity });
    if (!parsed.success) {
      setQuantityError(
        parsed.error.flatten().fieldErrors.newQuantity?.[0] ?? 'Enter a valid quantity',
      );
      return;
    }

    setQuantityError(null);
    setSaving(true);
    const result = await markRefillRefilledAction(parsed.data);
    setSaving(false);
    if (result.ok) {
      toast.success(`${medicationName} refill recorded`);
      setRefilledOpen(false);
      setQuantity('');
      router.refresh();
      return;
    }
    toast.error(result.error);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        onClick={handleOrdered}
        disabled={saving || status === 'ordered'}
      >
        <ShoppingCart className="h-4 w-4" aria-hidden="true" />
        Mark ordered
      </Button>

      <Button type="button" className="min-h-11" onClick={() => setRefilledOpen(true)} disabled={saving}>
        <PackageCheck className="h-4 w-4" aria-hidden="true" />
        Mark refilled
      </Button>

      <Dialog open={refilledOpen} onOpenChange={setRefilledOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record refill: {medicationName}</DialogTitle>
            <DialogDescription>
              Enter the quantity now on hand after the refill. The countdown is recalculated from it.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRefilled} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor={quantityId}>New quantity on hand *</Label>
              <Input
                id={quantityId}
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                className="min-h-11"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                aria-invalid={!!quantityError}
              />
              {quantityError && <p className="text-sm text-destructive">{quantityError}</p>}
            </div>

            <DialogFooter>
              <Button type="submit" className="min-h-11" disabled={saving}>
                {saving ? 'Saving…' : 'Save refill'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
