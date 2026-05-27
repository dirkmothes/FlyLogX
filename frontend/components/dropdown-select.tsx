"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Option = {
  value: string;
  label: string;
  disabled?: boolean;
};

type Props = {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
};

export function DropdownSelect({
  value,
  options,
  onChange,
  placeholder = "Select an option",
  disabled = false,
  className = "",
  buttonClassName = "",
  menuClassName = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(() => options.find((option) => option.value === value) ?? null, [options, value]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (target && rootRef.current && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div ref={rootRef} className={`dropdown-select ${className}`.trim()}>
      <button
        type="button"
        className={`input dropdown-select-trigger ${buttonClassName}`.trim()}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={`dropdown-select-value ${selected ? "" : "dropdown-select-placeholder"}`.trim()}>
          {selected ? selected.label : placeholder}
        </span>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="dropdown-select-caret">
          <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      </button>
      {open ? (
        <div className={`dropdown-select-menu ${menuClassName}`.trim()} role="listbox" aria-label={placeholder}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`dropdown-select-option ${option.value === value ? "dropdown-select-option-active" : ""}`.trim()}
              role="option"
              aria-selected={option.value === value}
              disabled={option.disabled}
              onClick={() => {
                if (!option.disabled) {
                  onChange(option.value);
                  setOpen(false);
                }
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
