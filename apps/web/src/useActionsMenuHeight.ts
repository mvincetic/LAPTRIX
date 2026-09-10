import { useLayoutEffect, type RefObject } from "react";

/** Fit the existing anchored disclosure below its opener without scrolling the page. */
export function useActionsMenuHeight(
  open: boolean,
  menu: RefObject<HTMLDivElement | null>,
) {
  useLayoutEffect(() => {
    const element = menu.current;
    if (!open || !element) return;
    const fit = () => {
      const top = element.getBoundingClientRect().top;
      element.style.maxHeight = `${Math.max(0, window.innerHeight - top - 12)}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    const header = element.closest("header");
    if (header) observer.observe(header);
    window.addEventListener("resize", fit);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [open, menu]);
}
