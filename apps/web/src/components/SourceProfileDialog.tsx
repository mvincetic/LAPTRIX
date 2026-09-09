import { useEffect, useId, useRef } from "react";
import { ChartNoAxesCombined, X } from "lucide-react";
import type { Track } from "../../../../packages/shared/schema";
import { SourceProfile } from "./SourceProfile";

/** Keep the inspector mounted so closing it preserves the current source selection. */
export function SourceProfileDialog({ track }: { track: Track }) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const close = () => {
    dialog.current?.close();
    trigger.current?.focus();
  };
  useEffect(() => {
    const element = dialog.current;
    return () => element?.close();
  }, []);
  return (
    <>
      <button
        ref={trigger}
        className="source-profile-open"
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          dialog.current?.showModal();
          closeButton.current?.focus();
        }}
      >
        <ChartNoAxesCombined size={14} />
        Elevation &amp; grade
      </button>
      <dialog
        ref={dialog}
        className="source-profile-dialog"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-track`}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
      >
        <header className="source-profile-heading">
          <div>
            <h1 id={`${id}-title`}>Source elevation &amp; grade</h1>
            <p id={`${id}-track`}>{track.name}</p>
          </div>
          <button
            ref={closeButton}
            type="button"
            className="icon-button"
            aria-label="Close source profile"
            onClick={close}
          >
            <X size={17} />
          </button>
        </header>
        <SourceProfile track={track} expanded />
      </dialog>
    </>
  );
}
