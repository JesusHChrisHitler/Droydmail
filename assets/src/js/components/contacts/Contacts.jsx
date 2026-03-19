import { useState } from 'react';
import { useContacts } from '../../hooks/useContacts';
import { EditIcon, TrashIcon, PlusIcon, ContactsIcon } from '../icons';
import { Loading } from '../ui/Loading';
import { EmptyState } from '../ui/EmptyState';
import { Modal, ModalHeader } from '../modals/Modal';
import { ConfirmModal } from '../modals/ConfirmModal';
import { useToast } from '../ui/Toast';
import { ContactForm } from './Form';
import { ContactViewModal } from './ContactViewModal';

function ContactCard({ contact, onClick, onEdit, onDelete }) {
  return (
    <div onClick={() => onClick(contact)} className="flex items-center gap-4 p-4 bg-surface-body rounded-lg hover:bg-border transition-colors group cursor-pointer">
      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-medium shrink-0 overflow-hidden">
        {contact.avatar_url ? (
          <img src={contact.avatar_url} alt={contact.name} className="w-full h-full object-cover" />
        ) : (
          contact.name.charAt(0).toUpperCase()
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white truncate">{contact.name}</div>
        <div className="text-sm text-gray-400 truncate">{contact.email}</div>
      </div>
      <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onEdit(contact); }} className="p-2 text-gray-400 hover:text-white hover:bg-border-light rounded-lg transition-colors">
          <EditIcon className="w-4 h-4" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(contact); }} className="p-2 text-gray-400 hover:text-red-400 hover:bg-border-light rounded-lg transition-colors">
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function Contacts({ navigate }) {
  const { contacts, loading, addContact, updateContact, removeContact } = useContacts();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);
  const toast = useToast();

  const handleAdd = async ({ email, name, avatar }) => {
    try {
      await addContact(email, name, avatar);
      setShowAdd(false);
      toast.success('Contact added');
    } catch (err) {
      toast.error(err.message || 'Failed to add contact');
    }
  };

  const handleUpdate = async ({ name, avatar }) => {
    try {
      await updateContact(editing.id, name, avatar);
      setEditing(null);
      toast.success('Contact updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update contact');
    }
  };

  const handleDelete = async () => {
    try {
      await removeContact(deleting.id);
      setDeleting(null);
      toast.success('Contact deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete contact');
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-white">Contacts</h1>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-4 h-4" />
          Add Contact
        </button>
      </div>

      {contacts.length === 0 ? (
        <EmptyState
          icon={<ContactsIcon className="w-8 h-8" />}
          title="No contacts yet"
          description="Add your first contact to get started"
          action={() => setShowAdd(true)}
          actionLabel="Add Contact"
        />
      ) : (
        <div className="space-y-2">
          {contacts.map(contact => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onClick={setViewing}
              onEdit={setEditing}
              onDelete={setDeleting}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} size="md">
          <ModalHeader icon={<ContactsIcon className="w-5 h-5" />} title="Add Contact" />
          <ContactForm onSubmit={handleAdd} onCancel={() => setShowAdd(false)} />
        </Modal>
      )}

      {editing && (
        <Modal isOpen={!!editing} onClose={() => setEditing(null)} size="md">
          <ModalHeader icon={<ContactsIcon className="w-5 h-5" />} title="Edit Contact" />
          <ContactForm initial={editing} onSubmit={handleUpdate} onCancel={() => setEditing(null)} />
        </Modal>
      )}

      {deleting && (
        <ConfirmModal
          isOpen={!!deleting}
          onClose={() => setDeleting(null)}
          title="Delete Contact"
          message={`Are you sure you want to delete ${deleting.name}?`}
          confirmText="Delete"
          confirmStyle="danger"
          onConfirm={handleDelete}
        />
      )}

      <ContactViewModal
        contact={viewing}
        isOpen={!!viewing}
        onClose={() => setViewing(null)}
        onEdit={setEditing}
        onDelete={setDeleting}
        onCompose={(email) => navigate(`/compose?to=${encodeURIComponent(email)}`)}
      />
    </div>
  );
}