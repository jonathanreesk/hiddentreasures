import type { APIRoute } from 'astro';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { env, EDIT_COOKIE, validSession } from '../../lib/edit-session';

// Lets logged-in staff upload video files straight from their browser to Vercel Blob storage.
// Videos are too big to pass through a server function, so the browser uploads directly
// using a short-lived token from here. Needs a Blob store connected to the Vercel project
// (Vercel > Storage > Create > Blob), which adds BLOB_READ_WRITE_TOKEN automatically.
export const prerender = false;

// Quick check the page uses before uploading
export const GET: APIRoute = async () =>
  new Response(JSON.stringify({ ready: !!env('BLOB_READ_WRITE_TOKEN') }), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!env('BLOB_READ_WRITE_TOKEN')) {
    return new Response(JSON.stringify({ error: 'Video uploads are not switched on yet. Ask Jonathan to connect Vercel Blob storage.' }), { status: 503, headers: { 'content-type': 'application/json' } });
  }
  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      token: env('BLOB_READ_WRITE_TOKEN'),
      onBeforeGenerateToken: async (pathname) => {
        // Only logged-in staff, only videos, only into the videos folder
        if (!validSession(cookies.get(EDIT_COOKIE)?.value)) throw new Error('Please log in again.');
        if (!pathname.startsWith('videos/')) throw new Error('Bad upload');
        return {
          allowedContentTypes: ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'],
          maximumSizeInBytes: 500 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {},
    });
    return new Response(JSON.stringify(result), { headers: { 'content-type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Upload failed' }), { status: 400, headers: { 'content-type': 'application/json' } });
  }
};
