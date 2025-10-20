// src/app/api/upload-video/route.ts
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic'; // ensure Node runtime
export const runtime = 'nodejs';

function makeSafe(name: string) {
  return name.replace(/[^\w.\-]+/g, '_');
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const userId = String(form.get('userId') || 'anonymous');

    if (!file) {
      return NextResponse.json({ ok: false, error: 'No file provided.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const stamp = Date.now();
    const safeName = makeSafe(file.name || 'video.mp4');
    const relDir = path.join('videos', userId);
    const relPath = path.join(relDir, `${stamp}_${safeName}`);
    const absDir = path.join(process.cwd(), 'public', relDir);
    const absPath = path.join(process.cwd(), 'public', relPath);

    // Ensure directory exists
    await fs.mkdir(absDir, { recursive: true });
    // Write file
    await fs.writeFile(absPath, buffer);

    const publicURL = `/${relPath}`; // served from /public

    return NextResponse.json({
      ok: true,
      videoURL: publicURL,
      storagePath: relPath,
    });
  } catch (err: any) {
    console.error('Upload error:', err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'Upload failed.' },
      { status: 500 }
    );
  }
}
