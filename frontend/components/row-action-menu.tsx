"use client";

import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

type ActionTone = "edit" | "submit" | "danger" | "neutral";

type ActionItem = {
  label: string;
  onSelect: () => void;
  tone?: ActionTone;
  disabled?: boolean;
  title?: string;
};

type Props = {
  label: string;
  actions: ActionItem[];
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
};

const toneClass: Record<ActionTone, string> = {
  edit: "row-action-menu-item-edit",
  submit: "row-action-menu-item-submit",
  danger: "row-action-menu-item-danger",
  neutral: "",
};

export function RowActionMenu({ label, actions, className, triggerClassName, menuClassName }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const visibleActions = useMemo(() => actions.filter((action) => action.label), [actions]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (!target?.closest(".row-action-menu") && !target?.closest(".row-action-popover")) {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    function updatePosition() {
      const button = buttonRef.current;
      const menu = menuRef.current;
      if (!button || !menu) {
        setPosition(null);
        return;
      }

      const buttonRect = button.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const menuWidth = menuRect.width || 170;
      const menuHeight = menuRect.height || 120;
      const openBelow = buttonRect.bottom + 8 + menuHeight <= window.innerHeight || buttonRect.top < menuHeight + 24;

      setPosition({
        top: openBelow ? buttonRect.bottom + 8 : Math.max(12, buttonRect.top - 8 - menuHeight),
        left: Math.max(12, Math.min(window.innerWidth - (menuWidth + 12), buttonRect.right - (menuWidth - 20))),
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  if (!visibleActions.length) {
    return null;
  }

  const menu = open && mounted ? (
    <div
      ref={menuRef}
      className={`row-action-popover ${menuClassName ?? ""}`.trim()}
      role="menu"
      aria-label={label}
      style={position ? { top: `${position.top}px`, left: `${position.left}px` } : undefined}
    >
      {visibleActions.map((action) => (
        <button
          key={action.label}
          type="button"
          className={`row-action-menu-item ${toneClass[action.tone ?? "neutral"]}`.trim()}
          role="menuitem"
          disabled={action.disabled}
          title={action.title}
          onClick={() => {
            if (action.disabled) {
              return;
            }
            setOpen(false);
            action.onSelect();
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div className={`row-action-menu ${className ?? ""}`.trim()}>
      <button
        ref={buttonRef}
        type="button"
        className={`row-action-menu-trigger ${triggerClassName ?? ""}`.trim()}
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5.5a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8Zm0 6.1a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8Zm0 6.1a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8Z" fill="currentColor" />
        </svg>
      </button>
      {menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
