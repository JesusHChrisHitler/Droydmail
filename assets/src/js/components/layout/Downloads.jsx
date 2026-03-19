import { useState, useEffect } from 'react';
import { Media } from '../ui/Media';
import { AuthButton } from '../status/AuthButton';
import { ROUTES } from '../../routes';
import { DownloadIcon, AndroidIcon, AppleIcon, WindowsIcon } from '../icons';

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function Downloads({ navigate, user }) {
  const [fileSizes, setFileSizes] = useState({});

  useEffect(() => {
    fetch('/api/downloads/droydmail.apk?info=true')
      .then(res => res.json())
      .then(data => {
        if (data.size) {
          setFileSizes(prev => ({ ...prev, [data.name]: data.size }));
        }
      })
      .catch(() => {});
  }, []);

  const downloads = [
    {
      id: 'android',
      name: 'Android',
      version: '1.0.0',
      file: '/api/downloads/droydmail.apk',
      size: fileSizes['droydmail.apk']
        ? formatBytes(fileSizes['droydmail.apk'])
        : '...',
      icon: <AndroidIcon className="w-8 h-8" />,
      available: true
    },
    {
      id: 'ios',
      name: 'iOS',
      version: '-',
      file: null,
      size: '-',
      icon: <AppleIcon className="w-8 h-8" />,
      available: false
    },
    {
      id: 'windows',
      name: 'Windows',
      version: '-',
      file: null,
      size: '-',
      icon: <WindowsIcon className="w-8 h-8" />,
      available: false
    },
    {
      id: 'macos',
      name: 'macOS',
      version: '-',
      file: null,
      size: '-',
      icon: <AppleIcon className="w-8 h-8" />,
      available: false
    }
  ];

  return (
    <div className="min-h-screen bg-surface-landing text-white">
      <nav className="h-16 flex items-center justify-between px-6 md:px-12 border-b border-white/5 bg-surface-landing/80 backdrop-blur-xl">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate(ROUTES.home)}
        >
          <Media
            src="logo.webp"
            alt="DroydMail"
            className="w-9 h-9 rounded-lg"
          />
          <span className="text-white font-bold text-lg hidden sm:block">
            DroydMail
          </span>
        </div>
        <AuthButton navigate={navigate} user={user} />
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="text-center mb-8 sm:mb-10 lg:mb-12">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-4">
            Downloads
          </h1>
          <p className="text-sm sm:text-base text-gray-400">
            Get DroydMail on your devices
          </p>
        </div>

        <div className="grid gap-3 sm:gap-4">
          {downloads.map(d => (
            <div
              key={d.id}
              className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl border transition-all ${
                d.available
                  ? 'bg-surface-card border-primary/20 hover:border-primary/50'
                  : 'bg-surface-base border-white/5 opacity-50'
              }`}
            >
              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 ${
                  d.available
                    ? 'bg-primary/20 text-primary-light'
                    : 'bg-white/5 text-gray-500'
                }`}
              >
                <div className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8">
                  {d.icon}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold">
                  {d.name}
                </h3>
                <p className="text-xs sm:text-sm text-gray-500">
                  {d.available
                    ? `v${d.version} · ${d.size}`
                    : 'Coming soon'}
                </p>
              </div>

              {d.available ? (
                <a
                  href={d.file}
                  download
                  className="w-full sm:w-auto px-4 sm:px-5 lg:px-6 py-2.5 sm:py-3 bg-primary hover:bg-primary-hover text-white text-sm sm:text-base font-semibold rounded-lg sm:rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <DownloadIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  Download
                </a>
              ) : (
                <span className="w-full sm:w-auto px-4 sm:px-5 lg:px-6 py-2.5 sm:py-3 bg-white/5 text-gray-500 text-sm sm:text-base font-medium rounded-lg sm:rounded-xl text-center">
                  Soon
                </span>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
