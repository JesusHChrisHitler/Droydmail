import { Modal, ModalHeader, ModalActions } from './Modal';
import { WarningIcon } from '../icons';

export function LinkWarningModal({ linkWarning, onClose, onConfirm }) {
  return (
    <Modal isOpen={!!linkWarning} onClose={onClose} size="md">
      <ModalHeader 
        icon={<WarningIcon className="w-fluid-icon-sm h-fluid-icon-sm text-yellow-500" />}
        title="External Link"
      />
      <p className="text-gray-400 text-fluid-sm mb-fluid-3">You're about to visit an external website:</p>
      <div className="bg-surface-base border border-border-light rounded-lg p-fluid-3 mb-fluid-3 break-all">
        <p className="text-fluid-xs text-gray-500 mb-1">Link text: <span className="text-gray-300">{linkWarning?.text}</span></p>
        <p className="text-fluid-xs text-gray-500">Destination:</p>
        <p className="text-fluid-sm text-primary-light mt-1">{linkWarning?.url}</p>
      </div>
      <p className="text-yellow-500/80 text-fluid-xs mb-fluid-3">Make sure you trust this link before proceeding.</p>
      <ModalActions>
        <button onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
        <button onClick={onConfirm} className="flex-1 btn-primary">Open Link</button>
      </ModalActions>
    </Modal>
  );
}