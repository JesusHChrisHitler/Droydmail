import { useDraggable } from '../../hooks/useDraggable';

const SIZE_CLASSES = {
  sm: 'max-w-modal-sm',
  md: 'max-w-modal-md', 
  lg: 'max-w-modal-lg',
  xl: 'max-w-modal-xl'
};

export function Modal({ isOpen, onClose, children, size = 'md', draggable = true }) {
  const { position, isDragging, handleMouseDown, reset } = useDraggable(draggable, isOpen);
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-fluid-4" onClick={onClose}>
      <div
        className={`bg-surface-card border border-border rounded-fluid-3 shadow-2xl relative flex flex-col w-full ${sizeClass}`}
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className={`px-fluid-6 pt-fluid-4 pb-fluid-3 ${draggable ? 'cursor-grab select-none' : ''} ${isDragging ? 'cursor-grabbing' : ''}`}
          onMouseDown={handleMouseDown}
          onDoubleClick={reset}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function ModalHeader({ icon, iconBg = 'bg-primary/20', iconColor = 'text-primary-light', title }) {
  return (
    <div className="flex items-center gap-fluid-3 mb-fluid-4">
      {icon && (  
        <div className={`w-fluid-icon-lg h-fluid-icon-lg rounded-xl ${iconBg} flex items-center justify-center ${iconColor}`}>
          {icon}
        </div>
      )}
      <h3 className="text-fluid-lg font-semibold text-white flex-1">{title}</h3>
    </div>
  );
}

export function ModalActions({ children }) {
  return <div className="flex gap-fluid-2 mt-fluid-2 pt-fluid-3 border-t border-border/50">{children}</div>;
}