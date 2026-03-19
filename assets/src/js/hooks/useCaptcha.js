import { useRef, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api';

export function useCaptcha() {
  const [config, setConfig] = useState({ enabled: false, siteKey: '' });
  const [ready, setReady] = useState(false);
  const [rendered, setRendered] = useState(false);
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    authApi.getCaptchaConfig().then(setConfig).catch(() => {});
  }, []);

  useEffect(() => {
    if (!config.enabled || !config.siteKey) return;
    const checkReady = setInterval(() => {
      if (window.grecaptcha && window.grecaptcha.render) {
        setReady(true);
        clearInterval(checkReady);
      }
    }, 100);
    return () => clearInterval(checkReady);
  }, [config.enabled, config.siteKey]);

  const renderCaptcha = useCallback((container) => {
    if (!ready || !config.enabled || !config.siteKey || rendered) return;
    try {
      widgetIdRef.current = window.grecaptcha.render(container, {
        sitekey: config.siteKey,
        theme: 'dark',
      });
      setRendered(true);
    } catch (e) {}
  }, [ready, config, rendered]);

  const getPayload = useCallback(() => {
    if (!config.enabled || widgetIdRef.current === null) {
      return { enabled: false, token: '', valid: true };
    }
    const token = window.grecaptcha.getResponse(widgetIdRef.current);
    return { enabled: true, token, valid: !!token };
  }, [config.enabled]);

  const reset = useCallback(() => {
    if (window.grecaptcha && widgetIdRef.current !== null) {
      window.grecaptcha.reset(widgetIdRef.current);
    }
  }, []);

  const validate = useCallback(() => {
    const payload = getPayload();
    if (payload.enabled && !payload.valid) {
      return { error: 'Please complete the captcha', payload: null };
    }
    return { error: null, payload };
  }, [getPayload]);

  return {
    config,
    ready,
    rendered,
    containerRef,
    renderCaptcha,
    getPayload,
    reset,
    validate,
  };
}