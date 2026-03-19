import { InboxIcon } from '../icons';

export function EmptyState({ icon, title, description, message, action, actionLabel }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-3 p-8">
      <div className="w-16 h-16 bg-border rounded-full flex items-center justify-center text-gray-600">
        {icon || <InboxIcon className="w-8 h-8" />}
      </div>
      {title && <h3 className="text-lg font-medium text-white">{title}</h3>}
      <p className="text-center text-gray-400 max-w-xs">{description || message}</p>
      {action && (
        <button onClick={action} className="mt-2 btn-primary">
          {actionLabel || 'Add'}
        </button>
      )}
    </div>
  );
}