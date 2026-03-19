import { Timestamp } from '../ui/Timestamp';

export function EmailHeader({ email, contact }) {
  const senderInitial = contact?.name?.charAt(0).toUpperCase() || email.from?.charAt(0).toUpperCase() || '?';
  const senderName = email.isSystem ? 'DroydMail' : (contact?.name || email.from?.split('@')[0] || email.from);

  return (
    <div className="flex items-start gap-4">
      {email.isSystem ? (
        <img src="/media/logo.webp" alt="DroydMail" className="w-12 h-12 rounded-full shrink-0 object-cover shadow-lg" />
      ) : contact?.avatar_url ? (
        <img src={contact.avatar_url} alt={contact.name} className="w-12 h-12 rounded-full shrink-0 object-cover shadow-lg" />
      ) : (
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white font-semibold text-lg shrink-0 shadow-lg shadow-primary/20">
          {senderInitial}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-1">
          <div> 
            <span className="text-white font-semibold text-base">{senderName}</span>
            <span className="text-gray-500 text-sm ml-2">&lt;{email.from}&gt;</span>
          </div>
          <Timestamp iso={email.time} className="text-gray-500 text-sm shrink-0" />
        </div>
        <div className="text-gray-500 text-sm">To: {email.to}</div>
        {email.cc && <div className="text-gray-500 text-sm">Cc: {email.cc}</div>}
      </div>
    </div>
  );
}