'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

/* ───────── Types ───────── */
interface Category {
  id: string;
  name: string;
  letter: string;
  description: string | null;
  storageMap: string | null;
  order: number;
}

interface Location {
  id: string;
  name: string;
  description: string | null;
  type: string | null;
  order: number;
}

/* ───────── Main Page ───────── */
export default function AdminSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [catModal, setCatModal] = useState(false);
  const [locModal, setLocModal] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [editingLoc, setEditingLoc] = useState<Location | null>(null);

  const [message, setMessage] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [missingCodes, setMissingCodes] = useState<string[]>([]);
  const [investigating, setInvestigating] = useState(false);
  const [similarResults, setSimilarResults] = useState<any[]>([]);
  const [testingEmail, setTestingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState<any>(null);

  // Auth guard
  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      fetch('/api/auth/me')
        .then((r) => r.json())
        .then((u) => {
          setUser(u);
          if (u.category !== 'Admin') router.replace('/dashboard');
        })
        .catch(() => router.replace('/dashboard'))
        .finally(() => setLoading(false));
    }
  }, [session, router]);

  const fetchCategories = useCallback(async () => {
    const r = await fetch('/api/admin/categories');
    if (r.ok) setCategories(await r.json());
  }, []);

  const fetchLocations = useCallback(async () => {
    const r = await fetch('/api/admin/locations');
    if (r.ok) setLocations(await r.json());
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchLocations();
  }, [fetchCategories, fetchLocations]);

  /* ── Category CRUD ── */
  const saveCat = async (data: Partial<Category>) => {
    setMessage('');
    const url = editingCat ? `/api/admin/categories/${editingCat.id}` : '/api/admin/categories';
    const method = editingCat ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const json = await res.json();
    if (!res.ok) { setMessage(json.error || 'Error saving category'); return; }
    setCatModal(false);
    setEditingCat(null);
    fetchCategories();
    setMessage('Category saved ✓');
  };

  const deleteCat = async (id: string) => {
    if (!confirm('Delete this category? This cannot be undone.')) return;
    const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
    if (res.ok) { fetchCategories(); setMessage('Category deleted ✓'); }
  };

  /* ── Location CRUD ── */
  const saveLoc = async (data: Partial<Location>) => {
    setMessage('');
    const url = editingLoc ? `/api/admin/locations/${editingLoc.id}` : '/api/admin/locations';
    const method = editingLoc ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const json = await res.json();
    if (!res.ok) { setMessage(json.error || 'Error saving location'); return; }
    setLocModal(false);
    setEditingLoc(null);
    fetchLocations();
    setMessage('Location saved ✓');
  };

  const deleteLoc = async (id: string) => {
    if (!confirm('Delete this storage location? This cannot be undone.')) return;
    const res = await fetch(`/api/admin/locations/${id}`, { method: 'DELETE' });
    if (res.ok) { fetchLocations(); setMessage('Location deleted ✓'); }
  };

  /* ── Seed Database ── */
  const handleSeed = async () => {
    if (!confirm('⚠️ This will DELETE all existing categories and locations and recreate the default 18 categories + 10 locations.\n\nContinue?')) return;
    setSeeding(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/seed', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setMessage(`✅ ${data.message}`);
        fetchCategories();
        fetchLocations();
      } else {
        setMessage(`❌ Error: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setSeeding(false);
    }
  };

  /* ── Update Reagents ── */
  const handleUpdateReagents = async () => {
    if (!confirm('📋 This will update ~230 reagents with new expiry dates, concentrations, quantities and brands from the spreadsheet.\n\nContinue?')) return;
    setUpdating(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/update-reagents', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const { results } = data;
        setMessage(`✅ Update completed!\n📊 Total: ${results.total}\n✅ Updated: ${results.updated}\n⚠️ Not Found: ${results.notFound}\n❌ Errors: ${results.errors}`);
      } else {
        setMessage(`❌ Error: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  /* ── Check Missing Codes ── */
  const handleCheckMissing = async () => {
    setChecking(true);
    setMessage('');
    setMissingCodes([]);
    try {
      const res = await fetch('/api/admin/check-missing-codes');
      const data = await res.json();
      if (data.success) {
        setMissingCodes(data.missingCodes || []);
        setMessage(`📊 Check completed!\n✅ Found: ${data.found}\n⚠️ Not Found: ${data.notFound}`);
      } else {
        setMessage(`❌ Error: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setChecking(false);
    }
  };

  /* ── Investigate Similar Codes ── */
  const handleInvestigate = async () => {
    setInvestigating(true);
    setMessage('');
    setSimilarResults([]);
    try {
      const res = await fetch('/api/admin/find-similar-codes');
      const data = await res.json();
      if (data.success) {
        setSimilarResults(data.results || []);
        setMessage(`🔍 Investigation completed! Found ${data.results.length} codes to analyze.`);
      } else {
        setMessage(`❌ Error: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setInvestigating(false);
    }
  };

  /* ── Test Email System ── */
  const handleTestEmail = async () => {
    setTestingEmail(true);
    setEmailResult(null);
    setMessage('');
    const startTime = Date.now();
    try {
      const res = await fetch('/api/test-email', { method: 'POST' });
      const data = await res.json();
      const elapsed = Date.now() - startTime;
      setEmailResult({ ...data, totalElapsed: elapsed });
      if (data.success) {
        setMessage(`✅ Test email sent to ${data.message?.replace('Test email sent to ', '') || user?.email}`);
      } else {
        setMessage(`❌ Email test failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      setEmailResult({ success: false, error: err.message, totalElapsed: Date.now() - startTime });
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setTestingEmail(false);
    }
  };

  if (status === 'loading' || loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  if (!user || user.category !== 'Admin') return null;

  return (
    <div>
      {/* Header */}
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
            <Link href="/admin">Admin</Link>
            <Link href="/admin/settings" style={{ fontWeight: 'bold' }}>Settings</Link>
          </nav>
          <div className="user-menu">
            <span>{user?.name}</span>
          </div>
        </div>
      </header>

      <main className="container" style={{ maxWidth: '1100px' }}>
        <h2 className="page-title">⚙️ Admin Settings</h2>
        <p style={{ color: '#666', marginBottom: '2rem' }}>
          Manage reagent categories and storage locations used across the system.
        </p>

        {message && (
          <div
            style={{
              padding: '10px 16px',
              marginBottom: '1.5rem',
              borderRadius: '6px',
              background: message.includes('Error') ? '#fce4e4' : '#e8f5e9',
              color: message.includes('Error') ? '#c62828' : '#2e7d32',
            }}
          >
            {message}
          </div>
        )}

        {/* ────── TEST EMAIL SYSTEM ────── */}
        <div
          style={{
            padding: '16px 20px',
            marginBottom: '2rem',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #e8f5e9 0%, #e3f2fd 100%)',
            border: '1px solid #81c784',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <strong style={{ color: '#2e7d32', fontSize: '15px' }}>📧 Test Email System</strong>
              <p style={{ margin: '4px 0 0', color: '#558b2f', fontSize: '14px' }}>
                Send a test email to <strong>{user?.email || 'your address'}</strong> to verify SMTP is working.
              </p>
            </div>
            <button
              onClick={handleTestEmail}
              disabled={testingEmail}
              style={{
                whiteSpace: 'nowrap',
                padding: '10px 22px',
                fontSize: '14px',
                fontWeight: 'bold',
                color: 'white',
                background: testingEmail ? '#9e9e9e' : 'linear-gradient(135deg, #43a047, #1b5e20)',
                border: 'none',
                borderRadius: '6px',
                cursor: testingEmail ? 'not-allowed' : 'pointer',
                boxShadow: testingEmail ? 'none' : '0 2px 8px rgba(46,125,50,0.3)',
                transition: 'all 0.2s',
              }}
            >
              {testingEmail ? '⏳ Sending...' : '📧 Test Email System'}
            </button>
          </div>

          {/* ── Email Test Result ── */}
          {emailResult && (
            <div
              style={{
                marginTop: '14px',
                padding: '14px 16px',
                borderRadius: '6px',
                background: emailResult.success ? '#f1f8e9' : '#ffebee',
                border: `1px solid ${emailResult.success ? '#aed581' : '#ef9a9a'}`,
                fontSize: '13px',
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '8px', color: emailResult.success ? '#33691e' : '#b71c1c' }}>
                {emailResult.success ? '✅ Email sent successfully!' : `❌ Failed: ${emailResult.error}`}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', color: '#555' }}>
                {emailResult.message && (
                  <>
                    <span style={{ fontWeight: 600 }}>📬 Sent to:</span>
                    <span>{emailResult.message?.replace('Test email sent to ', '') || '—'}</span>
                  </>
                )}
                {emailResult.messageId && (
                  <>
                    <span style={{ fontWeight: 600 }}>🆔 Message ID:</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all' }}>{emailResult.messageId}</span>
                  </>
                )}
                {emailResult.elapsedMs != null && (
                  <>
                    <span style={{ fontWeight: 600 }}>⚡ SMTP time:</span>
                    <span>{emailResult.elapsedMs}ms</span>
                  </>
                )}
                {emailResult.totalElapsed != null && (
                  <>
                    <span style={{ fontWeight: 600 }}>⏱️ Total time:</span>
                    <span>{emailResult.totalElapsed}ms</span>
                  </>
                )}
                {emailResult.smtpResponse && (
                  <>
                    <span style={{ fontWeight: 600 }}>📡 SMTP:</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{emailResult.smtpResponse}</span>
                  </>
                )}
              </div>

              {/* Step-by-step log */}
              {emailResult.steps && emailResult.steps.length > 0 && (
                <details style={{ marginTop: '10px' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#666', fontSize: '12px' }}>
                    📋 Detailed log ({emailResult.steps.length} steps)
                  </summary>
                  <div
                    style={{
                      marginTop: '6px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      background: '#fafafa',
                      padding: '8px',
                      borderRadius: '4px',
                      lineHeight: '1.6',
                    }}
                  >
                    {emailResult.steps.map((s: any, i: number) => (
                      <div key={i} style={{ borderBottom: '1px solid #eee', paddingBottom: '2px', marginBottom: '2px' }}>
                        <span style={{ color: '#999' }}>{i + 1}.</span>{' '}
                        <strong style={{ color: '#333' }}>{s.step}:</strong>{' '}
                        <span style={{ color: s.result?.includes('✅') ? '#2e7d32' : s.result?.includes('❌') ? '#c62828' : '#555' }}>
                          {s.result}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {/* Fix suggestion for failures */}
              {emailResult.fix && (
                <div style={{ marginTop: '8px', padding: '8px', background: '#fff8e1', borderRadius: '4px', fontSize: '12px', color: '#f57f17' }}>
                  💡 <strong>Fix:</strong> {emailResult.fix}
                </div>
              )}
              {emailResult.possibleCauses && (
                <div style={{ marginTop: '8px', padding: '8px', background: '#fff8e1', borderRadius: '4px', fontSize: '12px', color: '#f57f17' }}>
                  💡 <strong>Possible causes:</strong>
                  <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                    {emailResult.possibleCauses.map((c: string, i: number) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ────── SEED BUTTON ────── */}
        {categories.length === 0 && locations.length === 0 && (
          <div
            style={{
              padding: '16px 20px',
              marginBottom: '2rem',
              borderRadius: '8px',
              background: '#e3f2fd',
              border: '1px solid #90caf9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <strong style={{ color: '#1565c0' }}>🌱 Initialize Database</strong>
              <p style={{ margin: '4px 0 0', color: '#1976d2', fontSize: '14px' }}>
                No data found. Click to load the default 18 categories and 10 storage locations.
              </p>
            </div>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="button button-primary"
              style={{ whiteSpace: 'nowrap', opacity: seeding ? 0.6 : 1 }}
            >
              {seeding ? '⏳ Seeding...' : '🌱 Seed Database'}
            </button>
          </div>
        )}

        {/* ────── UPDATE REAGENTS BUTTON ────── */}
        <div
          style={{
            padding: '16px 20px',
            marginBottom: '2rem',
            borderRadius: '8px',
            background: '#fff3e0',
            border: '1px solid #ffb74d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <strong style={{ color: '#e65100' }}>📋 Update Reagent Database</strong>
            <p style={{ margin: '4px 0 0', color: '#ef6c00', fontSize: '14px' }}>
              Update ~230 reagents with corrected expiry dates, concentrations, quantities and brands from spreadsheet.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleInvestigate}
              disabled={investigating}
              className="button"
              style={{
                whiteSpace: 'nowrap',
                opacity: investigating ? 0.6 : 1,
                background: '#9c27b0',
                color: 'white',
                border: 'none',
              }}
            >
              {investigating ? '⏳ Investigating...' : '🔬 Investigate'}
            </button>
            <button
              onClick={handleCheckMissing}
              disabled={checking}
              className="button"
              style={{
                whiteSpace: 'nowrap',
                opacity: checking ? 0.6 : 1,
                background: '#2196f3',
                color: 'white',
                border: 'none',
              }}
            >
              {checking ? '⏳ Checking...' : '🔍 Check Missing'}
            </button>
            <button
              onClick={handleUpdateReagents}
              disabled={updating}
              className="button"
              style={{
                whiteSpace: 'nowrap',
                opacity: updating ? 0.6 : 1,
                background: '#ff9800',
                color: 'white',
                border: 'none',
              }}
            >
              {updating ? '⏳ Updating...' : '📋 Update Reagents'}
            </button>
          </div>
        </div>

        {/* ────── MISSING CODES LIST ────── */}
        {missingCodes.length > 0 && (
          <div
            style={{
              padding: '16px 20px',
              marginBottom: '2rem',
              borderRadius: '8px',
              background: '#ffebee',
              border: '1px solid #ef5350',
            }}
          >
            <strong style={{ color: '#c62828', display: 'block', marginBottom: '0.5rem' }}>
              ⚠️ Missing Codes ({missingCodes.length}):
            </strong>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: '0.5rem',
                fontSize: '13px',
                fontFamily: 'monospace',
                color: '#b71c1c',
              }}
            >
              {missingCodes.map((code) => (
                <div key={code} style={{ padding: '4px 8px', background: 'white', borderRadius: '4px' }}>
                  {code}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ────── INVESTIGATION RESULTS ────── */}
        {similarResults.length > 0 && (
          <div
            style={{
              padding: '16px 20px',
              marginBottom: '2rem',
              borderRadius: '8px',
              background: '#f3e5f5',
              border: '1px solid #ba68c8',
            }}
          >
            <strong style={{ color: '#6a1b9a', display: 'block', marginBottom: '1rem' }}>
              🔬 Investigation Results:
            </strong>
            {similarResults.map((result, idx) => (
              <div
                key={idx}
                style={{
                  marginBottom: '1rem',
                  padding: '12px',
                  background: 'white',
                  borderRadius: '6px',
                  border: '1px solid #e1bee7',
                }}
              >
                <div style={{ marginBottom: '8px' }}>
                  <strong style={{ color: '#7b1fa2', fontFamily: 'monospace', fontSize: '14px' }}>
                    {result.original}
                  </strong>
                  <span style={{ marginLeft: '8px', fontSize: '12px', color: '#666' }}>
                    (Letter: {result.letterPart}, Numbers: {result.numPart})
                  </span>
                </div>
                {result.similar.length > 0 ? (
                  <div style={{ fontSize: '13px' }}>
                    <div style={{ color: '#8e24aa', marginBottom: '4px' }}>
                      Found {result.similarCount} similar code(s):
                    </div>
                    {result.similar.map((sim: any, i: number) => (
                      <div
                        key={i}
                        style={{
                          padding: '4px 8px',
                          marginBottom: '2px',
                          background: '#fce4ec',
                          borderRadius: '4px',
                          fontFamily: 'monospace',
                          fontSize: '12px',
                        }}
                      >
                        <strong>{sim.code}</strong> - {sim.name}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: '#999' }}>No similar codes found</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ────── CATEGORIES ────── */}
        <section style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>📦 Reagent Categories</h3>
            <button
              onClick={() => { setEditingCat(null); setCatModal(true); }}
              className="button button-primary"
            >
              + New Category
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Letter</th>
                  <th>Storage Location</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999' }}>No categories yet</td></tr>
                ) : categories.map((cat) => (
                  <tr key={cat.id}>
                    <td>{cat.order}</td>
                    <td><strong>{cat.name}</strong></td>
                    <td><code style={{ fontSize: '1.1em' }}>{cat.letter}</code></td>
                    <td style={{ fontSize: '0.9em' }}>{cat.storageMap || '-'}</td>
                    <td style={{ color: '#666', fontSize: '0.9em' }}>{cat.description || '-'}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => { setEditingCat(cat); setCatModal(true); }}
                        className="button-secondary"
                        style={{ fontSize: '13px', padding: '4px 10px', marginRight: '6px' }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => deleteCat(cat.id)}
                        className="button-secondary"
                        style={{ fontSize: '13px', padding: '4px 10px', color: '#c62828' }}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ────── LOCATIONS ────── */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>📍 Storage Locations</h3>
            <button
              onClick={() => { setEditingLoc(null); setLocModal(true); }}
              className="button button-primary"
              style={{ background: '#28a745' }}
            >
              + New Location
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {locations.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: '#999' }}>No locations yet</td></tr>
                ) : locations.map((loc) => (
                  <tr key={loc.id}>
                    <td>{loc.order}</td>
                    <td><strong>{loc.name}</strong></td>
                    <td>{loc.type || '-'}</td>
                    <td style={{ color: '#666', fontSize: '0.9em' }}>{loc.description || '-'}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => { setEditingLoc(loc); setLocModal(true); }}
                        className="button-secondary"
                        style={{ fontSize: '13px', padding: '4px 10px', marginRight: '6px' }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => deleteLoc(loc.id)}
                        className="button-secondary"
                        style={{ fontSize: '13px', padding: '4px 10px', color: '#c62828' }}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* ────── MODALS ────── */}
      {catModal && (
        <CategoryModal
          category={editingCat}
          onSave={saveCat}
          onClose={() => { setCatModal(false); setEditingCat(null); }}
        />
      )}
      {locModal && (
        <LocationModal
          location={editingLoc}
          onSave={saveLoc}
          onClose={() => { setLocModal(false); setEditingLoc(null); }}
        />
      )}
    </div>
  );
}

/* ────────────────── Category Modal ────────────────── */
function CategoryModal({
  category,
  onSave,
  onClose,
}: {
  category: Category | null;
  onSave: (data: Partial<Category>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(category?.name || '');
  const [letter, setLetter] = useState(category?.letter || 'U');
  const [description, setDescription] = useState(category?.description || '');
  const [storageMap, setStorageMap] = useState(category?.storageMap || '');
  const [order, setOrder] = useState(category?.order ?? 0);

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3 style={{ marginBottom: '1.2rem' }}>{category ? '✏️ Edit Category' : '➕ New Category'}</h3>

        <div style={fieldStyle}>
          <label style={labelStyle}>Name *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="e.g. Acid" />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Code Letter</label>
          <input type="text" value={letter} onChange={(e) => setLetter(e.target.value.toUpperCase().slice(0, 1))} style={{ ...inputStyle, width: '60px' }} maxLength={1} placeholder="A" />
          <small style={{ color: '#666', marginTop: '2px', display: 'block' }}>Single letter used in internal code (LERP-<strong>{letter || 'U'}</strong>1234)</small>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Default Storage Location</label>
          <input type="text" value={storageMap} onChange={(e) => setStorageMap(e.target.value)} style={inputStyle} placeholder="e.g. CAB 1 — SHF 1 - Acid" />
          <small style={{ color: '#666', marginTop: '2px', display: 'block' }}>Auto-filled when this category is selected in the reagent form</small>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Description</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} style={inputStyle} placeholder="Optional description" />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Order</label>
          <input type="number" value={order} onChange={(e) => setOrder(parseInt(e.target.value) || 0)} style={{ ...inputStyle, width: '80px' }} />
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
          <button
            onClick={() => onSave({ name, letter, description, storageMap, order })}
            disabled={!name.trim()}
            className="button button-primary"
          >
            {category ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────── Location Modal ────────────────── */
function LocationModal({
  location,
  onSave,
  onClose,
}: {
  location: Location | null;
  onSave: (data: Partial<Location>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(location?.name || '');
  const [description, setDescription] = useState(location?.description || '');
  const [type, setType] = useState(location?.type || '');
  const [order, setOrder] = useState(location?.order ?? 0);

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3 style={{ marginBottom: '1.2rem' }}>{location ? '✏️ Edit Location' : '➕ New Location'}</h3>

        <div style={fieldStyle}>
          <label style={labelStyle}>Name *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="e.g. CAB 1 — SHF 1" />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}>
            <option value="">Select type...</option>
            <option value="Cabinet">Cabinet</option>
            <option value="Refrigerator">Refrigerator</option>
            <option value="Freezer">Freezer</option>
            <option value="Fume Hood">Fume Hood</option>
            <option value="Storage Room">Storage Room</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Description</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} style={inputStyle} placeholder="Optional description" />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Order</label>
          <input type="number" value={order} onChange={(e) => setOrder(parseInt(e.target.value) || 0)} style={{ ...inputStyle, width: '80px' }} />
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
          <button
            onClick={() => onSave({ name, description, type, order })}
            disabled={!name.trim()}
            className="button button-primary"
            style={{ background: '#28a745' }}
          >
            {location ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────── Shared styles ────────────────── */
const overlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.45)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const modalStyle: React.CSSProperties = {
  background: 'white', padding: '2rem', borderRadius: '10px',
  width: '520px', maxWidth: '95vw', boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
};
const fieldStyle: React.CSSProperties = { marginBottom: '1rem' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '14px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px' };
const cancelBtnStyle: React.CSSProperties = { padding: '8px 16px', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', background: '#f5f5f5' };
