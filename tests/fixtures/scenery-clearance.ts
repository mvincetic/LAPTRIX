import { Mesh, Object3D, Ray, Vector3 } from "three";

/** Exact world-triangle ray test with a conservative XZ grid broad phase. */
export function verticalSceneryProbe(
  scene: Object3D,
  include: (mesh: Mesh) => boolean = () => true,
) {
  const cells = new Map<string, [Vector3, Vector3, Vector3][]>();
  const cellSize = 32;
  scene.updateMatrixWorld(true);
  scene.traverse((node) => {
    if (!(node instanceof Mesh) || !include(node)) return;
    const positions = node.geometry.getAttribute("position"),
      indices = node.geometry.index;
    for (let i = 0; i < (indices?.count ?? positions.count); i += 3) {
      const triangle = [0, 1, 2].map((j) =>
        new Vector3()
          .fromBufferAttribute(positions, indices ? indices.getX(i + j) : i + j)
          .applyMatrix4(node.matrixWorld),
      ) as [Vector3, Vector3, Vector3];
      const xs = triangle.map((p) => p.x),
        zs = triangle.map((p) => p.z);
      for (
        let x = Math.floor(Math.min(...xs) / cellSize);
        x <= Math.floor(Math.max(...xs) / cellSize);
        x++
      )
        for (
          let z = Math.floor(Math.min(...zs) / cellSize);
          z <= Math.floor(Math.max(...zs) / cellSize);
          z++
        ) {
          const key = `${x},${z}`,
            bucket = cells.get(key);
          if (bucket) bucket.push(triangle);
          else cells.set(key, [triangle]);
        }
    }
  });
  const ray = new Ray(new Vector3(), new Vector3(0, -1, 0)),
    hit = new Vector3();
  return (x: number, y: number, z: number, depth: number) => {
    ray.origin.set(x, y, z);
    return (
      cells.get(`${Math.floor(x / cellSize)},${Math.floor(z / cellSize)}`) ?? []
    ).some(
      ([a, b, c]) =>
        ray.intersectTriangle(a, b, c, false, hit) !== null &&
        ray.origin.distanceTo(hit) <= depth,
    );
  };
}
