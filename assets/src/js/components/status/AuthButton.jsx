import { ROUTES } from '../../routes';

export function AuthButton({ navigate, user }) {
  if (user) {
    return (
      <button onClick={() => navigate(ROUTES.inbox)} className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-primary/25">
        Go to Inbox
      </button>
    );
  }
  return (
    <button onClick={() => navigate(ROUTES.login)} className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-primary/25">
      Sign in
    </button>
  );
}