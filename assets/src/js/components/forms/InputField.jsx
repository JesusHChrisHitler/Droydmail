export function InputField({ label, type = 'text', value, onChange, placeholder, error, hint, required, disabled, className = '' }) {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}{required && <span className="text-red-400 ml-1">*</span>}</label>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`form-input ${error ? 'form-input-error' : ''} ${className}`}
      />
      {error && <p className="form-error">{error}</p>}
      {hint && !error && <p className="form-hint">{hint}</p>}
    </div>
  );
}