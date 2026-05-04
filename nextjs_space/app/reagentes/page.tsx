'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import EtiquetaReagente from '@/components/EtiquetaReagente';

interface Reagent {
  id: string;
  nome: string;
  marca: string | null;
  volume: string | null;
  localidade: string | null;
  status: string;
  entradas: {
    id: string;
    codigoInterno: string;
    dataValidade: string | null;
    localizacao: string | null;
    dataEntrada?: string;
  }[];
}

export default function ReagentesPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [reagentes, setReagentes] = useState<Reagent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('consulta');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserAndReagentes();
    }
  }, [session]);

  const fetchUserAndReagentes = async () => {
    try {
      const userRes = await fetch('/api/auth/me');
      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData);
      }

      const reagentesRes = await fetch('/api/reagentes');
      if (reagentesRes.ok) {
        const data = await reagentesRes.json();
        setReagentes(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  const isAdmin = user?.category === 'Admin';
  const isPosGraduando = user?.category === 'Pos-graduando';

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
            <Link href="/reagentes">Reagents</Link>
          </nav>
          <div className="user-menu">
            <span>{user?.name}</span>
            <button onClick={() => router.push('/api/auth/signout')}>Log out</button>
          </div>
        </div>
      </header>

      <main className="container">
        <h2 className="page-title">Reagent Management</h2>

        {(isPosGraduando || isAdmin) && (
          <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', borderBottom: '2px solid #e0e0e0' }}>
            <button
              onClick={() => setTab('consulta')}
              style={{ padding: '0.75rem 1rem', background: tab === 'consulta' ? '#3498db' : 'transparent', color: tab === 'consulta' ? 'white' : '#333', border: 'none', cursor: 'pointer', borderRadius: '4px 4px 0 0' }}
            >
              Check Inventory
            </button>
            <button
              onClick={() => setTab('entrada')}
              style={{ padding: '0.75rem 1rem', background: tab === 'entrada' ? '#3498db' : 'transparent', color: tab === 'entrada' ? 'white' : '#333', border: 'none', cursor: 'pointer', borderRadius: '4px 4px 0 0' }}
            >
              Reagent Input
            </button>
            <button
              onClick={() => setTab('saida')}
              style={{ padding: '0.75rem 1rem', background: tab === 'saida' ? '#3498db' : 'transparent', color: tab === 'saida' ? 'white' : '#333', border: 'none', cursor: 'pointer', borderRadius: '4px 4px 0 0' }}
            >
              Reagent Output
            </button>
          </div>
        )}

        {tab === 'consulta' && <ConsultaReagentes userCategory={user?.category} />}
        {tab === 'entrada' && (isPosGraduando || isAdmin) && <EntradaForm onSuccess={fetchUserAndReagentes} />}
        {tab === 'saida' && (isPosGraduando || isAdmin) && <SaidaForm reagentes={reagentes} onSuccess={fetchUserAndReagentes} />}
      </main>
    </div>
  );
}

