import { useEffect, useRef } from 'react';

export function useModal(open = true) {
  const dialogRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    dialog.querySelector('[data-initial-focus]')?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected && previousFocus !== document.body) previousFocus.focus();
      else document.querySelector('#main-content')?.focus();
    };
  }, [open]);
  return dialogRef;
}

export default function Modal({ children, className, onClose, busy = false, ...props }) {
  const dialogRef = useModal();
  return (
    <dialog
      ref={dialogRef}
      className={`audit-modal ${className}`}
      aria-busy={busy}
      onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}
      {...props}
    >
      {children}
    </dialog>
  );
}
