'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function SeedPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    fetch('/api/seed/reagentes')
      .then(r => r.json())
      .then(setStatus)
      .catch(() => {});
  }, [resultado]);

  const executarSeed = async () => {
    if (!confirm(
      'Tem certeza que deseja importar os 230 reagentes?\n\n' +
      'Esta operação criará registros no banco de PRODUÇÃO.\n' +
      'Execute apenas UMA VEZ!'
    )) {
      return;
    }

    setLoading(true);
    setResultado(null);

    try {
      const response = await fetch('/api/seed/reagentes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const data = await response.json();
      setResultado(data);
    } catch (error: any) {
      setResultado({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '10px' }}>
        {'🌱'} Seed - Importação de Reagentes
      </h1>

      {status && (
        <div style={{
          background: '#e8f4fd',
          border: '1px solid #bee5eb',
          padding: '15px',
          borderRadius: '8px',
          marginTop: '15px'
        }}>
          <h4 style={{ margin: '0 0 8px' }}>{'📊'} Estado atual do banco</h4>
          <p style={{ margin: '4px 0' }}>Reagente (master): <strong>{status.totalReagentes ?? '?'}</strong></p>
          <p style={{ margin: '4px 0' }}>ReagenteEntrada (frascos): <strong>{status.totalEntradas ?? '?'}</strong></p>
          <p style={{ margin: '4px 0' }}>Arquivo seed: <strong>{status.seedFileExists ? 'Encontrado ✅' : 'Não encontrado ❌'}</strong></p>
        </div>
      )}

      <div style={{
        background: '#fff3cd',
        border: '1px solid #ffc107',
        padding: '20px',
        borderRadius: '8px',
        marginTop: '20px'
      }}>
        <h3 style={{ margin: '0 0 10px' }}>{'⚠️'} Atenção!</h3>
        <p>Esta operação irá importar <strong>230 reagentes</strong> do arquivo Excel processado para o banco de dados de produção.</p>
        <p>Certifique-se de executar apenas <strong>UMA VEZ</strong>.</p>
        <p>O primeiro usuário do banco será usado como responsável pela importação.</p>
      </div>

      <button
        onClick={executarSeed}
        disabled={loading}
        style={{
          marginTop: '30px',
          padding: '15px 30px',
          fontSize: '16px',
          backgroundColor: loading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'block'
        }}
      >
        {loading ? '⏳ Importando... (pode levar 1-2 min)' : '🚀 Executar Importação'}
      </button>

      {resultado && (
        <div style={{
          marginTop: '30px',
          padding: '20px',
          background: resultado.success ? '#d4edda' : '#f8d7da',
          border: `1px solid ${resultado.success ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '8px'
        }}>
          <h3 style={{ margin: '0 0 10px' }}>
            {resultado.success ? '✅ Sucesso!' : '❌ Erro'}
          </h3>
          <p><strong>Mensagem:</strong> {resultado.message || resultado.error}</p>

          {resultado.sucessos !== undefined && (
            <>
              <p><strong>Sucessos:</strong> {resultado.sucessos}</p>
              <p><strong>Erros:</strong> {resultado.erros}</p>
              <p><strong>Total Reagente (master):</strong> {resultado.totalReagentes}</p>
              <p><strong>Total Entradas (frascos):</strong> {resultado.totalEntradas}</p>
            </>
          )}

          {resultado.errosDetalhados && resultado.errosDetalhados.length > 0 && (
            <details style={{ marginTop: '10px' }}>
              <summary style={{ cursor: 'pointer' }}>
                Ver erros detalhados ({resultado.errosDetalhados.length})
              </summary>
              <ul style={{ maxHeight: '300px', overflow: 'auto' }}>
                {resultado.errosDetalhados.map((e: any, i: number) => (
                  <li key={i}><strong>{e.reagente}:</strong> {e.erro}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <div style={{
        marginTop: '40px',
        padding: '20px',
        background: '#f8f9fa',
        borderRadius: '8px',
        fontSize: '14px'
      }}>
        <h4 style={{ margin: '0 0 10px' }}>{'ℹ️'} Informações</h4>
        <p><strong>Arquivo seed:</strong> /public/data/reagentes_seed.json</p>
        <p><strong>Total de reagentes no arquivo:</strong> 230</p>
        <p><strong>Usuário logado:</strong> {session?.user?.name || 'Não logado'}</p>
        <p style={{ marginTop: '10px', color: '#666' }}>
          Você também pode executar via curl:<br />
          <code style={{ background: '#e9ecef', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
            {`curl -X POST https://seu-site.onrender.com/api/seed/reagentes -H "x-seed-secret: lerp-seed-2026"`}
          </code>
        </p>
      </div>
    </div>
  );
}
