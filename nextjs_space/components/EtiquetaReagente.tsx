'use client';

import { ReagenteEntrada, Reagente } from '@prisma/client';
import Image from 'next/image';
import { useRef } from 'react';

interface EtiquetaProps {
  entrada: ReagenteEntrada & { reagente?: Reagente };
  logoUrl?: string;
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

  const handlePrint = () => {
    const element = printRef.current;
    if (!element) return;

    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) return;

    printWindow.document.write(
      `<html><head><title>Label - ${entrada.reagente?.nome}</title>` +
      `<style>` +
      `@page { size: 10cm 8cm; margin: 0; } ` +
      `body { font-family: Arial, sans-serif; margin: 0; padding: 0; } ` +
      `.etiqueta { border: 2px solid #2c3e50; padding: 8px; width: 10cm; height: 8cm; background: white; box-sizing: border-box; position: relative; overflow: hidden; } ` +
      `.watermark-vencido { position: absolute; top: 45%; left: 50%; transform: translate(-50%, -50%) rotate(-28deg); font-size: 48px; font-weight: 800; color: rgba(192, 57, 43, 0.2); letter-spacing: 4px; z-index: 1; pointer-events: none; white-space: nowrap; } ` +
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

    // 10cm × 8cm at 96 DPI → ~378 × 302 px
    const canvas = document.createElement('canvas');
    canvas.width = 378;
    canvas.height = 302;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 378, 302);

    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, 374, 298);

    if (isVencido) {
      ctx.save();
      ctx.translate(189, 151);
      ctx.rotate((-28 * Math.PI) / 180);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(192, 57, 43, 0.2)';
      ctx.font = 'bold 56px Arial';
      ctx.fillText('EXPIRED', 0, 0);
      ctx.restore();
    }

    const data = [
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
    ctx.font = 'bold 14px Arial';
    ctx.fillText(data[0], 16, 28);

    ctx.font = '10px Arial';
    let y = 48;
    for (const line of data.slice(1)) {
      ctx.fillText(line, 16, y);
      y += 22;
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
    <div className="space-y-4">
      <div
        ref={printRef}
        className="etiqueta"
        style={{
          width: '10cm',
          height: '8cm',
          border: '2px solid #2c3e50',
          padding: '8px',
          backgroundColor: 'white',
          fontFamily: 'Arial, sans-serif',
          pageBreakAfter: 'always',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {isVencido && (
          <div
            style={{
              position: 'absolute',
              top: '45%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(-28deg)',
              fontSize: '48px',
              fontWeight: 800,
              color: 'rgba(192, 57, 43, 0.2)',
              letterSpacing: '4px',
              zIndex: 1,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            EXPIRED
          </div>
        )}

        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '6px',
            paddingBottom: '6px',
            borderBottom: '1px solid #ecf0f1',
          }}
        >
          {logoUrl && (
            <div style={{ width: '36px', height: '36px', position: 'relative', flexShrink: 0 }}>
              <Image
                src={logoUrl}
                alt="LERP Logo"
                fill
                style={{ objectFit: 'contain' }}
              />
            </div>
          )}
          <div style={{ textAlign: 'center', flex: 1, paddingLeft: '6px' }}>
            <h2
              style={{
                margin: 0,
                fontSize: '13px',
                fontWeight: 'bold',
                color: '#2c3e50',
                lineHeight: 1.2,
              }}
            >
              {entrada.reagente?.nome}
            </h2>
            <p
              style={{
                margin: '2px 0 0 0',
                fontSize: '8px',
                color: '#7f8c8d',
              }}
            >
              LERP - Polymer Reaction Engineering Laboratory
            </p>
          </div>
        </div>

        {/* Internal Code + Concentration */}
        <div
          style={{
            backgroundColor: '#ecf0f1',
            padding: '5px 8px',
            borderRadius: '3px',
            marginBottom: '6px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
          }}
        >
          <div>
            <p style={{ margin: '0 0 2px 0', fontSize: '8px', color: '#7f8c8d', fontWeight: 'bold' }}>
              INTERNAL CODE:
            </p>
            <p style={{ margin: 0, fontSize: '11px', fontWeight: 'bold', color: '#2c3e50', fontFamily: 'monospace' }}>
              {entrada.codigoInterno}
            </p>
          </div>
          {entrada.concentracao && (
            <div>
              <p style={{ margin: '0 0 2px 0', fontSize: '8px', color: '#7f8c8d', fontWeight: 'bold' }}>
                CONCENTRATION:
              </p>
              <p style={{ margin: 0, fontSize: '11px', fontWeight: 'bold', color: '#2c3e50' }}>
                {entrada.concentracao}
              </p>
            </div>
          )}
        </div>

        {/* Details grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px',
            marginBottom: '6px',
          }}
        >
          {entrada.categoria && (
            <div>
              <p style={{ margin: '0 0 2px 0', fontSize: '8px', color: '#7f8c8d', fontWeight: 'bold' }}>
                CATEGORY:
              </p>
              <p style={{ margin: 0, fontSize: '10px', color: '#2c3e50' }}>{entrada.categoria}</p>
            </div>
          )}
          {entrada.localizacao && (
            <div>
              <p style={{ margin: '0 0 2px 0', fontSize: '8px', color: '#7f8c8d', fontWeight: 'bold' }}>
                📍 LOCATION:
              </p>
              <p style={{ margin: 0, fontSize: '10px', color: '#2c3e50' }}>{entrada.localizacao}</p>
            </div>
          )}
          {entrada.dataValidade && (
            <div>
              <p style={{ margin: '0 0 2px 0', fontSize: '8px', color: '#7f8c8d', fontWeight: 'bold' }}>
                EXPIRY DATE:
              </p>
              <p style={{ margin: 0, fontSize: '10px', color: '#2c3e50' }}>{dataValidadeFormatada}</p>
            </div>
          )}
          {entrada.responsavel && (
            <div>
              <p style={{ margin: '0 0 2px 0', fontSize: '8px', color: '#7f8c8d', fontWeight: 'bold' }}>
                RESPONSIBLE:
              </p>
              <p style={{ margin: 0, fontSize: '10px', color: '#2c3e50' }}>{entrada.responsavel}</p>
            </div>
          )}
        </div>

        {/* Hazard warning */}
        {entrada.perigos && (
          <div
            style={{
              backgroundColor: '#ffe8e8',
              border: '1px solid #e74c3c',
              padding: '4px 8px',
              borderRadius: '3px',
              marginBottom: '6px',
            }}
          >
            <p style={{ margin: 0, fontSize: '9px', fontWeight: 'bold', color: '#c0392b' }}>
              ⚠️ {entrada.perigos}
            </p>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            fontSize: '8px',
            color: '#95a5a6',
            borderTop: '1px solid #ecf0f1',
            paddingTop: '4px',
          }}
        >
          <span>Entry: {new Date(entrada.dataEntrada).toLocaleDateString('en-US')}</span>
          {entrada.fornecedor && <span style={{ marginLeft: '10px' }}>Supplier: {entrada.fornecedor}</span>}
          {entrada.notaFiscal && <span style={{ marginLeft: '10px' }}>Invoice: {entrada.notaFiscal}</span>}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 justify-center">
        <button
          onClick={handlePrint}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          🖨️ Print
        </button>
        <button
          onClick={handleDownload}
          className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          ⬇️ Download
        </button>
      </div>
    </div>
  );
}
