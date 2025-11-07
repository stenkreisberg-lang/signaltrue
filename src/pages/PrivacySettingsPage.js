import React from 'react';
import PrivacySettingsForm from '../components/PrivacySettingsForm';

export default function PrivacySettingsPage() {
  // TODO: Fetch org from API and implement onSave handler
  const org = { data_region: 'EU', data_retention_days: 90 };
  const handleSave = async (fields) => {
    // TODO: Call backend API to update org privacy settings
    alert('Settings saved: ' + JSON.stringify(fields));
  };
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 32 }}>
      <PrivacySettingsForm org={org} onSave={handleSave} />
      <div style={{ marginTop: 32 }}>
        <a href="/api/consent-audit/download" target="_blank" rel="noopener noreferrer">
          <button style={{ padding: '10px 24px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600 }}>
            Download Consent Audit (PDF)
          </button>
        </a>
      </div>
    </div>
  );
}
