// Legacy route - redirects to new /api/agendamentos
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Redirect to new API
  const url = new URL('/api/agendamentos', request.url);
  return NextResponse.redirect(url);
}

export async function POST(request: NextRequest) {
  const url = new URL('/api/agendamentos', request.url);
  return NextResponse.redirect(url, { status: 307 });
}
