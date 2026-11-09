interface ValueControl { id: string; value: string; type?: string; }
interface ControlDocument extends EventTarget { readonly activeElement: unknown; hasFocus(): boolean; }
function valueControl(value: unknown): ValueControl | undefined {
  if (value && typeof value === 'object' && 'id' in value && 'value' in value && typeof value.id === 'string' && typeof value.value === 'string') return value as ValueControl;
}
/** A remembered DOM focus is not evidence that the user is still editing a control. */
export function bindControlValues(document: ControlDocument, window: EventTarget, reconcile: () => void) {
  const drafts = new Set<ValueControl>();
  const dragging = new Set<ValueControl>();
  const listeners: { target: EventTarget; type: string; listener: EventListener }[] = [];
  function listen(target: EventTarget, type: string, listener: EventListener) {
    target.addEventListener(type, listener, true);
    listeners.push({ target, type, listener });
  }
  listen(document, 'input', event => {
    const input = valueControl(event.target);
    if (input?.type === 'number' || input?.type === 'text') drafts.add(input);
  });
  listen(document, 'pointerdown', event => {
    const input = valueControl(event.target);
    if (input?.type === 'range') dragging.add(input);
  });
  const endPointer = () => { if (dragging.size) { dragging.clear(); reconcile(); } };
  listen(document, 'pointerup', endPointer);
  listen(document, 'pointercancel', endPointer);
  listen(document, 'change', event => {
    const input = valueControl(event.target);
    if (input) drafts.delete(input);
    // The action handler must read the committed value before a snapshot can replace it.
  });
  listen(document, 'focusout', event => {
    const input = valueControl(event.target);
    if (input) { drafts.delete(input); dragging.delete(input); }
    reconcile();
  });
  listen(window, 'blur', () => { drafts.clear(); dragging.clear(); reconcile(); });
  listen(window, 'focus', () => reconcile());
  return {
    setValue(input: ValueControl | null, value: string) {
      if (!input) return;
      const activelyEditing = document.hasFocus() && document.activeElement === input && (drafts.has(input) || dragging.has(input));
      if (!activelyEditing) input.value = value;
    },
    dispose() {
      for (const { target, type, listener } of listeners) target.removeEventListener(type, listener, true);
      drafts.clear(); dragging.clear();
    }
  };
}
