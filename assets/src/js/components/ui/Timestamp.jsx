export function formatRelativeTime(iso) {
  const date = new Date(iso);
  const now = new Date();
  const diff = now - date;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function Timestamp({ iso, className = '' }) {
  if (!iso) return null;
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isThisYear = date.getFullYear() === now.getFullYear();
  let formatted;
  if (isToday) {
    formatted = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } else if (isThisYear) {
    formatted = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } else {
    formatted = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }
  
  return <span className={className} title={date.toLocaleString()}>{formatted}</span>;
}