import { InputField } from './InputField';

export function EmailField({ label = 'Email', value, onChange, placeholder = 'you@example.com', error, required, disabled }) {
  return (
    <InputField
      type="email"
      label={label}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      error={error}
      required={required}
      disabled={disabled}
    />
  );
}