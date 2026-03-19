import { TrashIcon, ArchiveIcon, CloseIcon, CheckIcon, RefreshIcon } from '../icons';

export function BulkActions({ selectedCount, onArchive, onDelete, onRestore, onClear, onSelectAll, totalCount, allSelected, isTrash }) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-2 px-4 md:px-6 py-2 bg-primary/10 border-b border-primary/30 animate-slide-down">
      <button
        onClick={onSelectAll}
        className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-300 hover:text-white hover:bg-border rounded transition-colors"
      >
        <div className={`w-4 h-4 rounded border flex items-center justify-center ${allSelected ? 'bg-primary border-primary' : 'border-gray-500'}`}>
          {allSelected && <CheckIcon className="w-3 h-3 text-white" />}
        </div>
        <span>{allSelected ? 'Deselect all' : 'Select all'}</span>
      </button>

      <div className="flex-1 text-sm text-primary-light font-medium">
        {selectedCount} email{selectedCount !== 1 ? 's' : ''} selected
      </div>

      <div className="flex items-center gap-1">
        {isTrash ? (
          <>
            <button
              onClick={onRestore}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white hover:bg-emerald-600/20 rounded transition-colors"
            >
              <RefreshIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Restore</span>
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white hover:bg-red-600/20 rounded transition-colors"
            >
              <TrashIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Delete Forever</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onArchive}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white hover:bg-emerald-600/20 rounded transition-colors"
            >
              <ArchiveIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Archive</span>
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white hover:bg-red-600/20 rounded transition-colors"
            >
              <TrashIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          </>
        )}
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-gray-500 hover:text-white hover:bg-border rounded transition-colors ml-1"
        >
          <CloseIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}