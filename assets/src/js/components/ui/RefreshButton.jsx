import { RefreshIcon } from '../icons';

export function RefreshButton({ onClick, disabled, refreshing }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-border transition-colors disabled:opacity-50"
      title="Refresh"
    >
      <RefreshIcon className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
    </button>
  );
}