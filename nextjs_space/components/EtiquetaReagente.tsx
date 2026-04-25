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

  .cut-guide-wrapper {
    display: inline-block;
    padding: 12px;
    border: 1.5px dashed #aab0b8;
    border-radius: 2px;
  }

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

// Fully inlined HTML — mirrors the JSX layout with all styles inline
// Used for both Print and Download so output is always pixel-perfect
function buildLabelHtml(
  entrada: ReagenteEntrada & { reagente?: Reagente },
  isVencido: boolean,
  logoUrl?: string
) {
  const dataValidadeFormatada = entrada.dataValidade
    ? new Date(entrada.dataValidade).toLocaleDateString('en-US')
    : '-';

  const watermark = isVencido
    ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-28deg);font-size:64px;font-weight:800;color:rgba(192,57,43,0.18);letter-spacing:6px;pointer-events:none;white-space:nowrap;z-index:2;font-family:Arial,sans-serif;">EXPIRED</div>`
    : '';

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="LERP" style="width:48px;height:48px;object-fit:contain;flex-shrink:0;" />`
    : '';

  const codeGrid = `
    <div style="background:#ecf0f1;padding:7px 10px;border-radius:4px;margin-bottom:10px;display:grid;grid-template-columns:${entrada.concentracao ? '1fr 1fr' : '1fr'};gap:10px;">
      <div>
        <p style="margin:0 0 2px 0;font-size:9px;color:#7f8c8d;font-weight:bold;">INTERNAL CODE:</p>
        <p style="margin:0;font-size:13px;font-weight:bold;color:#2c3e50;font-family:monospace;">${entrada.codigoInterno}</p>
      </div>
      ${entrada.concentracao ? `
      <div>
        <p style="margin:0 0 2px 0;font-size:9px;color:#7f8c8d;font-weight:bold;">CONCENTRATION:</p>
        <p style="margin:0;font-size:13px;font-weight:bold;color:#2c3e50;">${entrada.concentracao}</p>
      </div>` : ''}
    </div>`;

  const hasDetails = entrada.categoria || entrada.localizacao || entrada.dataValidade || entrada.responsavel;
  const detailsGrid = hasDetails ? `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;margin-bottom:10px;">
      ${entrada.categoria ? `<div><p style="margin:0 0 2px 0;font-size:9px;color:#7f8c8d;font-weight:bold;">CATEGORY:</p><p style="margin:0;font-size:11px;color:#2c3e50;">${entrada.categoria}</p></div>` : ''}
      ${entrada.localizacao ? `<div><p style="margin:0 0 2px 0;font-size:9px;color:#7f8c8d;font-weight:bold;">📍 LOCATION:</p><p style="margin:0;font-size:11px;color:#2c3e50;">${entrada.localizacao}</p></div>` : ''}
      ${entrada.dataValidade ? `<div><p style="margin:0 0 2px 0;font-size:9px;color:#7f8c8d;font-weight:bold;">EXPIRY DATE:</p><p style="margin:0;font-size:11px;color:#2c3e50;">${dataValidadeFormatada}</p></div>` : ''}
      ${entrada.responsavel ? `<div><p style="margin:0 0 2px 0;font-size:9px;color:#7f8c8d;font-weight:bold;">RESPONSIBLE:</p><p style="margin:0;font-size:11px;color:#2c3e50;">${entrada.responsavel}</p></div>` : ''}
    </div>` : '';

  const hazard = entrada.perigos
    ? `<div style="background:#ffe8e8;border:1px solid #e74c3c;padding:6px 10px;border-radius:4px;margin-bottom:10px;"><p style="margin:0;font-size:11px;font-weight:bold;color:#c0392b;">⚠️ ${entrada.perigos}</p></div>`
    : '';

  const footer = `
    <div style="font-size:9px;color:#95a5a6;border-top:1px solid #ecf0f1;padding-top:6px;display:flex;flex-wrap:wrap;gap:0 14px;">
      <span>Entry: ${new Date(entrada.dataEntrada).toLocaleDateString('en-US')}</span>
      ${entrada.fornecedor ? `<span>Supplier: ${entrada.fornecedor}</span>` : ''}
      ${entrada.notaFiscal ? `<span>Invoice: ${entrada.notaFiscal}</span>` : ''}
    </div>`;

  return `
    <div style="position:relative;width:15cm;border:2px solid #2c3e50;padding:12px 16px;background:white;font-family:Arial,sans-serif;box-sizing:border-box;">
      ${watermark}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding-bottom:8px;border-bottom:1.5px solid #ecf0f1;">
        ${logoHtml}
        <div style="text-align:center;flex:1;padding-left:10px;">
          <h2 style="margin:0;font-size:16px;font-weight:bold;color:#2c3e50;line-height:1.2;">${entrada.reagente?.nome ?? ''}</h2>
          <p style="margin:3px 0 0 0;font-size:9px;color:#7f8c8d;">LERP — Polymer Reaction Engineering Laboratory</p>
        </div>
      </div>
      ${codeGrid}
      ${detailsGrid}
      ${hazard}
      ${footer}
    </div>`;
}

function openLabelWindow(
  entrada: ReagenteEntrada & { reagente?: Reagente },
  isVencido: boolean,
  logoUrl?: string
) {
  const labelHtml = buildLabelHtml(entrada, isVencido, logoUrl);
  const win = window.open('', '', 'height=600,width=900');
  if (!win) return;
  win.document.write(`
    <html>
      <head>
        <title>Label - ${entrada.reagente?.nome ?? ''}</title>
        <style>
          @page { size: 15cm auto; margin: 0; }
          body { margin: 0; padding: 0; }
          * { box-sizing: border-box; }
        </style>
      </head>
      <body>${labelHtml}</body>
    </html>`);
  win.document.close();
  win.focus();
  return win;
}

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

  // Opens the label in a new window and triggers the browser print dialog
  const handlePrint = () => {
    const win = openLabelWindow(entrada, isVencido, logoUrl);
    if (!win) return;
    setTimeout(() => win.print(), 300);
  };

  // Opens the label in a new window — user can Save as PDF / image from print dialog
  const handleDownload = () => {
    openLabelWindow(entrada, isVencido, logoUrl);
  };

  const dataValidadeFormatada = entrada.dataValidade
    ? new Date(entrada.dataValidade).toLocaleDateString('en-US')
    : '-';

  return (
    <>
      <style>{buttonStyles}</style>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '20px' }}>

        <div className="cut-guide-wrapper">
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1.5px solid #ecf0f1' }}>
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
            <div style={{ backgroundColor: '#ecf0f1', padding: '7px 10px', borderRadius: '4px', marginBottom: '10px', display: 'grid', gridTemplateColumns: entrada.concentracao ? '1fr 1fr' : '1fr', gap: '10px' }}>
              <div>
                <p style={{ margin: '0 0 2px 0', fontSize: '9px', color: '#7f8c8d', fontWeight: 'bold' }}>INTERNAL CODE:</p>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: '#2c3e50', fontFamily: 'monospace' }}>{entrada.codigoInterno}</p>
              </div>
              {entrada.concentracao && (
                <div>
                  <p style={{ margin: '0 0 2px 0', fontSize: '9px', color: '#7f8c8d', fontWeight: 'bold' }}>CONCENTRATION:</p>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: '#2c3e50' }}>{entrada.concentracao}</p>
                </div>
              )}
            </div>

            {/* Details */}
            {(entrada.categoria || entrada.localizacao || entrada.dataValidade || entrada.responsavel) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: '10px' }}>
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
              <div style={{ backgroundColor: '#ffe8e8', border: '1px solid #e74c3c', padding: '6px 10px', borderRadius: '4px', marginBottom: '10px' }}>
                <p style={{ margin: 0, fontSize: '11px', fontWeight: 'bold', color: '#c0392b' }}>⚠️ {entrada.perigos}</p>
              </div>
            )}

            {/* Footer */}
            <div style={{ fontSize: '9px', color: '#95a5a6', borderTop: '1px solid #ecf0f1', paddingTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '0 14px' }}>
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
            Save / Export
          </button>
        </div>

      </div>
    </>
  );
}
