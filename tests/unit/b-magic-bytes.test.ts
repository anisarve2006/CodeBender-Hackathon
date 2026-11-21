import { describe, it, expect } from 'vitest';
import { detectMimeFromBytes } from '../../lib/utils/blob';

/** Minimal valid PNG: signature, IHDR (1x1), IEND. */
const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00,
  0x1f, 0x15, 0xc4, 0x89,
  0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a]);

const JPEG_BYTES = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
]);

/** Windows executable header ("MZ"), padded. Must be rejected whatever the file is named. */
const EXE_BYTES = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00]);

describe('detectMimeFromBytes', () => {
  it('accepts a real PNG by its magic bytes', async () => {
    expect(await detectMimeFromBytes(PNG_BYTES)).toBe('image/png');
  });

  it('accepts a PDF by its magic bytes', async () => {
    expect(await detectMimeFromBytes(PDF_BYTES)).toBe('application/pdf');
  });

  it('accepts a JPEG by its magic bytes', async () => {
    expect(await detectMimeFromBytes(JPEG_BYTES)).toBe('image/jpeg');
  });

  it('rejects an executable even when the upload is named .pdf', async () => {
    // The file name is never inspected; only the bytes decide.
    expect(await detectMimeFromBytes(EXE_BYTES)).toBeNull();
  });

  it('rejects unknown bytes', async () => {
    expect(await detectMimeFromBytes(new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04]))).toBeNull();
  });

  it('rejects an empty buffer', async () => {
    expect(await detectMimeFromBytes(new Uint8Array(0))).toBeNull();
  });
});
