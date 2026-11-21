'use client';

import * as React from 'react';
import {
  Search,
  Upload,
  LayoutGrid,
  List,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/EmptyState';
import { DocumentCard } from './document-card';
import { QuickAddDocumentDialog } from './quick-add-document';
import { DocumentAccessDialog } from './document-access-dialog';
import { can } from '@/lib/utils/rbac';
import { useRouter } from 'next/navigation';
import type { CircleRole } from '@/lib/types/app';
import type { DocumentListItem } from '@/lib/data/documents';
import type { DocKind } from '@/lib/schemas/documents';

interface DocumentsViewProps {
  circleId: string;
  role: CircleRole;
  documents: DocumentListItem[];
}

const KIND_FILTERS: { label: string; value: DocKind | 'all' }[] = [
  { label: 'All Documents', value: 'all' },
  { label: 'Prescriptions', value: 'prescription' },
  { label: 'Lab Reports', value: 'lab_report' },
  { label: 'Discharge Summaries', value: 'discharge_summary' },
  { label: 'Scans & X-Rays', value: 'scan' },
  { label: 'Insurance', value: 'insurance' },
  { label: 'Bills', value: 'bill' },
  { label: 'Other', value: 'other' },
];

export function DocumentsView({ circleId, role, documents }: DocumentsViewProps) {
  const router = useRouter();
  const [selectedKind, setSelectedKind] = React.useState<DocKind | 'all'>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [accessDoc, setAccessDoc] = React.useState<DocumentListItem | null>(null);

  const canUpload = can(role, 'manage_records');

  // Filter documents by kind and search query
  const filteredDocs = React.useMemo(() => {
    return documents.filter((doc) => {
      const matchesKind = selectedKind === 'all' || doc.kind === selectedKind;
      const matchesSearch =
        searchQuery.trim() === '' ||
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.uploaderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.kind.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesKind && matchesSearch;
    });
  }, [documents, selectedKind, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents by title or doctor..."
            className="pl-9 min-h-11 bg-card"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {/* View mode toggle */}
          <div className="flex items-center rounded-lg border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-background shadow-xs text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-background shadow-xs text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {canUpload && (
            <Button
              type="button"
              className="min-h-11"
              onClick={() => setUploadOpen(true)}
            >
              <Upload className="h-4 w-4 mr-1.5" />
              Upload Document
            </Button>
          )}
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {KIND_FILTERS.map((f) => {
          const isSelected = selectedKind === f.value;
          const count =
            f.value === 'all'
              ? documents.length
              : documents.filter((d) => d.kind === f.value).length;

          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setSelectedKind(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border cursor-pointer transition-colors ${
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                  : 'border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Security notice banner */}
      <div className="flex items-center gap-2.5 rounded-xl border bg-muted/30 p-3.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
        <span>
          Prescriptions and reports are stored in private encrypted storage. Downloads expire in 60 seconds.
          Restricted documents require approval from circle coordinators.
        </span>
      </div>

      {/* Document Grid / List */}
      {filteredDocs.length === 0 ? (
        <EmptyState
          title={searchQuery ? 'No matching documents' : 'No documents uploaded'}
          description={
            searchQuery
              ? `No records found matching "${searchQuery}". Try a different keyword.`
              : 'Securely store prescriptions, lab reports, and scan summaries in the family vault.'
          }
          icon={FileText}
          actionLabel={canUpload ? 'Upload First Record' : undefined}
          onAction={canUpload ? () => setUploadOpen(true) : undefined}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <DocumentCard
              key={doc.id}
              circleId={circleId}
              document={doc}
              role={role}
              viewMode="grid"
              onManageAccess={(d) => setAccessDoc(d)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredDocs.map((doc) => (
            <DocumentCard
              key={doc.id}
              circleId={circleId}
              document={doc}
              role={role}
              viewMode="list"
              onManageAccess={(d) => setAccessDoc(d)}
            />
          ))}
        </div>
      )}

      {/* Quick Add Dialog */}
      <QuickAddDocumentDialog
        circleId={circleId}
        open={uploadOpen}
        onOpenChange={setUploadOpen}
      />

      {/* Access Grants & Audit Log Dialog */}
      <DocumentAccessDialog
        circleId={circleId}
        document={accessDoc}
        open={!!accessDoc}
        onOpenChange={(open) => {
          if (!open) setAccessDoc(null);
        }}
        onRefresh={() => router.refresh()}
      />
    </div>
  );
}
