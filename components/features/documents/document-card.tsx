'use client';

import * as React from 'react';
import {
  FileText,
  FileCheck2,
  FileHeart,
  FileSpreadsheet,
  Download,
  Trash2,
  ShieldAlert,
  ShieldCheck,
  Users,
  Eye,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { deleteDocumentAction } from '@/app/(app)/c/[circleId]/documents/actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { can } from '@/lib/utils/rbac';
import type { CircleRole } from '@/lib/types/app';
import type { DocumentListItem } from '@/lib/data/documents';

interface DocumentCardProps {
  circleId: string;
  document: DocumentListItem;
  role: CircleRole;
  onManageAccess?: (document: DocumentListItem) => void;
  viewMode?: 'grid' | 'list';
}

function getDocKindConfig(kind: string) {
  switch (kind) {
    case 'prescription':
      return { label: 'Prescription', icon: FileHeart, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800' };
    case 'lab_report':
      return { label: 'Lab Report', icon: FileCheck2, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800' };
    case 'discharge_summary':
      return { label: 'Discharge Summary', icon: FileSpreadsheet, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800' };
    case 'scan':
      return { label: 'Scan / Imaging', icon: FileText, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800' };
    case 'insurance':
      return { label: 'Insurance', icon: ShieldCheck, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' };
    default:
      return { label: 'Record', icon: FileText, color: 'text-slate-600 bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800' };
  }
}

export function DocumentCard({
  circleId,
  document,
  role,
  onManageAccess,
  viewMode = 'grid',
}: DocumentCardProps) {
  const router = useRouter();
  const [opening, setOpening] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const kindConfig = getDocKindConfig(document.kind);
  const Icon = kindConfig.icon;
  const isOwnerOrCoord = can(role, 'view_restricted_documents'); // owner or coordinator
  const isRestricted = document.sensitivity === 'restricted';
  const hasAccess = document.canView;

  async function handleViewDocument() {
    if (!hasAccess) {
      toast.error('This document is restricted. Contact the circle coordinator for access.');
      return;
    }

    setOpening(true);
    try {
      const res = await fetch(`/api/documents/${document.id}/url`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate secure viewing link');
      }

      // Open 60-second signed download URL in new tab
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to view document';
      toast.error(msg);
    } finally {
      setOpening(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await deleteDocumentAction({
      circleId,
      documentId: document.id,
    });
    setDeleting(false);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }

    toast.success('Document removed from vault');
    setDeleteConfirmOpen(false);
    router.refresh();
  }

  if (viewMode === 'list') {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-card hover:border-primary/40 transition-colors gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`h-11 w-11 rounded-lg border flex items-center justify-center flex-shrink-0 ${kindConfig.color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-sm truncate">{document.title}</h4>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${kindConfig.color}`}>
                {kindConfig.label}
              </span>
              {isRestricted && (
                <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                  <ShieldAlert className="h-3 w-3" />
                  Restricted
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {document.reportDate ? `Report: ${document.reportDate} • ` : ''}
              {(document.sizeBytes / (1024 * 1024)).toFixed(2)} MB • Added by {document.uploaderName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {hasAccess ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 text-xs"
              onClick={handleViewDocument}
              disabled={opening}
            >
              <Eye className="h-4 w-4 mr-1.5" />
              {opening ? 'Loading...' : 'View / Download'}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 text-xs text-muted-foreground"
              disabled
            >
              <Lock className="h-4 w-4 mr-1.5" />
              Access Restricted
            </Button>
          )}

          {isRestricted && isOwnerOrCoord && onManageAccess && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-11 text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              onClick={() => onManageAccess(document)}
              title="Manage member access grants"
            >
              <Users className="h-4 w-4 mr-1.5" />
              Access ({document.grantCount})
            </Button>
          )}

          {isOwnerOrCoord && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-11 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        <ConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          title="Delete Document"
          description={`Are you sure you want to remove "${document.title}" from the family vault? This action cannot be undone.`}
          confirmLabel="Yes, delete document"
          destructive={true}
          onConfirm={handleDelete}
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4 flex flex-col justify-between hover:border-primary/40 transition-colors shadow-sm">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className={`h-11 w-11 rounded-lg border flex items-center justify-center flex-shrink-0 ${kindConfig.color}`}>
            <Icon className="h-5 w-5" />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${kindConfig.color}`}>
              {kindConfig.label}
            </span>
            {isRestricted && (
              <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                <ShieldAlert className="h-3 w-3" />
                Restricted
              </span>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-sm line-clamp-1">{document.title}</h4>
          <p className="text-xs text-muted-foreground mt-1">
            {document.reportDate ? `Report: ${document.reportDate}` : `Added: ${new Date(document.createdAt).toLocaleDateString()}`}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {(document.sizeBytes / (1024 * 1024)).toFixed(2)} MB • {document.uploaderName}
          </p>
        </div>
      </div>

      <div className="pt-4 border-t mt-3 flex items-center justify-between gap-2">
        {hasAccess ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 text-xs flex-1"
            onClick={handleViewDocument}
            disabled={opening}
          >
            <Download className="h-4 w-4 mr-1.5" />
            {opening ? 'Loading...' : 'View'}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 text-xs flex-1 text-muted-foreground"
            disabled
          >
            <Lock className="h-4 w-4 mr-1.5" />
            Restricted
          </Button>
        )}

        {isRestricted && isOwnerOrCoord && onManageAccess && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-11 text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            onClick={() => onManageAccess(document)}
            title="Manage member access grants"
          >
            <Users className="h-4 w-4 mr-1" />
            Grants
          </Button>
        )}

        {isOwnerOrCoord && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-11 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
            onClick={() => setDeleteConfirmOpen(true)}
            aria-label="Delete document"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Document"
        description={`Are you sure you want to remove "${document.title}" from the family vault? This action cannot be undone.`}
        confirmLabel={deleting ? 'Deleting...' : 'Yes, delete document'}
        destructive={true}
        onConfirm={handleDelete}
      />
    </div>
  );
}
