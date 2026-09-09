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
        `Campaign completed: ${data.totalItens} bottles processed. A ZIP file was downloaded containing the campaign spreadsheet and one Excel label per bottle. Items were removed from the database.`
      );

      setSelectedOrder([]);
      setVolumeAtual({});
      await loadResiduos();
    } catch (error: any) {
      setMessage(error?.message || 'Error processing campaign');
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
            <Link href="/residuos/campanha">Campaign</Link>
          </nav>
          <div className="user-menu">
            <span>{user?.name || user?.email}</span>
            <button onClick={() => router.push('/api/auth/signout')}>Sign Out</button>
          </div>
        </div>
      </header>

      <main className="container">
        <h2 className="page-title">Collection Campaign</h2>

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
              Campaign
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
                  </tr>
                );
              })}
            </tbody>
          </table>
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
