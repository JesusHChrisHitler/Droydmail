export function PasswordStrength({ password }) {
  const getStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: 'bg-gray-600' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;
    
    if (score <= 2) return { score: 1, label: 'Brimstone', color: 'bg-red-500' };
    if (score <= 3) return { score: 2, label: 'Coal', color: 'bg-orange-500' };
    if (score <= 4) return { score: 3, label: 'Stone', color: 'bg-yellow-500' };
    if (score <= 5) return { score: 4, label: 'Gem', color: 'bg-green-500' };
    return { score: 5, label: 'Diamond', color: 'bg-emerald-400' };
  };

  const { score, label, color } = getStrength(password);
  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= score ? color : 'bg-gray-700'}`} />
        ))}
      </div>
      <p className={`text-xs ${color.replace('bg-', 'text-')}`}>{label}</p>
    </div>
  );
}