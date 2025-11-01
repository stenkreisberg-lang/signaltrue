import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('UI error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <h1 style={styles.title}>Something went wrong</h1>
            <p style={styles.subtitle}>Please refresh the page. If the issue persists, try clearing browser cache.</p>
            {process.env.NODE_ENV !== 'production' && (
              <pre style={styles.pre}>{String(this.state.error)}</pre>
            )}
            <button style={styles.button} onClick={() => window.location.reload()}>Refresh</button>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

const styles = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', padding: 24 },
  card: { background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, maxWidth: 720, width: '100%' },
  title: { margin: 0, marginBottom: 8, fontSize: 24 },
  subtitle: { marginTop: 0, marginBottom: 16, color: '#6b7280' },
  pre: { whiteSpace: 'pre-wrap', background: '#f3f4f6', borderRadius: 8, padding: 12, fontSize: 12, color: '#111827' },
  button: { padding: '10px 16px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }
};

export default ErrorBoundary;
