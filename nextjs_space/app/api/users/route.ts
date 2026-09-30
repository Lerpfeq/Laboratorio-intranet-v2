import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET - Lightweight list of approved users.
 *
 * Accessible to ANY authenticated user (not admin-only). This is needed so that
 * equipment managers (responsáveis) can pick internal users when booking on
 * their behalf, without exposing the full admin users endpoint.
 * Returns only minimal, non-sensitive fields.
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      where: { status: 'approved' },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(users);
  } catch (error: any) {
    console.error('Error fetching users list:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
