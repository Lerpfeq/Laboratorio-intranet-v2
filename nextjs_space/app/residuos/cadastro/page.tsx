'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';

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
  const [message, setMessage] = useState('');

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
      } catch (error) {
        console.error('Erro ao carregar usuário:', error);
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
    setMessage('');

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
      setMessage(`Resíduo #${data.residuo.numeroRecipiente} cadastrado com sucesso e etiqueta gerada.`);

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
      setMessage(error?.message || 'Erro ao cadastrar resíduo');
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
            <Link href="/residuos/cadastro">Cadastro</Link>
            <Link href="/residuos/campanha">Campanha</Link>
          </nav>
          <div className="user-menu">
            <span>{user?.name || user?.email}</span>
            <button onClick={() => router.push('/api/auth/signout')}>Sair</button>
          </div>
        </div>
      </header>

      <main className="container">
        <h2 className="page-title">Cadastro de Resíduo</h2>

        <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', borderBottom: '2px solid #e0e0e0' }}>
          <Link href="/residuos/cadastro">
            <button
              style={{
                padding: '0.75rem 1rem',
                background: '#3498db',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '4px 4px 0 0',
              }}
            >
              Cadastro
            </button>
          </Link>
          <Link href="/residuos/campanha">
            <button
              style={{
                padding: '0.75rem 1rem',
                background: 'transparent',
                color: '#333',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '4px 4px 0 0',
              }}
            >
              Campanha
            </button>
          </Link>
        </div>

        <form onSubmit={handleSubmit} style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div className="form-group">
            <label>Composição *</label>
            <textarea
              value={form.composicao}
              onChange={(event) => setForm((prev) => ({ ...prev, composicao: event.target.value }))}
              rows={3}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Classe *</label>
              <select
                value={form.classe}
                onChange={(event) => setForm((prev) => ({ ...prev, classe: event.target.value }))}
                required
              >
                <option value="HC">HC</option>
                <option value="OH">OH</option>
                <option value="CN">CN</option>
                <option value="CS">CS</option>
                <option value="OF">OF</option>
                <option value="OM">OM</option>
                <option value="INORGANICO">Inorgânico</option>
              </select>
            </div>

            <div className="form-group">
              <label>Estado *</label>
              <select
                value={form.estado}
                onChange={(event) => setForm((prev) => ({ ...prev, estado: event.target.value }))}
                required
              >
                <option value="S">Sólido (S)</option>
                <option value="L">Líquido (L)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Tipo de Recipiente *</label>
              <input
                type="text"
                value={form.tipoRecipiente}
                onChange={(event) => setForm((prev) => ({ ...prev, tipoRecipiente: event.target.value }))}
                placeholder="Ex.: Frasco de vidro"
                required
              />
            </div>

            <div className="form-group">
              <label>Volume do Recipiente (L) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.volumeRecipienteLitros}
                onChange={(event) => setForm((prev) => ({ ...prev, volumeRecipienteLitros: event.target.value }))}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Responsável *</label>
              <input
                type="text"
                value={form.responsavel}
                onChange={(event) => setForm((prev) => ({ ...prev, responsavel: event.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label>Departamento *</label>
              <input
                type="text"
                value={form.departamento}
                onChange={(event) => setForm((prev) => ({ ...prev, departamento: event.target.value }))}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Data *</label>
              <input
                type="date"
                value={form.data}
                onChange={(event) => setForm((prev) => ({ ...prev, data: event.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label>pH</label>
              <input
                type="number"
                min="0"
                max="14"
                step="0.1"
                value={form.ph}
                onChange={(event) => setForm((prev) => ({ ...prev, ph: event.target.value }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Observações</label>
            <textarea
              value={form.observacoes}
              onChange={(event) => setForm((prev) => ({ ...prev, observacoes: event.target.value }))}
              rows={2}
            />
          </div>

          <div
            style={{
              marginBottom: '1.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <div style={{ background: '#ecf0f1', padding: '0.75rem 1rem', fontWeight: 600 }}>
              Tabela de Composição (%)
            </div>
            <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Halogenados %</label>
                <input
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

              <div className="form-group" style={{ margin: 0 }}>
                <label>Acetonitrila %</label>
                <input
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

              <div className="form-group" style={{ margin: 0 }}>
                <label>Metais Pesados %</label>
                <input
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

          <div
            style={{
              marginBottom: '1.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <div style={{ background: '#ecf0f1', padding: '0.75rem 1rem', fontWeight: 600 }}>
              Checkboxes de Segurança
            </div>
            <div style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={form.presencaEnxofre}
                  onChange={(event) => setForm((prev) => ({ ...prev, presencaEnxofre: event.target.checked }))}
                />
                Presença de enxofre ou substâncias sulfuradas
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={form.geradorCianetos}
                  onChange={(event) => setForm((prev) => ({ ...prev, geradorCianetos: event.target.checked }))}
                />
                Gerador de cianetos
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={form.aminas}
                  onChange={(event) => setForm((prev) => ({ ...prev, aminas: event.target.checked }))}
                />
                Aminas
              </label>
            </div>
          </div>

          <button type="submit" disabled={saving} className="button button-primary">
            {saving ? 'Processando...' : '🏷️ Cadastrar e Gerar Etiqueta PDF'}
          </button>

          {message && (
            <div className={message.includes('sucesso') ? 'success-message' : 'error-message'}>
              {message}
            </div>
          )}
        </form>
      </main>
    </div>
  );
}
