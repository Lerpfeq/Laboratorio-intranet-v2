import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import os from 'os';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const tmpDir = path.join(os.tmpdir(), 'rembg-' + Date.now());

  try {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/bmp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Supported: PNG, JPEG, WebP, BMP' },
        { status: 400 }
      );
    }

    // Max 10MB per image
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Max 10MB per image.' },
        { status: 400 }
      );
    }

    // Create temp dir
    if (!existsSync(tmpDir)) {
      mkdirSync(tmpDir, { recursive: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const inputPath = path.join(tmpDir, 'input.png');
    const outputPath = path.join(tmpDir, 'output.png');

    writeFileSync(inputPath, buffer);

    // Run rembg
    try {
      execSync(`python3 -c "
from rembg import remove
from PIL import Image
import io

with open('${inputPath}', 'rb') as f:
    input_data = f.read()

output_data = remove(input_data)

with open('${outputPath}', 'wb') as f:
    f.write(output_data)
"`, {
        timeout: 45000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (execError: any) {
      console.error('rembg error:', execError?.stderr?.toString() || execError.message);
      return NextResponse.json(
        { error: 'Background removal failed. Please try again.' },
        { status: 500 }
      );
    }

    if (!existsSync(outputPath)) {
      return NextResponse.json(
        { error: 'Processing failed - no output generated' },
        { status: 500 }
      );
    }

    const outputBuffer = readFileSync(outputPath);
    const base64 = outputBuffer.toString('base64');

    // Cleanup
    try {
      unlinkSync(inputPath);
      unlinkSync(outputPath);
    } catch {}

    return NextResponse.json({
      success: true,
      image: `data:image/png;base64,${base64}`,
      originalName: file.name,
    });
  } catch (error: any) {
    console.error('Remove background error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  } finally {
    // Cleanup temp dir
    try {
      if (existsSync(tmpDir)) {
        const files = require('fs').readdirSync(tmpDir);
        for (const f of files) {
          unlinkSync(path.join(tmpDir, f));
        }
        require('fs').rmdirSync(tmpDir);
      }
    } catch {}
  }
}


