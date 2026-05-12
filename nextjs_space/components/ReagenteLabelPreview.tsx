'use client';

import { useEffect, useState } from 'react';

interface ReagenteLabelPreviewProps {
  reagente: {
    id: string;
    codigo?: string;
    codigoInterno?: string;
  };
  onRegisterAnother?: () => void;
}

export default function ReagenteLabelPreview({ reagente, onRegisterAnother }: ReagenteLabelPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string>('');

  useEffect(() => {
    let urlToRevoke: string | null = null;

    async function gerarPDF() {
      try {
        const response = await fetch(`/api/reagentes/${reagente.id}/etiqueta`);
        const data = await response.json();

        if (data.success) {
          const blob = base64ToBlob(data.etiquetaPdfBase64, 'application/pdf');
          const url = URL.createObjectURL(blob);
          urlToRevoke = url;
          setPdfUrl(url);
        }
      } catch (error) {
        console.error('Erro ao gerar PDF:', error);
      }
    }

    gerarPDF();

    return () => {
      if (urlToRevoke) {
        URL.revokeObjectURL(urlToRevoke);
      }
    };
  }, [reagente.id]);

  const handlePrint = () => {
    if (pdfUrl) {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = pdfUrl;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow?.print();
      };
    }
  };

  const handleSaveExport = () => {
    if (pdfUrl) {
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = `etiqueta-${reagente.codigo || reagente.codigoInterno || reagente.id}.pdf`;
      a.click();
    }
  };

  return (
    <div className="label-preview-container">
      <div className="success-header">
        <span className="checkmark">✅</span>
        <h2>Generated Label</h2>
      </div>

      <p className="label-info">1 label generated — one per bottle.</p>

      <div className="label-preview-frame">
        {pdfUrl && (
          <iframe
            src={pdfUrl}
            width="100%"
            height="400px"
            style={{ border: '1px dashed #ccc' }}
            title="Prévia da etiqueta"
          />
        )}
      </div>

      <div className="label-actions">
        <button onClick={handlePrint} className="button button-primary" type="button">
          🖨️ Print Label
        </button>
        <button onClick={handleSaveExport} className="button button-success" type="button">
          💾 Save / Export
        </button>
      </div>

      {onRegisterAnother && (
        <button onClick={onRegisterAnother} className="button" style={{ marginTop: '20px' }} type="button">
          Register Another Reagent
        </button>
      )}
    </div>
  );
}

function base64ToBlob(base64: string, type: string): Blob {
  const byteCharacters = atob(base64);
  const byteArrays = [];
  for (let i = 0; i < byteCharacters.length; i++) {
    byteArrays.push(byteCharacters.charCodeAt(i));
  }
  return new Blob([new Uint8Array(byteArrays)], { type });
}
