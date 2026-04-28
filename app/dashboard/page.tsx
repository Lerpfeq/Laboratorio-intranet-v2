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
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>;
  }

  if (!user) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Error loading user data</div>;
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
                <Link href="/dashboard">Dashboard</Link>
                <Link href="/reagentes">Reagent</Link>
                {(isPosGraduando || isAdmin) && <Link href="/agendamento">Calendar</Link>}
                {(isPosGraduando || isAdmin) && <Link href="/residuos">Waste</Link>}
                <Link href="/amostras">Samples Seletion</Link>
                <Link href="/removedor-bg">Image</Link>
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
              <strong>Pending approval</strong><br />
               Your account is pending approval by an administrator. You will be notified shortly.
            </div>
          </div>
        )}

        <h2 className="page-title">Welcome, {user.name || user.email}!</h2>

        {user.status === 'approved' ? (
          <>
            <p style={{ marginBottom: '2rem', fontSize: '1.05rem', color: '#666' }}>
              Select an option below to get started:
            </p>

            <div className="card-grid">
              {!isIC && (
                <Link href="/reagentes" style={{ textDecoration: 'none' }}>
                  <div className="card card-blue">
                    <div className="card-header">
                      <span>Reagent inventory</span>
                    </div>
                    <p style={{ color: '#666', fontSize: '0.9rem' }}>Manage reagent inventory</p>
                  </div>
                </Link>
              )}

              {isIC && (
                <Link href="/reagentes" style={{ textDecoration: 'none' }}>
                  <div className="card card-blue">
                    <div className="card-header">
                      <span>Search</span>
                    </div>
                    <p style={{ color: '#666', fontSize: '0.9rem' }}>Check reagent availability</p>
                  </div>
                </Link>
              )}

              {(isPosGraduando || isAdmin) && (
                <Link href="/agendamento" style={{ textDecoration: 'none' }}>
                  <div className="card card-orange">
                    <div className="card-header">
                      <span>Calendar</span>
                    </div>
                    <p style={{ color: '#666', fontSize: '0.9rem' }}>Schedule lab equipment</p>
                  </div>
                </Link>
              )}

              {(isPosGraduando || isAdmin) && (
                <Link href="/residuos" style={{ textDecoration: 'none' }}>
                  <div className="card card-red">
                    <div className="card-header">
                      <span>Waste</span>
                    </div>
                    <p style={{ color: '#666', fontSize: '0.9rem' }}>Record and manage waste</p>
                  </div>
                </Link>
              )}

              <Link href="/amostras" style={{ textDecoration: 'none' }}>
                <div className="card card-green">
                  <div className="card-header">
                    <span>Samples Selection</span>
                  </div>
                  <p style={{ color: '#666', fontSize: '0.9rem' }}>Select the best combination of samples</p>
                </div>
              </Link>

              <Link href="/removedor-bg" style={{ textDecoration: 'none' }}>
                <div className="card card-purple">
                  <div className="card-header">
                    <span>Image</span>
                  </div>
                  <p style={{ color: '#666', fontSize: '0.9rem' }}>Remove the background from images</p>
                </div>
              </Link>

              {isAdmin && (
                <Link href="/admin" style={{ textDecoration: 'none' }}>
                  <div className="card card-teal">
                    <div className="card-header">
                      <span>Settings</span>
                    </div>
                    <p style={{ color: '#666', fontSize: '0.9rem' }}>Manage users and permissions</p>
                  </div>
                </Link>
              )}
            </div>
          </>
        ) : (
          <div style={{ marginTop: '2rem', padding: '2rem', background: '#f0f0f0', borderRadius: '8px', textAlign: 'center' }}>
            <p style={{ fontSize: '1.1rem', color: '#666' }}>
              Your account is pending approval. Please contact an administrator to gain access to the features.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
