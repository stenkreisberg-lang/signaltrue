import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * PrivacySettingsForm
 * Dropdowns for data region and retention period, with save handler.
 */
export default function PrivacySettingsForm({ org, onSave }) {
  const [dataRegion, setDataRegion] = useState(org?.data_region || 'EU');
  const [retention, setRetention] = useState(org?.data_retention_days || 90);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave({ data_region: dataRegion, data_retention_days: retention });
    } catch (err) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} style={{ maxWidth: 400, margin: '0 auto', padding: 24, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #e5e7eb' }}>
      <h2 style={{ marginBottom: 16 }}>Privacy Settings</h2>
      <label style={{ display: 'block', marginBottom: 8 }}>
        Data Region
        <select value={dataRegion} onChange={e => setDataRegion(e.target.value)} style={{ width: '100%', marginTop: 4 }}>
          <option value="EU">EU</option>
          <option value="US">US</option>
          <option value="Other">Other</option>
        </select>
      </label>
      <label style={{ display: 'block', marginBottom: 16 }}>
        Data Retention Period (days)
        <select value={retention} onChange={e => setRetention(Number(e.target.value))} style={{ width: '100%', marginTop: 4 }}>
          <option value={30}>30</option>
          <option value={90}>90</option>
          <option value={180}>180</option>
        </select>
      </label>
      {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
      <button type="submit" disabled={saving} style={{ padding: '8px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600 }}>
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </form>
  );
}

PrivacySettingsForm.propTypes = {
  org: PropTypes.object,
  onSave: PropTypes.func.isRequired,
};
