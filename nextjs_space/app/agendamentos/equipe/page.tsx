'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface UserInfo {
  id: string;
  name: string | null;
  email: string | null;
  category: string | null;
  status: string;
}

interface Autorizacao {
  id: string;
  userId: string;
  tipo: 'RESPONSAVEL' | 'TREINADO';
  user: { id: string; name: string | null; email: string | null };
}

interface Equipamento {
  id: string;
  nome: string;
  descricao: string | null;
  sopLink: string | null;
  autorizacoes: Autorizacao[];
}

export default function EquipmentTeamPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) setUser(await res.json());
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchEquipamentos = useCallback(async () => {
    try {
      const res = await fetch('/api/equipamentos?scope=all');
      if (res.ok) setEquipamentos(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      fetchUser();
      fetchEquipamentos();
    }
  }, [session, fetchUser, fetchEquipamentos]);

  if (status === 'loading' || loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  const isAdmin = user?.category === 'Admin';

  const renderPeople = (list: Autorizacao[], emptyLabel: string) => {
    if (list.length === 0) return <span style={{ color: '#999' }}>{emptyLabel}</span>;
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {list.map((a) => (
          <span
            key={a.id}
            className="status-badge"
            style={{
              background: a.tipo === 'RESPONSAVEL' ? '#e8f5e9' : '#e3f2fd',
              color: a.tipo === 'RESPONSAVEL' ? '#2e7d32' : '#1565c0',
              display: 'inline-block',
            }}
            title={a.user.email || ''}
          >
            {a.user.name || a.user.email}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div>
      <header className="header">
        <div className="header-container">
          <div className="logo-section">
            <div style={{ position: 'relative', width: '40px', height: '40px' }}>
              <Image src="/logo.png" alt="LERP" fill style={{ objectFit: 'contain' }} />
            </div>
            <div className="logo-text"><h1>LERP</h1></div>
          </div>
          <nav className="nav-tabs">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/reagentes">Reagent</Link>
            <Link href="/agendamentos">Calendar</Link>
            <Link href="/agendamentos/equipe" style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '4px' }}>Team</Link>
            <Link href="/residuos">Waste</Link>
            {isAdmin && <Link href="/agendamentos/settings">Settings</Link>}
            {isAdmin && <Link href="/admin">Admin</Link>}
          </nav>
          <div className="user-menu">
            <span>{user?.name || user?.email}</span>
            <button onClick={() => router.push('/api/auth/signout')}>Sign Out</button>
          </div>
        </div>
      </header>

      <main className="container" style={{ maxWidth: '1200px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 className="page-title" style={{ marginBottom: 0 }}>👥 Equipment Team</h2>
          <Link href="/agendamentos" className="button button-secondary">← Back to Calendar</Link>
        </div>

        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          Overview of all equipment with their managers, trained users and SOP links.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ minWidth: '160px' }}>Equipment</th>
                <th>Managers</th>
                <th>Trained users</th>
                <th>SOP</th>
              </tr>
            </thead>
            <tbody>
              {equipamentos.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>
                    No equipment registered
                  </td>
                </tr>
              ) : (
                equipamentos.map((eq) => {
                  const responsaveis = eq.autorizacoes.filter((a) => a.tipo === 'RESPONSAVEL');
                  const treinados = eq.autorizacoes.filter((a) => a.tipo === 'TREINADO');
                  return (
                    <tr key={eq.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{eq.nome}</div>
                        {eq.descricao && (
                          <div style={{ color: '#888', fontSize: '0.8rem', marginTop: '2px' }}>{eq.descricao}</div>
                        )}
                      </td>
                      <td>{renderPeople(responsaveis, 'No managers')}</td>
                      <td>{renderPeople(treinados, 'No trained users')}</td>
                      <td>
                        {eq.sopLink ? (
                          <a href={eq.sopLink} target="_blank" rel="noopener noreferrer"
                            style={{ color: '#3498db', textDecoration: 'underline' }}>
                            📄 View SOP
                          </a>
                        ) : (
                          <span style={{ color: '#999' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
