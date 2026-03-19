import { useState, useEffect } from 'react';

export function Loading() {
  const [dots, setDots] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 400);
    const progressInterval = setInterval(() => {
      setProgress(p => p >= 100 ? 100 : p + Math.random() * 15);
    }, 150);
    return () => {
      clearInterval(dotInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-surface-landing flex items-center justify-center overflow-hidden relative">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(109,40,217,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(109,40,217,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      <div className="relative z-10 text-center">
        <div className="relative w-32 h-32 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full border border-primary/30"></div>
          <div className="absolute inset-2 rounded-full border border-primary/50"></div>
          <div className="absolute inset-4 rounded-full border-2 border-primary animate-pulse"></div>
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#a78bfa] animate-spin" style={{ animationDuration: '1.5s' }}></div>
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-b-[#6d28d9] animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }}></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center animate-pulse">
              <span className="text-white font-bold text-lg">N</span>
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2 tracking-wider">NEGROTECH</h1>
        <p className="text-primary-light text-sm mb-6 font-mono">AI SYSTEMS</p>

        <div className="w-48 h-1 bg-surface-body rounded-full mx-auto mb-4 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full transition-all duration-150"
            style={{ width: `${Math.min(progress, 100)}%` }}
          ></div>
        </div>

        <p className="text-gray-500 text-sm font-mono">
          Initializing{dots}<span className="invisible">...</span>
        </p>
      </div>

      <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary rounded-full animate-ping opacity-50"></div>
      <div className="absolute bottom-1/3 right-1/4 w-1 h-1 bg-primary-light rounded-full animate-ping opacity-30" style={{ animationDelay: '0.5s' }}></div>
      <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-primary rounded-full animate-ping opacity-40" style={{ animationDelay: '1s' }}></div>
    </div>
  );
}