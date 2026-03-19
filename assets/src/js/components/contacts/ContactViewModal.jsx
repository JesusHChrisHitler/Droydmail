import { Modal } from '../modals/Modal';
import { MailIcon, EditIcon, TrashIcon, CloseIcon } from '../icons';

export function ContactViewModal({ contact, isOpen, onClose, onEdit, onDelete, onCompose }) {
  if (!contact) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <button onClick={onClose} className="absolute top-fluid-3 right-fluid-3 p-1 text-gray-500 hover:text-white transition-colors">
        <CloseIcon className="w-fluid-icon-sm h-fluid-icon-sm" />
      </button>

      <div className="text-center pt-fluid-2 pb-fluid-4">
        <div className="w-fluid-icon-xl h-fluid-icon-xl rounded-full bg-primary mx-auto mb-fluid-4 flex items-center justify-center text-white text-fluid-xl font-medium overflow-hidden" style={{ width: 'clamp(4rem, 10vmin, 7rem)', height: 'clamp(4rem, 10vmin, 7rem)' }}>
          {contact.avatar_url ? (
            <img src={contact.avatar_url} alt={contact.name} className="w-full h-full object-cover" />
          ) : (
            contact.name.charAt(0).toUpperCase()
          )}
        </div>
        <h2 className="text-fluid-lg font-semibold text-white mb-1">{contact.name}</h2>
        <p className="text-gray-400 text-fluid-sm">{contact.email}</p>
      </div>

      <div className="flex gap-fluid-2 pt-fluid-4 border-t border-border">
        <button
          onClick={() => { onClose(); onCompose(contact.email); }}
          className="flex-1 flex items-center justify-center gap-fluid-2 py-fluid-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors"
        >
          <MailIcon className="w-fluid-icon-sm h-fluid-icon-sm" />
          <span className="text-fluid-sm font-medium">Email</span>
        </button>
        <button
          onClick={() => { onClose(); onEdit(contact); }}
          className="flex-1 flex items-center justify-center gap-fluid-2 py-fluid-2 bg-surface-body hover:bg-border text-white rounded-lg transition-colors"
        >
          <EditIcon className="w-fluid-icon-sm h-fluid-icon-sm" />
          <span className="text-fluid-sm font-medium">Edit</span>
        </button>
        <button
          onClick={() => { onClose(); onDelete(contact); }}
          className="flex-1 flex items-center justify-center gap-fluid-2 py-fluid-2 bg-surface-body hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
        >
          <TrashIcon className="w-fluid-icon-sm h-fluid-icon-sm" />
          <span className="text-fluid-sm font-medium">Delete</span>
        </button>
      </div>
    </Modal>
  );
}