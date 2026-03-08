import { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
const familyCache = new Map();
const CACHE_TTL_MS = 2 * 60 * 1000;

export default function useDriftFamilies(orgId, { enabled = true, teamId = null } = {}) {
  const [families, setFamilies] = useState([]);
  const [coverage, setCoverage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !orgId) return;

    let mounted = true;
    const cacheKey = teamId ? `team:${teamId}` : `org:${orgId}`;
    const cached = familyCache.get(cacheKey);
    const isFresh = cached && Date.now() - cached.cachedAt < CACHE_TTL_MS;

    if (isFresh) {
      setFamilies(cached.families || []);
      setCoverage(cached.coverage || null);
    }

    const fetchFamilies = async () => {
      try {
        if (!isFresh) setLoading(true);
        const token = localStorage.getItem('token');
        const endpoint = teamId
          ? `${API_URL}/api/signals/team/${teamId}/families`
          : `${API_URL}/api/signals/org/${orgId}/families`;

        const res = await axios.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!mounted) return;
        setFamilies(res.data.families || []);
        setCoverage(res.data.coverage || null);
        familyCache.set(cacheKey, {
          families: res.data.families || [],
          coverage: res.data.coverage || null,
          cachedAt: Date.now(),
        });
        setError(null);
      } catch (err) {
        if (!mounted) return;
        console.error('[useDriftFamilies] Error fetching families:', err);
        setError(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (!isFresh) {
      fetchFamilies();
    }

    return () => {
      mounted = false;
    };
  }, [orgId, enabled, teamId]);

  return {
    families,
    coverage,
    loading,
    error,
  };
}
