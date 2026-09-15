import { useEffect, useMemo, useState } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  type Group,
} from "three";
import type { Track } from "../../../../packages/shared/schema";
import { createTerrainSurface } from "../../../../packages/track-engine/terrain";
import { roadApron } from "../road-presentation";
import { Trackside } from "./Trackside";
import { TracksideAssets } from "./TracksideAssets";
import { presentationForSource } from "../trackside-assets";
import { Trees } from "./Trees";
import { BlenderScenery } from "./BlenderScenery";
import {
  loadRBRScenery,
  rbrSceneryContract,
  sceneryFootprints,
} from "../scenery-asset";

export function Landscape({
  track,
  sourceFingerprint,
}: {
  track: Track;
  sourceFingerprint?: string;
}) {
  const presentation = presentationForSource(sourceFingerprint);
  const [scenery, setScenery] = useState<Group | null>(null);
  const eligible = sourceFingerprint === rbrSceneryContract.sourceFingerprint;
  useEffect(() => {
    if (!eligible) return;
    let active = true;
    void loadRBRScenery()
      .then((template) => {
        if (active) setScenery(template);
      })
      .catch(() => {
        console.warn(
          "Showcase scenery could not load. Toggle Environment to retry.",
        );
      });
    return () => {
      active = false;
    };
  }, [eligible]);
  const shownScenery = eligible ? scenery : null;
  const data = useMemo(() => {
    const surface = createTerrainSurface(track);
    const colors = new Float32Array(surface.distances.length * 3);
    const light = new Color("#b8c3a2"),
      dark = new Color("#939f85"),
      color = new Color();
    surface.distances.forEach((distance, i) => {
      const x = surface.positions[i * 3],
        z = surface.positions[i * 3 + 2];
      const variation = (Math.sin(x / 73) * Math.cos(z / 89) + 1) * 0.1;
      color
        .copy(light)
        .lerp(dark, Math.min(1, distance / 280) * 0.35 + variation);
      colors.set([color.r, color.g, color.b], i * 3);
    });
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      "position",
      new BufferAttribute(surface.positions, 3),
    );
    geometry.setAttribute("color", new BufferAttribute(colors, 3));
    geometry.setIndex(surface.indices);
    geometry.computeVertexNormals();
    const apron = new BufferGeometry();
    apron.setAttribute(
      "position",
      new BufferAttribute(roadApron(track, surface), 3),
    );
    apron.computeVertexNormals();
    return { geometry, apron, trees: surface.trees, surface };
  }, [track]);
  useEffect(() => {
    return () => {
      data.geometry.dispose();
      data.apron.dispose();
    };
  }, [data]);
  return (
    <group>
      <Trackside
        track={track}
        surface={data.surface}
        omitRanges={
          shownScenery ? rbrSceneryContract.distanceRanges : undefined
        }
      />
      {shownScenery && <BlenderScenery template={shownScenery} />}
      {presentation && (
        <TracksideAssets
          track={track}
          apron={data.apron.getAttribute("position").array}
          presentation={presentation}
        />
      )}
      <mesh name="context-terrain" geometry={data.geometry} receiveShadow>
        <meshStandardMaterial vertexColors roughness={1} />
      </mesh>
      <mesh name="road-earthworks" geometry={data.apron} receiveShadow>
        <meshStandardMaterial color="#a8b395" roughness={1} side={DoubleSide} />
      </mesh>
      <Trees
        positions={data.trees}
        exclusions={shownScenery ? sceneryFootprints(shownScenery) : undefined}
      />
    </group>
  );
}
