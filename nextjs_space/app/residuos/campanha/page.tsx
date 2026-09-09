'use client';

import { useEffect, useMemo, useState } from 'react';
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

type EditForm = {
  composicao: string;
  classe: string;
  estado: string;
  tipoRecipiente: string;
  volumeRecipienteLitros: string;
  departamento: string;
  responsavel: string;
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
  const [message, setMessage] = useState('');

  const [residuos, setResiduos] = useState<Residuo[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<string[]>([]);
  const [volumeAtual, setVolumeAtual] = useState<Record<string, string>>({});

  const [departamento, setDepartamento] = useState('');
  const [responsavelInformacoes, setResponsavelInformacoes] = useState('');
  const [dataCampanha, setDataCampanha] = useState(new Date().toISOString().slice(0, 10));

  // Edit modal state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const openEdit = (residuo: Residuo) => {
    setEditingId(residuo.id);
    setEditForm({
      composicao: residuo.composicao,
      classe: residuo.classe,
      estado: residuo.estado,
      tipoRecipiente: residuo.tipoRecipiente,
      volumeRecipienteLitros: String(residuo.volumeRecipienteLitros),
      departamento: residuo.departamento,
      responsavel: residuo.responsavel,
    });
    setEditError('');
  };

  const closeEdit = () => {
    setEditingId(null);
    setEditForm(null);
    setEditError('');
  };

  const saveEdit = async () => {
    if (!editingId || !editForm) return;
    setEditSaving(true);
    setEditError('');
    try {
      const response = await fetch(`/api/residuos/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          volumeRecipienteLitros: Number(editForm.volumeRecipienteLitros),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Error saving changes');
      closeEdit();
      await loadResiduos();
    } catch (err: any) {
      setEditError(err?.message || 'Error saving changes');
    } finally {
      setEditSaving(false);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) throw new Error('Failed to load user');
        const data = await response.json();
        setUser(data);
        setResponsavelInformacoes(data?.name || data?.email || '');
      } catch (error) {
        console.error('Error loading user:', error);
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
        throw new Error(data?.error || 'Error listing waste records');
      }
      setResiduos(data);
      if (data.length > 0) {
        setDepartamento((prev) => prev || data[0]?.departamento || '');
      }
    } catch (error) {
      console.error('Error listing waste records:', error);
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
    setMessage('');

    if (selectedOrder.length === 0) {
      setMessage('Select at least one bottle for the campaign.');
      return;
    }

    const itens = selectedOrder.map((id) => ({
      id,
      volumeAtualLitros: Number(volumeAtual[id]),
    }));

    if (itens.some((item) => !Number.isFinite(item.volumeAtualLitros) || item.volumeAtualLitros < 0)) {
      setMessage('Enter a valid current volume (in L) for all selected bottles.');
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
        throw new Error(data?.error || 'Failed to process campaign');
      }

      downloadBase64(data.zipBase64, data.zipFileName, 'application/zip');

      setMessage(
        `Campaign completed: ${data.totalItens} bottles processed. A ZIP file was downloaded containing the collection spreadsheet and one Excel label per bottle. Items were removed from the database.`
      );

      setSelectedOrder([]);
      setVolumeAtual({});
      await loadResiduos();
    } catch (error: any) {
      setMessage(error?.message || 'Error processing collection');
    } finally {
      setProcessing(false);
    }
  };

  if (status === 'loading' || loadingUser) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
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
            <Link href="/residuos">Waste</Link>
            <Link href="/residuos/cadastro">Register</Link>
            <Link href="/residuos/campanha">Collection</Link>
          </nav>
          <div className="user-menu">
            <span>{user?.name || user?.email}</span>
            <button onClick={() => router.push('/api/auth/signout')}>Sign Out</button>
          </div>
        </div>
      </header>

      <main className="container">
        <h2 className="page-title">Collection</h2>

        <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', borderBottom: '2px solid #e0e0e0' }}>
          <Link href="/residuos/cadastro">
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
              Register
            </button>
          </Link>
          <Link href="/residuos/campanha">
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
              Collection
            </button>
          </Link>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '1rem',
            marginBottom: '1.5rem',
            padding: '1rem',
            backgroundColor: '#ecf0f1',
            borderRadius: '4px',
          }}
        >
          <div className="form-group" style={{ margin: 0 }}>
            <label>Department</label>
            <input
              type="text"
              value={departamento}
              onChange={(event) => setDepartamento(event.target.value)}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>Responsible for information</label>
            <input
              type="text"
              value={responsavelInformacoes}
              onChange={(event) => setResponsavelInformacoes(event.target.value)}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>Date</label>
            <input
              type="date"
              value={dataCampanha}
              onChange={(event) => setDataCampanha(event.target.value)}
            />
          </div>
        </div>

        {loadingRows ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading bottles...</div>
        ) : residuos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#7f8c8d' }}>
            No bottles registered at the moment.
          </div>
        ) : (
          <>
          <table className="table">
            <thead>
              <tr>
                <th>Select</th>
                <th>Order</th>
                <th>Container #</th>
                <th>Composition</th>
                <th>Class</th>
                <th>State</th>
                <th>Container Type</th>
                <th>Current Volume (L)</th>
                <th>Container Volume (L)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {residuos.map((residuo) => {
                const selected = selectedOrder.includes(residuo.id);
                return (
                  <tr key={residuo.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(event) => toggleSelection(residuo.id, event.target.checked)}
                      />
                    </td>
                    <td>{selected ? ordinalById[residuo.id] : '-'}</td>
                    <td>{residuo.numeroRecipiente}</td>
                    <td style={{ maxWidth: '260px', whiteSpace: 'normal' }}>{residuo.composicao}</td>
                    <td>{residuo.classe}</td>
                    <td>{residuo.estado}</td>
                    <td>{residuo.tipoRecipiente}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        disabled={!selected}
                        value={volumeAtual[residuo.id] || ''}
                        onChange={(event) =>
                          setVolumeAtual((prev) => ({ ...prev, [residuo.id]: event.target.value }))
                        }
                        placeholder="0.00"
                        style={{
                          width: '110px',
                          padding: '0.5rem',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                        }}
                      />
                    </td>
                    <td>{residuo.volumeRecipienteLitros}</td>
                    <td>
                      <button
                        onClick={() => openEdit(residuo)}
                        style={{
                          padding: '0.3rem 0.7rem',
                          background: '#f39c12',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                        }}
                      >
                        ✏️ Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Edit Modal */}
          {editingId && editForm && (
            <div
              style={{
                position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
              }}
              onClick={(e) => { if (e.target === e.currentTarget) closeEdit(); }}
            >
              <div style={{
                background: 'white', borderRadius: '8px', padding: '2rem',
                width: '600px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto',
                boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
              }}>
                <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#2c3e50' }}>
                  ✏️ Edit Waste Record
                </h3>

                <div className="form-group">
                  <label>Composition *</label>
                  <textarea
                    rows={3}
                    value={editForm.composicao}
                    onChange={(e) => setEditForm((prev) => prev ? { ...prev, composicao: e.target.value } : prev)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Class *</label>
                    <select
                      value={editForm.classe}
                      onChange={(e) => setEditForm((prev) => prev ? { ...prev, classe: e.target.value } : prev)}
                    >
                      <option value="HC">HC - Hydrocarbons</option>
                      <option value="OH">OH - Organohalogenated</option>
                      <option value="CN">CN - Nitrogenous Compounds</option>
                      <option value="CS">CS - Sulfur Compounds</option>
                      <option value="OF">OF - Organophosphates</option>
                      <option value="OM">OM - Organometallics</option>
                      <option value="INORGANICO">Inorganic - Inorganics</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>State *</label>
                    <select
                      value={editForm.estado}
                      onChange={(e) => setEditForm((prev) => prev ? { ...prev, estado: e.target.value } : prev)}
                    >
                      <option value="S">Solid (S)</option>
                      <option value="L">Liquid (L)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Container Type</label>
                    <input
                      type="text"
                      value={editForm.tipoRecipiente}
                      onChange={(e) => setEditForm((prev) => prev ? { ...prev, tipoRecipiente: e.target.value } : prev)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Container Volume (L)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editForm.volumeRecipienteLitros}
                      onChange={(e) => setEditForm((prev) => prev ? { ...prev, volumeRecipienteLitros: e.target.value } : prev)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Department</label>
                    <input
                      type="text"
                      value={editForm.departamento}
                      onChange={(e) => setEditForm((prev) => prev ? { ...prev, departamento: e.target.value } : prev)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Responsible</label>
                    <input
                      type="text"
                      value={editForm.responsavel}
                      onChange={(e) => setEditForm((prev) => prev ? { ...prev, responsavel: e.target.value } : prev)}
                    />
                  </div>
                </div>

                {editError && (
                  <div className="error-message" style={{ marginBottom: '1rem' }}>{editError}</div>
                )}

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button
                    onClick={closeEdit}
                    style={{
                      padding: '0.6rem 1.2rem', background: '#95a5a6', color: 'white',
                      border: 'none', borderRadius: '4px', cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEdit}
                    disabled={editSaving}
                    className="button button-primary"
                  >
                    {editSaving ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </div>
            </div>
          )}
          </>
        )}

        <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            disabled={processing || selectedOrder.length === 0}
            onClick={processarCampanha}
            className="button button-primary"
          >
            {processing ? 'Processing...' : 'Generate ZIP (spreadsheet + Excel labels) and finalize campaign'}
          </button>
          <p style={{ margin: 0, color: '#7f8c8d', fontSize: '0.95rem' }}>
            The ordinal numbering restarts at 1 for each campaign.
          </p>
        </div>

        {message && (
          <div
            className={
              message.includes('completed') || message.includes('generated') ? 'success-message' : 'error-message'
            }
            style={{ marginTop: '0.75rem' }}
          >
            {message}
          </div>
        )}
      </main>
    </div>
  );
}
