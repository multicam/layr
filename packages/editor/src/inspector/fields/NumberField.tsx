interface NumberFieldProps {
  label: string;
  value: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function NumberField({ 
  label, 
  value, 
  onChange,
  min,
  max,
  step = 1
}: NumberFieldProps) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange?.(parseFloat(e.target.value) || 0)}
        min={min}
        max={max}
        step={step}
        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
      />
    </div>
  );
}
