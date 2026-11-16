import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {
  validateAllowedExtension,
  verifyFileMagicBytes,
  inspectZipSafety,
  scanUploadedBuffer,
  MAX_ZIP_ENTRIES,
} from './uploadSecurity';

describe('Upload Security Hardening', () => {
  it('allows only supported academic document and image extensions and ignores browser MIME claims', () => {
    const pdf = validateAllowedExtension('lecture_notes.PDF');
    assert.strictEqual(pdf.ok, true);
    if (pdf.ok) assert.strictEqual(pdf.canonicalMimeType, 'application/pdf');

    const exe = validateAllowedExtension('payload.exe');
    assert.strictEqual(exe.ok, false);

    const html = validateAllowedExtension('page.html');
    assert.strictEqual(html.ok, false);

    const svg = validateAllowedExtension('icon.svg');
    assert.strictEqual(svg.ok, false);
  });

  it('verifies real file magic bytes and rejects spoofed extensions', async () => {
    const validPdf = await verifyFileMagicBytes(Buffer.from('%PDF-1.7\n1 0 obj\n', 'ascii'), '.pdf');
    assert.strictEqual(validPdf.ok, true);

    const fakePdf = await verifyFileMagicBytes(Buffer.from('MZ\x90\x00This is an exe', 'ascii'), '.pdf');
    assert.strictEqual(fakePdf.ok, false);

    const validPng = await verifyFileMagicBytes(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]), '.png');
    assert.strictEqual(validPng.ok, true);

    const fakePng = await verifyFileMagicBytes(Buffer.from('<html><script>alert(1)</script></html>'), '.png');
    assert.strictEqual(fakePng.ok, false);
  });

  it('blocks zip archives exceeding entry limits or containing VBA macros', async () => {
    const macroZip = new JSZip();
    macroZip.file('[Content_Types].xml', '<Types/>');
    macroZip.file('word/document.xml', '<w:document/>');
    macroZip.file('word/vbaProject.bin', 'macro-bytes');
    const macroBuf = await macroZip.generateAsync({ type: 'nodebuffer' });

    const macroCheck = await inspectZipSafety(macroBuf, 'docx');
    assert.strictEqual(macroCheck.ok, false);

    const bigZip = new JSZip();
    bigZip.file('[Content_Types].xml', '<Types/>');
    bigZip.file('word/document.xml', '<w:document/>');
    for (let i = 0; i < MAX_ZIP_ENTRIES + 5; i++) {
      bigZip.file(`word/item_${i}.txt`, 'x');
    }
    const bigBuf = await bigZip.generateAsync({ type: 'nodebuffer' });
    const bigCheck = await inspectZipSafety(bigBuf, 'docx');
    assert.strictEqual(bigCheck.ok, false);
  });

  it('marks valid DOCX clean and spoofed PDF blocked with SHA-256 digest', async () => {
    const cleanDocx = new JSZip();
    cleanDocx.file('[Content_Types].xml', '<Types/>');
    cleanDocx.file('word/document.xml', '<w:document><w:body><w:p><w:r><w:t>Hello</w:t></w:r></w:p></w:body></w:document>');
    const cleanBuf = await cleanDocx.generateAsync({ type: 'nodebuffer' });

    const cleanRes = await scanUploadedBuffer({ buffer: cleanBuf, fileName: 'essay.docx' });
    assert.strictEqual(cleanRes.scanStatus, 'clean');
    assert.strictEqual(cleanRes.canonicalMimeType, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    assert.strictEqual(cleanRes.sha256.length, 64);

    const blockedRes = await scanUploadedBuffer({
      buffer: Buffer.from('MZ_FAKE_PDF'),
      fileName: 'notes.pdf',
    });
    assert.strictEqual(blockedRes.scanStatus, 'blocked');
  });
});
