'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ReagenteLabelPreview from '@/components/ReagenteLabelPreview';
import StorageLocationSelector from '@/components/StorageLocationSelector';

interface InventoryEntry {
  id: string;
  reagenteId: string;
  nome: string;
  marca: string | null;
  entradas: {
    id: string;
    codigoInterno: string;
    dataValidade: string | null;
    localizacao: string | null;
    dataEntrada?: string;
    categoria?: string | null;
    concentracao?: string | null;
  }[];
}

export default function ReagentesPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
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
      fetchUser();
    }
  }, [session]);

  const fetchUser = async () => {
    try {
      const userRes = await fetch('/api/auth/me');
      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData);
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
              🗑️ Reagent Disposal
            </button>
          </div>
        )}

        {tab === 'consulta' && <ConsultaReagentes userCategory={user?.category} />}
        {tab === 'entrada' && (isPosGraduando || isAdmin) && <EntradaForm />}
        {tab === 'saida' && (isPosGraduando || isAdmin) && <SaidaForm />}
      </main>
    </div>
  );
}

function getStatus(dataValidade: string | null): 'Valid' | 'Expired' {
  if (!dataValidade) return 'Valid';
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const validade = new Date(dataValidade);
  validade.setHours(0, 0, 0, 0);
  return validade >= hoje ? 'Valid' : 'Expired';
}

