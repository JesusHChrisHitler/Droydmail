import { useEffect, useRef } from 'react';

export function CaptchaWidget({ captcha }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current && captcha.ready && !captcha.rendered) {
      captcha.renderCaptcha(containerRef.current);
    }
  }, [captcha.ready, captcha.rendered, captcha.renderCaptcha]);

  if (!captcha.config.enabled || !captcha.config.siteKey) {
    return null;
  }

  return (
    <div className="flex justify-center">
      <div ref={containerRef}></div>
    </div>
  );
}