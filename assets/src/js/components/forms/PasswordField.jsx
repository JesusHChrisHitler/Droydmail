import { useState } from 'react';
import { EyeIcon, EyeOffIcon } from '../icons';

export function PasswordField({ label, value, onChange, placeholder, error, hint, required, disabled }) {
  const [show, setShow] = useState(false);

  return (
    <div className="form-group">
      {label && <label className="form-label">{label}{required && <span className="text-red-400 ml-1">*</span>}</label>}
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`form-input pr-10 ${error ? 'form-input-error' : ''}`}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
        >
          {show ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
      {hint && !error && <p className="form-hint">{hint}</p>}
    </div>
  );
}