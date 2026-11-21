'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { FileText, Image as ImageIcon, Lock, Search, ShieldCheck, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/EmptyState';
import { DOCUMENT_KIND_OPTIONS } from '@/components/features/documents/quick-add-document';
import { GrantAccessDialog, type GrantableMember } from '@/components/features/documents/grant-access-dialog';

export interface DocumentCardItem {
  id: string;
  kind: string;
  title: string;
  mimeType: string;
  sizeBytes: number;
  reportDate: string | null;
  sensitivity: 'normal' | 'restricted';
  uploaderName: string;
  createdAt: Date;
}

interface DocumentsBrowserProps {
  circleId: string;
  documents: DocumentCardItem[];
  canGrant: boolean;
  members: GrantableMember[];
  timezone: string;
  filters: { kind?: string; search?: string };
}

const KIND_LABELS: Record<string, string> = Object.fromEntries(
  DOCUMENT_KIND_OPTIONS.map((option) => [option.value, option.label]),
);

function formatReportDate(value: string | null, timezone: string): string | null {
  if (!value) return null;
  // Report dates are calendar dates; anchor them at noon UTC so no timezone shifts the day.
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeZone: timezone,
  }).format(new Date(`${value}T12:00:00Z`));
}

function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function DocumentsBrowser({
  circleId,
  documents,
  canGrant,
  members,
  timezone,
  filters,
}: DocumentsBrowserProps) {
  const [grantTarget, setGrantTarget] = React.useState<DocumentCardItem | null>(null);
  const [openingId, setOpeningId] = React.useState<string | null>(null);

  const openDocument = async (documentId: string) => {
    setOpeningId(documentId);
    try {
      const response = await fetch(`/api/documents/${documentId}/url`, { cache: 'no-store' });
      const body = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!response.ok || !body?.url) {
        toast.error(body?.error ?? 'Could not open this document.');
        return;
      }
      window.open(body.url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Could not open this document. Check your connection and try again.');
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <div className="space-y-6">
      <form
        method="get"
        action={`/c/${circleId}/documents`}
        className="grid gap-3 sm:grid-cols-[1fr_200px_auto] sm:items-end"
        role="search"
      >
        <div className="space-y-1.5">
          <label htmlFor="doc-search" className="text-sm font-medium">
            Search by title
          </label>
          <Input
            id="doc-search"
            name="q"
            type="search"
            defaultValue={filters.search ?? ''}
            placeholder="e.g. blood test"
            className="min-h-11"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="doc-filter-kind" className="text-sm font-medium">
            Kind
          </label>
          <select
            id="doc-filter-kind"
            name="kind"
            defaultValue={filters.kind ?? ''}
            className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All kinds</option>
            {DOCUMENT_KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <Button type="submit" variant="secondary" className="min-h-11">
            <Search className="h-4 w-4" aria-hidden="true" />
            Apply
          </Button>
          {(filters.kind || filters.search) && (
            <a
              href={`/c/${circleId}/documents`}
              className="inline-flex min-h-11 items-center rounded-md px-4 text-sm font-medium hover:bg-muted"
            >
              Clear
            </a>
          )}
        </div>
      </form>

      {documents.length === 0 ? (
        <EmptyState
          title={filters.kind || filters.search ? 'No documents match' : 'No documents yet'}
          description="Uploaded prescriptions, lab reports and summaries will appear here."
          icon={FileText}
        />
      ) : (
        <ul className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4 xl:grid-cols-3">
          {documents.map((doc) => {
            const isImage = doc.mimeType.startsWith('image/');
            const Icon = isImage ? ImageIcon : FileText;
            const reportDate = formatReportDate(doc.reportDate, timezone);
            const restricted = doc.sensitivity === 'restricted';

            return (
              <li
                key={doc.id}
                className="flex flex-col gap-3 rounded-lg border bg-card p-4 text-card-foreground shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-6 w-6 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="break-words text-base font-semibold">{doc.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {KIND_LABELS[doc.kind] ?? doc.kind}
                      {reportDate && <> · Report date {reportDate}</>}
                    </p>
                  </div>
                  {restricted && (
                    <Badge variant="outline" className="shrink-0 gap-1">
                      <Lock className="h-3 w-3" aria-hidden="true" />
                      Restricted
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  Uploaded by {doc.uploaderName} · {formatSize(doc.sizeBytes)}
                </p>

                <div className="mt-auto flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="min-h-11"
                    disabled={openingId === doc.id}
                    onClick={() => openDocument(doc.id)}
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    {openingId === doc.id ? 'Opening…' : 'Open'}
                  </Button>
                  {canGrant && restricted && (
                    <Button
                      variant="ghost"
                      className="min-h-11"
                      onClick={() => setGrantTarget(doc)}
                    >
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                      Access
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {grantTarget && (
        <GrantAccessDialog
          open={!!grantTarget}
          onOpenChange={(next) => {
            if (!next) setGrantTarget(null);
          }}
          circleId={circleId}
          documentId={grantTarget.id}
          documentTitle={grantTarget.title}
          members={members}
          timezone={timezone}
        />
      )}
    </div>
  );
}
