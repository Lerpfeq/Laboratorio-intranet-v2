'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReagenteLabelPreview from '@/components/ReagenteLabelPreview';

export default function ReemitirEtiquetaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [reagente, setReagente] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarReagente() {
      try {
        const response = await fetch(`/api/reagentes/${params.id}`);
        const data = await response.json();

        if (data.success) {
          setReagente(data.reagente);
        }
      } catch (error) {
        console.error('Erro:', error);
      } finally {
        setLoading(false);
      }
    }

    if (params?.id) {
      carregarReagente();
    }
  }, [params?.id]);

  if (loading) return <div className="container">Carregando...</div>;
  if (!reagente) return <div className="container">Reagente não encontrado</div>;

  return (
    <div className="container">
      <h1>Reemissão de Etiqueta</h1>

      <ReagenteLabelPreview
        reagente={reagente}
        onRegisterAnother={() => router.push('/reagentes')}
      />
    </div>
  );
}
