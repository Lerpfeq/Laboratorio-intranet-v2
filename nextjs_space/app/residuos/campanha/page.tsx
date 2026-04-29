'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type UserInfo = {
  id: string;
  name: string | null;
  email: string | null;
  category: string | null;
  status: string;
};

type Residuo = {
  id: string;
  numeroRecipiente: number;
  composicao: string;
  classe: string;
  estado: string;
  tipoRecipiente: string;
  volumeRecipienteLitros: number;
  departamento: string;
  responsavel: string;
  createdAt: string;
};

function downloadBase64(base64: string, filename: string, mimeType: string) {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i += 1) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const blob = new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function CampanhaResiduosPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();

  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingRows, setLoadingRows] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);

  const [residuos, setResiduos] = useState<Residuo[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<string[]>([]);
  const [volumeAtual, setVolumeAtual] = useState<Record<string, string>>({});

  const [departamento, setDepartamento] = useState('');
  const [responsavelInformacoes, setResponsavelInformacoes] = useState('');
  const [dataCampanha, setDataCampanha] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) throw new Error('Falha ao carregar usuário');
        const data = await response.json();
        setUser(data);
        setResponsavelInformacoes(data?.name || data?.email || '');
      } catch (error: any) {
        toast.error(error?.message || 'Erro ao carregar usuário');
      } finally {
        setLoadingUser(false);
      }
    }

    if (session?.user?.id) fetchUser();
  }, [session]);

  const loadResiduos = async () => {
    setLoadingRows(true);
    try {
      const response = await fetch('/api/residuos');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Erro ao listar resíduos');
      }
      setResiduos(data);
      if (data.length > 0) {
        setDepartamento((prev) => prev || data[0]?.departamento || '');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao listar resíduos');
    } finally {
      setLoadingRows(false);
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      loadResiduos();
    }
  }, [session]);

  const ordinalById = useMemo(() => {
    const map: Record<string, number> = {};
    selectedOrder.forEach((id, index) => {
      map[id] = index + 1;
    });
    return map;
  }, [selectedOrder]);

  const toggleSelection = (id: string, checked: boolean) => {
    setSelectedOrder((prev) => {
      if (checked) {
        if (prev.includes(id)) return prev;
        return [...prev, id];
      }
      return prev.filter((item) => item !== id);
    });
  };

  const processarCampanha = async () => {
    if (selectedOrder.length === 0) {
      toast.error('Selecione ao menos um frasco para a campanha.');
      return;
    }

    const itens = selectedOrder.map((id) => ({
      id,
      volumeAtualLitros: Number(volumeAtual[id]),
    }));

    if (itens.some((item) => !Number.isFinite(item.volumeAtualLitros) || item.volumeAtualLitros < 0)) {
      toast.error('Informe um volume atual válido (em L) para todos os frascos selecionados.');
      return;
    }

    setProcessing(true);

    try {
      const response = await fetch('/api/residuos/campanha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departamento,
          responsavelInformacoes,
          data: dataCampanha,
          itens,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Falha ao processar campanha');
      }

      downloadBase64(data.excelBase64, data.excelFileName, 'application/vnd.ms-excel');
      downloadBase64(data.etiquetasPdfBase64, data.etiquetasPdfFileName, 'application/pdf');

      toast.success(
        `Campanha concluída: ${data.totalItens} frascos processados, planilha e etiquetas geradas, e itens removidos da base.`
      );

      setSelectedOrder([]);
      setVolumeAtual({});
      await loadResiduos();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao processar campanha');
    } finally {
      setProcessing(false);
    }
  };

  if (status === 'loading' || loadingUser) {
    return <div style={{ padding: '2rem' }}>Carregando...</div>;
  }

  return (
    <div>
      <header className="header">
        <div className="header-container">
          <div className="logo-section">
            <div style={{ position: 'relative', width: '40px', height: '40px' }}>
              <Image src="/logo.png" alt="LERP Logo" fill style={{ objectFit: 'contain' }} />
            </div>
            <div className="logo-text"><h1>LERP</h1></div>
          </div>
          <nav className="nav-tabs">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/residuos">Resíduos</Link>
            <Link href="/residuos/cadastro">Cadastro</Link>
          </nav>
          <div className="user-menu">
            <span>{user?.name || user?.email}</span>
            <button onClick={() => router.push('/api/auth/signout')}>Sair</button>
          </div>
        </div>
      </header>

      <main className="container space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="page-title !mb-0">Campanha de Recolhimento</h2>
          <Link href="/residuos/cadastro"><Button>Ir para cadastro</Button></Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dados da campanha</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="departamento">Departamento</Label>
              <Input
                id="departamento"
                value={departamento}
                onChange={(event) => setDepartamento(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsavelInfo">Responsável pelas informações</Label>
              <Input
                id="responsavelInfo"
                value={responsavelInformacoes}
                onChange={(event) => setResponsavelInformacoes(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataCampanha">Data</Label>
              <Input
                id="dataCampanha"
                type="date"
                value={dataCampanha}
                onChange={(event) => setDataCampanha(event.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Frascos disponíveis para recolhimento</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRows ? (
              <p className="text-sm text-muted-foreground">Carregando frascos...</p>
            ) : residuos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Não há frascos cadastrados no momento.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Selecionar</TableHead>
                    <TableHead>Ordinal</TableHead>
                    <TableHead>Nº recipiente</TableHead>
                    <TableHead>Composição</TableHead>
                    <TableHead>Classe</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Tipo recipiente</TableHead>
                    <TableHead>Volume atual (L)</TableHead>
                    <TableHead>Volume recipiente (L)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {residuos.map((residuo) => {
                    const selected = selectedOrder.includes(residuo.id);
                    return (
                      <TableRow key={residuo.id}>
                        <TableCell>
                          <Checkbox
                            checked={selected}
                            onCheckedChange={(checked) => toggleSelection(residuo.id, Boolean(checked))}
                          />
                        </TableCell>
                        <TableCell>{selected ? ordinalById[residuo.id] : '-'}</TableCell>
                        <TableCell>{residuo.numeroRecipiente}</TableCell>
                        <TableCell className="max-w-[360px] whitespace-normal">{residuo.composicao}</TableCell>
                        <TableCell>{residuo.classe}</TableCell>
                        <TableCell>{residuo.estado}</TableCell>
                        <TableCell>{residuo.tipoRecipiente}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            disabled={!selected}
                            value={volumeAtual[residuo.id] || ''}
                            onChange={(event) =>
                              setVolumeAtual((prev) => ({ ...prev, [residuo.id]: event.target.value }))
                            }
                            placeholder="0.00"
                          />
                        </TableCell>
                        <TableCell>{residuo.volumeRecipienteLitros}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button disabled={processing || selectedOrder.length === 0} onClick={processarCampanha}>
            {processing ? 'Processando...' : 'Gerar planilha + etiquetas e finalizar campanha'}
          </Button>
          <p className="text-sm text-muted-foreground">
            A numeração ordinal reinicia em 1 a cada campanha e será idêntica na planilha e nas etiquetas.
          </p>
        </div>
      </main>
    </div>
  );
}
