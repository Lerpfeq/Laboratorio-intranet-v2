import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink, readFile } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export const maxDuration = 60;

// Function to remove background using rembg (FREE)
async function removeBackgroundWithRembg(inputPath: string, outputPath: string): Promise<void> {
  try {
    // Tentar usar rembg instalado via pip
    await execAsync(`python3 -m rembg i "${inputPath}" "${outputPath}"`, {
      timeout: 60000, // 60 segundos timeout
      maxBuffer: 50 * 1024 * 1024 // 50MB buffer
    });
  } catch (error: any) {
    // If rembg doesn't work, try alternative
    throw new Error(`rembg failed: ${error.message}`);
  }
}

// Alternative function using Remove.bg API (free trial, then paid)
async function removeBackgroundWithAPI(inputBuffer: Buffer): Promise<Buffer> {
  const REMOVE_BG_API_KEY = process.env.REMOVE_BG_API_KEY;

  if (!REMOVE_BG_API_KEY) {
    throw new Error('Remove.bg API key not configured');
  }

  const formData = new FormData();
  formData.append('image_file', new Blob([inputBuffer]), 'image.png');
  formData.append('size', 'auto');

  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: {
      'X-Api-Key': REMOVE_BG_API_KEY,
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Remove.bg API error: ${error}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function POST(request: NextRequest) {
  let inputPath: string | null = null;
  let outputPath: string | null = null;

  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Validar tipo de imagem
    if (!image.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validar tamanho (max 10MB)
    if (image.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large (max 10MB)' }, { status: 400 });
    }

    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    inputPath = `/tmp/input_${timestamp}_${randomId}.png`;
    outputPath = `/tmp/output_${timestamp}_${randomId}.png`;

    await writeFile(inputPath, buffer);

    let processedBuffer: Buffer;
    let base64: string;

    try {
      // Try method 1: rembg (FREE, local)
      console.log('[BG Removal] Trying rembg...');
      await removeBackgroundWithRembg(inputPath, outputPath);
      processedBuffer = await readFile(outputPath);
      base64 = processedBuffer.toString('base64');
      console.log('[BG Removal] Success with rembg');

    } catch (rembgError: any) {
      console.log('[BG Removal] rembg failed:', rembgError.message);

      // Method 2: Remove.bg API (free trial, then paid)
      if (process.env.REMOVE_BG_API_KEY) {
        console.log('[BG Removal] Trying Remove.bg API...');
        processedBuffer = await removeBackgroundWithAPI(buffer);
        base64 = processedBuffer.toString('base64');
        console.log('[BG Removal] Success with Remove.bg API');
      } else {
        // If no method works
        return NextResponse.json({
          error: 'Background removal service not available',
          details: 'rembg is not installed and no Remove.bg API key is configured.',
          instructions: 'Run: pip install rembg[cpu] onnxruntime'
        }, { status: 503 });
      }
    }

    // Clean up temporary files
    if (inputPath) await unlink(inputPath).catch(() => {});
    if (outputPath) await unlink(outputPath).catch(() => {});

    return NextResponse.json({
      success: true,
      image: `data:image/png;base64,${base64}`,
      originalName: image.name,
    });

  } catch (error: any) {
    // Limpar arquivos em caso de erro
    if (inputPath) await unlink(inputPath).catch(() => {});
    if (outputPath) await unlink(outputPath).catch(() => {});

    console.error('[BG Removal] Error:', error);

    return NextResponse.json({
      error: 'Failed to process image',
      details: error.message,
      suggestion: 'Try with a smaller image or contact support'
    }, { status: 500 });
  }
}

// Health check
export async function GET() {
  try {
    // Check if rembg is available
    const { stdout } = await execAsync('python3 -c "import rembg; print(rembg.__version__)"', {
      timeout: 5000
    });

    return NextResponse.json({
      status: 'ready',
      method: 'rembg',
      version: stdout.trim(),
      cost: 'FREE'
    });
  } catch {
    // If rembg is not available
    const hasAPIKey = !!process.env.REMOVE_BG_API_KEY;

    return NextResponse.json({
      status: hasAPIKey ? 'api-fallback' : 'unavailable',
      method: hasAPIKey ? 'Remove.bg API' : 'none',
      rembgInstalled: false,
      apiKeyConfigured: hasAPIKey,
      cost: hasAPIKey ? 'PAID (after trial)' : 'N/A',
      installation: 'pip install rembg[cpu] onnxruntime'
    }, { status: hasAPIKey ? 200 : 503 });
  }
}
