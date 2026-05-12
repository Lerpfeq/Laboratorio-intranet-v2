'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import StorageLocationSelector from '@/components/StorageLocationSelector';

export default function EditReagentePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [nome, setNome] = useState('');
  const [marca, setMarca] = useState('');
  const [fabricante, setFabricante] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [quantidadeAtual, setQuantidadeAtual] = useState('');
  const [unidade, setUnidade] = useState('L');
  const [dataValidade, setDataValidade] = useState('');
  const [validadeIndeterminada, setValidadeIndeterminada] = useState(false);
  const [numeroNotaFiscal, setNumeroNotaFiscal] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [categoria, setCategoria] = useState('');
  const [concentracao, setConcentracao] = useState('');
  const [codigo, setCodigo] = useState('');

  useEffect(() => {
    async function carregarReagente() {
      try {
        const response = await fetch(`/api/reagentes/${params.id}`);
        const data = await response.json();

        if (data.success && data.reagente) {
          const r = data.reagente;
          setNome(r.nome || '');
          setMarca(r.marca || '');
          setFabricante(r.fabricante || '');
          setQuantidade(r.quantidade?.toString() || '');
          setQuantidadeAtual(r.quantidadeAtual?.toString() || '');
          setUnidade(r.unidade || 'L');
          setDataValidade(r.dataValidade ? r.dataValidade.split('T')[0] : '');
          setValidadeIndeterminada(r.validadeIndeterminada || false);
          setNumeroNotaFiscal(r.numeroNotaFiscal || '');
          setLocalizacao(r.localizacao || '');
          setCategoria(r.categoria || '');
          setConcentracao(r.concentracao || '');
          setCodigo(r.codigo || '');
        } else {
          alert('Reagent not found');
          router.push('/reagentes');
        }
      } catch (error) {
        console.error('Error loading reagent:', error);
        alert('Error loading reagent');
      } finally {
        setLoading(false);
      }
    }

    if (params?.id) {
      carregarReagente();
    }
  }, [params?.id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome || !marca || !fabricante || !quantidade) {
      alert('Please fill in all required fields (Name, Brand, Supplier, Quantity)');
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(`/api/reagentes/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          marca,
          fabricante,
          numeroNotaFiscal,
          quantidade: Number.parseFloat(quantidade),
          quantidadeAtual: quantidadeAtual ? Number.parseFloat(quantidadeAtual) : Number.parseFloat(quantidade),
          unidade,
          dataValidade: validadeIndeterminada ? null : (dataValidade || null),
          validadeIndeterminada,
          localizacao,
          categoria,
          concentracao,
          responsavel: session?.user?.name,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Reagent updated successfully!');
        router.push('/reagentes');
      } else {
        alert(`Error: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating reagent:', error);
      alert('Error updating reagent');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  return (
    <div className="container">
      <h1>Edit Reagent</h1>
      <p className="subtitle">
        Internal Code: <strong>{codigo}</strong>
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label>Reagent Name *</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Acetone"
              required
            />
          </div>

          <div className="form-group">
            <label>Brand *</label>
            <input
              type="text"
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              placeholder="Ex: Sigma-Aldrich, Merck, Fisher"
              required
            />
          </div>

          <div className="form-group">
            <label>Supplier *</label>
            <input
              type="text"
              value={fabricante}
              onChange={(e) => setFabricante(e.target.value)}
              placeholder="Ex: Chemical Distributor Inc."
              required
            />
          </div>

          <div className="form-group">
            <label>Invoice Number *</label>
            <input
              type="text"
              value={numeroNotaFiscal}
              onChange={(e) => setNumeroNotaFiscal(e.target.value)}
              placeholder="Ex: NF-123456"
              required
            />
          </div>

          <div className="form-group">
            <label>Total Quantity *</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="number"
                step="0.001"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                placeholder="Ex: 1.5"
                required
              />
              <select value={unidade} onChange={(e) => setUnidade(e.target.value)}>
                <option value="L">L (Liters)</option>
                <option value="mL">mL (Milliliters)</option>
                <option value="kg">kg (Kilograms)</option>
                <option value="g">g (Grams)</option>
                <option value="mg">mg (Milligrams)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Current Quantity</label>
            <input
              type="number"
              step="0.001"
              value={quantidadeAtual}
              onChange={(e) => setQuantidadeAtual(e.target.value)}
              placeholder="Same as total if not used"
            />
            <small style={{ color: '#666' }}>Leave empty to keep same as total quantity</small>
          </div>

          <div className="form-group">
            <label>Concentration</label>
            <input
              type="text"
              value={concentracao}
              onChange={(e) => setConcentracao(e.target.value)}
              placeholder="Ex: 99.5%, 1M, etc."
            />
          </div>

          <div className="form-group">
            <label>Expiry Date</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input
                type="date"
                value={dataValidade}
                onChange={(e) => setDataValidade(e.target.value)}
                disabled={validadeIndeterminada}
                style={validadeIndeterminada ? { opacity: 0.5 } : {}}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={validadeIndeterminada}
                  onChange={(e) => {
                    setValidadeIndeterminada(e.target.checked);
                    if (e.target.checked) {
                      setDataValidade('');
                    }
                  }}
                />
                <span>Indeterminate expiry date</span>
              </label>
            </div>
          </div>
        </div>

        <div className="form-group" style={{ marginTop: '20px' }}>
          <StorageLocationSelector
            category={categoria}
            onCategoryChange={setCategoria}
            location={localizacao}
            onLocationChange={setLocalizacao}
          />
        </div>

        <div className="form-actions">
          <button type="submit" disabled={saving} className="button button-primary">
            {saving ? 'Saving...' : '💾 Save Changes'}
          </button>

          <button type="button" onClick={() => router.push('/reagentes')} className="button-secondary">
            ❌ Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
