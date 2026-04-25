'use client';

import { ReagenteEntrada, Reagente } from '@prisma/client';
import Image from 'next/image';
import { useRef } from 'react';

interface EtiquetaProps {
  entrada: ReagenteEntrada & { reagente?: Reagente };
  logoUrl?: string;
}

const buttonStyles = `
  .label-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 24px;
    border: none;
    border-radius: 6px;
    font-family: 'Segoe UI', system-ui, sans-serif;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.4px;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    position: relative;
    overflow: hidden;
  }
  .label-btn::after {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(255,255,255,0.12);
    opacity: 0;
    transition: opacity 0.15s ease;
  }
  .label-btn:hover::after { opacity: 1; }
  .label-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(0,0,0,0.18); }
  .label-btn:active { transform: translateY(0); box-shadow: 0 2px 6px rgba(0,0,0,0.12); }
  .label-btn-print {
    background: linear-gradient(135deg, #1a6fa8 0%, #2196d3 100%);
    color: white;
    box-shadow: 0 3px 10px rgba(26,111,168,0.35);
  }
  .label-btn-download {
    background: linear-gradient(135deg, #1a7a4a 0%, #27ae60 100%);
    color: white;
    box-shadow: 0 3px 10px rgba(26,122,74,0.35);
  }
  .btn-icon { font-size: 15px; line-height: 1; }

  /* Cut guide wrapper */
  .cut-guide-wrapper {
    position: relative;
    display: inline-block;
    padding: 12px;
    border: 1.5px dashed #aab0b8;
    border-radius: 2px;
  }

  /* Watermark via ::before on the label box — no extra DOM node, no height impact */
  .etiqueta-box {
    position: relative;
  }
  .etiqueta-box.vencido::before {
    content: 'EXPIRED';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-28deg);
    font-size: 64px;
    font-weight: 800;
    color: rgba(192, 57, 43, 0.18);
    letter-spacing: 6px;
    pointer-events: none;
    white-space: nowrap;
    z-index: 2;
    font-family: Arial, sans-serif;
  }
`;

