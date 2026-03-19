import { Modal, ModalHeader, ModalActions } from './Modal';
import { WarningIcon, InfoIcon } from '../icons';

export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', confirmStyle = 'danger' }) {
  const iconByStyle = {
    danger: <WarningIcon className="w-fluid-icon-sm h-fluid-icon-sm text-red-500" />,
    warning: <WarningIcon className="w-fluid-icon-sm h-fluid-icon-sm text-yellow-500" />,
    info: <InfoIcon className="w-fluid-icon-sm h-fluid-icon-sm text-blue-500" />,
  };

  const bgByStyle = {
    danger: 'bg-primary/20',
    warning: 'bg-primary/20',
    info: 'bg-primary/20',
  };

  const btnByStyle = {
    danger: 'btn-primary',
    warning: 'btn-primary',
    info: 'btn-primary',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader 
        icon={iconByStyle[confirmStyle]}
        iconBg={bgByStyle[confirmStyle]}
        title={title}
      />
      <p className="text-gray-400 text-fluid-sm mb-fluid-4">{message}</p>
      <ModalActions>
        <button onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
        <button onClick={onConfirm} className={`flex-1 px-fluid-4 py-fluid-2 rounded-lg font-medium transition-colors ${btnByStyle[confirmStyle]}`}>{confirmText}</button>
      </ModalActions>
    </Modal>
  );
}