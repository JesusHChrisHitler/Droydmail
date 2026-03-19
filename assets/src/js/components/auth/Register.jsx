import { useState } from 'react';
import { AuthLayout } from './AuthLayout';
import { CaptchaForm } from './CaptchaForm';
import { PasswordField } from '../forms/PasswordField';
import { PasswordStrength } from '../forms/PasswordStrength';
import { ROUTES } from '../../routes';
import { WarningIcon } from '../icons';

export function Register({ onRegister, navigate }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (captchaPayload) => {
    setLoading(true);
    try {
      await onRegister(username, password, email, captchaPayload);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout navigate={navigate} subtitle="Create your secure inbox" altText="Already have an account?" altAction="Sign in" altLink={ROUTES.login}>
      <CaptchaForm onSubmit={handleSubmit} className="space-y-3">
        {(captchaWidget) => (
          <>
            <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg mb-2">
              <WarningIcon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200/90">It is <span className="font-semibold text-amber-300">highly recommended</span> to use a VPN when registering for enhanced privacy and security.</p>
            </div>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} className="form-input-compact" placeholder="Enter username" />
              {username && <p className="form-hint font-mono">Your email: <span className="text-primary-light">{username}@georgedroyd.wtf</span></p>}
            </div>
            <div className="form-group">
              <PasswordField label="Password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Enter password" />
              <PasswordStrength password={password} />
            </div>
            <div className="form-group">
              <label className="form-label">Verification Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="form-input-compact" placeholder="your@email.com" />
              <p className="form-hint">We'll send a 6-digit code to verify</p>
            </div>
            {captchaWidget}
            <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-primary-muted text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/25 hover:shadow-primary/40 text-sm">
              {loading ? <span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Processing...</span> : 'Send verification code'}
            </button>
          </>
        )}
      </CaptchaForm>
    </AuthLayout>
  );
}