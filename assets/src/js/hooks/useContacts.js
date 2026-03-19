import { useState, useEffect, useCallback, useRef } from 'react';
import { contactsApi } from '../api';

function useMounted() {
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);
  return mounted;
}

export function useContacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const mounted = useMounted();

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await contactsApi.list();
      if (mounted.current) setContacts(data || []);
    } catch {
      if (mounted.current) setContacts([]);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [mounted]);

  const addContact = useCallback(async (email, name, avatar) => {
    const contact = await contactsApi.create(email, name, avatar);
    setContacts(prev => [...prev, contact].sort((a, b) => a.name.localeCompare(b.name)));
    return contact;
  }, []);

  const updateContact = useCallback(async (id, name, avatar) => {
    const updated = await contactsApi.update(id, name, avatar);
    setContacts(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c));
    return updated;
  }, []);

  const removeContact = useCallback(async (id) => {
    await contactsApi.delete(id);
    setContacts(prev => prev.filter(c => c.id !== id));
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const getContactByEmail = useCallback((email) => {
    return contacts.find(c => c.email === email);
  }, [contacts]);

  return { contacts, loading, refresh: fetchContacts, addContact, updateContact, removeContact, getContactByEmail };
}