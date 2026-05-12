'use client';

import { useEffect, useState } from 'react';

interface ReagenteEntry {
  id: string;
  codigoInterno: string;
  etiquetaPdfBase64?: string;
  etiquetaFileName?: string;
  [key: string]: any;
}

interface ReagenteLabelPreviewProps {
  /** Array of created entries (new multi-label API) */
  reagentes?: ReagenteEntry[];
  /** Single reagent (legacy – backward compat) */
  reagente?: { id: string; codigo?: string; codigoInterno?: string };
  onRegisterAnother?: () => void;
}

export default function ReagenteLabelPreview({ reagentes, reagente, onRegisterAnother }: ReagenteLabelPreviewProps) {
  // Normalise: always work with an array
  const entries: ReagenteEntry[] = reagentes && reagentes.length > 0
    ? reagentes
    : reagente
      ? [{ id: reagente.id, codigoInterno: reagente.codigo || reagente.codigoInterno || '' }]
      : [];

  return (
    <div className="label-preview-container">
      <div className="success-header">
        <span className="checkmark">✅</span>
        <h2>Generated Label{entries.length > 1 ? 's' : ''}</h2>
      </div>

      <p className="label-info">
        {entries.length} label{entries.length > 1 ? 's' : ''} generated — one per bottle.
      </p>

      {entries.map((entry, index) => (
        <LabelCard key={entry.id} entry={entry} index={index} total={entries.length} />
      ))}

      {entries.length > 1 && (
        <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
          <button
            onClick={() => printAll(entries)}
            className="button button-primary"
            type="button"
          >
            🖨️ Print All Labels
          </button>
          <button
            onClick={() => downloadAll(entries)}
            className="button button-success"
            type="button"
          >
            💾 Save All Labels
          </button>
        </div>
      )}

      {onRegisterAnother && (
        <button onClick={onRegisterAnother} className="button" style={{ marginTop: '20px' }} type="button">
          Register Another Reagent
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Individual card per bottle                                          */
/* ------------------------------------------------------------------ */

function LabelCard({ entry, index, total }: { entry: ReagenteEntry; index: number; total: number }) {
  const [pdfUrl, setPdfUrl] = useState<string>('');

  useEffect(() => {
    let urlToRevoke: string | null = null;

    async function loadPdf() {
      try {
        // If the API already returned base64, use it directly
        if (entry.etiquetaPdfBase64) {
          const blob = base64ToBlob(entry.etiquetaPdfBase64, 'application/pdf');
          const url = URL.createObjectURL(blob);
          urlToRevoke = url;
          setPdfUrl(url);
          return;
        }

        // Fallback: fetch from API
        const response = await fetch(`/api/reagentes/${entry.id}/etiqueta`);
        const data = await response.json();
        if (data.success) {
          const blob = base64ToBlob(data.etiquetaPdfBase64, 'application/pdf');
          const url = URL.createObjectURL(blob);
          urlToRevoke = url;
          setPdfUrl(url);
        }
      } catch (error) {
        console.error('Error loading PDF:', error);
      }
    }

    loadPdf();

    return () => {
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
    };
  }, [entry.id, entry.etiquetaPdfBase64]);

  const handlePrint = () => {
    if (!pdfUrl) return;
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = pdfUrl;
    document.body.appendChild(iframe);
    iframe.onload = () => iframe.contentWindow?.print();
  };

  const handleSave = () => {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = entry.etiquetaFileName || `etiqueta-${entry.codigoInterno || entry.id}.pdf`;
    a.click();
  };

  return (
    <div className="label-preview-card">
      <h3 style={{ margin: '0 0 12px 0', color: '#333', fontSize: '16px' }}>
        {total > 1 ? `Bottle ${index + 1} — ` : ''}{entry.codigoInterno}
      </h3>

      <div className="label-preview-frame">
        {pdfUrl ? (
          <iframe
            src={pdfUrl}
            width="100%"
            height="300px"
            style={{ border: '1px dashed #ccc', borderRadius: '8px' }}
            title={`Label preview ${entry.codigoInterno}`}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>Loading label…</div>
        )}
      </div>

      <div className="label-actions" style={{ marginTop: '10px' }}>
        <button onClick={handlePrint} className="button button-primary" type="button" style={{ fontSize: '14px' }}>
          🖨️ Print
        </button>
        <button onClick={handleSave} className="button button-success" type="button" style={{ fontSize: '14px' }}>
          💾 Save
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bulk helpers                                                        */
/* ------------------------------------------------------------------ */

function printAll(entries: ReagenteEntry[]) {
  entries.forEach((entry) => {
    if (entry.etiquetaPdfBase64) {
      const blob = base64ToBlob(entry.etiquetaPdfBase64, 'application/pdf');
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.onload = () => iframe.contentWindow?.print();
    }
  });
}

function downloadAll(entries: ReagenteEntry[]) {
  entries.forEach((entry, i) => {
    if (entry.etiquetaPdfBase64) {
      const blob = base64ToBlob(entry.etiquetaPdfBase64, 'application/pdf');
      const url = URL.createObjectURL(blob);
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = url;
        a.download = entry.etiquetaFileName || `etiqueta-${entry.codigoInterno || entry.id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }, i * 300); // stagger downloads
    }
  });
}

/* ------------------------------------------------------------------ */
/* Utils                                                               */
/* ------------------------------------------------------------------ */

function base64ToBlob(base64: string, type: string): Blob {
  const byteCharacters = atob(base64);
  const byteArrays = [];
  for (let i = 0; i < byteCharacters.length; i++) {
    byteArrays.push(byteCharacters.charCodeAt(i));
  }
  return new Blob([new Uint8Array(byteArrays)], { type });
}
