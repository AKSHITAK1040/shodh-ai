import { NextRequest, NextResponse } from 'next/server';

interface RouteContext {
  params: Promise<{ path?: string[] }>;
}

async function handleProxy(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const targetPath = (path || []).join('/');
  const search = request.nextUrl.search;

  const targetCandidates = [
    process.env.AI_SERVICE_URL,
    'http://ai-service:3002',
    'http://127.0.0.1:3002',
    'http://localhost:3002',
  ].filter(Boolean) as string[];

  const uniqueTargets = Array.from(new Set(targetCandidates));

  const reqHeaders = new Headers(request.headers);
  reqHeaders.delete('host');
  reqHeaders.delete('connection');
  reqHeaders.delete('content-length');

  let body: BodyInit | null = null;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = await request.arrayBuffer();
  }

  let lastError: any = null;

  for (const base of uniqueTargets) {
    try {
      const destUrl = `${base.replace(/\/$/, '')}/${targetPath}${search}`;
      const response = await fetch(destUrl, {
        method: request.method,
        headers: reqHeaders,
        body,
        cache: 'no-store',
      });

      const resHeaders = new Headers(response.headers);
      resHeaders.delete('transfer-encoding');
      resHeaders.delete('content-encoding');

      const resBody = await response.arrayBuffer();
      return new NextResponse(resBody, {
        status: response.status,
        statusText: response.statusText,
        headers: resHeaders,
      });
    } catch (err: any) {
      lastError = err;
      continue;
    }
  }

  console.error('[AI Service Proxy] All targets failed for path:', targetPath, lastError);
  return NextResponse.json(
    { message: `Failed to proxy to AI service: ${lastError?.message || 'Connection refused'}` },
    { status: 502 }
  );
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
export const PATCH = handleProxy;
export const OPTIONS = handleProxy;
