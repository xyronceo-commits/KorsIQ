import crypto from 'crypto';
import JSZip from 'jszip';

export type ScanStatus = 'scanning' | 'clean' | 'blocked';

export const ALLOWED_EXTENSION_MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.csv': 'text/csv',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

export const ALLOWED_BUCKET_MIME_TYPES = Array.from(new Set(Object.values(ALLOWED_EXTENSION_MIME_MAP)));

export const MAX_ZIP_ENTRIES = 1000;
export const MAX_ZIP_UNCOMPRESSED_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_ZIP_COMPRESSION_RATIO = 100;

export function getFileExtension(fileName: string): string {
  const clean = String(fileName || '').trim().toLowerCase();
  const lastDot = clean.lastIndexOf('.');
  if (lastDot < 0) return '';
  return clean.slice(lastDot);
}

export function validateAllowedExtension(
  fileName: string
): { ok: true; ext: string; canonicalMimeType: string } | { ok: false; error: string } {
  const ext = getFileExtension(fileName);
  const canonicalMimeType = ALLOWED_EXTENSION_MIME_MAP[ext];
  if (!ext || !canonicalMimeType) {
    return {
      ok: false,
      error: 'Unsupported file type. Allowed formats: PDF, Word (.docx), PowerPoint (.pptx), text (.txt, .md, .csv), and images (.png, .jpg, .webp, .gif).',
    };
  }
  return { ok: true, ext, canonicalMimeType };
}

function hasPrefix(buf: Buffer, bytes: number[], offset = 0): boolean {
  if (buf.length < offset + bytes.length) return false;
  for (let i = 0; i < bytes.length; i++) {
    if (buf[offset + i] !== bytes[i]) return false;
  }
  return true;
}

export async function inspectZipSafety(
  buffer: Buffer,
  expectedKind?: 'docx' | 'pptx'
): Promise<{ ok: true; entryCount: number; totalUncompressedBytes: number } | { ok: false; error: string }> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const names = Object.keys(zip.files);

    if (names.length > MAX_ZIP_ENTRIES) {
      return { ok: false, error: `Archive exceeds maximum entry count (${MAX_ZIP_ENTRIES}).` };
    }

    if (expectedKind) {
      const hasContentTypes = names.includes('[Content_Types].xml');
      const hasKindFolder = names.some((n) => n.startsWith(expectedKind === 'docx' ? 'word/' : 'ppt/'));
      if (!hasContentTypes || !hasKindFolder) {
        return { ok: false, error: `File does not appear to be a valid .${expectedKind} document.` };
      }
    }

    // Block embedded VBA macro binaries and executable/script payloads inside archives
    if (
      names.some((n) =>
        /vbaProject\.bin$/i.test(n) ||
        /\.(exe|dll|bat|cmd|ps1|vbs|js|msi|scr|hta)$/i.test(n)
      )
    ) {
      return { ok: false, error: 'Documents containing macros or executable payloads are blocked for security.' };
    }

    let declaredTotal = 0;
    let actualTotal = 0;

    for (const name of names) {
      const entry: any = zip.files[name];
      if (!entry || entry.dir) continue;

      const declaredUncompressed = Number(entry._data?.uncompressedSize) || 0;
      const declaredCompressed = Number(entry._data?.compressedSize) || 0;

      declaredTotal += declaredUncompressed;
      if (declaredTotal > MAX_ZIP_UNCOMPRESSED_BYTES) {
        return { ok: false, error: 'Archive unpacked size exceeds the 50 MB safety limit.' };
      }

      if (declaredCompressed > 0 && declaredUncompressed > 100 * 1024) {
        const ratio = declaredUncompressed / declaredCompressed;
        if (ratio > MAX_ZIP_COMPRESSION_RATIO) {
          return { ok: false, error: 'Archive compression ratio exceeds safety limits.' };
        }
      }

      // Stream-count actual decompressed bytes for ALL entries to defeat spoofed ZIP headers
      await new Promise<void>((resolve, reject) => {
        const stream = entry.internalStream('uint8array');
        let settled = false;
        stream.on('data', (chunk: Uint8Array) => {
          actualTotal += chunk.byteLength;
          if (actualTotal > MAX_ZIP_UNCOMPRESSED_BYTES && !settled) {
            settled = true;
            reject(new Error('Archive unpacked content exceeds the 50 MB safety limit.'));
          }
        });
        stream.on('end', () => {
          if (!settled) {
            settled = true;
            resolve();
          }
        });
        stream.on('error', (err: any) => {
          if (!settled) {
            settled = true;
            reject(err);
          }
        });
        stream.resume();
      });
    }

    return { ok: true, entryCount: names.length, totalUncompressedBytes: Math.max(declaredTotal, actualTotal) };
  } catch {
    return { ok: false, error: 'Could not verify archive structure. File may be corrupted.' };
  }
}

