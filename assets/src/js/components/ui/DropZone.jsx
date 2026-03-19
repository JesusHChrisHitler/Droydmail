import { UploadIcon } from '../icons';
import { useDropZone } from '../../hooks/useDropZone';

export function DropZone({ onDrop, disabled, children, overlay = true, overlayText = 'Drop files here', overlaySubtext = 'Max 5 files, 25MB each' }) {
  const { isDragging, dragProps } = useDropZone(onDrop, disabled);

  return (
    <div {...dragProps} className="relative h-full">
      {children}
      {overlay && isDragging && (
        <div className="absolute inset-0 z-50 bg-surface-base/95 flex items-center justify-center border-2 border-dashed border-purple-500 rounded-xl m-2">
          <div className="text-center">
            <UploadIcon className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <p className="text-purple-400 text-lg font-medium">{overlayText}</p>
            <p className="text-gray-500 text-sm mt-1">{overlaySubtext}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export { useDropZone };