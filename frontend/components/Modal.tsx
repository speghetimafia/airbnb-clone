"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "md" | "lg" | "full";
};

/** Airbnb-style centered sheet: title bar with X on the left, scrollable body, optional sticky footer. */
export default function Modal({ open, onClose, title, children, footer, size = "md" }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  const width = size === "full" ? "h-full w-full" : size === "lg" ? "md:max-w-3xl" : "md:max-w-xl";

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/50 md:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl md:rounded-2xl ${width} ${
          size === "full" ? "max-h-none rounded-none md:rounded-none" : ""
        } animate-[slideUp_.25s_ease-out]`}
      >
        <div className="relative flex h-16 shrink-0 items-center justify-center border-b border-line px-6">
          <button onClick={onClose} aria-label="Close" className="absolute left-4 rounded-full p-2 hover:bg-soft">
            <X size={16} strokeWidth={2.5} />
          </button>
          {title && <h2 className="text-base font-bold">{title}</h2>}
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer && <div className="shrink-0 border-t border-line px-6 py-4">{footer}</div>}
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}`}</style>
    </div>
  );
}
