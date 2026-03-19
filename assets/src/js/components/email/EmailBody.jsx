import { useEffect, useRef } from 'react';

export function EmailBody({ email, showHtml, onLinkClick }) {
  const iframeRef = useRef(null);
  const hasHtml = email.bodyHtml?.trim();

  useEffect(() => {
    if (hasHtml && iframeRef.current && showHtml) {
      const doc = iframeRef.current.contentDocument;
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src ${window.location.origin} data: cid:;"><style>
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.6;color:#e5e5e5;background:transparent;margin:0;padding:0;word-wrap:break-word}
        a{color:#a78bfa;cursor:pointer}img{max-width:100%;height:auto}pre,code{background:#1a1a2e;padding:2px 6px;border-radius:4px}
        blockquote{border-left:3px solid #6d28d9;margin:1em 0;padding-left:1em;color:#9ca3af}
        :-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-track{background:#16162a}::-webkit-scrollbar-thumb{background:#3d3d5c;border-radius:4px}:-webkit-scrollbar-thumb:hover{background:#6d28d9}*{scrollbar-width:thin;scrollbar-color:#3d3d5c #16162a}
      </style></head><body>${email.bodyHtml}</body></html>`);
      doc.close();
      setTimeout(() => {
        if (iframeRef.current?.contentDocument?.body) {
          iframeRef.current.style.height = iframeRef.current.contentDocument.body.scrollHeight + 'px';
          const links = iframeRef.current.contentDocument.querySelectorAll('a[href]');
          links.forEach(link => {
            link.addEventListener('click', (e) => {
              e.preventDefault();
              const href = link.getAttribute('href');
              if (href && !href.startsWith('#')) {
                onLinkClick({ url: href, text: link.textContent || href });
              }
            });
          });
        }
      }, 100);
    }
  }, [email, showHtml, hasHtml, onLinkClick]);

  if (hasHtml && showHtml) {
    return <iframe ref={iframeRef} sandbox="allow-same-origin" className="w-full border-0 min-h-[200px]" title="Email content" />;
  }

  const linkifyText = (text) => {
    if (!text) return '(No content)';
    const urlRegex = /(https?:\/\/[^\s<>"')\]]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) =>
      urlRegex.test(part) ? (
        <a
          key={i}
          href="#"
          onClick={(e) => { e.preventDefault(); onLinkClick({ url: part, text: part }); }}
          className="text-purple-400 hover:text-purple-300 underline break-all"
        >
          {part}
        </a>
      ) : part
    );
  };

  return (
    <div className="text-gray-300 leading-relaxed whitespace-pre-wrap text-[15px]">
      {linkifyText(email.body)}
    </div>
  );
}