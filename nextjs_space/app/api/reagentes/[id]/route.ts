import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function parseOptionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reagente = await prisma.reagenteEntrada.findUnique({
      where: { id: params.id },
      include: {
        reagente: {
          select: {
            nome: true,
            marca: true,
          },
        },
      },
    });

    if (!reagente) {
      return NextResponse.json({ error: 'Reagent not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      reagente: {
        id: reagente.id,
        codigo: reagente.codigoInterno,
        nome: reagente.reagente.nome,
        fabricante: reagente.fornecedor || reagente.marca || reagente.reagente.marca || '',
        quantidade: reagente.quantidade,
        quantidadeAtual: reagente.quantidadeAtual,
        unidade: reagente.unidade,
        dataValidade: reagente.dataValidade,
        lote: reagente.notaFiscal,
        cas: reagente.observacoes?.replace(/^CAS:\s*/i, '') || '',
        localizacao: reagente.localizacao,
        categoria: reagente.categoria,
        concentracao: reagente.concentracao,
        responsavel: reagente.responsavel,
      },
    });
  } catch (error: any) {
    console.error('Error fetching reagent:', error);
    return NextResponse.json(
      { error: error?.message || 'Error fetching reagent' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { category: true, name: true },
    });

    if (user?.category === 'IC') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const data = await request.json();

    const reagenteExistente = await prisma.reagenteEntrada.findUnique({
      where: { id: params.id },
      include: { reagente: true },
    });

    if (!reagenteExistente) {
      return NextResponse.json({ error: 'Reagent not found' }, { status: 404 });
    }

    const nome = String(data.nome ?? '').trim();
    const fabricante = String(data.fabricante ?? '').trim();

    if (!nome || !fabricante) {
      return NextResponse.json(
        { error: 'Name and brand/supplier are required' },
        { status: 400 }
      );
    }

    const quantidade = parseOptionalNumber(data.quantidade);
    const quantidadeAtual = parseOptionalNumber(data.quantidadeAtual);

    const dataValidade =
      data.dataValidade === null || data.dataValidade === '' || data.dataValidade === undefined
        ? null
        : new Date(data.dataValidade);

    const reagenteAtualizado = await prisma.$transaction(async (tx) => {
      await tx.reagente.update({
        where: { id: reagenteExistente.reagenteId },
        data: {
          nome,
          marca: fabricante,
          localidade:
            typeof data.localizacao === 'string'
              ? data.localizacao || null
              : reagenteExistente.localizacao,
          ultimaAtualizacao: new Date(),
        },
      });

      return tx.reagenteEntrada.update({
        where: { id: params.id },
        data: {
          fornecedor: fabricante,
          marca: fabricante,
          quantidade: quantidade ?? reagenteExistente.quantidade,
          quantidadeAtual: quantidadeAtual ?? (quantidade ?? reagenteExistente.quantidadeAtual),
          unidade:
            typeof data.unidade === 'string' && data.unidade.trim()
              ? data.unidade
              : reagenteExistente.unidade,
          dataValidade,
          notaFiscal: typeof data.lote === 'string' ? data.lote : reagenteExistente.notaFiscal,
          observacoes:
            typeof data.cas === 'string' && data.cas.trim()
              ? `CAS: ${data.cas.trim()}`
              : null,
          localizacao:
            typeof data.localizacao === 'string'
              ? data.localizacao || null
              : reagenteExistente.localizacao,
          categoria:
            typeof data.categoria === 'string'
              ? data.categoria || null
              : reagenteExistente.categoria,
          concentracao:
            typeof data.concentracao === 'string'
              ? data.concentracao || null
              : reagenteExistente.concentracao,
          responsavel:
            typeof data.responsavel === 'string' && data.responsavel.trim()
              ? data.responsavel.trim()
              : user?.name || reagenteExistente.responsavel,
        },
      });
    });

    return NextResponse.json({ success: true, reagente: reagenteAtualizado });
  } catch (error: any) {
    console.error('Error updating reagent:', error);
    return NextResponse.json(
      { error: error?.message || 'Error updating reagent' },
      { status: 500 }
    );
  }
}
