import { useState } from 'react';
import { ModalActions } from '../modals/Modal';
import { UserIcon, PlusIcon } from '../icons';
import { useToast } from '../ui/Toast';
import { useDropZone } from '../../hooks/useDropZone';
import { validateFileMagicBytes } from '../../utils';

export function ContactForm({ onSubmit, onCancel, initial = null }) {
  const [email, setEmail] = useState(initial?.email || '');
  const [name, setName] = useState(initial?.name || '');
  const [avatar, setAvatar] = useState(null);
  const [preview, setPreview] = useState(initial?.avatar_url || '');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

  const processFile = async (file) => {
    if (!file) return false;
    if (!file.type.startsWith('image/')) {
      toast.error('File must be an image');
      return false;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      toast.error('Avatar must be under 2MB');
      return false;
    }
    const { valid, error } = await validateFileMagicBytes(file);
    if (!valid) {
      toast.error(error);
      return false;
    }
    setAvatar(file);
    setPreview(URL.createObjectURL(file));
    return true;
  };

  const handleAvatarDrop = async (files) => {
    await processFile(files[0]);
  };

  const { isDragging, dragProps } = useDropZone(handleAvatarDrop);

  const handleAvatarChange = async (e) => {
    await processFile(e.target.files[0]);
    e.target.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({ email, name, avatar });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex justify-center">
        <label
          className="relative cursor-pointer group"
          {...dragProps}
        >
          <div className={`w-20 h-20 rounded-full bg-border flex items-center justify-center overflow-hidden border-2 border-dashed transition-colors ${
            isDragging ? 'border-primary bg-primary/20 scale-110' : 'border-border-muted group-hover:border-primary'
          }`}>
            {preview ? (
              <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className={`w-8 h-8 ${isDragging ? 'text-primary' : 'text-gray-500'}`} />
            )}
          </div>
          <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
            <PlusIcon className="w-3 h-3 text-white" />
          </div>
        </label>
      </div>

      {!initial && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input"
            placeholder="contact@example.com"
            required
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="form-input"
          placeholder="John Doe"
          required
        />
      </div>

      <ModalActions>
        <button type="button" onClick={onCancel} className="btn-secondary" disabled={submitting}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Saving...' : initial ? 'Update' : 'Add Contact'}
        </button>
      </ModalActions>
    </form>
  );
}