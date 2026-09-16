import { useEffect, useLayoutEffect, useMemo } from "react";
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
  rbrSceneryContract,
  sceneryFootprints,
  sceneryGroundMaterials,
} from "../scenery-asset";
import { groundUV, groundMaterial } from "../ground-materials";

export function Landscape({
  track,
  sourceFingerprint,
  scenery: shownScenery,
}: {
  track: Track;
  sourceFingerprint?: string;
  scenery: Group | null;
}) {
  const presentation = presentationForSource(sourceFingerprint);
  const grass = useMemo(
    () =>
      shownScenery
        ? groundMaterial(sceneryGroundMaterials(shownScenery).grass, true)
        : null,
    [shownScenery],
  );
  useEffect(() => () => grass?.dispose(), [grass]);
  const data = useMemo(() => {
    const surface = createTerrainSurface(track);
    const colors = new Float32Array(surface.distances.length * 3);
    const authoredColors = new Float32Array(colors.length);
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
      const tone = 1 - variation * 0.35 - Math.min(1, distance / 280) * 0.04;
      authoredColors.set([tone, tone, tone], i * 3);
    });
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      "position",
      new BufferAttribute(surface.positions, 3),
    );
    geometry.setAttribute("color", new BufferAttribute(colors, 3));
    geometry.setAttribute(
      "uv",
      groundUV(
        surface.positions,
        rbrSceneryContract.groundMaterials.grass.tileMetres,
      ),
    );
    geometry.setIndex(surface.indices);
    geometry.computeVertexNormals();
    const apron = new BufferGeometry();
    apron.setAttribute(
      "position",
      new BufferAttribute(roadApron(track, surface), 3),
    );
    apron.computeVertexNormals();
    apron.setAttribute(
      "uv",
      groundUV(
        apron.getAttribute("position").array,
        rbrSceneryContract.groundMaterials.grass.tileMetres,
      ),
    );
    // White vertex modulation gives the shared grass material a consistent apron.
    apron.setAttribute(
      "color",
      new BufferAttribute(
        new Float32Array(apron.getAttribute("position").count * 3).fill(1),
        3,
      ),
    );
    return {
      geometry,
      apron,
      trees: surface.trees,
      surface,
      fallbackColors: colors.slice(),
      authoredColors: new BufferAttribute(authoredColors, 3),
    };
  }, [track]);
  useLayoutEffect(() => {
    const colors = data.geometry.getAttribute("color");
    colors.array.set(grass ? data.authoredColors.array : data.fallbackColors);
    colors.needsUpdate = true;
  }, [data, grass]);
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
        {grass ? (
          <primitive object={grass} attach="material" dispose={null} />
        ) : (
          <meshStandardMaterial vertexColors roughness={1} />
        )}
      </mesh>
      <mesh name="road-earthworks" geometry={data.apron} receiveShadow>
        {grass ? (
          <primitive object={grass} attach="material" dispose={null} />
        ) : (
          <meshStandardMaterial
            color="#a8b395"
            roughness={1}
            side={DoubleSide}
          />
        )}
      </mesh>
      <Trees
        positions={data.trees}
        exclusions={shownScenery ? sceneryFootprints(shownScenery) : undefined}
      />
    </group>
  );
}
