import React, { useState } from 'react';
import api from '../../utils/api';

export default function ReportExportActions({ version }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const openReport = async (kind) => {
    setBusy(kind);
    setError('');
    try {
      const path = kind === 'pdf' ? '/weekly-brief/report.pdf' : '/weekly-brief/email-preview';
      const response = await api.get(path, { responseType: 'blob' });
      const blob = new Blob([response.data], {
        type: kind === 'pdf' ? 'application/pdf' : 'text/html;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      if (kind === 'pdf') {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'SignalTrue-' + (version || 'nadalaaruanne') + '.pdf';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      } else {
        const preview = window.open(url, '_blank', 'noopener,noreferrer');
        if (!preview) setError('Brauser blokeeris eelvaate. Luba selle lehe hüpikaken.');
      }
      // Let the download or new tab resolve its blob URL.
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      setError(err.response?.data?.message || 'Aruande avamine ebaõnnestus.');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={Boolean(busy)}
        onClick={() => openReport('pdf')}
        className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy === 'pdf' ? 'PDF-i loomine…' : 'Laadi alla HR aruanne (PDF)'}
      </button>
      <button
        type="button"
        disabled={Boolean(busy)}
        onClick={() => openReport('email')}
        className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 disabled:opacity-50"
      >
        {busy === 'email' ? 'Eelvaate avamine…' : 'Vaata HR e-kirja'}
      </button>
      {version && <span className="text-xs text-slate-600">Versioon {version}</span>}
      {error && (
        <span className="text-xs text-amber-800" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
