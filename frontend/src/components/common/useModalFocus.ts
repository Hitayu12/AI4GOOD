import { useEffect, useRef } from 'react';

const focusable = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]';

export function useModalFocus(open: boolean, onClose: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const trigger = document.activeElement;
    const controls = () => Array.from(dialog.querySelectorAll<HTMLElement>(focusable))
      .filter((element) => element.getClientRects().length > 0);

    (controls()[0] ?? dialog).focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = controls();
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const atEdge = event.shiftKey ? active === first : active === last;
      if (!first || atEdge || !dialog.contains(active) || active === dialog) {
        event.preventDefault();
        (event.shiftKey ? last ?? dialog : first ?? dialog).focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [open]);

  return dialogRef;
}
