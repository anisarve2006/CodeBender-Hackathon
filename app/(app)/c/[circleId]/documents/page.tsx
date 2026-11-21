import { PageHeader } from '@/components/shared/PageHeader';
import { requireUser } from '@/lib/auth/session';
import { requireCircleRole } from '@/lib/data/circle-context';
import { listDocuments, listGrantableMembers } from '@/lib/data/documents';
import { docKindSchema } from '@/lib/schemas/documents';
import { can } from '@/lib/utils/rbac';
import { QuickAddDocumentButton } from '@/components/features/documents/quick-add-document';
import {
  DocumentsBrowser,
  type DocumentCardItem,
} from '@/components/features/documents/documents-browser';
import type { GrantableMember } from '@/components/features/documents/grant-access-dialog';

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DocumentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ circleId: string }>;
  searchParams: Promise<{ kind?: string | string[]; q?: string | string[] }>;
}) {
  const { circleId } = await params;
  const { kind: rawKind, q: rawQuery } = await searchParams;

  const kindResult = docKindSchema.safeParse(firstParam(rawKind));
  const kind = kindResult.success ? kindResult.data : undefined;
  const search = firstParam(rawQuery)?.trim().slice(0, 120) || undefined;

  const [ctx, viewer] = await Promise.all([requireCircleRole(circleId), requireUser()]);

  const canUpload = can(ctx.role, 'manage_records');
  const canGrant = can(ctx.role, 'view_restricted_documents');

  const [documents, grantable] = await Promise.all([
    listDocuments(circleId, { kind, search }),
    canGrant ? listGrantableMembers(circleId) : Promise.resolve([]),
  ]);

  const cards: DocumentCardItem[] = documents.map((doc) => ({
    id: doc.id,
    kind: doc.kind,
    title: doc.title,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    reportDate: doc.reportDate,
    sensitivity: doc.sensitivity,
    uploaderName: doc.uploaderName,
    createdAt: doc.createdAt,
  }));

  const members: GrantableMember[] = grantable.flatMap((member) =>
    member.role === 'caregiver' || member.role === 'care_recipient'
      ? [{ userId: member.userId, fullName: member.fullName, role: member.role }]
      : [],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Medical Documents"
          subtitle="Securely stored prescriptions, lab reports, and hospital summaries"
        />
        {canUpload && <QuickAddDocumentButton circleId={circleId} />}
      </div>

      <p className="text-sm text-muted-foreground">
        Family Care Hub organises information only and does not provide medical advice. Always
        consult a doctor.
      </p>

      <DocumentsBrowser
        circleId={circleId}
        documents={cards}
        canGrant={canGrant}
        members={members}
        timezone={viewer.timezone}
        filters={{ kind, search }}
      />
    </div>
  );
}
