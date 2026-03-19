import { useState } from 'react';
import { AuthLayout } from './AuthLayout';
import { CaptchaForm } from './CaptchaForm';
import { PasswordField } from '../forms/PasswordField';
import { ROUTES } from '../../routes';

export function Login({ onLogin, navigate }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (captchaPayload) => {
    setLoading(true);
    try {
      await onLogin(username, password, captchaPayload);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout navigate={navigate} subtitle="Sign in to your account" altText="Don't have an account?" altAction="Register" altLink={ROUTES.register}>
      <CaptchaForm onSubmit={handleSubmit} className="space-y-fluid-4">
        {(captchaWidget) => (
          <>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} className="form-input" placeholder="Enter username" />
            </div>
            <PasswordField label="Password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Enter password" />
            {captchaWidget}
            <button type="submit" disabled={loading} className="w-full py-3.5 bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-primary-muted text-white font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/25 hover:shadow-primary/40">
              {loading ? <span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Processing...</span> : 'Sign in'}
            </button>
          </>
        )}
      </CaptchaForm>
    </AuthLayout>
  );
}