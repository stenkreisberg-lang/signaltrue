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
            <p style={styles.subtitle}>Last updated: 16 December 2025</p>
          </div>
        </header>

        <main style={styles.section}> 
          <div style={styles.container}> 
            <div style={styles.card}> 
              <p style={styles.content}>SignalTrue is a business-to-business software service designed to help organizations understand team-level collaboration patterns and engagement signals. SignalTrue provides aggregated, derived insights to managers, HR, and leadership teams to support healthier team operations and better leadership decisions.</p>
              <p style={styles.content}>SignalTrue connects to a company’s Google Workspace environment using Google Calendar read-only access. SignalTrue does not monitor individual employees, does not track personal behavior, does not access meeting content, and does not provide data or insights to third parties.</p>

              <h3 style={styles.h2}>DATA CONTROLLER</h3>
              <p style={styles.content}>SignalTrue OÜ<br />
              Asula 4, 11312 Tallinn, Estonia<br />
              Email: <a href="mailto:privacy@signaltrue.ai" style={{color:'#6366f1'}}>privacy@signaltrue.ai</a></p>

              <h3 style={styles.h2}>SCOPE OF THIS PRIVACY POLICY</h3>
              <p style={styles.content}>This Privacy Policy explains how SignalTrue accesses, uses, stores, protects, and deletes data, including Google user data, in compliance with the Google API Services User Data Policy, Google APIs Terms of Service, and applicable data protection laws.</p>

              <h3 style={styles.h2}>DATA ACCESSED (GOOGLE USER DATA)</h3>
              <p style={styles.content}>SignalTrue accesses Google Calendar data only. No other Google services or APIs are accessed.</p>
              <p style={styles.content}>SignalTrue uses a Google Calendar read-only OAuth scope.</p>
              <p style={styles.content}>SignalTrue does not access the following Google Calendar data:</p>
              <ul style={{...styles.content, paddingLeft:'20px'}}>
                <li>Event titles or summaries</li>
                <li>Event descriptions</li>
                <li>Event start or end times</li>
                <li>Attendee lists</li>
                <li>Organizer information</li>
                <li>Meeting content or attachments</li>
              </ul>
              <p style={styles.content}>SignalTrue accesses only the minimum calendar response metadata required to calculate meeting invitation acceptance timing and response behavior trends. This includes metadata related to when calendar invitations are accepted or declined.</p>
              <p style={styles.content}>SignalTrue does not access historical Google Calendar data. Data collection begins only after a user explicitly connects their Google Calendar account to SignalTrue.</p>

              <h3 style={styles.h2}>DATA USAGE</h3>
              <p style={styles.content}>SignalTrue uses Google Calendar data solely to generate derived, aggregated behavioral signals at team level.</p>
              <p style={styles.content}>Examples of derived signals include:</p>
              <ul style={{...styles.content, paddingLeft:'20px'}}>
                <li>Meeting invitation acceptance speed trends</li>
                <li>Changes in response behavior over time</li>
              </ul>
              <p style={styles.content}>SignalTrue does not display raw Google Calendar data to users. SignalTrue does not expose individual-level calendar activity. All insights are aggregated and presented at team level only.</p>
              <p style={styles.content}>Google Calendar data is used exclusively to provide SignalTrue’s user-facing features and to support team-level leadership and HR decision-making.</p>

              <h3 style={styles.h2}>DATA STORAGE</h3>
              <p style={styles.content}>SignalTrue does not store raw Google Calendar event data.</p>
              <p style={styles.content}>Only derived signals generated from calendar response metadata are stored.</p>
              <p style={styles.content}>All data is stored in a tenant-isolated manner. Data from one customer organization is logically separated from data belonging to other customers.</p>

              <h3 style={styles.h2}>DATA SHARING</h3>
              <p style={styles.content}>SignalTrue does not sell, rent, license, or otherwise provide Google user data or derived insights to third parties.</p>
              <p style={styles.content}>SignalTrue does not share Google user data for advertising, profiling, analytics, or marketing purposes.</p>
              <p style={styles.content}>SignalTrue does not use Google user data to train artificial intelligence or machine learning models.</p>
              <p style={styles.content}>SignalTrue may use infrastructure providers (such as cloud hosting services) strictly as data processors to operate the service. These providers do not access or use data for their own purposes.</p>

              <h3 style={styles.h2}>DATA RETENTION</h3>
              <p style={styles.content}>SignalTrue retains data while the customer account is active.</p>
              <p style={styles.content}>If Google Calendar access is disconnected, SignalTrue stops collecting new data. Existing derived signals may be retained unless deletion is requested.</p>

              <h3 style={styles.h2}>DATA DELETION</h3>
              <p style={styles.content}>Customers may request deletion of all stored data via an administrator-level request.</p>
              <p style={styles.content}>Upon a valid deletion request:</p>
              <ul style={{...styles.content, paddingLeft:'20px'}}>
                <li>All derived signals and stored data associated with the customer organization are permanently deleted.</li>
              </ul>
              <p style={styles.content}>Individual employee deletion requests are not applicable, as SignalTrue stores only aggregated, team-level signals and does not store individual user data.</p>

              <h3 style={styles.h2}>DATA SECURITY</h3>
              <p style={styles.content}>SignalTrue applies industry-standard security practices to protect data, including:</p>
              <ul style={{...styles.content, paddingLeft:'20px'}}>
                <li>Encryption in transit using TLS</li>
                <li>Encryption at rest</li>
                <li>Strict tenant isolation</li>
              </ul>
              <p style={styles.content}>Access to production data is restricted to authorized superadmin personnel only and is limited to what is necessary to operate and support the service.</p>

              <h3 style={styles.h2}>USER RIGHTS</h3>
              <p style={styles.content}>Where applicable under data protection laws, customers may request access to, correction of, or deletion of their organization’s data through an authorized administrator.</p>

              <h3 style={styles.h2}>COMPLIANCE WITH GOOGLE API SERVICES USER DATA POLICY</h3>
              <p style={styles.content}>SignalTrue’s use of Google user data complies with the Google API Services User Data Policy, including Limited Use requirements.</p>
              <p style={styles.content}>Google user data is:</p>
              <ul style={{...styles.content, paddingLeft:'20px'}}>
                <li>Used only to provide SignalTrue’s user-facing features</li>
                <li>Not sold</li>
                <li>Not used for advertising</li>
                <li>Not used for profiling</li>
                <li>Not used for surveillance</li>
                <li>Not used for AI or machine learning model training</li>
              </ul>

              <h3 style={styles.h2}>CONTACT</h3>
              <p style={styles.content}>For privacy, data protection, or deletion requests, authorized administrators may contact: <a href="mailto:privacy@signaltrue.ai" style={{color:'#6366f1'}}>privacy@signaltrue.ai</a></p>
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
