'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
      } finally {
        setLoading(false);
      }
    }

    if (session?.user?.id) {
      bootstrap();
    }
  }, [session]);

  if (status === 'loading' || loading) {
    return <div style={{ padding: '2rem' }}>Carregando...</div>;
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
            <Link href="/residuos">Resíduos</Link>
            <Link href="/residuos/cadastro">Cadastro</Link>
            <Link href="/residuos/campanha">Campanha</Link>
          </nav>
          <div className="user-menu">
            <span>{user?.name || user?.email}</span>
            <button onClick={() => router.push('/api/auth/signout')}>Sair</button>
          </div>
        </div>
      </header>

      <main className="container space-y-6">
        <h2 className="page-title !mb-0">Gestão de Resíduos</h2>

        <Card>
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Total de frascos cadastrados: <strong>{total}</strong>
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Cadastro de frascos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Registre novos frascos com composição detalhada e gere a etiqueta interna em PDF.
              </p>
              <Link href="/residuos/cadastro"><Button>Ir para cadastro</Button></Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Campanha de recolhimento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Selecione frascos, informe o volume atual e gere planilha + etiquetas da campanha.
              </p>
              <Link href="/residuos/campanha"><Button>Ir para campanha</Button></Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
