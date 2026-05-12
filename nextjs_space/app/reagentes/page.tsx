'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ReagenteLabelPreview from '@/components/ReagenteLabelPreview';
import StorageLocationSelector from '@/components/StorageLocationSelector';

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
              🗑️ Descarte de Reagente
            </button>
          </div>
        )}

        {tab === 'consulta' && <ConsultaReagentes userCategory={user?.category} />}
        {tab === 'entrada' && (isPosGraduando || isAdmin) && <EntradaForm onSuccess={fetchUserAndReagentes} />}
        {tab === 'saida' && (isPosGraduando || isAdmin) && (
          <SaidaForm onSuccess={fetchUserAndReagentes} />
        )}
      </main>
    </div>
  );
}

function ConsultaReagentes({ userCategory }: { userCategory?: string }) {
  const [reagentes, setReagentes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({ nome: '', marca: '' });

  useEffect(() => {
    fetchReagentes();
  }, []);


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
                    {userCategory === 'IC' || !ultimaEntrada?.codigoInterno ? (
                      <button
                        disabled
                        className="button"
                        style={{
                          padding: '0.45rem 0.75rem',
                          backgroundColor: '#d5d8dc',
                          color: '#7f8c8d',
                          border: '1px solid #aed6f1',
                          borderRadius: '4px',
                          cursor: 'not-allowed',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                        title="Perfil IC sem permissão para reemitir etiqueta"
                        type="button"
                      >
                        📄 Reemitir Etiqueta
                      </button>
                    ) : (
                      <Link href={`/reagentes/reemitir/${r.id}`}>
                        <button
                          className="button"
                          style={{
                            padding: '0.45rem 0.75rem',
                            backgroundColor: '#e8f4fd',
                            color: '#2471a3',
                            border: '1px solid #aed6f1',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                          title="Abrir tela de reemissão"
                          type="button"
                        >
                          📄 Reemitir Etiqueta
                        </button>
                      </Link>
                    )}
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
  const [showPreview, setShowPreview] = useState(false);
  const [reagenteCadastrado, setReagenteCadastrado] = useState<{ id: string; codigo: string } | null>(null);
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

  const resetForm = () => {
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/reagentes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const primeiraEntrada = data[0];
          setReagenteCadastrado({
            id: primeiraEntrada.id,
            codigo: primeiraEntrada.codigoInterno,
          });
          setShowPreview(true);
          setMessage(`Reagent successfully added! ${data.length} label${data.length > 1 ? 's' : ''} generated.`);
          onSuccess();
        }
      } else {
        setMessage('Error adding reagent.');
      }
    } catch (error) {
      setMessage('Error adding reagent.');
    } finally {
      setLoading(false);
    }
  };

  if (showPreview && reagenteCadastrado) {
    return (
      <ReagenteLabelPreview
        reagente={reagenteCadastrado}
        onRegisterAnother={() => {
          setShowPreview(false);
          setReagenteCadastrado(null);
          setMessage('');
          resetForm();
        }}
      />
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

      <StorageLocationSelector
        value={formData.localidade}
        onChange={(location) => setFormData({ ...formData, localidade: location })}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label>Expiry Date</label>
          <input
            type="date"
            value={formData.dataValidade}
            onChange={(e) => setFormData({ ...formData, dataValidade: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Supplier *</label>
          <input
            type="text"
            value={formData.fornecedor}
            onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value })}
            required
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label>Invoice Number</label>
          <input
            type="text"
            value={formData.notaFiscal}
            onChange={(e) => setFormData({ ...formData, notaFiscal: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Hazard Class</label>
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

function SaidaForm({ onSuccess }: { onSuccess: () => void }) {
  const { data: session } = useSession();
  const [codigo, setCodigo] = useState('');
  const [reagente, setReagente] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const buscarPorCodigo = async () => {
    if (!codigo.trim()) {
      alert('Digite o código interno');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/reagentes/buscar-codigo?codigo=${encodeURIComponent(codigo)}`);
      const data = await response.json();

      if (data.success) {
        setReagente(data.reagente);
      } else {
        alert('Reagente não encontrado');
        setReagente(null);
      }
    } catch (error) {
      console.error('Erro ao buscar reagente:', error);
      alert('Erro ao buscar reagente');
    } finally {
      setLoading(false);
    }
  };

  const registrarDescarte = async () => {
    if (!reagente) {
      alert('Busque um reagente primeiro');
      return;
    }

    const confirmar = window.confirm(
      `Tem certeza que deseja registrar o descarte/fim do frasco ${reagente.codigo}?\n\nEsta ação é IRREVERSÍVEL e o registro será DELETADO permanentemente do banco de dados.`
    );

    if (!confirmar) {
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/reagentes/descarte', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reagenteId: reagente.id,
          codigo: reagente.codigo,
          responsavel: session?.user?.name,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Frasco descartado e removido do inventário com sucesso!');
        setCodigo('');
        setReagente(null);
        onSuccess();
      } else {
        alert(`Erro: ${data.error || 'Erro ao registrar descarte'}`);
      }
    } catch (error) {
      console.error('Erro ao registrar descarte:', error);
      alert('Erro ao registrar descarte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <h3>Descarte de Reagente</h3>
      <p style={{ marginBottom: '1rem' }}>
        Registre quando um frasco acabou (será removido do inventário).
      </p>

      <div className="form-group">
        <label>Internal Code:</label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            placeholder="Ex: LERP-U5833"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                buscarPorCodigo();
              }
            }}
          />
          <button type="button" onClick={buscarPorCodigo} disabled={loading} className="button button-primary">
            🔍 Buscar
          </button>
        </div>
      </div>

      {reagente && (
        <div
          className="card"
          style={{ backgroundColor: '#fff3cd', border: '2px solid #ffc107', padding: '1rem', borderRadius: '8px' }}
        >
          <h3>⚠️ Reagente Encontrado:</h3>
          <p><strong>Código:</strong> {reagente.codigo}</p>
          <p><strong>Nome:</strong> {reagente.nome}</p>
          <p><strong>Fabricante:</strong> {reagente.fabricante || '-'}</p>
          <p><strong>Localização:</strong> {reagente.localizacao || '-'}</p>
          <p>
            <strong>Data de entrada:</strong>{' '}
            {reagente.dataEntrada ? new Date(reagente.dataEntrada).toLocaleDateString('pt-BR') : '-'}
          </p>

          <hr />

          <p style={{ color: '#d32f2f', fontWeight: 'bold' }}>
            ⚠️ ATENÇÃO: Ao confirmar, este frasco será DELETADO PERMANENTEMENTE do banco de dados.
          </p>

          <button
            type="button"
            onClick={registrarDescarte}
            disabled={loading}
            className="button button-danger"
          >
            🗑️ Registrar Descarte (Deletar Frasco)
          </button>
        </div>
      )}
    </div>
  );
}
