interface TextFieldProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'number';
}

export function TextField({ 
  label, 
  value, 
  onChange, 
  placeholder,
  type = 'text'
}: TextFieldProps) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
      />
    </div>
  );
}
