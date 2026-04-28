'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CLASSE_RESIDUO_VALUES } from '@/lib/residuos';

type UserInfo = {
  id: string;
  name: string | null;
  email: string | null;
  category: string | null;
  status: string;
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

export default function CadastroResiduoPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();

  const [loadingUser, setLoadingUser] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);

  const [form, setForm] = useState({
    composicao: '',
    classe: 'OH',
    estado: 'L',
    tipoRecipiente: '',
    volumeRecipienteLitros: '',
    responsavel: '',
    departamento: '',
    data: new Date().toISOString().slice(0, 10),
    ph: '',
    observacoes: '',
    halogenadosPercentual: '',
    acetonitrilaPercentual: '',
    metaisPesadosPercentual: '',
    presencaEnxofre: false,
    geradorCianetos: false,
    aminas: false,
  });

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
        setForm((prev) => ({
          ...prev,
          responsavel: data?.name || data?.email || '',
        }));
      } catch (error: any) {
        toast.error(error?.message || 'Erro ao carregar usuário');
      } finally {
        setLoadingUser(false);
      }
    }

    if (session?.user?.id) {
      fetchUser();
    }
  }, [session]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      const response = await fetch('/api/residuos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          composicao: form.composicao,
          classe: form.classe,
          estado: form.estado,
          tipoRecipiente: form.tipoRecipiente,
          volumeRecipienteLitros: Number(form.volumeRecipienteLitros),
          responsavel: form.responsavel,
          departamento: form.departamento,
          data: form.data,
          ph: form.ph ? Number(form.ph) : null,
          observacoes: form.observacoes,
          halogenadosPercentual: form.halogenadosPercentual ? Number(form.halogenadosPercentual) : null,
          acetonitrilaPercentual: form.acetonitrilaPercentual ? Number(form.acetonitrilaPercentual) : null,
          metaisPesadosPercentual: form.metaisPesadosPercentual ? Number(form.metaisPesadosPercentual) : null,
          presencaEnxofre: form.presencaEnxofre,
          geradorCianetos: form.geradorCianetos,
          aminas: form.aminas,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Falha ao cadastrar resíduo');
      }

      downloadBase64(data.etiquetaPdfBase64, data.etiquetaFileName, 'application/pdf');
      toast.success(`Resíduo #${data.residuo.numeroRecipiente} cadastrado e etiqueta gerada.`);

      setForm((prev) => ({
        ...prev,
        composicao: '',
        tipoRecipiente: '',
        volumeRecipienteLitros: '',
        ph: '',
        observacoes: '',
        halogenadosPercentual: '',
        acetonitrilaPercentual: '',
        metaisPesadosPercentual: '',
        presencaEnxofre: false,
        geradorCianetos: false,
        aminas: false,
      }));
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao cadastrar resíduo');
    } finally {
      setSaving(false);
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
            <Link href="/residuos/campanha">Campanha</Link>
          </nav>
          <div className="user-menu">
            <span>{user?.name || user?.email}</span>
            <button onClick={() => router.push('/api/auth/signout')}>Sair</button>
          </div>
        </div>
      </header>

      <main className="container space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="page-title !mb-0">Cadastro de Resíduo</h2>
          <div className="flex gap-2">
            <Link href="/residuos"><Button variant="outline">Voltar</Button></Link>
            <Link href="/residuos/campanha"><Button>Ir para campanha</Button></Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Modelo de etiqueta de referência</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-xs border rounded p-2">
              <Image
                src="/etiqueta-residuo-modelo.jpeg"
                width={340}
                height={220}
                alt="Modelo de etiqueta de resíduo"
                style={{ width: '100%', height: 'auto' }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dados do frasco</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="composicao">Composição do resíduo</Label>
                  <Textarea
                    id="composicao"
                    value={form.composicao}
                    onChange={(event) => setForm((prev) => ({ ...prev, composicao: event.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="classe">Classe</Label>
                  <select
                    id="classe"
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={form.classe}
                    onChange={(event) => setForm((prev) => ({ ...prev, classe: event.target.value }))}
                    required
                  >
                    {CLASSE_RESIDUO_VALUES.map((classe) => (
                      <option key={classe} value={classe}>
                        {classe === 'INORGANICO' ? 'Inorgânico' : classe}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <select
                    id="estado"
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={form.estado}
                    onChange={(event) => setForm((prev) => ({ ...prev, estado: event.target.value }))}
                    required
                  >
                    <option value="S">Sólido (S)</option>
                    <option value="L">Líquido (L)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipoRecipiente">Tipo de recipiente</Label>
                  <Input
                    id="tipoRecipiente"
                    value={form.tipoRecipiente}
                    onChange={(event) => setForm((prev) => ({ ...prev, tipoRecipiente: event.target.value }))}
                    placeholder="Ex.: Frasco de vidro"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="volumeRecipiente">Volume do recipiente (L)</Label>
                  <Input
                    id="volumeRecipiente"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.volumeRecipienteLitros}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, volumeRecipienteLitros: event.target.value }))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsavel">Responsável</Label>
                  <Input
                    id="responsavel"
                    value={form.responsavel}
                    onChange={(event) => setForm((prev) => ({ ...prev, responsavel: event.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="departamento">Departamento</Label>
                  <Input
                    id="departamento"
                    value={form.departamento}
                    onChange={(event) => setForm((prev) => ({ ...prev, departamento: event.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data">Data</Label>
                  <Input
                    id="data"
                    type="date"
                    value={form.data}
                    onChange={(event) => setForm((prev) => ({ ...prev, data: event.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ph">pH</Label>
                  <Input
                    id="ph"
                    type="number"
                    min="0"
                    max="14"
                    step="0.1"
                    value={form.ph}
                    onChange={(event) => setForm((prev) => ({ ...prev, ph: event.target.value }))}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={form.observacoes}
                    onChange={(event) => setForm((prev) => ({ ...prev, observacoes: event.target.value }))}
                  />
                </div>
              </div>

              <div className="border rounded-md">
                <div className="bg-muted px-4 py-2 text-sm font-semibold">Tabela de composição detalhada</div>
                <div className="p-4 grid gap-3">
                  <div className="grid grid-cols-2 gap-3 items-center">
                    <Label htmlFor="halogenados">Halogenados (%)</Label>
                    <Input
                      id="halogenados"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={form.halogenadosPercentual}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, halogenadosPercentual: event.target.value }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 items-center">
                    <Label htmlFor="acetonitrila">Acetonitrila (%)</Label>
                    <Input
                      id="acetonitrila"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={form.acetonitrilaPercentual}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, acetonitrilaPercentual: event.target.value }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 items-center">
                    <Label htmlFor="metaisPesados">Metais Pesados (%)</Label>
                    <Input
                      id="metaisPesados"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={form.metaisPesadosPercentual}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, metaisPesadosPercentual: event.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="border rounded-md">
                <div className="bg-muted px-4 py-2 text-sm font-semibold">Checklists de segurança</div>
                <div className="p-4 grid gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.presencaEnxofre}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({ ...prev, presencaEnxofre: Boolean(checked) }))
                      }
                    />
                    Presença de enxofre/substâncias sulfuradas
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.geradorCianetos}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({ ...prev, geradorCianetos: Boolean(checked) }))
                      }
                    />
                    Gerador de cianetos
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.aminas}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({ ...prev, aminas: Boolean(checked) }))
                      }
                    />
                    Aminas
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button disabled={saving} type="submit">
                  {saving ? 'Salvando...' : 'Cadastrar e gerar etiqueta PDF'}
                </Button>
                <p className="text-sm text-muted-foreground self-center">
                  A etiqueta é gerada com marca d'água "WASTE", ícone ⚠️ e aviso de 75% do volume.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