export async function verifyFileMagicBytes(
  buffer: Buffer,
  ext: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!buffer || buffer.length === 0) {
    return { ok: false, error: 'Uploaded file is empty.' };
  }

  switch (ext) {
    case '.pdf': {
      // %PDF- within first 1024 bytes
      const head = buffer.subarray(0, Math.min(1024, buffer.length)).toString('ascii');
      if (!head.includes('%PDF-')) {
        return { ok: false, error: 'File content does not match PDF signature (%PDF-).' };
      }
      return { ok: true };
    }
    case '.png': {
      if (!hasPrefix(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
        return { ok: false, error: 'File content does not match PNG signature.' };
      }
      return { ok: true };
    }
    case '.jpg':
    case '.jpeg': {
      if (!hasPrefix(buffer, [0xff, 0xd8, 0xff])) {
        return { ok: false, error: 'File content does not match JPEG signature.' };
      }
      return { ok: true };
    }
    case '.gif': {
      const sig = buffer.subarray(0, 6).toString('ascii');
      if (sig !== 'GIF87a' && sig !== 'GIF89a') {
        return { ok: false, error: 'File content does not match GIF signature.' };
      }
      return { ok: true };
    }
    case '.webp': {
      if (
        buffer.length < 12 ||
        buffer.subarray(0, 4).toString('ascii') !== 'RIFF' ||
        buffer.subarray(8, 12).toString('ascii') !== 'WEBP'
      ) {
        return { ok: false, error: 'File content does not match WebP signature.' };
      }
      return { ok: true };
    }
    case '.docx':
    case '.pptx': {
      if (!hasPrefix(buffer, [0x50, 0x4b, 0x03, 0x04]) && !hasPrefix(buffer, [0x50, 0x4b, 0x05, 0x06])) {
        return { ok: false, error: `File content does not match ${ext} archive signature.` };
      }
      const zipCheck = await inspectZipSafety(buffer, ext === '.docx' ? 'docx' : 'pptx');
      if (zipCheck.ok === false) {
        return { ok: false, error: zipCheck.error };
      }
      return { ok: true };
    }
    case '.txt':
    case '.md':
    case '.csv': {
      const sample = buffer.subarray(0, Math.min(8192, buffer.length));
      // Reject common binary / executable signatures
      if (
        hasPrefix(sample, [0x4d, 0x5a]) || // MZ (PE executable)
        hasPrefix(sample, [0x7f, 0x45, 0x4c, 0x46]) || // ELF
        hasPrefix(sample, [0x25, 0x50, 0x44, 0x46]) || // %PDF
        hasPrefix(sample, [0x50, 0x4b, 0x03, 0x04]) // ZIP
      ) {
        return { ok: false, error: 'Binary content is not allowed in plain text files.' };
      }
      // Reject NUL bytes unless UTF-16 BOM is present
      const hasUtf16Bom =
        hasPrefix(sample, [0xff, 0xfe]) || hasPrefix(sample, [0xfe, 0xff]);
      if (!hasUtf16Bom && sample.includes(0x00)) {
        return { ok: false, error: 'Text file contains invalid binary bytes.' };
      }
      return { ok: true };
    }
    default:
      return { ok: false, error: 'Unsupported file type.' };
  }
}

export async function scanUploadedBuffer(params: {
  buffer: Buffer;
  fileName: string;
  virusTotalApiKey?: string;
}): Promise<{
  scanStatus: ScanStatus;
  sha256: string;
  provider: string;
  detail: string;
  canonicalMimeType?: string;
}> {
  const sha256 = crypto.createHash('sha256').update(params.buffer).digest('hex');

  const extCheck = validateAllowedExtension(params.fileName);
  if (extCheck.ok === false) {
    return {
      scanStatus: 'blocked',
      sha256,
      provider: 'local_signature_check',
      detail: extCheck.error,
    };
  }

  const sigCheck = await verifyFileMagicBytes(params.buffer, extCheck.ext);
  if (sigCheck.ok === false) {
    return {
      scanStatus: 'blocked',
      sha256,
      provider: 'local_signature_check',
      detail: sigCheck.error,
      canonicalMimeType: extCheck.canonicalMimeType,
    };
  }

  // Optional VirusTotal SHA-256 hash lookup when VIRUSTOTAL_API_KEY is configured
  const vtKey = params.virusTotalApiKey?.trim();
  if (vtKey) {
    const vtController = new AbortController();
    const vtTimer = setTimeout(() => vtController.abort(), 5000);
    try {
      const vtRes = await fetch(`https://www.virustotal.com/api/v3/files/${sha256}`, {
        headers: { 'x-apikey': vtKey },
        signal: vtController.signal,
      });
      if (vtRes.ok) {
        const vtJson: any = await vtRes.json().catch(() => ({}));
        const stats = vtJson?.data?.attributes?.last_analysis_stats;
        const malicious = Number(stats?.malicious || 0);
        const suspicious = Number(stats?.suspicious || 0);
        if (malicious > 0 || suspicious > 2) {
          return {
            scanStatus: 'blocked',
            sha256,
            provider: 'virustotal',
            detail: `Flagged by antivirus (${malicious} malicious, ${suspicious} suspicious).`,
            canonicalMimeType: extCheck.canonicalMimeType,
          };
        }
        return {
          scanStatus: 'clean',
          sha256,
          provider: 'virustotal',
          detail: 'Verified clean via VirusTotal hash check and local signature verification.',
          canonicalMimeType: extCheck.canonicalMimeType,
        };
      }
    } catch {
      // Non-fatal if VT is unreachable or times out; fall through to local signature result
    } finally {
      clearTimeout(vtTimer);
    }
  }

  return {
    scanStatus: 'clean',
    sha256,
    provider: 'local_signature_check',
    detail: 'Verified clean via file signature and archive safety checks.',
    canonicalMimeType: extCheck.canonicalMimeType,
  };
}
