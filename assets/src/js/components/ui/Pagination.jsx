import { Spinner } from './Spinner';

export function Pagination({ batch, totalBatches, hasMore, loadMore, loadingMore }) {
  if (totalBatches <= 1) return null;

  return (
    <div className="py-4 flex flex-col items-center gap-2 border-t border-border">
      {loadingMore ? (
        <Spinner />
      ) : hasMore ? (
        <button
          onClick={loadMore}
          className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-border rounded-lg transition-colors"
        >
          Load more (batch {batch + 1} of {totalBatches})
        </button>
      ) : (
        <span className="text-sm text-gray-500">All {totalBatches} batches loaded</span>
      )}
      <span className="text-xs text-gray-600">Batch {batch} of {totalBatches}</span>
    </div>
  );
}