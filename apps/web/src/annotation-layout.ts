import { addAfterEffect } from "@react-three/fiber";

type Layer = "sectors" | "events" | "ghosts";
const priority: Record<Layer, number> = { events: 0, sectors: 1, ghosts: 2 };
type Pass = { layer: Layer; layout: (upstreamChanged: boolean) => boolean };
const passes = new Map<symbol, Pass>();
let ordered: Pass[] = [];
let detach: (() => void) | undefined;

/** Place annotations after projected HTML, with one deterministic obstacle order. */
export function registerAnnotationLayout(layer: Layer, layout: Pass["layout"]) {
  const key = Symbol(layer);
  passes.set(key, { layer, layout });
  const sort = () => {
    ordered = [...passes.values()].sort(
      (a, b) => priority[a.layer] - priority[b.layer],
    );
  };
  sort();
  detach ??= addAfterEffect(() => {
    let changed = false;
    for (const pass of ordered) {
      const placed = pass.layout(changed);
      changed = changed || placed;
    }
  });
  return () => {
    passes.delete(key);
    sort();
    if (!passes.size) {
      detach?.();
      detach = undefined;
    }
  };
}
