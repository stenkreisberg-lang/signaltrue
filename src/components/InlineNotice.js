import React from 'react';

export default function InlineNotice({ kind = 'info', title, children, style }) {
  const styles = getStyles(kind);
  return (
    <div role="status" style={{ ...styles.base, ...style }}>
      {title && <strong style={styles.strong}>{title} </strong>}
      <span>{children}</span>
    </div>
  );
}

function getStyles(kind) {
  const kinds = {
    info: {
      base: {
        background: 'var(--color-brand-softer)',
        color: 'var(--color-brand)',
        border: '1px solid var(--color-brand-soft)',
      },
      strong: { color: 'var(--color-brand-dark)' },
    },
    success: {
      base: { background: '#ECFDF5', color: '#065F46', border: '1px solid #6EE7B7' },
      strong: { color: 'var(--color-brand-dark)' },
    },
    warning: {
      base: { background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' },
      strong: { color: '#7C2D12' },
    },
    error: {
      base: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #FCA5A5' },
      strong: { color: '#7F1D1D' },
    },
  };
  const common = {
    base: { padding: '1rem 1.25rem', borderRadius: 8, marginBottom: '1.5rem' },
    strong: {},
  };
  const sel = kinds[kind] || kinds.info;
  return { base: { ...common.base, ...sel.base }, strong: { ...common.strong, ...sel.strong } };
}
