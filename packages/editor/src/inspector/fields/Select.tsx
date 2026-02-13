interface SelectProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange?: (value: string) => void;
}

export function Select({ label, value, options, onChange }: SelectProps) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
