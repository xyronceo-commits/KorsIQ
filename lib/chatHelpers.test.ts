import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import { buildStudentContext } from './studentContext';

// 1. Empty / partial student context never throws
{
  const emptyCtx = buildStudentContext(null, []);
  assert.ok(emptyCtx.includes('No specific courses currently registered.'));
  assert.ok(emptyCtx.includes('General University Academic Studies'));

  const partialCtx = buildStudentContext(
    { department: 'Computer Science' },
    [null as any, undefined as any, { code: 'CSC 201', title: 'Data Structures', units: 3 }, { code: '', title: '' }]
  );
  assert.ok(partialCtx.includes('CSC 201: Data Structures (3 Units)'));
  assert.ok(partialCtx.includes('COURSE: Untitled Course'));
}

// 2. Express 5 + Node SSE disconnect guard: res.on('close') with !res.writableEnded does NOT abort on POST
{
  const app = express();
  app.use(express.json());

  app.post('/api/test-chat-stream', async (_req, res) => {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.flushHeaders?.();

    const controller = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) controller.abort();
    });

    res.write(`event: stage\ndata: ${JSON.stringify({ stage: 'generating', label: 'Writing response...' })}\n\n`);
    await new Promise((r) => setTimeout(r, 80));

    if (controller.signal.aborted) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: 'Premature abort', status: 500, code: 'PREMATURE_ABORT' })}\n\n`);
      res.end();
      return;
    }

    res.write(`event: token\ndata: ${JSON.stringify({ text: 'Hello ' })}\n\n`);
    res.write(`event: token\ndata: ${JSON.stringify({ text: 'scholar!' })}\n\n`);
    res.write(`event: done\ndata: ${JSON.stringify({ text: 'Hello scholar!' })}\n\n`);
    res.end();
  });

  app.post('/api/test-chat-error', (_req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests. Please try again in a minute.',
      code: 'AI_RATE_LIMITED',
    });
  });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  try {
    // Happy path SSE stream
    const resp = await fetch(`${baseUrl}/api/test-chat-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Explain Big-O notation' }),
    });
    assert.equal(resp.status, 200);
    const body = await resp.text();
    assert.ok(body.includes('event: token'));
    assert.ok(body.includes('Hello scholar!'));
    assert.ok(!body.includes('PREMATURE_ABORT'));

    // 429 Error surfacing
    const errResp = await fetch(`${baseUrl}/api/test-chat-error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hi' }),
    });
    assert.equal(errResp.status, 429);
    const errJson = await errResp.json();
    assert.equal(errJson.code, 'AI_RATE_LIMITED');
  } finally {
    server.closeAllConnections?.();
    server.close();
  }
}

console.log('All chatHelpers tests passed!');
