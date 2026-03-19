import { useState, useEffect } from 'react';
import { Banner } from '../ui/Banner';
import { Media } from '../ui/Media';
import { Loading } from '../ui/Loading';
import { AuthButton } from '../status/AuthButton';
import { ROUTES } from '../../routes';
import { AndroidIcon, ArrowRightIcon, CheckIcon } from '../icons';

export function Landing({ navigate, user }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen flex-col bg-surface-landing min-w-[320px] select-none overflow-x-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-primary-light/10 rounded-full blur-[100px]" />
      </div>

      <nav className="sticky top-0 z-50 h-16 flex items-center justify-between px-6 md:px-12 border-b border-white/5 bg-surface-landing/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Media src="logo.webp" alt="DroydMail Logo" className="w-9 h-9 rounded-lg object-cover" />
          <span className="text-white font-bold text-lg hidden sm:block tracking-tight">DroydMail</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(ROUTES.downloads)}
            className="hidden sm:flex items-center gap-2 text-gray-400 hover:text-white text-sm px-3 py-2 transition-colors"
          >
            <AndroidIcon className="w-4 h-4" />
            Alternate Downloads
          </button>

          <AuthButton navigate={navigate} user={user} />
        </div>
      </nav>

      <Banner />

      <main className="relative flex-grow flex items-center">
        <section className="max-w-5xl mx-auto px-6 md:px-12 py-20">
          <div className="text-center">
            <div className="relative inline-block mb-10">
              <div className="absolute -inset-6 bg-gradient-to-r from-primary to-primary-light rounded-full blur-3xl opacity-20" />
              <Media src="george.webp" alt="George Droyd" className="relative w-32 h-32 rounded-full object-cover object-top border-2 border-primary/50 shadow-2xl" />
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white mb-6 leading-[1.05] tracking-tight">
              Email that respects<br />
              <span className="bg-gradient-to-r from-primary-light via-primary to-primary-light bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">your privacy</span>
            </h1>

            <p className="text-gray-400 text-lg md:text-xl mb-12 leading-relaxed max-w-xl mx-auto">
              Private email for people who refuse to be the product.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
              <button onClick={() => navigate(ROUTES.register)} className="group px-10 py-4 bg-primary hover:bg-primary-hover text-white font-semibold rounded-2xl transition-all hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 flex items-center justify-center gap-3 text-lg">
                Create Account
                <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => window.open("https://discord.gg/AVtJShyzKc", "_blank")}
                className="group px-10 py-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-2xl transition-all flex items-center justify-center gap-3 text-lg"
              >
                Support Server
                <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => navigate(ROUTES.downloads)}
                className="sm:hidden px-10 py-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-2xl transition-all border-white/10 flex items-center justify-center gap-3"
              >
                <AndroidIcon className="w-5 h-5" />
                Alternate Downloads
              </button>
            </div>

            <div className="flex items-center justify-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4 text-green-500" />
                Encrypted
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4 text-green-500" />
                No tracking
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4 text-green-500" />
                Free
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5">
        <div className="max-w-5xl mx-auto px-6 md:px-12 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <Media src="logo.webp" alt="DroydMail" className="w-6 h-6 rounded" />
              <span className="text-gray-500 text-sm">DroydMail</span>
            </div>
            <p className="text-gray-600 text-xs">Negrotech</p>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes gradient { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        .animate-gradient { animation: gradient 3s ease infinite; }
      `}</style>
    </div>
  );
}
