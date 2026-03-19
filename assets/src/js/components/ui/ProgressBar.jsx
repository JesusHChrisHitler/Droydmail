export function ProgressBar({ progress, filename, status = 'uploading' }) {
  const statusColors = {
    uploading: 'bg-purple-500',
    success: 'bg-green-500',
    error: 'bg-red-500',
  };

  return (
    <div className="w-full">
      {filename && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-300 truncate max-w-[200px]">{filename}</span>
          <span className="text-xs text-gray-500">{Math.round(progress)}%</span>
        </div>
      )}
      <div className="h-2 bg-surface-body rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${statusColors[status]}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}