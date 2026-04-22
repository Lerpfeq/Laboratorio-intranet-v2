'use client';

import { useState, FormEvent } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleEmailSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        router.replace('/dashboard');
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setLoading(true);
    signIn('google', { redirect: true, callbackUrl: '/dashboard' });
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: 'white', borderRadius: '8px', padding: '2rem', maxWidth: '400px', width: '100%', boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto 1rem' }}>
            <Image src="/logo.png" alt="LERP Logo" fill style={{ objectFit: 'contain' }} />
          </div>
          <h1 style={{ fontSize: '1.5rem', color: '#1a1a2e' }}>LERP Intranet</h1>
          <p style={{ color: '#666', marginTop: '0.5rem' }}>Laboratório de Engenharia de Reações Poliméricas</p>
        </div>

        {error && <div style={{ background: '#f8d7da', color: '#721c24', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleEmailSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              disabled={loading}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.95rem' }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.95rem' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '0.75rem', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Conectando...' : 'Entrar'}
          </button>
        </form>

        <div style={{ position: 'relative', margin: '2rem 0' }}>
          <hr style={{ border: 'none', borderTop: '1px solid #ddd' }} />
          <span style={{ position: 'absolute', left: '50%', top: '-10px', transform: 'translateX(-50%)', background: 'white', padding: '0 0.5rem', color: '#666', fontSize: '0.85rem' }}>OU</span>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{ width: '100%', padding: '0.75rem', background: '#fff', border: '1px solid #ddd', borderRadius: '4px', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          <span>Entrar com Google</span>
        </button>

        <p style={{ textAlign: 'center', marginTop: '2rem', color: '#666', fontSize: '0.9rem' }}>
          Não tem conta? <Link href="/signup" style={{ color: '#3498db', textDecoration: 'none', fontWeight: 500 }}>Criar conta</Link>
        </p>
      </div>
    </div>
  );
}
