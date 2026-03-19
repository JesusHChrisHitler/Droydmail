import { ROUTES } from '../../routes';

export function NotFound({ navigate }) {
  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-8xl font-bold text-primary mb-4">404</h1>
        <p className="text-2xl text-white mb-2">Page not found</p>
        <p className="text-gray-500 mb-8">The page you're looking for doesn't exist.</p>
        <button
          onClick={() => navigate(ROUTES.home)}
          className="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors"
        >
          Go home
        </button>
      </div>
    </div>
  );
}