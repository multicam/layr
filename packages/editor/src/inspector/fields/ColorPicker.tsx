interface ColorPickerProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
}

export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <div className="flex gap-2">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange?.(e.target.value)}
          className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="#000000"
          className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
        />
      </div>
    </div>
  );
}
