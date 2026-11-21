'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { z } from 'zod';
import { Camera, Upload, FileText, Lock } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { createDocumentSchema } from '@/lib/schemas/documents';
import { uploadDocumentAction } from '@/app/(app)/c/[circleId]/documents/actions';

type DocumentFormValues = z.input<typeof createDocumentSchema>;

export const DOCUMENT_KIND_OPTIONS = [
  { value: 'prescription', label: 'Prescription' },
  { value: 'lab_report', label: 'Lab report' },
  { value: 'scan', label: 'Scan' },
  { value: 'discharge_summary', label: 'Discharge summary' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'bill', label: 'Bill' },
  { value: 'other', label: 'Other' },
] as const;

interface QuickAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  circleId: string;
}

const inputClass = 'min-h-11';
const MAX_MB = 10;
/** Same limit as validateUploadSize in lib/utils/blob.ts (kept here so the client bundle stays free of server code). */
const MAX_BYTES = MAX_MB * 1024 * 1024;

/** File name without its extension, used to prefill the title. */
function titleFromFileName(name: string): string {
  return name.replace(/\.[^.]*$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 120);
}

export function QuickAddDocumentDialog({ open, onOpenChange, circleId }: QuickAddDialogProps) {
  const router = useRouter();
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);

  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(createDocumentSchema),
    defaultValues: {
      circleId,
      title: '',
      kind: 'other',
      reportDate: '',
      sensitivity: 'normal',
    },
  });
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  // Revoke the object URL when the preview changes or the dialog unmounts.
  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const isImage = file?.type.startsWith('image/') ?? false;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFileError(null);

    if (!selected) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    if (selected.size === 0 || selected.size > MAX_BYTES) {
      setFileError(`The file must be ${MAX_MB} MB or smaller.`);
      setFile(null);
      setPreviewUrl(null);
      event.target.value = '';
      return;
    }

    setFile(selected);
    setPreviewUrl(selected.type.startsWith('image/') ? URL.createObjectURL(selected) : null);

    // Prefill the title from the file name, but never overwrite what the user already typed.
    if (!form.getValues('title')) {
      setValue('title', titleFromFileName(selected.name), { shouldValidate: false });
    }
  };

  const onSubmit = async (values: DocumentFormValues) => {
    if (!file) {
      setFileError('Choose a photo or PDF to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('circleId', circleId);
    formData.append('title', values.title);
    formData.append('kind', values.kind);
    formData.append('reportDate', values.reportDate ?? '');
    formData.append('sensitivity', values.sensitivity ?? 'normal');
    formData.append('file', file);

    const result = await uploadDocumentAction(formData);

    if (result.ok) {
      toast.success('Document saved');
      reset({ circleId, title: '', kind: 'other', reportDate: '', sensitivity: 'normal' });
      setFile(null);
      setPreviewUrl(null);
      setFileError(null);
      onOpenChange(false);
      router.refresh();
      return;
    }

    if (result.fieldErrors) {
      for (const [field, messages] of Object.entries(result.fieldErrors)) {
        if (messages[0]) {
          setError(field as keyof DocumentFormValues, { message: messages[0] });
        }
      }
    }
    toast.error(result.error);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Medical Record</DialogTitle>
          <DialogDescription>
            Take a photo or choose a PDF. Files are stored privately and checked by their content.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="doc-file">Photo or PDF *</Label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label
                htmlFor="doc-file"
                className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-input px-4 text-sm font-medium hover:bg-muted"
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                Choose file
              </label>
              <label
                htmlFor="doc-camera"
                className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-input px-4 text-sm font-medium hover:bg-muted"
              >
                <Camera className="h-4 w-4" aria-hidden="true" />
                Take photo
              </label>
            </div>
            <input
              id="doc-file"
              type="file"
              accept="image/*,application/pdf"
              className="sr-only"
              onChange={handleFileChange}
            />
            <input
              id="doc-camera"
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              className="sr-only"
              onChange={handleFileChange}
            />
            {fileError && <p className="text-sm text-destructive">{fileError}</p>}

            {file && (
              <div className="flex items-center gap-3 rounded-md border p-3">
                {isImage && previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Preview of the selected file"
                    className="h-16 w-16 rounded object-cover"
                  />
                ) : (
                  <FileText className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
                )}
                <div className="min-w-0 text-sm">
                  <p className="truncate font-medium">{file.name}</p>
                  <p className="text-muted-foreground">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doc-title">Title *</Label>
            <Input
              id="doc-title"
              className={inputClass}
              aria-invalid={!!errors.title}
              {...register('title')}
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="doc-kind">Kind *</Label>
              <select
                id="doc-kind"
                className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...register('kind')}
              >
                {DOCUMENT_KIND_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-report-date">Report date</Label>
              <Input
                id="doc-report-date"
                type="date"
                className={inputClass}
                aria-invalid={!!errors.reportDate}
                {...register('reportDate')}
              />
              {errors.reportDate && (
                <p className="text-sm text-destructive">{errors.reportDate.message}</p>
              )}
            </div>
          </div>

          <div className="flex min-h-11 items-start justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="doc-sensitivity" className="flex items-center gap-2">
                <Lock className="h-4 w-4" aria-hidden="true" />
                Mark as restricted
              </Label>
              <p className="text-sm text-muted-foreground">
                Restricted documents are visible only to owners and coordinators, and to people
                you grant access to.
              </p>
            </div>
            <Controller
              control={control}
              name="sensitivity"
              render={({ field }) => (
                <Switch
                  id="doc-sensitivity"
                  checked={field.value === 'restricted'}
                  onCheckedChange={(checked: boolean) => field.onChange(checked ? 'restricted' : 'normal')}
                />
              )}
            />
          </div>

          <DialogFooter>
            <Button type="submit" className="min-h-11" disabled={isSubmitting || !file}>
              <Upload className="h-4 w-4" aria-hidden="true" />
              {isSubmitting ? 'Uploading…' : 'Save document'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Trigger button plus dialog, for use in server-rendered pages. */
export function QuickAddDocumentButton({ circleId }: { circleId: string }) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button className="min-h-11" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4" aria-hidden="true" />
        Upload record
      </Button>
      <QuickAddDocumentDialog open={open} onOpenChange={setOpen} circleId={circleId} />
    </>
  );
}
