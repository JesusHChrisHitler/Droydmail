import { useState } from 'react';
import { useToast } from '../ui/Toast';
import { Media } from '../ui/Media';
import { ROUTES } from '../../routes';

export function Verification({ username, email, onVerify, navigate }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onVerify(username, code);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-landing flex items-center justify-center p-fluid-4 relative overflow-hidden min-w-[320px] select-none">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(109,40,217,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(109,40,217,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary rounded-full animate-float opacity-50"></div>
      <div className="absolute bottom-1/3 right-1/4 w-1.5 h-1.5 bg-primary-light rounded-full animate-drift opacity-40" style={{ animationDelay: '0.5s' }}></div>
      <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-primary rounded-full animate-pulse-glow opacity-40" style={{ animationDelay: '1s' }}></div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <div onClick={() => navigate(ROUTES.home)} className="inline-flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary rounded-xl blur-md opacity-50 group-hover:opacity-75 transition-opacity"></div>
              <Media 
                src="logo.webp" 
                alt="DroydMail" 
                className="w-12 h-12 rounded-xl object-cover relative z-10 border border-primary/50"
              />
            </div>
            <div className="text-left">
              <span className="text-white font-bold text-xl block tracking-wide">DroydMail</span>
              <span className="text-primary text-xs font-mono">NEGROTECH</span>
            </div>
          </div>
          <p className="text-gray-500 text-sm mt-6">Enter verification code</p>
        </div>

        <div className="bg-surface-base border border-border rounded-2xl p-fluid-4 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-3 font-medium text-center">Verification Code</label>
              <div className="flex justify-center gap-2">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <input
                    key={index}
                    id={`code-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={code[index] || ''}
                autoFocus={index === 0}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                if (val) {
                        const newCode = code.padEnd(6, ' ').split('');
                        newCode[index] = val[val.length - 1];
                setCode(newCode.join('').trim());
                        if (index < 5) document.getElementById(`code-${index + 1}`)?.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace') {
                        e.preventDefault();
                        const newCode = code.padEnd(6, ' ').split('');
                        if (code[index]) {
                          newCode[index] = ' ';
                          setCode(newCode.join('').trim());
                        } else if (index > 0) {
                          newCode[index - 1] = ' ';
                          setCode(newCode.join('').trim());
                document.getElementById(`code-${index - 1}`)?.focus();
                        }
                      }
                    }}
                    onPaste={(e) => {
                e.preventDefault();
                      const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                setCode(paste);
                      document.getElementById(`code-${Math.min(paste.length, 5)}`)?.focus();
                    }}
                className="form-input-code"
                  />
                ))}
              </div>
              <p className="text-gray-500 text-xs mt-4 text-center">
                Check <span className="text-primary-light">{email}</span> for the code
              </p>
            </div>

            <button 
              type="submit" 
              disabled={loading || code.length !== 6} 
              className="w-full py-3 bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-primary-muted text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/25 hover:shadow-primary/40"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Processing...
                </span>
              ) : 'Verify & create account'}
            </button>
            <button
              type="button"
              onClick={() => navigate(ROUTES.register)}
              className="w-full py-2 text-gray-500 hover:text-white text-sm transition-colors"
            >
              ← Back to registration
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-xs mt-8 font-mono">
          Secured by Negrotech Encryption
        </p>
      </div>
    </div>
  );
}