function ConsultaReagentes({ userCategory }: { userCategory?: string }) {
  const router = useRouter();
  const [reagentes, setReagentes] = useState<InventoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const [filtroNome, setFiltroNome] = useState('');
  const [filtroMarca, setFiltroMarca] = useState('');
  const [filtroLocalizacao, setFiltroLocalizacao] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'all' | 'valid' | 'expired'>('all');

  useEffect(() => {
    fetchReagentes();
  }, []);

  const fetchReagentes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reagentes/consulta');
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

  const reagentesFiltrados = useMemo(() => {
    return reagentes.filter((r) => {
      const entrada = r.entradas[0];
      const location = entrada?.localizacao || '';
      const status = getStatus(entrada?.dataValidade || null);

      const matchNome = !filtroNome || r.nome.toLowerCase().includes(filtroNome.toLowerCase());
      const matchMarca = !filtroMarca || (r.marca || '').toLowerCase().includes(filtroMarca.toLowerCase());
      const matchLocalizacao = !filtroLocalizacao || location.toLowerCase().includes(filtroLocalizacao.toLowerCase());
      const matchStatus =
        filtroStatus === 'all' ||
        (filtroStatus === 'valid' && status === 'Valid') ||
        (filtroStatus === 'expired' && status === 'Expired');

      return matchNome && matchMarca && matchLocalizacao && matchStatus;
    });
  }, [reagentes, filtroNome, filtroMarca, filtroLocalizacao, filtroStatus]);

  return (
    <div>
      <h3 style={{ marginBottom: '1.5rem' }}>🔍 Check Inventory</h3>

      <div className="filters-container">
        <input
          type="text"
          placeholder="Filter by name..."
          value={filtroNome}
          onChange={(e) => setFiltroNome(e.target.value)}
          className="filter-input"
        />

        <input
          type="text"
          placeholder="Filter by brand..."
          value={filtroMarca}
          onChange={(e) => setFiltroMarca(e.target.value)}
          className="filter-input"
        />

        <input
          type="text"
          placeholder="Filter by location..."
          value={filtroLocalizacao}
          onChange={(e) => setFiltroLocalizacao(e.target.value)}
          className="filter-input"
        />

        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as 'all' | 'valid' | 'expired')}
          className="filter-select"
        >
          <option value="all">All Status</option>
          <option value="valid">Valid Only</option>
          <option value="expired">Expired Only</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
      ) : reagentesFiltrados.length === 0 ? (
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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reagentesFiltrados.map((r) => {
              const entrada = r.entradas[0];
              const status = getStatus(entrada?.dataValidade || null);
              return (
                <tr key={r.id}>
                  <td><strong>{r.nome}</strong></td>
                  <td>{r.marca || '-'}</td>
                  <td><code>{entrada?.codigoInterno || '-'}</code></td>
                  <td>{entrada?.categoria || '-'}</td>
                  <td>{entrada?.concentracao || '-'}</td>
                  <td>{entrada?.localizacao || '-'}</td>
                  <td>{entrada?.dataValidade ? new Date(entrada.dataValidade).toLocaleDateString('en-US') : '-'}</td>
                  <td>
                    <span className={`status-badge ${status.toLowerCase()}`}>
                      {status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => router.push(`/reagentes/edit/${entrada?.id}`)}
                        className="button-secondary"
                        style={{ fontSize: '14px', padding: '6px 12px' }}
                        disabled={userCategory === 'IC' || !entrada?.id}
                        title={userCategory === 'IC' ? 'IC profile does not have permission to edit reagent' : 'Open edit page'}
                        type="button"
                      >
                        ✏️ Edit
                      </button>

                      <button
                        onClick={() => router.push(`/reagentes/reemitir/${entrada?.id}`)}
                        className="button-secondary"
                        style={{ fontSize: '14px', padding: '6px 12px' }}
                        disabled={userCategory === 'IC' || !entrada?.id}
                        title={userCategory === 'IC' ? 'IC profile does not have permission to reissue label' : 'Open label reissue page'}
                        type="button"
                      >
                        📄 Reissue Label
                      </button>
                    </div>
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

function EntradaForm() {
  const { data: session } = useSession() || {};
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [reagentesCriados, setReagentesCriados] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    nome: '',
    fabricante: '',
    numeroNotaFiscal: '',
    quantidade: '',
    unidade: 'L',
    quantidadeFrascos: 1,
    dataValidade: '',
    validadeIndeterminada: false,
    categoria: '',
    localizacao: '',
    concentracao: '',
    responsavel: '',
  });

  // Auto-fill responsible from session
  useEffect(() => {
    if (session?.user?.name && !formData.responsavel) {
      setFormData((prev) => ({ ...prev, responsavel: session.user?.name || '' }));
    }
  }, [session?.user?.name]);

  const resetForm = () => {
    setFormData({
      nome: '',
      fabricante: '',
      numeroNotaFiscal: '',
      quantidade: '',
      unidade: 'L',
      quantidadeFrascos: 1,
      dataValidade: '',
      validadeIndeterminada: false,
      categoria: '',
      localizacao: '',
      concentracao: '',
      responsavel: session?.user?.name || '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    // Validate required fields
    if (!formData.nome.trim()) {
      setMessage('Reagent Name is a required field.');
      return;
    }

    if (!formData.fabricante.trim()) {
      setMessage('Supplier is a required field.');
      return;
    }

    if (!formData.numeroNotaFiscal.trim()) {
      setMessage('Invoice Number is a required field.');
      return;
    }

    if (!formData.quantidade || Number.parseFloat(formData.quantidade) <= 0) {
      setMessage('Quantity must be greater than zero.');
      return;
    }

    // Validate Expiry Date (required unless indeterminate)
    if (!formData.validadeIndeterminada && !formData.dataValidade) {
      setMessage('Please select an Expiry Date or mark as Indeterminate.');
      return;
    }

    // Validate Responsible (required)
    if (!formData.responsavel.trim()) {
      setMessage('Responsible is a required field. Please log in again if not filled automatically.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        quantidade: Number.parseFloat(formData.quantidade),
        dataEntrada: new Date().toISOString(),
        dataValidade: formData.validadeIndeterminada ? null : (formData.dataValidade || null),
      };

      console.log('[EntradaForm] Sending payload:', JSON.stringify(payload, null, 2));

      const res = await fetch('/api/reagentes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log('[EntradaForm] API response status:', res.status, 'data:', data);

      if (res.ok && Array.isArray(data) && data.length > 0) {
        setReagentesCriados(data);
        setShowPreview(true);
        setMessage(`Reagent successfully added! ${data.length} label${data.length > 1 ? 's' : ''} generated.`);
      } else if (res.ok && data && !Array.isArray(data)) {
        // Handle legacy single-object response
        setReagentesCriados([data]);
        setShowPreview(true);
        setMessage('Reagent successfully added! 1 label generated.');
      } else {
        setMessage(data?.error || `Error adding reagent (status ${res.status}).`);
      }
    } catch (error: any) {
      console.error('[EntradaForm] Error:', error);
      setMessage('Network error adding reagent: ' + (error?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  if (showPreview && reagentesCriados.length > 0) {
    return (
      <ReagenteLabelPreview
        reagentes={reagentesCriados}
        onRegisterAnother={() => {
          setShowPreview(false);
          setReagentesCriados([]);
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
          placeholder="Ex: Acetone"
          value={formData.nome}
          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          required
        />
      </div>

      <div className="form-group">
        <label>Supplier *</label>
        <input
          type="text"
          placeholder="Ex: Sigma-Aldrich"
          value={formData.fabricante}
          onChange={(e) => setFormData({ ...formData, fabricante: e.target.value })}
          required
        />
      </div>

      <div className="form-group">
        <label>Invoice Number *</label>
        <input
          type="text"
          placeholder="Ex: NF-123456"
          value={formData.numeroNotaFiscal}
          onChange={(e) => setFormData({ ...formData, numeroNotaFiscal: e.target.value })}
          required
        />
      </div>

      <div className="form-group">
        <label>Quantity *</label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="number"
            step="0.001"
            placeholder="Ex: 1.5"
            value={formData.quantidade}
            onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })}
            required
          />
          <select value={formData.unidade} onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}>
            <option value="L">L (Liters)</option>
            <option value="mL">mL (Milliliters)</option>
            <option value="kg">kg (Kilograms)</option>
            <option value="g">g (Grams)</option>
            <option value="mg">mg (Milligrams)</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>Number of Bottles *</label>
        <input
          type="number"
          min="1"
          placeholder="Ex: 3"
          value={formData.quantidadeFrascos}
          onChange={(e) => setFormData({ ...formData, quantidadeFrascos: parseInt(e.target.value || '1', 10) })}
          required
        />
      </div>

      <div className="form-group">
        <label>Expiry Date {!formData.validadeIndeterminada && <span style={{ color: '#d32f2f' }}>*</span>}</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input
            type="date"
            value={formData.dataValidade}
            onChange={(e) => setFormData({ ...formData, dataValidade: e.target.value })}
            disabled={formData.validadeIndeterminada}
            required={!formData.validadeIndeterminada}
            style={formData.validadeIndeterminada ? { opacity: 0.5 } : {}}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={formData.validadeIndeterminada}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  validadeIndeterminada: e.target.checked,
                  dataValidade: e.target.checked ? '' : formData.dataValidade,
                });
              }}
            />
            <span>Indeterminate expiry date</span>
          </label>
        </div>
      </div>

      <div className="form-group">
        <StorageLocationSelector
          category={formData.categoria}
          onCategoryChange={(category) => setFormData((prev) => ({ ...prev, categoria: category }))}
          location={formData.localizacao}
          onLocationChange={(location) => setFormData((prev) => ({ ...prev, localizacao: location }))}
        />
      </div>

      <div className="form-group">
        <label>Concentration</label>
        <input
          type="text"
          placeholder="Ex: 99.5%"
          value={formData.concentracao}
          onChange={(e) => setFormData({ ...formData, concentracao: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label>Responsible <span style={{ color: '#d32f2f' }}>*</span></label>
        <input
          type="text"
          value={formData.responsavel}
          readOnly
          placeholder="Name of responsible person"
          required
          style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
        />
        <small style={{ color: '#666', fontSize: '12px' }}>
          Automatically filled from your login session
        </small>
      </div>

      <button type="submit" disabled={loading} className="button button-primary">
        {loading ? 'Processing...' : 'Register Reagent'}
      </button>

      {message && <div className={message.toLowerCase().includes('success') ? 'success-message' : 'error-message'}>{message}</div>}
    </form>
  );
}

function SaidaForm() {
  const [codigo, setCodigo] = useState('');
  const [reagente, setReagente] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const buscarPorCodigo = async () => {
    if (!codigo.trim()) {
      alert('Type the internal code.');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/reagentes/buscar-codigo?codigo=${encodeURIComponent(codigo)}`);
      const data = await response.json();

      if (data.success) {
        setReagente(data.reagente);
      } else {
        alert('Reagent not found.');
        setReagente(null);
      }
    } catch (error) {
      console.error('Error searching reagent:', error);
      alert('Error searching reagent.');
    } finally {
      setLoading(false);
    }
  };

  const registrarDescarte = async () => {
    if (!reagente) {
      alert('Search for a reagent first.');
      return;
    }

    const confirmar = window.confirm(
      `Are you sure you want to register disposal for bottle ${reagente.codigo}?\n\nThis action is IRREVERSIBLE and the bottle will be permanently deleted from the database.`
    );

    if (!confirmar) return;

    try {
      setLoading(true);

      const response = await fetch('/api/reagentes/descarte', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reagenteId: reagente.id,
          codigo: reagente.codigo,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Bottle deleted successfully!');
        setCodigo('');
        setReagente(null);
      } else {
        alert(`Error: ${data.error || 'Error deleting bottle.'}`);
      }
    } catch (error) {
      console.error('Error deleting bottle:', error);
      alert('Error deleting bottle.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <h3>Reagent Disposal</h3>
      <p style={{ marginBottom: '1rem' }}>Register when a bottle is finished (will be removed from inventory)</p>

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
            🔍 Search
          </button>
        </div>
      </div>

      {reagente && (
        <div className="card" style={{ backgroundColor: '#fff3cd', border: '2px solid #ffc107', padding: '1rem', borderRadius: '8px' }}>
          <h3>⚠️ Reagent Found:</h3>
          <p><strong>Code:</strong> {reagente.codigo}</p>
          <p><strong>Name:</strong> {reagente.nome}</p>
          <p><strong>Brand:</strong> {reagente.fabricante || '-'}</p>
          <p><strong>Location:</strong> {reagente.localizacao || '-'}</p>
          <p><strong>Entry date:</strong> {reagente.dataEntrada ? new Date(reagente.dataEntrada).toLocaleDateString('en-US') : '-'}</p>

          <hr />

          <p style={{ color: '#d32f2f', fontWeight: 'bold' }}>
            ⚠️ WARNING: By confirming, this bottle will be PERMANENTLY DELETED from the database.
          </p>

          <button type="button" onClick={registrarDescarte} disabled={loading} className="button button-danger">
            🗑️ Register Disposal (Delete Bottle)
          </button>
        </div>
      )}
    </div>
  );
}
