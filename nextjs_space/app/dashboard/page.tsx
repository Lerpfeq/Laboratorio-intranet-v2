'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface User {
  id: string;
  name: string | null;
  email: string | null;
  category: string | null;
  status: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserData();
    }
  }, [session]);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Carregando...</div>;
  }

  if (!user) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Erro ao carregar dados do usuario</div>;
  }

  const isAdmin = user.category === 'Admin';
  const isPosGraduando = user.category === 'Pos-graduando';
  const isIC = user.category === 'IC';

  return (
    <div>
      <header className="header">
        <div className="header-container">
          <div className="logo-section">
            <div style={{ position: 'relative', width: '40px', height: '40px' }}>
              <Image src="/logo.png" alt="LERP Logo" fill style={{ objectFit: 'contain' }} />
            </div>
            <div className="logo-text">
              <h1>LERP</h1>
            </div>
          </div>
          <nav className="nav-tabs">
            {user.status === 'approved' && (
              <>
                <Link href="/dashboard">Inicio</Link>
                <Link href="/reagentes">Reagentes</Link>
                {(isPosGraduando || isAdmin) && <Link href="/agendamento">Agendamento</Link>}
                {(isPosGraduando || isAdmin) && <Link href="/residuos">Residuos</Link>}
                <Link href="/amostras">Amostras</Link>
                <Link href="/removedor-bg">Remover BG</Link>
                {isAdmin && <Link href="/admin">Admin</Link>}
              </>
            )}
          </nav>
          <div className="user-menu">
            <span>{user.name || user.email}</span>
            <button
              onClick={() => router.push('/api/auth/signout')}
              style={{ cursor: 'pointer' }}
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="container">
        {user.status !== 'approved' && (
          <div className="alert alert-info">
            <span>!</span>
            <div>
              <strong>Aguardando aprovacao</strong><br />
              Sua conta esta pendente de aprovacao por um administrador. Voce sera notificado em breve.
            </div>
          </div>
        )}

        <h2 className="page-title">Bem-vindo, {user.name || user.email}!</h2>

        {user.status === 'approved' ? (
          <>
            <p style={{ marginBottom: '2rem', fontSize: '1.05rem', color: '#666' }}>
              Selecione uma opcao abaixo para comecar:
            </p>

            <div className="card-grid">
              {!isIC && (
                <Link href="/reagentes" style={{ textDecoration: 'none' }}>
                  <div className="card card-blue">
                    <div className="card-header">
                      <span>Chemistry</span>
                      <span>Reagentes</span>
                    </div>
                    <p style={{ color: '#666', fontSize: '0.9rem' }}>Gerenciar entrada, saida e estoque de reagentes</p>
                  </div>
                </Link>
              )}

              {isIC && (
                <Link href="/reagentes" style={{ textDecoration: 'none' }}>
                  <div className="card card-blue">
                    <div className="card-header">
                      <span>Search</span>
                      <span>Consultar Estoque</span>
                    </div>
                    <p style={{ color: '#666', fontSize: '0.9rem' }}>Consultar disponibilidade de reagentes</p>
                  </div>
                </Link>
              )}

              {(isPosGraduando || isAdmin) && (
                <Link href="/agendamento" style={{ textDecoration: 'none' }}>
                  <div className="card card-orange">
                    <div className="card-header">
                      <span>Calendar</span>
                      <span>Agendamento</span>
                    </div>
                    <p style={{ color: '#666', fontSize: '0.9rem' }}>Agendar equipamentos do laboratorio</p>
                  </div>
                </Link>
              )}

              {(isPosGraduando || isAdmin) && (
                <Link href="/residuos" style={{ textDecoration: 'none' }}>
                  <div className="card card-red">
                    <div className="card-header">
                      <span>Trash</span>
                      <span>Residuos</span>
                    </div>
                    <p style={{ color: '#666', fontSize: '0.9rem' }}>Registrar e gerenciar residuos</p>
                  </div>
                </Link>
              )}

              <Link href="/amostras" style={{ textDecoration: 'none' }}>
                <div className="card card-green">
                  <div className="card-header">
                    <span>Samples</span>
                    <span>Selecao de Amostras</span>
                  </div>
                  <p style={{ color: '#666', fontSize: '0.9rem' }}>Selecionar melhor combinacao de amostras</p>
                </div>
              </Link>

              <Link href="/removedor-bg" style={{ textDecoration: 'none' }}>
                <div className="card card-purple">
                  <div className="card-header">
                    <span>Image</span>
                    <span>Remover Background</span>
                  </div>
                  <p style={{ color: '#666', fontSize: '0.9rem' }}>Remover fundo de imagens</p>
                </div>
              </Link>

              {isAdmin && (
                <Link href="/admin" style={{ textDecoration: 'none' }}>
                  <div className="card card-teal">
                    <div className="card-header">
                      <span>Settings</span>
                      <span>Painel Admin</span>
                    </div>
                    <p style={{ color: '#666', fontSize: '0.9rem' }}>Gerenciar usuarios e permissoes</p>
                  </div>
                </Link>
              )}
            </div>
          </>
        ) : (
          <div style={{ marginTop: '2rem', padding: '2rem', background: '#f0f0f0', borderRadius: '8px', textAlign: 'center' }}>
            <p style={{ fontSize: '1.1rem', color: '#666' }}>
              Sua conta esta aguardando aprovacao. Entre em contato com um administrador para ter acesso as funcionalidades.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
