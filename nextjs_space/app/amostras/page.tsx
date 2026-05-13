'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface RankingItem {
  combination: number[];
  stdDev: number;
  rank: number;
}

interface BestCompromise {
  samples: number[];
  positions: number[];
  stdDevs: number[];
  totalScore: number;
  worstPosition: number;
}

interface Results {
  totalCombinations: number;
  rankings: RankingItem[][];
  bestCompromise: BestCompromise;
  propertyNames: string[];
}

export default function AmostrasPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Configuration state
  const [nSamples, setNSamples] = useState<number>(10);
  const [nProperties, setNProperties] = useState<number>(3);
  const [nSelect, setNSelect] = useState<number>(5);
  const [propertyNames, setPropertyNames] = useState<string[]>([]);
  const [sampleValues, setSampleValues] = useState<number[][]>([]);
  const [step, setStep] = useState<number>(1);
  const [calculating, setCalculating] = useState(false);
  const [results, setResults] = useState<Results | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // CSV paste
  const pasteRef = useRef<HTMLTextAreaElement>(null);

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
      const res = await fetch('/api/auth/me');
      if (res.ok) setUser(await res.json());
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Step 1 -> Step 2
  const goToPropertyNames = () => {
    if (nSelect > nSamples) {
      setErrorMsg('Samples to select cannot exceed total samples.');
      return;
    }
    if (nSamples < 2 || nProperties < 1 || nSelect < 2) {
      setErrorMsg('Need at least 2 samples, 1 property, and select >= 2.');
      return;
    }
    setErrorMsg('');
    setPropertyNames(Array(nProperties).fill('').map((_, i) => `Property ${i + 1}`));
    setStep(2);
  };

  // Step 2 -> Step 3
  const goToDataEntry = () => {
    setErrorMsg('');
    setSampleValues(
      Array(nSamples).fill(null).map(() => Array(nProperties).fill(0))
    );
    setStep(3);
  };

  const updateValue = (row: number, col: number, val: string) => {
    const newVals = sampleValues.map(r => [...r]);
    newVals[row][col] = parseFloat(val.replace(',', '.')) || 0;
    setSampleValues(newVals);
  };

  const updatePropertyName = (idx: number, name: string) => {
    const n = [...propertyNames];
    n[idx] = name;
    setPropertyNames(n);
  };

  // Parse CSV / tab-separated paste
  const handlePaste = () => {
    const text = pasteRef.current?.value || '';
    if (!text.trim()) return;
    const lines = text.trim().split('\n').filter(l => l.trim());
    const parsed = lines.map(line =>
      line.split(/[,;\t]+/).map(v => parseFloat(v.replace(',', '.').trim()) || 0)
    );
    if (parsed.length > 0) {
      const cols = parsed[0].length;
      // Update config
      setNSamples(parsed.length);
      setNProperties(cols);
      setNSelect(Math.min(nSelect, parsed.length));
      setPropertyNames(prev => {
        const names = [...prev];
        while (names.length < cols) names.push(`Property ${names.length + 1}`);
        return names.slice(0, cols);
      });
      setSampleValues(parsed);
      setErrorMsg('');
    }
  };

  // Calculate
  const calculate = async () => {
    setCalculating(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/sample-selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          samples: sampleValues,
          nSelect,
          propertyNames,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResults(data.results);
        setStep(4);
      } else {
        setErrorMsg(data.error || 'Calculation error');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Network error');
    } finally {
      setCalculating(false);
    }
  };

  if (status === 'loading' || loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  const isAdmin = user?.category === 'Admin';
  const isPosGraduando = user?.category === 'Pos-graduando';

  // Shared styles
  const cardStyle: React.CSSProperties = {
    background: 'white',
    padding: '30px',
    borderRadius: '10px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    marginBottom: '24px',
  };
  const btnPrimary: React.CSSProperties = {
    padding: '12px 28px',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 600,
  };
  const btnSecondary: React.CSSProperties = {
    ...btnPrimary,
    backgroundColor: '#6b7280',
  };
  const btnSuccess: React.CSSProperties = {
    ...btnPrimary,
    backgroundColor: '#16a34a',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '6px',
    fontWeight: 600,
    color: '#374151',
    fontSize: '14px',
  };

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
            <Link href="/reagentes">Reagents</Link>
            {(isPosGraduando || isAdmin) && <Link href="/agendamento">Calendar</Link>}
            {(isPosGraduando || isAdmin) && <Link href="/residuos">Waste</Link>}
            <Link href="/amostras" style={{ borderBottom: '2px solid white', paddingBottom: '4px' }}>Samples</Link>
            <Link href="/removedor-bg">Image</Link>
            {isAdmin && <Link href="/admin">Admin</Link>}
          </nav>
          <div className="user-menu">
            <span>{user?.name}</span>
            <button onClick={() => router.push('/api/auth/signout')}>Log out</button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '30px 20px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
            🔬 Sample Selection — Compromise Algorithm
          </h2>
          <p style={{ color: '#64748b', marginTop: '6px', fontSize: '0.95rem' }}>
            Find the best combination of samples that minimizes standard deviation across multiple properties.
          </p>
        </div>

        {errorMsg && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
            padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontWeight: 500
          }}>
            {errorMsg}
          </div>
        )}

        {/* ========== STEP 1: Configuration ========== */}
        {step === 1 && (
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0, color: '#1e40af' }}>Step 1: Configuration</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              <div>
                <label style={labelStyle}>Total samples (n)</label>
                <input
                  type="number" min={2} max={30} value={nSamples}
                  onChange={e => setNSamples(parseInt(e.target.value) || 2)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Properties per sample</label>
                <input
                  type="number" min={1} max={10} value={nProperties}
                  onChange={e => setNProperties(parseInt(e.target.value) || 1)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Samples to select (k)</label>
                <input
                  type="number" min={2} max={nSamples} value={nSelect}
                  onChange={e => setNSelect(parseInt(e.target.value) || 2)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ background: '#f0f9ff', padding: '16px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', color: '#475569' }}>
              <strong>How it works:</strong> The algorithm generates all C(n, k) combinations, calculates the standard deviation
              of each property for every combination, ranks them, and finds the combination with the best compromise
              (lowest sum of rank positions across all properties).
            </div>

            <button style={btnPrimary} onClick={goToPropertyNames}>
              Next → Define Properties
            </button>
          </div>
        )}

        {/* ========== STEP 2: Property Names ========== */}
        {step === 2 && (
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0, color: '#1e40af' }}>Step 2: Name Your Properties</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>
              Give meaningful names to each property (e.g., Elongation, Tensile Strength, Viscosity).
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              {propertyNames.map((name, idx) => (
                <div key={idx}>
                  <label style={labelStyle}>Property {idx + 1}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => updatePropertyName(idx, e.target.value)}
                    placeholder={`Property ${idx + 1}`}
                    style={inputStyle}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button style={btnSecondary} onClick={() => setStep(1)}>← Back</button>
              <button style={btnPrimary} onClick={goToDataEntry}>Next → Enter Data</button>
            </div>
          </div>
        )}

        {/* ========== STEP 3: Data Entry ========== */}
        {step === 3 && (
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0, color: '#1e40af' }}>Step 3: Enter Sample Values</h3>

            {/* CSV Paste area */}
            <div style={{ marginBottom: '20px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <label style={{ ...labelStyle, marginBottom: '8px' }}>
                📋 Quick paste (CSV / tab-separated — one sample per line):
              </label>
              <textarea
                ref={pasteRef}
                rows={4}
                placeholder={"1.5\t2.3\t4.1\n2.0\t3.1\t3.8\n..."}
                style={{ ...inputStyle, fontFamily: 'monospace', resize: 'vertical' }}
              />
              <button
                onClick={handlePaste}
                style={{ ...btnPrimary, marginTop: '8px', padding: '8px 20px', fontSize: '13px', backgroundColor: '#6366f1' }}
              >
                Parse &amp; Fill Table
              </button>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1e40af', color: 'white' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>Sample #</th>
                    {propertyNames.map((name, idx) => (
                      <th key={idx} style={{ padding: '10px 14px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>
                        {name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sampleValues.map((row, sIdx) => (
                    <tr key={sIdx} style={{ backgroundColor: sIdx % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                      <td style={{ padding: '8px 14px', textAlign: 'center', fontWeight: 700, border: '1px solid #e5e7eb', color: '#1e40af' }}>
                        {sIdx + 1}
                      </td>
                      {row.map((val, pIdx) => (
                        <td key={pIdx} style={{ padding: '4px 6px', border: '1px solid #e5e7eb' }}>
                          <input
                            type="text"
                            value={val}
                            onChange={e => updateValue(sIdx, pIdx, e.target.value)}
                            style={{
                              width: '100%', padding: '6px 8px', border: '1px solid #d1d5db',
                              borderRadius: '4px', textAlign: 'center', fontSize: '13px', boxSizing: 'border-box'
                            }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button style={btnSecondary} onClick={() => setStep(2)}>← Back</button>
              <button
                style={{ ...btnSuccess, opacity: calculating ? 0.6 : 1 }}
                onClick={calculate}
                disabled={calculating}
              >
                {calculating ? '⏳ Calculating...' : '🚀 Calculate Best Compromise'}
              </button>
            </div>
          </div>
        )}

        {/* ========== STEP 4: Results ========== */}
        {step === 4 && results && (
          <>
            {/* Best Compromise Card */}
            <div style={{
              ...cardStyle,
              background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
              border: '2px solid #86efac',
            }}>
              <h3 style={{ marginTop: 0, color: '#166534', fontSize: '1.3rem' }}>
                ✅ Best Compromise Combination
              </h3>
              <div style={{
                display: 'flex', gap: '30px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px'
              }}>
                <div>
                  <span style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 600 }}>SELECTED SAMPLES</span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#15803d' }}>
                    {results.bestCompromise.samples.join(', ')}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 600 }}>TOTAL SCORE</span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#15803d' }}>
                    {results.bestCompromise.totalScore}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 600 }}>TOTAL COMBINATIONS</span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#15803d' }}>
                    {results.totalCombinations.toLocaleString()}
                  </div>
                </div>
              </div>
              <p style={{ color: '#475569', fontSize: '0.88rem', margin: 0 }}>
                The score is the sum of ranking positions across all properties. Lower is better.
                Worst individual ranking position: <strong>{results.bestCompromise.worstPosition + 1}º</strong> of {results.totalCombinations}.
              </p>
            </div>

            {/* Per-Property Breakdown */}
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, color: '#1e40af' }}>📊 Per-Property Analysis</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {results.propertyNames.map((name: string, idx: number) => {
                  const position = results.bestCompromise.positions[idx] + 1;
                  const sd = results.bestCompromise.stdDevs[idx];
                  const pct = ((position / results.totalCombinations) * 100).toFixed(1);
                  const isGood = parseFloat(pct) <= 25;
                  const isOk = parseFloat(pct) <= 50;
                  return (
                    <div key={idx} style={{
                      padding: '18px',
                      background: isGood ? '#f0fdf4' : isOk ? '#fefce8' : '#fff7ed',
                      borderRadius: '8px',
                      border: `1px solid ${isGood ? '#bbf7d0' : isOk ? '#fef08a' : '#fed7aa'}`,
                    }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#1e293b', fontSize: '1rem' }}>{name}</h4>
                      <div style={{ fontSize: '0.88rem', color: '#475569', lineHeight: '1.7' }}>
                        <div>Position: <strong style={{ color: isGood ? '#16a34a' : isOk ? '#ca8a04' : '#ea580c' }}>{position}º</strong> / {results.totalCombinations}</div>
                        <div>Percentile: <strong>{pct}%</strong></div>
                        <div>Std Dev: <strong>{sd.toFixed(4)}</strong></div>
                      </div>
                      {/* Mini progress bar */}
                      <div style={{ marginTop: '10px', background: '#e5e7eb', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${100 - parseFloat(pct)}%`,
                          height: '100%',
                          background: isGood ? '#22c55e' : isOk ? '#eab308' : '#f97316',
                          borderRadius: '4px',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top 10 per property */}
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, color: '#1e40af' }}>🏆 Top 10 Combinations per Property</h3>
              {results.propertyNames.map((name: string, pIdx: number) => (
                <div key={pIdx} style={{ marginBottom: '24px' }}>
                  <h4 style={{ color: '#334155', marginBottom: '10px' }}>{name}</h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f1f5f9' }}>
                          <th style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #e2e8f0' }}>Rank</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Samples</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #e2e8f0' }}>Std Dev</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.rankings[pIdx].map((item: RankingItem, rIdx: number) => {
                          const isBest = JSON.stringify(item.combination) === JSON.stringify(results.bestCompromise.samples);
                          return (
                            <tr key={rIdx} style={{
                              backgroundColor: isBest ? '#fef9c3' : rIdx % 2 === 0 ? '#fff' : '#f9fafb',
                              fontWeight: isBest ? 700 : 400,
                            }}>
                              <td style={{ padding: '6px 12px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                                {rIdx + 1}º
                              </td>
                              <td style={{ padding: '6px 12px', border: '1px solid #e2e8f0' }}>
                                [{item.combination.join(', ')}]
                                {isBest && <span style={{ marginLeft: '8px', color: '#ca8a04' }}>★ compromise</span>}
                              </td>
                              <td style={{ padding: '6px 12px', textAlign: 'center', border: '1px solid #e2e8f0', fontFamily: 'monospace' }}>
                                {item.stdDev.toFixed(4)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button style={btnPrimary} onClick={() => { setStep(1); setResults(null); }}>
                🔄 New Analysis
              </button>
              <button style={btnSecondary} onClick={() => setStep(3)}>
                ← Edit Data
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
