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
      'Are you sure you want to import 230 reagents?\n\n' +
      'This operation will create records in the PRODUCTION database.\n' +
      'Run only ONCE!'
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
        {'🌱'} Seed - Reagent Import
      </h1>

      {status && (
        <div style={{
          background: '#e8f4fd',
          border: '1px solid #bee5eb',
          padding: '15px',
          borderRadius: '8px',
          marginTop: '15px'
        }}>
          <h4 style={{ margin: '0 0 8px' }}>{'📊'} Current database state</h4>
          <p style={{ margin: '4px 0' }}>Reagent (master): <strong>{status.totalReagentes ?? '?'}</strong></p>
          <p style={{ margin: '4px 0' }}>ReagentEntry (bottles): <strong>{status.totalEntradas ?? '?'}</strong></p>
          <p style={{ margin: '4px 0' }}>Seed file: <strong>{status.seedFileExists ? 'Found ✅' : 'Not found ❌'}</strong></p>
        </div>
      )}

      <div style={{
        background: '#fff3cd',
        border: '1px solid #ffc107',
        padding: '20px',
        borderRadius: '8px',
        marginTop: '20px'
      }}>
        <h3 style={{ margin: '0 0 10px' }}>{'⚠️'} Warning!</h3>
        <p>This operation will import <strong>230 reagents</strong> from the processed Excel file into the production database.</p>
        <p>Make sure to run only <strong>ONCE</strong>.</p>
        <p>The first user in the database will be used as the import responsible.</p>
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
        {loading ? '⏳ Importing... (may take 1-2 min)' : '🚀 Run Import'}
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
            {resultado.success ? '✅ Success!' : '❌ Error'}
          </h3>
          <p><strong>Message:</strong> {resultado.message || resultado.error}</p>

          {resultado.sucessos !== undefined && (
            <>
              <p><strong>Successes:</strong> {resultado.sucessos}</p>
              <p><strong>Errors:</strong> {resultado.erros}</p>
              <p><strong>Total Reagent (master):</strong> {resultado.totalReagentes}</p>
              <p><strong>Total Entries (bottles):</strong> {resultado.totalEntradas}</p>
            </>
          )}

          {resultado.errosDetalhados && resultado.errosDetalhados.length > 0 && (
            <details style={{ marginTop: '10px' }}>
              <summary style={{ cursor: 'pointer' }}>
                View detailed errors ({resultado.errosDetalhados.length})
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
        <h4 style={{ margin: '0 0 10px' }}>{'ℹ️'} Information</h4>
        <p><strong>Seed file:</strong> /public/data/reagentes_seed.json</p>
        <p><strong>Total reagents in file:</strong> 230</p>
        <p><strong>Logged in user:</strong> {session?.user?.name || 'Not logged in'}</p>
        <p style={{ marginTop: '10px', color: '#666' }}>
          You can also run via curl:<br />
          <code style={{ background: '#e9ecef', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
            {`curl -X POST https://your-site.onrender.com/api/seed/reagentes -H "x-seed-secret: lerp-seed-2026"`}
          </code>
        </p>
      </div>
    </div>
  );
}
