import React from 'react';
import { Link } from 'react-router-dom';
import SiteFooter from '../components/SiteFooter';

// Minimal styles object for Privacy page

export default function Privacy() {
  return (
    <>
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
            </div>
          </div>
        </nav>

        <header style={styles.header}> 
          <div style={styles.container}> 
            <h1 style={styles.title}>Privacy Policy</h1>
            <p style={styles.subtitle}>Effective Date: 16.12.2025 | Last Updated: 16.12.2025</p>
          </div>
        </header>

        <main style={styles.section}> 
          <div style={styles.container}> 
            <div style={styles.card}> 
              <p style={styles.content}>SignalTrue (“we”, “us”, “our”) respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, store, share, and protect data, including Google user data, when you use the SignalTrue website, platform, and services. This policy applies to all visitors and users of SignalTrue.</p>

              <h3 style={styles.h2}>Data Collected and Accessed</h3>
              <p style={styles.content}>We collect only the minimum data necessary to operate SignalTrue.</p>

              <h3 style={styles.h2}>Personal Data</h3>
              <p style={styles.content}>We collect personal data that you provide directly when you create an account, sign in, or contact us. This includes your name, email address, and Google Workspace email address when Google authentication is used. We do not collect job titles, phone numbers, physical addresses, or unnecessary profile information.</p>

              <h3 style={styles.h2}>Google User Data</h3>
              <p style={styles.content}>When you authenticate with Google or connect Google services, SignalTrue accesses certain Google user data only with your explicit consent. This data is limited to Google Calendar and Google Workspace metadata required to generate team-level collaboration signals. This may include event start and end times, meeting duration, organizers, attendee lists, RSVP and attendance status, and recurring event information. We do not access, store, or process email content, message bodies, chat messages, document contents, files, contact lists beyond calendar attendee metadata, device information, location data, keystrokes, screen activity, or browsing activity.</p>

              <h3 style={styles.h2}>How We Use Your Data</h3>
              <p style={styles.content}>SignalTrue uses collected data solely to provide, operate, and improve the platform. We use calendar and collaboration metadata to generate aggregated, team-level signals such as engagement patterns, meeting load trends, focus and recovery indicators, and early warning signals related to burnout risk or culture drift. Google user data is also used to authenticate users securely and maintain connected integrations.</p>
              <p style={styles.content}>We may use aggregated and anonymized data to improve product functionality, reliability, and performance. We use data to respond to support requests and to communicate important service-related updates.</p>
              <p style={styles.content}>SignalTrue does not use data to monitor individual employees, evaluate individual performance, conduct surveillance, or automate employment decisions. All insights are derived from patterns at the team level and are intended to support leadership understanding and human decision-making.</p>

              <h3 style={styles.h2}>Data Sharing</h3>
              <p style={styles.content}>SignalTrue does not sell, rent, or trade personal data or Google user data. We do not share Google user data with third parties for advertising or marketing purposes.</p>
              <p style={styles.content}>We may share data with trusted service providers that support the operation of SignalTrue, such as cloud hosting providers, database and storage services, analytics and monitoring tools, and email delivery services. These providers are contractually obligated to protect data and to use it only for providing services to SignalTrue.</p>
              <p style={styles.content}>We may disclose data if required to comply with applicable laws, legal processes, or governmental requests, or to protect the rights, safety, and security of SignalTrue, its users, or the public.</p>

              <h3 style={styles.h2}>Data Storage and Protection</h3>
              <p style={styles.content}>SignalTrue stores data on secure servers hosted by cloud infrastructure providers in the European Union. We use industry-standard security measures to protect data, including encryption in transit using TLS, encryption at rest where supported, strict access controls, authentication mechanisms, and regular security reviews. Access to data is limited to authorized personnel and systems necessary to operate and maintain the service.</p>

              <h3 style={styles.h2}>Data Retention and Deletion</h3>
              <p style={styles.content}>SignalTrue retains personal data and team-level metadata for as long as an account remains active or as necessary to provide services and comply with legal obligations. Users may request deletion of their data at any time by emailing <a href="mailto:privacy@signaltrue.ai" style={{color:'#6366f1'}}>privacy@signaltrue.ai</a> with the subject line “Data Deletion Request” and including the account email address.</p>
              <p style={styles.content}>We will acknowledge deletion requests within five business days and complete deletion from active systems within thirty days. Data will also be removed from backups within a reasonable period in accordance with our backup retention policies.</p>

              <h3 style={styles.h2}>Your Choices and Controls</h3>
              <p style={styles.content}>You may review and update your account information where available. You may revoke or modify Google OAuth permissions at any time through your Google Account settings under Security and Third-party apps with account access, or by disconnecting Google integrations within SignalTrue.</p>

              <h3 style={styles.h2}>Cookies and Tracking Technologies</h3>
              <p style={styles.content}>SignalTrue uses cookies and similar technologies to enable website functionality, analyze usage patterns, and improve performance. You may control cookies through your browser settings.</p>

              <h3 style={styles.h2}>Children’s Privacy</h3>
              <p style={styles.content}>SignalTrue does not knowingly collect personal data from children under the age of 16.</p>

              <h3 style={styles.h2}>Changes to This Privacy Policy</h3>
              <p style={styles.content}>We may update this Privacy Policy from time to time to reflect changes in legal requirements, technology, or our services. Any updates will be indicated by updating the “Last Updated” date at the top of this page.</p>

              <h3 style={styles.h2}>Contact Information</h3>
              <p style={styles.content}>If you have questions, concerns, or requests related to privacy or data protection, you may contact us at <a href="mailto:privacy@signaltrue.ai" style={{color:'#6366f1'}}>privacy@signaltrue.ai</a> or at Asula 4, 11312 Tallinn, Estonia.</p>
            </div>
          </div>
        </main>

        <SiteFooter />
      </div>
    </>
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

  header: { padding: '4rem 2rem', background: 'linear-gradient(to bottom, #f9fafb, white)', textAlign: 'center' },
  container: { maxWidth: '1000px', margin: '0 auto' },
  title: { fontSize: '2.5rem', fontWeight: '800', color: '#111827', marginBottom: '0.5rem' },
  subtitle: { fontSize: '1rem', color: '#6b7280' },

  section: { padding: '2rem' },
  card: { background: 'white', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '2rem', boxShadow: '0 8px 20px rgba(0,0,0,0.04)' },
  sectionBlock: { marginBottom: '1.75rem' },
  h2: { fontSize: '1.25rem', fontWeight: '700', color: '#111827', marginBottom: '0.75rem' },
  content: { color: '#4b5563', lineHeight: 1.7 },

  // Footer styles moved to SiteFooter component
};
