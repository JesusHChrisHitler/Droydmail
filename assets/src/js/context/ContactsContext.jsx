import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { contactsApi } from '../api';

const ContactsContext = createContext(null);

export function ContactsProvider({ children }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchContacts = useCallback(async () => {
    try {
      const data = await contactsApi.list();
      setContacts(data || []);
    } catch {
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const extractEmail = (str) => {
    if (!str) return '';
    const match = str.match(/<([^>]+)>/);
    return (match ? match[1] : str).toLowerCase().trim();
  };

  const getContactByEmail = useCallback((emailOrFrom) => {
    const normalized = extractEmail(emailOrFrom);
    return contacts.find(c => extractEmail(c.email) === normalized);
  }, [contacts]);

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
    const handleRefresh = () => fetchContacts();
    window.addEventListener('refreshContacts', handleRefresh);
    return () => window.removeEventListener('refreshContacts', handleRefresh);
  }, [fetchContacts]);

  return (
    <ContactsContext.Provider value={{ contacts, loading, refresh: fetchContacts, getContactByEmail, addContact, updateContact, removeContact }}>
      {children}
    </ContactsContext.Provider>
  );
}

export function useContactsContext() {
  const ctx = useContext(ContactsContext);
  if (!ctx) throw new Error('useContactsContext must be used within ContactsProvider');
  return ctx;
}