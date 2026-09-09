'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

type UserInfo = {
  id: string;
  name: string | null;
  email: string | null;
  category: string | null;
  status: string;
};

export default function ResiduosPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  useEffect(() => {
    async function bootstrap() {
      try {
        const userRes = await fetch('/api/auth/me');
        if (userRes.ok) {
          const userData = await userRes.json();
          setUser(userData);
        }

        const residuosRes = await fetch('/api/residuos');
        if (residuosRes.ok) {
          const residuos = await residuosRes.json();
          setTotal(Array.isArray(residuos) ? residuos.length : 0);
        }
      } catch (error) {
        console.error('Error loading waste records:', error);
      } finally {
        setLoading(false);
      }
    }

    if (session?.user?.id) {
      bootstrap();
    }
  }, [session]);

  if (status === 'loading' || loading) {
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
        <h2 className="page-title">Waste Management</h2>

        <div
          style={{
            marginBottom: '1.5rem',
            padding: '1rem',
            backgroundColor: '#ecf0f1',
            borderRadius: '4px',
          }}
        >
          <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>📦 Summary</h3>
          <p style={{ margin: 0, color: '#2c3e50' }}>
            Total registered bottles: <strong>{total}</strong>
          </p>
        </div>

        <div className="card-grid" style={{ marginBottom: 0 }}>
          <div className="card card-blue" style={{ cursor: 'default' }}>
            <div className="card-header">
              <span className="card-icon">🧪</span>
              <span>Bottle Registration</span>
            </div>
            <p style={{ margin: 0, color: '#555' }}>
              Register new bottles with detailed composition and generate the internal label in PDF.
            </p>
            <div>
              <Link href="/residuos/cadastro">
                <button className="button button-primary">Go to registration</button>
              </Link>
            </div>
          </div>

          <div className="card card-purple" style={{ cursor: 'default' }}>
            <div className="card-header">
              <span className="card-icon">📋</span>
              <span>Collection</span>
            </div>
            <p style={{ margin: 0, color: '#555' }}>
              Select bottles, enter current volume and generate spreadsheet + campaign labels.
            </p>
            <div>
              <Link href="/residuos/campanha">
                <button className="button button-primary">Go to campaign</button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
