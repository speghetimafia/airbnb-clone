"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "md" | "lg" | "full";
  /** Shown above the footer. Use this instead of toasts while open: dialogs sit in the browser's top layer, above toasts. */
  error?: string | null;
};

/**
 * Airbnb-style sheet on the native <dialog>: the browser traps focus, makes the page behind inert,
 * handles Esc, and restores focus to the opener on close. Bottom sheet on phones, centered on desktop.
 */
export default function Modal({ open, onClose, title, children, footer, size = "md", error }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const opener = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => {
      dialog.close();
      opener?.focus(); // React may detach the dialog first, which skips the browser's own focus restore
    };
  }, [open]);

  if (!open) return null;
  const width = size === "full" ? "" : size === "lg" ? "md:max-w-3xl" : "md:max-w-xl";

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault(); // Esc: let React state close it so open/closed never disagree
        onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()} // click on the backdrop
      className={`m-0 mt-auto w-full max-w-none overflow-hidden bg-transparent p-0 backdrop:bg-black/50 md:m-auto ${
        size === "full" ? "h-full max-h-none md:m-0" : "max-h-[92vh]"
      } ${width}`}
    >
      <div
        className={`flex max-h-[inherit] w-full flex-col overflow-hidden bg-white shadow-2xl ${
          size === "full" ? "h-full" : "rounded-t-3xl md:rounded-2xl"
        } animate-[slideUpMobile_.25s_ease-out] md:animate-[slideUpDesktop_.2s_ease-out]`}
      >
        {size !== "full" && <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-[#dddddd] md:hidden" />}
        <div className="relative flex h-14 shrink-0 items-center justify-center border-b border-line px-6">
          <button onClick={onClose} aria-label="Close" className="absolute left-4 rounded-full p-2 hover:bg-soft">
            <X size={16} strokeWidth={2.5} />
          </button>
          {title && <h2 className="text-base font-bold">{title}</h2>}
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {error && <p role="alert" className="mx-6 mb-3 rounded-xl bg-[#fff8f6] px-4 py-3 text-sm text-[#c13515]">{error}</p>}
        {footer && <div className="shrink-0 border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </dialog>
  );
}
