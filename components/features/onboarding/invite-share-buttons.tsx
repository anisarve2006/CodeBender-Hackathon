'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * WhatsApp and copy-link buttons for one generated invitation link.
 * The message is neutral and contains no medical details.
 */
export function InviteShareButtons({ link, email }: { link: string; email: string }) {
  const message = `I've invited you to help coordinate care on Kinly. Join here: ${link}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(message)}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Invitation link copied.');
    } catch {
      toast.error('Could not copy automatically. Select the link and copy it instead.');
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Share the invitation for ${email} on WhatsApp`}
        className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'min-h-11')}
      >
        Share on WhatsApp
      </a>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="min-h-11"
        onClick={copyLink}
        aria-label={`Copy the invitation link for ${email}`}
      >
        Copy link
      </Button>
    </div>
  );
}
