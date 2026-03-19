// components/auth/AuthLayout.jsx
import { Media } from '../ui/Media';
import { BackArrowIcon } from '../icons';
import { ROUTES } from '../../routes';

export function AuthLayout({ children, subtitle, navigate, altAction, altText, altLink }) {
  return (
    <div className="min-h-screen bg-surface-landing flex items-center justify-center p-fluid-4 relative overflow-hidden min-w-[320px] select-none">
      {/* Large gradient orbs */}
      <div className="absolute -top-48 -left-48 w-[500px] h-[500px] bg-gradient-to-br from-primary/30 to-purple-900/20 rounded-full blur-3xl animate-pulse-glow"></div>
      <div className="absolute -bottom-32 -right-32 w-[400px] h-[400px] bg-gradient-to-tl from-purple-600/25 to-primary/10 rounded-full blur-3xl" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-primary/15 rounded-full blur-2xl animate-drift"></div>
      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }}></div>
      {/* Background grid */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(109,40,217,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(109,40,217,0.12) 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }}></div>
      </div>
      {/* Glow line accents */}
      <div className="absolute top-0 left-1/4 w-px h-32 bg-gradient-to-b from-primary/50 to-transparent"></div>
      <div className="absolute bottom-0 right-1/3 w-px h-48 bg-gradient-to-t from-purple-500/40 to-transparent"></div>
      {/* Floating particles */}
      <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary rounded-full animate-float opacity-70"></div>
      <div className="absolute bottom-1/3 right-1/4 w-1.5 h-1.5 bg-primary-light rounded-full animate-drift opacity-60" style={{ animationDelay: '0.5s' }}></div>
      <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-purple-400 rounded-full animate-pulse-glow opacity-50" style={{ animationDelay: '1s' }}></div>
      <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-purple-300 rounded-full animate-float opacity-40" style={{ animationDelay: '1.5s' }}></div>
      <div className="absolute top-2/3 right-1/5 w-1 h-1 bg-primary rounded-full animate-drift opacity-50" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-1/2 left-1/6 w-1 h-1 bg-purple-400 rounded-full animate-float opacity-35" style={{ animationDelay: '2.5s' }}></div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div onClick={() => navigate(ROUTES.home)} className="inline-flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary rounded-xl blur-md opacity-50 group-hover:opacity-75 transition-opacity"></div>
              <Media src="logo.webp" alt="DroydMail" className="w-12 h-12 rounded-xl object-cover relative z-10 border-primary/50" />
            </div>
            <div className="text-left">
              <span className="text-white font-bold text-xl block tracking-wide">DroydMail</span>
              <span className="text-primary text-xs font-mono">NEGROTECH</span>
            </div>
          </div>
          <p className="text-gray-500 text-sm mt-6">{subtitle}</p>
        </div>

        {/* Form card */}
        <div className="bg-surface-base border-border rounded-2xl p-fluid-4 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
          {children}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center space-y-2">
          <button onClick={() => navigate(altLink)} className="text-gray-500 text-sm hover:text-primary-light transition-colors">
            {altText} <span className="text-primary-light">{altAction}</span>
          </button>
          <br />
          <button onClick={() => navigate(ROUTES.home)} className="text-gray-500 text-sm hover:text-primary-light transition-colors inline-flex items-center gap-2 group">
            <BackArrowIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to home
          </button>
        </div>
        <p className="text-center text-gray-600 text-xs mt-8 font-mono">Secured by Negrotech Encryption</p>
      </div>
    </div>
  );
}