import React, { useState } from 'react';
import { Link } from 'react-router-dom';

// Minimal styles object for Contact page

function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    teamSize: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // In production, this would send to your backend
    console.log('Form submitted:', formData);
    setSubmitted(true);
  };

  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <div style={styles.navContent}>
          <Link to="/" style={styles.logoLink}>
            <img src="/logo-icon.svg" alt="SignalTrue" style={styles.logoImg} />
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

      <section style={styles.hero}>
        <div style={styles.container}>
          <h1 style={styles.heroTitle}>Get in Touch</h1>
          <p style={styles.heroSubtitle}>
            Request a demo, ask a question, or just say hello. We'd love to hear from you.
          </p>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.container}>
          <div style={styles.contentGrid}>
            {/* Contact Info */}
            <div style={styles.infoSection}>
              <h2 style={styles.infoTitle}>Contact Information</h2>
              <p style={styles.infoText}>
                Fill out the form and our team will get back to you within 24 hours.
              </p>

              <div style={styles.contactMethods}>
                <div style={styles.contactMethod}>
                  <div style={styles.contactIcon}>📧</div>
                  <div>
                    <div style={styles.contactLabel}>Email</div>
                    <a href="mailto:hello@signaltrue.ai" style={styles.contactValue}>hello@signaltrue.ai</a>
                  </div>
                </div>

                <div style={styles.contactMethod}>
                  <div style={styles.contactIcon}>💬</div>
                  <div>
                    <div style={styles.contactLabel}>Support</div>
                    <a href="mailto:support@signaltrue.ai" style={styles.contactValue}>support@signaltrue.ai</a>
                  </div>
                </div>

                <div style={styles.contactMethod}>
                  <div style={styles.contactIcon}>💼</div>
                  <div>
                    <div style={styles.contactLabel}>Sales</div>
                    <a href="mailto:sales@signaltrue.ai" style={styles.contactValue}>sales@signaltrue.ai</a>
                  </div>
                </div>
              </div>

              <div style={styles.infoBox}>
                <h3 style={styles.infoBoxTitle}>What to Expect</h3>
                <ul style={styles.expectList}>
                  <li>✓ Response within 24 hours</li>
                  <li>✓ Personalized product demo</li>
                  <li>✓ Custom pricing for your team size</li>
                  <li>✓ Free 14-day trial access</li>
                  <li>✓ No high-pressure sales tactics</li>
                </ul>
              </div>
            </div>

            {/* Contact Form */}
            <div style={styles.formSection}>
              {!submitted ? (
                <form onSubmit={handleSubmit} style={styles.form}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      style={styles.input}
                      placeholder="John Doe"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Work Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      style={styles.input}
                      placeholder="john@company.com"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Company *</label>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      required
                      style={styles.input}
                      placeholder="Acme Inc."
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Team Size *</label>
                    <select
                      name="teamSize"
                      value={formData.teamSize}
                      onChange={handleChange}
                      required
                      style={styles.select}
                    >
                      <option value="">Select team size</option>
                      <option value="1-25">1-25 employees</option>
                      <option value="26-100">26-100 employees</option>
                      <option value="101-500">101-500 employees</option>
                      <option value="501+">500+ employees</option>
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Message</label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      style={styles.textarea}
                      rows="4"
                      placeholder="Tell us about your team and what you're looking for..."
                    />
                  </div>

                  <button type="submit" style={styles.submitButton}>
                    Request Demo
                  </button>

                  <p style={styles.formNote}>
                    By submitting this form, you agree to our Privacy Policy.
                    We'll never share your information.
                  </p>
                </form>
              ) : (
                <div style={styles.successMessage}>
                  <div style={styles.successIcon}>✓</div>
                  <h3 style={styles.successTitle}>Thank You!</h3>
                  <p style={styles.successText}>
                    We've received your request and will get back to you within 24 hours.
                  </p>
                  <p style={styles.successText}>
                    Check your email for a calendar link to schedule your personalized demo.
                  </p>
                  <Link to="/" style={styles.backButton}>
                    Back to Home
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: 'white' },
  nav: { background: 'white', borderBottom: '1px solid #e5e7eb', padding: '1rem 2rem', position: 'sticky', top: 0, zIndex: 100 },
  navContent: { maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logoLink: { display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' },
  logoImg: { height: '32px', width: '32px' },
  logoText: { fontSize: '1.25rem', fontWeight: '700', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  navLinks: { display: 'flex', gap: '2rem', alignItems: 'center' },
  navLink: { color: '#4b5563', textDecoration: 'none', fontWeight: '500' },
  loginBtn: { padding: '0.5rem 1.5rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', borderRadius: '6px', textDecoration: 'none', fontWeight: '600' },
  hero: { padding: '5rem 2rem 3rem', background: 'linear-gradient(to bottom, #f9fafb, white)', textAlign: 'center' },
  container: { maxWidth: '1200px', margin: '0 auto' },
  heroTitle: { fontSize: '3rem', fontWeight: '700', color: '#111827', marginBottom: '1.5rem' },
  heroSubtitle: { fontSize: '1.25rem', color: '#6b7280', lineHeight: 1.6, maxWidth: '800px', margin: '0 auto' },
  section: { padding: '4rem 2rem' },
  contentGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '4rem', alignItems: 'start' },
  infoSection: { display: 'flex', flexDirection: 'column', gap: '2rem' },
  infoTitle: { fontSize: '2rem', fontWeight: '700', color: '#111827' },
  infoText: { fontSize: '1.125rem', color: '#6b7280', lineHeight: 1.7 },
  contactMethods: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  contactMethod: { display: 'flex', alignItems: 'center', gap: '1rem' },
  contactIcon: { fontSize: '2rem' },
  contactLabel: { fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' },
  contactValue: { fontSize: '1.125rem', color: '#6366f1', textDecoration: 'none', fontWeight: '600' },
  infoBox: { background: '#f9fafb', borderRadius: '12px', padding: '2rem', border: '1px solid #e5e7eb' },
  infoBoxTitle: { fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' },
  expectList: { listStyle: 'none', padding: 0, color: '#4b5563', lineHeight: 2 },
  formSection: { background: 'white', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '3rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' },
  form: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  label: { fontSize: '0.95rem', fontWeight: '600', color: '#374151' },
  input: { padding: '0.875rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', fontFamily: 'inherit' },
  select: { padding: '0.875rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', fontFamily: 'inherit', background: 'white' },
  textarea: { padding: '0.875rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', fontFamily: 'inherit', resize: 'vertical' },
  submitButton: { padding: '1rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', marginTop: '0.5rem' },
  formNote: { fontSize: '0.875rem', color: '#6b7280', textAlign: 'center', marginTop: '0.5rem' },
  successMessage: { textAlign: 'center', padding: '2rem 0' },
  successIcon: { width: '80px', height: '80px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', margin: '0 auto 2rem', fontWeight: '700' },
  successTitle: { fontSize: '2rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' },
  successText: { fontSize: '1.125rem', color: '#6b7280', lineHeight: 1.7, marginBottom: '1rem' },
  backButton: { display: 'inline-block', marginTop: '1.5rem', padding: '0.875rem 2rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: '600' },
  // Footer styles moved to shared SiteFooter component
};

export default Contact;
