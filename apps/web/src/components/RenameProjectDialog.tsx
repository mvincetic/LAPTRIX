import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import "./project-name.css";

export function RenameProjectDialog({
  name,
  onRename,
  onClose,
}: {
  name: string;
  onRename: (name: string) => void;
  onClose: () => void;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(name);
  const close = () => {
    // Release the native modal before the parent restores focus outside it.
    dialog.current?.close();
    onClose();
  };
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    input.current?.focus();
    input.current?.select();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="rename-dialog"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-help`}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <header className="rename-heading">
        <h1 id={`${id}-title`}>Rename project</h1>
        <button
          type="button"
          className="icon-button"
          aria-label="Close project naming"
          onClick={close}
        >
          <X size={17} />
        </button>
      </header>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          dialog.current?.close();
          onRename(draft);
        }}
      >
        <div className="rename-body">
          <label htmlFor={`${id}-name`}>Project name</label>
          <input
            ref={input}
            id={`${id}-name`}
            value={draft}
            maxLength={80}
            onChange={(event) => setDraft(event.target.value)}
          />
          <p id={`${id}-help`}>
            Up to 80 characters. Use Save to keep this name on your device.
          </p>
        </div>
        <footer className="rename-footer">
          <button type="button" onClick={close}>
            Cancel
          </button>
          <button type="submit" className="primary-button">
            Rename
          </button>
        </footer>
      </form>
    </dialog>
  );
}
