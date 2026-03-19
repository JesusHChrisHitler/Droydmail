import { useState, useEffect, useRef } from 'react';
import { useCache } from '../context/CacheContext';

export function useEmailView(token) {
  const { getEmail, fetchEmail } = useCache();
  const getEmailRef = useRef(getEmail);
  const fetchEmailRef = useRef(fetchEmail);
  getEmailRef.current = getEmail;
  fetchEmailRef.current = fetchEmail;

  const [email, setEmail] = useState(() => getEmail(token));
  const [loading, setLoading] = useState(() => !getEmail(token));
  const [error, setError] = useState(null);
  const fetchedRef = useRef(null);

  useEffect(() => {
    if (!token || token === 'undefined' || token === 'null') {
      setError('Invalid token');
      setLoading(false);
      return;
    }

    const cached = getEmailRef.current(token);
    if (cached) {
      setEmail(cached);
      setLoading(false);
      fetchedRef.current = token;
      return;
    }

    if (fetchedRef.current === token) return;
    fetchedRef.current = token;

    setLoading(true);
    setError(null);

    fetchEmailRef.current(token)
      .then(data => {
        setEmail(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to load');
        setLoading(false);
        fetchedRef.current = null;
      });
  }, [token]);

  return { email, loading, error };
}