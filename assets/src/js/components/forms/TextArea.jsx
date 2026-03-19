export function TextArea({ label, value, onChange, placeholder, error, hint, required, disabled, rows = 4 }) {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}{required && <span className="text-red-400 ml-1">*</span>}</label>}
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
        className={`form-input resize-none ${error ? 'form-input-error' : ''}`}
      />
      {error && <p className="form-error">{error}</p>}
      {hint && !error && <p className="form-hint">{hint}</p>}
    </div>
  );
}