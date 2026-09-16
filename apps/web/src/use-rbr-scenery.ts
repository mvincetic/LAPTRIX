import { useEffect, useState } from "react";
import type { Group } from "three";
import { loadRBRScenery, rbrSceneryContract } from "./scenery-asset";

/** Optional visuals follow the active source and Environment control, never the clock. */
export function useRBRScenery(
  sourceFingerprint: string | undefined,
  enabled: boolean,
) {
  const [scenery, setScenery] = useState<Group | null>(null);
  const eligible =
    enabled && sourceFingerprint === rbrSceneryContract.sourceFingerprint;
  useEffect(() => {
    if (!eligible) return;
    let active = true;
    void loadRBRScenery()
      .then((template) => {
        if (active) setScenery(template);
      })
      .catch(() =>
        console.warn(
          "Showcase scenery could not load. Toggle Environment to retry.",
        ),
      );
    return () => {
      active = false;
    };
  }, [eligible]);
  return eligible ? scenery : null;
}
