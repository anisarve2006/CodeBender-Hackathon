'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
  documentUploadFormSchema,
  type DocumentUploadFormValues,
} from '@/lib/schemas/documents';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Upload, Camera, FileText, X, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface QuickAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  circleId: string;
}

export function QuickAddDocumentDialog({
  open,
  onOpenChange,
  circleId,
}: QuickAddDialogProps) {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const cameraInputRef = React.useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [isDragOver, setIsDragOver] = React.useState(false);

  const form = useForm<DocumentUploadFormValues>({
    resolver: zodResolver(documentUploadFormSchema),
    defaultValues: {
      title: '',
      kind: 'other',
      reportDate: new Date().toISOString().split('T')[0],
      sensitivity: 'normal',
    },
  });

  const sensitivity = form.watch('sensitivity');

  // Clear preview URL on unmount or file change
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleFileSelection(file: File) {
    setFileError(null);

    // Size check
    if (file.size > 10 * 1024 * 1024) {
      setFileError('File exceeds maximum size of 10 MB.');
      return;
    }

    // MIME type check
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif'];
    if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|jpe?g|png|heic)$/i)) {
      setFileError('Invalid file type. Only PDF, JPEG, PNG, and HEIC files are accepted.');
      return;
    }

    setSelectedFile(file);

    // Auto-fill title if empty
    if (!form.getValues('title')) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      form.setValue('title', cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  }

  function handleReset() {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setFileError(null);
    form.reset({
      title: '',
      kind: 'other',
      reportDate: new Date().toISOString().split('T')[0],
      sensitivity: 'normal',
    });
  }

  async function onSubmit(values: DocumentUploadFormValues) {
    if (!selectedFile) {
      setFileError('Please select a file to upload.');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('circleId', circleId);
      formData.append('title', values.title);
      formData.append('kind', values.kind);
      if (values.reportDate) {
        formData.append('reportDate', values.reportDate);
      }
      formData.append('sensitivity', values.sensitivity);

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload document');
      }

      toast.success('Document uploaded securely to private vault');
      handleReset();
      onOpenChange(false);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!uploading) {
          if (!next) handleReset();
          onOpenChange(next);
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload Medical Document</DialogTitle>
          <DialogDescription>
            Prescriptions, lab reports, and discharge summaries stored securely in private cloud storage.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* File Picker / Dropzone */}
          {!selectedFile ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                isDragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/30 hover:border-muted-foreground/60'
              }`}
            >
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium">Drag & drop your medical document here</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Supports PDF, JPEG, PNG, HEIC up to 10 MB
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileText className="h-4 w-4 mr-1.5" />
                    Browse Files
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11"
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    <Camera className="h-4 w-4 mr-1.5" />
                    Take Photo
                  </Button>
                </div>

                {/* Hidden native inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/heic"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileSelection(e.target.files[0]);
                  }}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileSelection(e.target.files[0]);
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border p-4 bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-14 w-14 object-cover rounded-md border"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-md bg-red-100 dark:bg-red-950/40 border flex items-center justify-center text-red-600">
                    <FileText className="h-7 w-7" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type || 'Document'}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSelectedFile(null);
                  if (previewUrl) URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {fileError && (
            <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{fileError}</span>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-1.5">
            <Label htmlFor="doc-title">Document Title *</Label>
            <Input
              id="doc-title"
              placeholder="e.g. Complete Blood Count (CBC)"
              className="min-h-11"
              aria-invalid={form.formState.errors.title ? true : undefined}
              {...form.register('title')}
            />
            {form.formState.errors.title && (
              <p className="text-xs text-red-600 dark:text-red-400">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="doc-kind">Document Category</Label>
              <select
                id="doc-kind"
                className="w-full h-11 px-3 rounded-md border bg-background text-sm cursor-pointer"
                {...form.register('kind')}
              >
                <option value="prescription">Prescription</option>
                <option value="lab_report">Lab Report</option>
                <option value="discharge_summary">Discharge Summary</option>
                <option value="scan">Scan / X-Ray / MRI</option>
                <option value="insurance">Insurance Policy / Card</option>
                <option value="bill">Medical Bill / Receipt</option>
                <option value="other">Other Medical Record</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-report-date">Report / Prescription Date</Label>
              <Input
                id="doc-report-date"
                type="date"
                className="min-h-11"
                {...form.register('reportDate')}
              />
            </div>
          </div>

          {/* Sensitivity Setting */}
          <div className="space-y-2 rounded-xl border p-3.5 bg-muted/20">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Privacy & Sensitivity</Label>
              {sensitivity === 'restricted' ? (
                <span className="flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Restricted Document
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Standard Visibility
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => form.setValue('sensitivity', 'normal', { shouldDirty: true })}
                className={`p-3 rounded-lg border text-left cursor-pointer transition-colors ${
                  sensitivity === 'normal'
                    ? 'border-primary bg-primary/10 font-medium'
                    : 'border-border hover:bg-muted'
                }`}
              >
                <div className="font-semibold text-foreground">Normal</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Visible to all family members and caregivers in this circle.
                </div>
              </button>

              <button
                type="button"
                onClick={() => form.setValue('sensitivity', 'restricted', { shouldDirty: true })}
                className={`p-3 rounded-lg border text-left cursor-pointer transition-colors ${
                  sensitivity === 'restricted'
                    ? 'border-amber-500 bg-amber-500/10 font-medium'
                    : 'border-border hover:bg-muted'
                }`}
              >
                <div className="font-semibold text-amber-900 dark:text-amber-300">Restricted</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Hidden from view unless explicitly granted by Owner or Coordinator.
                </div>
              </button>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => {
                handleReset();
                onOpenChange(false);
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button type="submit" className="min-h-11" disabled={uploading}>
              {uploading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full" />
                  <span>Encrypting & Uploading...</span>
                </div>
              ) : (
                'Upload Document'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
