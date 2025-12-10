import React from 'react';
import { Link } from 'react-router-dom';

const styles = {
  nav: {
    backgroundColor: '#111827', // bg-gray-900
    padding: '1rem 1.5rem',
  },
  navContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '72rem',
    margin: '0 auto',
  },
  logoLink: {
    display: 'flex',
    alignItems: 'center',
    textDecoration: 'none',
  },
  logoImg: {
    height: '2rem',
    width: 'auto',
  },
  logoText: {
    color: 'white',
    fontSize: '1.25rem',
    fontWeight: 'bold',
    marginLeft: '0.5rem',
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  navLink: {
    color: '#D1D5DB', // text-gray-300
    textDecoration: 'none',
    '&:hover': {
      color: 'white',
    },
  },
  loginBtn: {
    color: 'white',
    backgroundColor: '#4F46E5', // bg-indigo-600
    padding: '0.5rem 1rem',
    borderRadius: '0.375rem',
    textDecoration: 'none',
    '&:hover': {
      backgroundColor: '#4338CA', // bg-indigo-700
    },
  },
};

function SiteHeader() {
  return (
    <nav style={styles.nav}>
      <div style={styles.navContent}>
        <Link to="/" style={styles.logoLink}>
          <img src="/images/logo-icon.svg" alt="SignalTrue" style={styles.logoImg} />
          <span style={styles.logoText}>SignalTrue</span>
        </Link>
        <div style={styles.navLinks}>
          <Link to="/product" style={styles.navLink}>Product</Link>
          <Link to="/pricing" style={styles.navLink}>Pricing</Link>
          <Link to="/about" style={styles.navLink}>About</Link>
          <Link to="/contact" style={styles.navLink}>Contact</Link>
          <Link to="/login" style={styles.loginBtn}>Login</Link>
        </div>
      </div>
    </nav>
  );
}

export default SiteHeader;
