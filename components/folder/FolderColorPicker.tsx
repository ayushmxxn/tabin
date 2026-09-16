import { useRef, useState, useEffect } from "react";
import { FOLDER_COLOR_PRESETS, DEFAULT_FOLDER_COLOR } from "@/lib/folderColors";
import { cn } from "@/lib/utils";

interface FolderColorPickerProps {
  value?: string;
  onChange: (colorHex: string) => void;
  className?: string;
  showHexInput?: boolean;
}

export function FolderColorPicker({
  value = DEFAULT_FOLDER_COLOR,
  onChange,
  className,
  showHexInput = true,
}: FolderColorPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const normalizedValue = value.toLowerCase();

  // Find active preset if matches
  const activePreset = FOLDER_COLOR_PRESETS.find(
    (p) => p.id === normalizedValue || p.hex.toLowerCase() === normalizedValue,
  );

  const [hexText, setHexText] = useState(
    value.startsWith("#") ? value.toUpperCase() : (activePreset?.hex ?? DEFAULT_FOLDER_COLOR),
  );

  useEffect(() => {
    if (value.startsWith("#")) {
      setHexText(value.toUpperCase());
    } else if (activePreset) {
      setHexText(activePreset.hex.toUpperCase());
    }
  }, [value, activePreset]);

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value;
    if (!input.startsWith("#")) input = `#${input}`;
    setHexText(input);

    const validHex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
    if (validHex.test(input)) {
      onChange(input);
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Preset Swatches Grid */}
      <div className="grid grid-cols-8 gap-2 items-center px-0.5">
        {FOLDER_COLOR_PRESETS.map((preset) => {
          const isSelected =
            normalizedValue === preset.id ||
            normalizedValue === preset.hex.toLowerCase();

          return (
            <button
              key={preset.id}
              type="button"
              title={preset.name}
              onClick={() => {
                onChange(preset.hex);
                setHexText(preset.hex.toUpperCase());
              }}
              className={cn(
                "relative flex h-6 w-6 items-center justify-center rounded-full transition-all duration-150 hover:scale-110 active:scale-95",
                isSelected
                  ? "ring-1 ring-white/90 ring-offset-2 ring-offset-[#141414] scale-105 shadow-sm"
                  : "hover:ring-1 hover:ring-white/30 opacity-90 hover:opacity-100",
              )}
              style={{ backgroundColor: preset.hex }}
            />
          );
        })}

        {/* Custom Color Dropper / Rainbow Picker */}
        <div className="relative flex items-center justify-center">
          <button
            type="button"
            title="Custom Color Wheel"
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "relative flex h-6 w-6 items-center justify-center rounded-full transition-all duration-150 hover:scale-110 active:scale-95 shadow-sm",
              "bg-[conic-gradient(from_90deg,#ff0000,#ff8000,#ffff00,#00ff00,#00ffff,#0000ff,#8000ff,#ff0080,#ff0000)]",
              !activePreset
                ? "ring-1 ring-white/90 ring-offset-2 ring-offset-[#141414] scale-105"
                : "hover:ring-1 hover:ring-white/30",
            )}
          >
            <div className="flex h-3 w-3 items-center justify-center rounded-full bg-black/60">
              <svg
                width="7"
                height="7"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="3.2"
                strokeLinecap="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="color"
            value={value.startsWith("#") ? value : (activePreset?.hex ?? DEFAULT_FOLDER_COLOR)}
            onChange={(e) => {
              onChange(e.target.value);
              setHexText(e.target.value.toUpperCase());
            }}
            className="sr-only"
            aria-label="Choose custom folder color"
          />
        </div>
      </div>

      {/* Color Details & Hex Input matching Search dropdown */}
      {showHexInput && (
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10 px-0.5">
          <span className="truncate text-[11px] text-white/40 font-normal">
            {activePreset ? activePreset.name : "Custom Color"}
          </span>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.06] hover:bg-white/[0.10] px-2.5 py-1 transition-colors cursor-pointer"
          >
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0 border border-white/30"
              style={{ backgroundColor: value.startsWith("#") ? value : (activePreset?.hex ?? DEFAULT_FOLDER_COLOR) }}
            />
            <input
              type="text"
              value={hexText}
              onClick={(e) => e.stopPropagation()}
              onChange={handleHexInputChange}
              maxLength={7}
              placeholder="#50B1FD"
              className="w-16 bg-transparent text-[11px] font-mono text-white/90 tracking-wider focus:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
