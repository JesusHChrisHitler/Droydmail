import { useEffect, useRef, useCallback } from 'react';

const searchCallbacks = new Map();

export function useSocket(user, handlers = {}) {
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);
  const attemptsRef = useRef(0);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const userRef = useRef(user);
  userRef.current = user;

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;
    if (!userRef.current) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      attemptsRef.current = 0;
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'email') {
          window.dispatchEvent(new CustomEvent('wsEmail', { detail: msg.payload }));
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('New Email', { body: `From: ${msg.payload.from}\n${msg.payload.subject}`, icon: '/media/logo.webp', tag: msg.payload.token });
          }
        }
        if (msg.type === 'storage') window.dispatchEvent(new CustomEvent('wsStorage', { detail: msg.payload }));
        if (msg.type === 'contacts') window.dispatchEvent(new Event('refreshContacts'));
        if (msg.type === 'mail_move') window.dispatchEvent(new CustomEvent('wsMailMove', { detail: msg.payload }));
        if (msg.type === 'mail_delete') window.dispatchEvent(new CustomEvent('wsMailDelete', { detail: msg.payload }));
        if (msg.type === 'batch_delete') window.dispatchEvent(new CustomEvent('wsBatchDelete', { detail: msg.payload }));
        if (msg.type === 'unread_counts') {
          window.__unreadCounts = msg.payload;
          window.dispatchEvent(new CustomEvent('wsUnreadCounts', { detail: msg.payload }));
        }
        if (msg.type === 'alias_create') window.dispatchEvent(new CustomEvent('wsAliasCreate', { detail: msg.payload }));
        if (msg.type === 'alias_delete') window.dispatchEvent(new CustomEvent('wsAliasDelete', { detail: msg.payload }));
        if (msg.type === 'search_result') {
          const cb = searchCallbacks.get(msg.payload.id);
          if (cb?.onResult) cb.onResult(msg.payload.email);
        }
        if (msg.type === 'search_done') {
          const cb = searchCallbacks.get(msg.payload.id);
          if (cb?.onDone) cb.onDone(msg.payload.total);
          searchCallbacks.delete(msg.payload.id);
        }
        if (msg.type === 'role_change') {
          window.dispatchEvent(new CustomEvent('wsRoleChange', { detail: msg.payload }));
        }
        if (msg.type === 'user_role_change') {
          window.dispatchEvent(new CustomEvent('wsUserRoleChange', { detail: msg.payload }));
        }
        if (msg.type === 'admin_report') {
          window.dispatchEvent(new CustomEvent('wsAdminReport', { detail: msg.payload }));
        }
        if (msg.type === 'admin_counts') {
          const adminOnly = { admin: msg.payload.admin };
          window.__unreadCounts = { ...window.__unreadCounts, ...adminOnly };
          window.dispatchEvent(new CustomEvent('wsUnreadCounts', { detail: window.__unreadCounts }));
        }
      } catch (err) {}
    };

    ws.onclose = () => {
      wsRef.current = null;
      const delay = Math.min(1000 * Math.pow(2, attemptsRef.current), 30000);
      attemptsRef.current++;
      reconnectRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  useEffect(() => {
    if (user && (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)) {
      connect();
    }
    if (!user && wsRef.current) {
      wsRef.current.close();
    }
  }, [user, connect]);

  return wsRef;
}

export function getWsRef() {
  return window.__wsRef;
}

export function setWsRef(ref) {
  window.__wsRef = ref;
}

export function wsSearch(query, folder, onResult, onDone) {
  const ws = window.__wsRef?.current;
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    onDone(0);
    return () => {};
  }
  const id = Math.random().toString(36).slice(2);
  searchCallbacks.set(id, { onResult, onDone });
  ws.send(JSON.stringify({ type: 'search', payload: { id, query, folder } }));
  return () => searchCallbacks.delete(id);
}