"use client";

import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

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
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; width: number } | null>(null);
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

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }

    function updatePosition() {
      const root = rootRef.current;
      const trigger = root?.querySelector(".dropdown-select-trigger") as HTMLButtonElement | null;
      if (!trigger) {
        setMenuStyle(null);
        return;
      }

      const rect = trigger.getBoundingClientRect();
      const width = Math.max(rect.width, 220);
      const preferredLeft = rect.left;
      const left = Math.max(12, Math.min(window.innerWidth - width - 12, preferredLeft));
      const estimatedHeight = Math.min(300, Math.max(120, options.length * 42 + 16));
      const openBelow = rect.bottom + 8 + estimatedHeight <= window.innerHeight || rect.top < estimatedHeight + 24;
      const top = openBelow ? rect.bottom + 8 : Math.max(12, rect.top - 8 - estimatedHeight);
      setMenuStyle({ top, left, width });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, options.length]);

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
      {open && menuStyle
        ? createPortal(
            <div
              className={`dropdown-select-menu ${menuClassName}`.trim()}
              role="listbox"
              aria-label={placeholder}
              style={{ top: `${menuStyle.top}px`, left: `${menuStyle.left}px`, width: `${menuStyle.width}px` }}
            >
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
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