export default function EtiquetaReagente({ entrada, logoUrl }: EtiquetaProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const isVencido = (() => {
    if (!entrada.dataValidade) return false;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const validade = new Date(entrada.dataValidade);
    validade.setHours(0, 0, 0, 0);
    return validade < hoje;
  })();

  const handlePrint = () => {
    const element = printRef.current;
    if (!element) return;

    const printWindow = window.open('', '', 'height=600,width=900');
    if (!printWindow) return;

    printWindow.document.write(
      `<html><head><title>Label - ${entrada.reagente?.nome}</title>` +
      `<style>` +
      `@page { size: 15cm auto; margin: 0; } ` +
      `body { font-family: Arial, sans-serif; margin: 0; padding: 0; } ` +
      `.etiqueta-box { border: 2px solid #2c3e50; padding: 12px 16px; width: 15cm; background: white; box-sizing: border-box; position: relative; } ` +
      `.etiqueta-box.vencido::before { content: 'EXPIRED'; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-28deg); font-size: 64px; font-weight: 800; color: rgba(192,57,43,0.18); letter-spacing: 6px; pointer-events: none; white-space: nowrap; z-index: 2; font-family: Arial, sans-serif; } ` +
      `</style>` +
      `</head><body>` +
      element.innerHTML +
      `</body></html>`
    );
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownload = () => {
    const element = printRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = rect.width * scale;
    canvas.height = rect.height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(scale, scale);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, rect.width - 2, rect.height - 2);

    if (isVencido) {
      ctx.save();
      ctx.translate(rect.width / 2, rect.height / 2);
      ctx.rotate((-28 * Math.PI) / 180);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(192, 57, 43, 0.2)';
      ctx.font = 'bold 72px Arial';
      ctx.fillText('EXPIRED', 0, 0);
      ctx.restore();
    }

    const rows = [
      entrada.reagente?.nome || 'Reagent',
      `Code: ${entrada.codigoInterno}`,
      entrada.categoria ? `Category: ${entrada.categoria}` : '',
      entrada.concentracao ? `Concentration: ${entrada.concentracao}` : '',
      entrada.localizacao ? `📍 Location: ${entrada.localizacao}` : '',
      entrada.dataValidade
        ? `Expiry: ${new Date(entrada.dataValidade).toLocaleDateString('en-US')}`
        : '',
      entrada.responsavel ? `Responsible: ${entrada.responsavel}` : '',
      entrada.perigos ? `⚠️ ${entrada.perigos}` : '',
    ].filter(Boolean);

    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(rows[0], 16, 32);
    ctx.font = '12px Arial';
    let y = 56;
    for (const line of rows.slice(1)) {
      ctx.fillText(line, 16, y);
      y += 24;
    }

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `label-${entrada.codigoInterno}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const dataValidadeFormatada = entrada.dataValidade
    ? new Date(entrada.dataValidade).toLocaleDateString('en-US')
    : '-';

  return (
    <>
      <style>{buttonStyles}</style>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '20px' }}>

        {/* Cut guide + label */}
        <div className="cut-guide-wrapper">

          {/* The actual label */}
          <div
            ref={printRef}
            className={`etiqueta-box${isVencido ? ' vencido' : ''}`}
            style={{
              width: '15cm',
              border: '2px solid #2c3e50',
              padding: '12px 16px',
              backgroundColor: 'white',
              fontFamily: 'Arial, sans-serif',
              boxSizing: 'border-box',
            }}
          >

            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px',
                paddingBottom: '8px',
                borderBottom: '1.5px solid #ecf0f1',
              }}
            >
              {logoUrl && (
                <div style={{ width: '48px', height: '48px', position: 'relative', flexShrink: 0 }}>
                  <Image src={logoUrl} alt="LERP Logo" fill style={{ objectFit: 'contain' }} />
                </div>
              )}
              <div style={{ textAlign: 'center', flex: 1, paddingLeft: '10px' }}>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#2c3e50', lineHeight: 1.2 }}>
                  {entrada.reagente?.nome}
                </h2>
                <p style={{ margin: '3px 0 0 0', fontSize: '9px', color: '#7f8c8d' }}>
                  LERP — Polymer Reaction Engineering Laboratory
                </p>
              </div>
            </div>

            {/* Internal Code + Concentration */}
            <div
              style={{
                backgroundColor: '#ecf0f1',
                padding: '7px 10px',
                borderRadius: '4px',
                marginBottom: '10px',
                display: 'grid',
                gridTemplateColumns: entrada.concentracao ? '1fr 1fr' : '1fr',
                gap: '10px',
              }}
            >
              <div>
                <p style={{ margin: '0 0 2px 0', fontSize: '9px', color: '#7f8c8d', fontWeight: 'bold' }}>
                  INTERNAL CODE:
                </p>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: '#2c3e50', fontFamily: 'monospace' }}>
                  {entrada.codigoInterno}
                </p>
              </div>
              {entrada.concentracao && (
                <div>
                  <p style={{ margin: '0 0 2px 0', fontSize: '9px', color: '#7f8c8d', fontWeight: 'bold' }}>
                    CONCENTRATION:
                  </p>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: '#2c3e50' }}>
                    {entrada.concentracao}
                  </p>
                </div>
              )}
            </div>

            {/* Details */}
            {(entrada.categoria || entrada.localizacao || entrada.dataValidade || entrada.responsavel) && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px 16px',
                  marginBottom: '10px',
                }}
              >
                {entrada.categoria && (
                  <div>
                    <p style={{ margin: '0 0 2px 0', fontSize: '9px', color: '#7f8c8d', fontWeight: 'bold' }}>CATEGORY:</p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#2c3e50' }}>{entrada.categoria}</p>
                  </div>
                )}
                {entrada.localizacao && (
                  <div>
                    <p style={{ margin: '0 0 2px 0', fontSize: '9px', color: '#7f8c8d', fontWeight: 'bold' }}>📍 LOCATION:</p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#2c3e50' }}>{entrada.localizacao}</p>
                  </div>
                )}
                {entrada.dataValidade && (
                  <div>
                    <p style={{ margin: '0 0 2px 0', fontSize: '9px', color: '#7f8c8d', fontWeight: 'bold' }}>EXPIRY DATE:</p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#2c3e50' }}>{dataValidadeFormatada}</p>
                  </div>
                )}
                {entrada.responsavel && (
                  <div>
                    <p style={{ margin: '0 0 2px 0', fontSize: '9px', color: '#7f8c8d', fontWeight: 'bold' }}>RESPONSIBLE:</p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#2c3e50' }}>{entrada.responsavel}</p>
                  </div>
                )}
              </div>
            )}

            {/* Hazard warning */}
            {entrada.perigos && (
              <div
                style={{
                  backgroundColor: '#ffe8e8',
                  border: '1px solid #e74c3c',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  marginBottom: '10px',
                }}
              >
                <p style={{ margin: 0, fontSize: '11px', fontWeight: 'bold', color: '#c0392b' }}>
                  ⚠️ {entrada.perigos}
                </p>
              </div>
            )}

            {/* Footer */}
            <div
              style={{
                fontSize: '9px',
                color: '#95a5a6',
                borderTop: '1px solid #ecf0f1',
                paddingTop: '6px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0 14px',
              }}
            >
              <span>Entry: {new Date(entrada.dataEntrada).toLocaleDateString('en-US')}</span>
              {entrada.fornecedor && <span>Supplier: {entrada.fornecedor}</span>}
              {entrada.notaFiscal && <span>Invoice: {entrada.notaFiscal}</span>}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '10px', paddingLeft: '12px' }}>
          <button className="label-btn label-btn-print" onClick={handlePrint}>
            <span className="btn-icon">🖨️</span>
            Print Label
          </button>
          <button className="label-btn label-btn-download" onClick={handleDownload}>
            <span className="btn-icon">⬇️</span>
            Download PNG
          </button>
        </div>

      </div>
    </>
  );
}