function ConsultaReagentes({ userCategory }: { userCategory?: string }) {
  const [reagentes, setReagentes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({ nome: '', marca: '' });
  const [reemitindoId, setReemitindoId] = useState<string | null>(null);

  useEffect(() => {
    fetchReagentes();
  }, []);

  const downloadBase64 = (base64: string, fileName: string, mimeType: string) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  };

  const reemitirEtiqueta = async (id: string, codigo: string) => {
    try {
      setReemitindoId(id);
      const response = await fetch(`/api/reagentes/${id}/etiqueta`);
      const data = await response.json();

      if (response.ok && data.success) {
        downloadBase64(data.etiquetaPdfBase64, data.etiquetaFileName, 'application/pdf');
        alert(`Etiqueta ${codigo} reemitida com sucesso!`);
      } else {
        alert(`Erro ao gerar etiqueta: ${data.error || 'falha desconhecida'}`);
      }
    } catch (error) {
      console.error('Erro ao reemitir etiqueta:', error);
      alert('Erro ao reemitir etiqueta');
    } finally {
      setReemitindoId(null);
    }
  };

  const fetchReagentes = async (nome = '', marca = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (nome) params.append('nome', nome);
      if (marca) params.append('marca', marca);

      const res = await fetch(`/api/reagentes/consulta?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReagentes(data);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    const novosFiltros = { ...filtros, [field]: value };
    setFiltros(novosFiltros);
    fetchReagentes(novosFiltros.nome, novosFiltros.marca);
  };

  return (
    <div>
      <h3 style={{ marginBottom: '1.5rem' }}>🔍 Check Inventory</h3>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
          marginBottom: '1.5rem',
          padding: '1rem',
          backgroundColor: '#ecf0f1',
          borderRadius: '4px',
        }}
      >
        <div className="form-group" style={{ margin: 0 }}>
          <label>Filter by Name</label>
          <input
            type="text"
            value={filtros.nome}
            onChange={(e) => handleFilterChange('nome', e.target.value)}
            placeholder="Enter the reagent's name"
          />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Filter by Brand</label>
          <input
            type="text"
            value={filtros.marca}
            onChange={(e) => handleFilterChange('marca', e.target.value)}
            placeholder="Enter the brand"
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
      ) : reagentes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#7f8c8d' }}>No results found</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Brand</th>
              <th>Internal Code</th>
              <th>Category</th>
              <th>Concentration</th>
              <th>Location</th>
              <th>Expiry Date</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {reagentes.map((r) => {
              const ultimaEntrada = r.entradas[0];
              return (
                <tr key={r.id}>
                  <td><strong>{r.nome}</strong></td>
                  <td>{r.marca || '-'}</td>
                  <td><code>{ultimaEntrada?.codigoInterno || '-'}</code></td>
                  <td>{ultimaEntrada?.categoria || '-'}</td>
                  <td>{ultimaEntrada?.concentracao || '-'}</td>
                  <td>{ultimaEntrada?.localizacao || '-'}</td>
                  <td>
                    {ultimaEntrada?.dataValidade
                      ? new Date(ultimaEntrada.dataValidade).toLocaleDateString('en-US')
                      : '-'}
                  </td>
                  <td><span className={`status-badge status-${r.status}`}>{r.status}</span></td>
                  <td>
                    <button
                      onClick={() => reemitirEtiqueta(r.id, ultimaEntrada?.codigoInterno || '')}
                      disabled={userCategory === 'IC' || !ultimaEntrada?.codigoInterno || reemitindoId === r.id}
                      className="button"
                      style={{
                        padding: '0.45rem 0.75rem',
                        backgroundColor: userCategory === 'IC' ? '#d5d8dc' : '#e8f4fd',
                        color: userCategory === 'IC' ? '#7f8c8d' : '#2471a3',
                        border: '1px solid #aed6f1',
                        borderRadius: '4px',
                        cursor: userCategory === 'IC' ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                      title={userCategory === 'IC' ? 'Perfil IC sem permissão para reemitir etiqueta' : 'Reemitir etiqueta PDF'}
                    >
                      {reemitindoId === r.id ? 'Gerando...' : '📄 Reemitir Etiqueta'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function EntradaForm({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [etiquetas, setEtiquetas] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    nome: '',
    marca: '',
    volume: '',
    localidade: '',
    fornecedor: '',
    notaFiscal: '',
    quantidade: 1,
    dataEntrada: new Date().toISOString().split('T')[0],
    categoria: '',
    concentracao: '',
    dataValidade: '',
    perigos: '',
    responsavel: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setEtiquetas([]);

    try {
      const res = await fetch('/api/reagentes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json(); // always an array
        setEtiquetas(data);
        setMessage(`Reagent successfully added! ${data.length} label${data.length > 1 ? 's' : ''} generated.`);
        setTimeout(() => {
          setFormData({
            nome: '',
            marca: '',
            volume: '',
            localidade: '',
            fornecedor: '',
            notaFiscal: '',
            quantidade: 1,
            dataEntrada: new Date().toISOString().split('T')[0],
            categoria: '',
            concentracao: '',
            dataValidade: '',
            perigos: '',
            responsavel: '',
          });
        }, 3000);
        onSuccess();
      } else {
        setMessage('Error adding reagent.');
      }
    } catch (error) {
      setMessage('Error adding reagent.');
    } finally {
      setLoading(false);
    }
  };

  if (etiquetas.length > 0) {
    return (
      <div>
        <h3 style={{ marginBottom: '0.5rem', color: '#27ae60' }}>✅ Generated Label{etiquetas.length > 1 ? 's' : ''}</h3>
        <p style={{ marginBottom: '1.5rem', color: '#7f8c8d', fontSize: '14px' }}>
          {etiquetas.length} label{etiquetas.length > 1 ? 's' : ''} generated — one per bottle.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {etiquetas.map((entrada, idx) => (
            <div key={entrada.id}>
              {etiquetas.length > 1 && (
                <p style={{ marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '13px', color: '#555' }}>
                  Bottle {idx + 1} of {etiquetas.length} — <code>{entrada.codigoInterno}</code>
                </p>
              )}
              <EtiquetaReagente entrada={entrada} logoUrl="/logo.png" />
            </div>
          ))}
        </div>
        <button
          onClick={() => setEtiquetas([])}
          style={{
            marginTop: '2rem',
            padding: '0.75rem 1.5rem',
            background: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Register Another Reagent
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '700px', margin: '0 auto' }}>
      <div className="form-group">
        <label>Reagent Name *</label>
        <input
          type="text"
          value={formData.nome}
          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          required
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label>Brand</label>
          <input
            type="text"
            value={formData.marca}
            onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Category</label>
          <select
            value={formData.categoria}
            onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
          >
            <option value="">Select a category</option>
            <option value="Solvent">Solvent</option>
            <option value="Acid">Acid</option>
            <option value="Base">Base</option>
            <option value="Monomer">Monomer</option>
            <option value="Polymer">Polymer</option>
            <option value="Crosslinker">Crosslinker</option>
            <option value="Catalyst">Catalyst</option>
            <option value="Photoinitiator">Photoinitiator</option>
            <option value="Nanomaterial">Nanomaterial</option>
            <option value="Analytical">Analytical</option>
            <option value="Microbiology">Microbiology</option>
            <option value="Inorganic Salt">Inorganic Salt</option>
            <option value="Thiol">Thiol</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label>Volume</label>
          <input
            type="text"
            value={formData.volume}
            onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
            placeholder="e.g. 1L, 500ml"
          />
        </div>
        <div className="form-group">
          <label>Concentration (e.g. 99.5%)</label>
          <input
            type="text"
            value={formData.concentracao}
            onChange={(e) => setFormData({ ...formData, concentracao: e.target.value })}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label>Location (e.g. CAB-03 | SHF-02)</label>
          <input
            type="text"
            value={formData.localidade}
            onChange={(e) => setFormData({ ...formData, localidade: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Expiry Date</label>
          <input
            type="date"
            value={formData.dataValidade}
            onChange={(e) => setFormData({ ...formData, dataValidade: e.target.value })}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label>Supplier *</label>
          <input
            type="text"
            value={formData.fornecedor}
            onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value })}
            required
          />
        </div>
        <div className="form-group">
          <label>Invoice Number</label>
          <input
            type="text"
            value={formData.notaFiscal}
            onChange={(e) => setFormData({ ...formData, notaFiscal: e.target.value })}
          />
        </div>
      </div>

      <div className="form-group">
          <select
            value={formData.perigos}
             onChange={(e) => setFormData({ ...formData, perigos: e.target.value })}
          >
            <option value="">Select a category</option>
            <option value="Flammable">Flammable</option>
            <option value="Controlled">Controlled</option>
            <option value="Refrigerated">Refrigerated</option>
            <option value="Corrosive">Corrosive</option>
            <option value="Oxidizer">Oxidizer</option>
            <option value="Inert">Inert</option>
          </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label>Quantity *</label>
          <input
            type="number"
            value={formData.quantidade}
            onChange={(e) => setFormData({ ...formData, quantidade: parseInt(e.target.value) })}
            min="1"
            required
          />
        </div>
        <div className="form-group">
          <label>Responsible</label>
          <input
            type="text"
            value={formData.responsavel}
            onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Entry Date</label>
        <input
          type="date"
          value={formData.dataEntrada}
          onChange={(e) => setFormData({ ...formData, dataEntrada: e.target.value })}
        />
      </div>

      <button type="submit" disabled={loading} className="button button-primary">
        {loading ? 'Processing...' : '🏷️ Generate Label & Register'}
      </button>

      {message && (
        <div className={message.includes('successfully') ? 'success-message' : 'error-message'}>
          {message}
        </div>
      )}
    </form>
  );
}

function SaidaForm({ reagentes, onSuccess }: { reagentes: Reagent[]; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [codigoInterno, setCodigoInterno] = useState('');

  const entradasComCodigo = reagentes.flatMap((reagente) =>
    (reagente.entradas || [])
      .filter((entrada) => !!entrada.codigoInterno)
      .map((entrada) => ({
        reagenteId: reagente.id,
        nome: reagente.nome,
        codigoInterno: entrada.codigoInterno,
      }))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const reagenteSelecionado = entradasComCodigo.find(
      (entrada) => entrada.codigoInterno === codigoInterno
    );

    if (!reagenteSelecionado) {
      setMessage('Please select a valid reagent by internal code.');
      return;
    }

    const confirmarExclusao = window.confirm(
      `Are you sure you want to permanently remove the reagent "${reagenteSelecionado.nome}" (code ${codigoInterno})? This action cannot be undone.`
    );

    if (!confirmarExclusao) {
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/reagentes/saida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigoInterno }),
      });

      if (res.ok) {
        setMessage('Output recorded: reagent permanently removed.');
        setCodigoInterno('');
        onSuccess();
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage(data.error || 'Error recording output.');
      }
    } catch (error) {
      setMessage('Error recording output.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="form-group">
        <label>Reagent Internal Code *</label>
        <select
          value={codigoInterno}
          onChange={(e) => setCodigoInterno(e.target.value)}
          required
        >
          <option value="">Select internal code</option>
          {entradasComCodigo.map((entrada) => (
            <option key={`${entrada.reagenteId}-${entrada.codigoInterno}`} value={entrada.codigoInterno}>
              {entrada.codigoInterno} — {entrada.nome}
            </option>
          ))}
        </select>
      </div>

      <button type="submit" disabled={loading} className="button button-primary">
        {loading ? 'Removing...' : 'Confirm Output & Remove Reagent'}
      </button>

      {message && (
        <div className={message.includes('recorded') ? 'success-message' : 'error-message'}>
          {message}
        </div>
      )}
    </form>
  );
}
