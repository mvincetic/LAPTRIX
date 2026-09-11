import { useLayoutEffect, useRef, useState } from "react";
import { visibleAxisTicks } from "../axis-ticks";
import { plotTickLabel, type PlotViewport } from "../plotViewport";
import "./plot-ticks.css";

export function PlotTicks({
  viewport,
  axis,
  className,
  available = true,
}: {
  viewport: PlotViewport;
  axis: "time" | "distance";
  className: string;
  available?: boolean;
}) {
  const row = useRef<HTMLDivElement>(null);
  const [mask, setMask] = useState("111111");
  const ticks = Array.from({ length: 6 }, (_, i) => {
    const value = viewport.start + ((viewport.end - viewport.start) * i) / 5;
    return {
      value,
      label: available
        ? plotTickLabel(value, viewport, axis)
        : String(i * 1000),
    };
  });
  const signature = ticks
    .map(({ value, label }) => `${value}:${label}`)
    .join("|");
  useLayoutEffect(() => {
    const node = row.current;
    if (!node) return;
    let active = true;
    const measure = () => {
      if (!active) return;
      const area = node.getBoundingClientRect();
      const bounds = [...node.children].map((child) => {
        const box = child.getBoundingClientRect();
        return { left: box.left - area.left, right: box.right - area.left };
      });
      const next = visibleAxisTicks(bounds, area.width)
        .map((visible) => (visible ? "1" : "0"))
        .join("");
      setMask((previous) => (previous === next ? previous : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    for (const child of node.children) observer.observe(child);
    void document.fonts.ready.then(measure);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [signature, className]);
  return (
    <div ref={row} className={`plot-axis-ticks ${className}`}>
      {ticks.map(({ value, label }, index) => (
        <span
          key={index}
          title={String(value)}
          aria-hidden={mask[index] !== "1"}
          style={{
            left: `${index * 20}%`,
            visibility: mask[index] === "1" ? "visible" : "hidden",
          }}
        >
          {label}
        </span>
      ))}
    </div>
  );
}
