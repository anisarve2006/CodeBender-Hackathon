import { NextResponse, type NextRequest } from 'next/server';
import { requireCircleRole } from '@/lib/data/circle-context';
import { uploadDocumentData } from '@/lib/data/documents';
import { docKindSchema, sensitivityLevelSchema } from '@/lib/schemas/documents';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const circleId = formData.get('circleId') as string | null;
    const title = formData.get('title') as string | null;
    const kindRaw = formData.get('kind') as string | null;
    const reportDateRaw = formData.get('reportDate') as string | null;
    const sensitivityRaw = formData.get('sensitivity') as string | null;

    if (!circleId) {
      return NextResponse.json({ error: 'Circle ID is required' }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (!title || title.trim().length < 2) {
      return NextResponse.json(
        { error: 'Document title must be at least 2 characters' },
        { status: 400 },
      );
    }

    const kindParsed = docKindSchema.safeParse(kindRaw || 'other');
    const kind = kindParsed.success ? kindParsed.data : 'other';

    const sensitivityParsed = sensitivityLevelSchema.safeParse(sensitivityRaw || 'normal');
    const sensitivity = sensitivityParsed.success ? sensitivityParsed.data : 'normal';

    const ctx = await requireCircleRole(circleId, [
      'owner',
      'coordinator',
      'caregiver',
    ]);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const doc = await uploadDocumentData(ctx, buffer, {
      title: title.trim(),
      kind,
      reportDate: reportDateRaw?.trim() || null,
      sensitivity,
      filename: file.name,
    });

    return NextResponse.json({ ok: true, document: doc });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
