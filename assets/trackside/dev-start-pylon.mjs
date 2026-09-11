import {
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Path,
  Shape,
  ShapeGeometry,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import asset from "./dev-start-pylon.json" with { type: "json" };

/** Editable original mesh source. Export merges static parts into three material batches. */
export function buildDevStartPylon() {
  const batches = asset.materials.map(() => []);
  const box = (material, dimensions, position) => {
    batches[material].push(
      new BoxGeometry(
        dimensions.width,
        dimensions.height,
        dimensions.depth,
      ).translate(...position),
    );
  };
  const lettering = (label, back) => {
    const width =
      (label.text.length - 1) * asset.letterAdvance + asset.letterWidth;
    [...label.text].forEach((letter, index) => {
      const shape = new Shape();
      asset.glyphs[letter].forEach((points, contour) => {
        const path = contour === 0 ? shape : new Path();
        points.forEach(([x, y], i) =>
          i ? path.lineTo(x, y) : path.moveTo(x, y),
        );
        path.closePath();
        if (contour) shape.holes.push(path);
      });
      const scale = label.width / width;
      const geometry = new ShapeGeometry(shape)
        .scale(scale, label.height, 1)
        .translate(
          -label.width / 2 + index * asset.letterAdvance * scale,
          label.y,
          asset.letteringZ,
        );
      if (back) geometry.rotateY(Math.PI);
      batches[label.material].push(geometry);
    });
  };
  box(0, asset.frame, [0, asset.frame.height / 2, 0]);
  box(0, asset.foot, [0, asset.foot.height / 2, 0]);
  for (const back of [false, true]) {
    const z = back ? -asset.face.z : asset.face.z;
    box(1, asset.face, [0, asset.frame.height / 2, z]);
    box(2, asset.band, [0, asset.band.y, z]);
    asset.labels.forEach((label) => lettering(label, back));
    box(2, asset.rule, [0, asset.rule.y, z]);
  }
  const model = new Group();
  model.name = asset.id;
  model.userData = {
    assetId: asset.id,
    units: "metres",
    up: "+Y",
    forward: "+Z",
  };
  batches.forEach((parts, i) => {
    const geometry = mergeGeometries(parts, false);
    const material = new MeshStandardMaterial(asset.materials[i]);
    const mesh = new Mesh(geometry, material);
    mesh.name = asset.materials[i].name;
    model.add(mesh);
    parts.forEach((part) => part.dispose());
  });
  return model;
}
