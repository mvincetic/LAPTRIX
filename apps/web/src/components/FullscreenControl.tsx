import { useEffect, useRef, useState, type RefObject } from "react";
import { Expand, Minimize, X } from "lucide-react";
import "./fullscreen-control.css";

/** Native fullscreen events, rather than an optimistic click, own the button state. */
export function FullscreenControl({
  target,
}: {
  target: RefObject<HTMLElement | null>;
}) {
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState("");
  const generation = useRef(0);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const changed = () => {
      generation.current += 1;
      setActive(
        !!target.current && document.fullscreenElement === target.current,
      );
      setMessage("");
    };
    changed();
    document.addEventListener("fullscreenchange", changed);
    return () => {
      generation.current += 1;
      document.removeEventListener("fullscreenchange", changed);
    };
  }, [target]);
  const toggle = async () => {
    const element = target.current;
    if (!element) return;
    const exiting = document.fullscreenElement === element;
    const id = ++generation.current;
    setMessage("");
    try {
      if (exiting) {
        if (typeof document.exitFullscreen !== "function") {
          setMessage("Fullscreen exit is not available in this browser.");
          return;
        }
        await document.exitFullscreen();
      } else {
        if (typeof element.requestFullscreen !== "function") {
          setMessage("Fullscreen is not available in this browser.");
          return;
        }
        await element.requestFullscreen();
      }
    } catch {
      if (id !== generation.current) return;
      setMessage(
        exiting
          ? "Fullscreen could not close in this browser. Try again."
          : "Fullscreen could not open in this browser. Try again.",
      );
    }
  };
  return (
    <div className="fullscreen-control">
      <button
        ref={button}
        className={`icon-button${active ? " active" : ""}`}
        aria-label={active ? "Exit fullscreen viewer" : "Fullscreen viewer"}
        aria-pressed={active}
        onClick={() => void toggle()}
      >
        {active ? <Minimize size={15} /> : <Expand size={15} />}
      </button>
      {message && (
        <div
          className="fullscreen-message"
          role="status"
          aria-label="Fullscreen status"
        >
          {message}
          <button
            className="icon-button"
            aria-label="Dismiss fullscreen message"
            onClick={() => {
              setMessage("");
              button.current?.focus();
            }}
          >
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
