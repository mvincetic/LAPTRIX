import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import {
  northScreenAngle,
  northScreenLabel,
} from "../../apps/web/src/north-indicator";

const difference = (a: number, b: number) =>
  Math.abs(((a - b + 540) % 360) - 180);
const cameraAt = (x: number, y: number, z: number) => {
  const camera = new PerspectiveCamera();
  camera.position.set(x, y, z);
  camera.lookAt(0, 0, 0);
  return camera;
};
describe("north projected from actual camera rotation", () => {
  it("places north correctly in top and cardinal overview positions", () => {
    for (const [position, expected] of [
      [[0, 10, 0.01], 0],
      [[10, 10, 0], 90],
      [[0, 10, -10], 180],
      [[-10, 10, 0], 270],
      [[0, 10, 10], 0],
    ] as [number[], number][]) {
      const actual = northScreenAngle(
        cameraAt(position[0], position[1], position[2]).quaternion,
      );
      expect(actual).not.toBeNull();
      expect(difference(actual!, expected)).toBeLessThan(1e-9);
    }
  });
  it("agrees with independently rotated north vectors across orbit and camera roll", () => {
    let maximumError = 0;
    for (let azimuth = -180; azimuth <= 180; azimuth += 15)
      for (const pitch of [0.01, 15, 50, 89.9])
        for (const roll of [0, 37]) {
          const az = (azimuth * Math.PI) / 180,
            el = (pitch * Math.PI) / 180;
          const camera = cameraAt(
            Math.sin(az) * Math.cos(el),
            Math.sin(el),
            Math.cos(az) * Math.cos(el),
          );
          camera.rotateZ((roll * Math.PI) / 180);
          const north = new Vector3(0, 0, -1).applyQuaternion(
            camera.quaternion.clone().invert(),
          );
          const expected =
            ((Math.atan2(north.x, north.y) * 180) / Math.PI + 360) % 360;
          const actual = northScreenAngle(camera.quaternion);
          expect(actual).not.toBeNull();
          maximumError = Math.max(maximumError, difference(actual!, expected));
        }
    expect(maximumError).toBeLessThan(1e-8);
  });
  it("depends only on rotation and treats equivalent quaternion signs equally", () => {
    const camera = cameraAt(10, 20, 30),
      q = camera.quaternion;
    const original = northScreenAngle(q);
    expect(northScreenAngle({ x: -q.x, y: -q.y, z: -q.z, w: -q.w })).toBe(
      original,
    );
    camera.position.add(new Vector3(90000, 70000, -40000));
    expect(northScreenAngle(camera.quaternion)).toBe(original);
  });
  it("marks a north-aligned viewing axis as directionally undefined", () => {
    expect(northScreenAngle(cameraAt(0, 0, 1).quaternion)).toBeNull();
    expect(northScreenAngle(cameraAt(0, 0, -1).quaternion)).toBeNull();
    expect(northScreenAngle({ x: NaN, y: 0, z: 0, w: 1 })).toBeNull();
    expect(northScreenLabel(null)).toBe(
      "North is along the viewing direction.",
    );
  });
  it("describes screen direction accessibly, including the angle wrap", () => {
    expect([0, 45, 90, 135, 180, 225, 270, 315].map(northScreenLabel)).toEqual([
      "North points up on screen.",
      "North points up and right on screen.",
      "North points right on screen.",
      "North points down and right on screen.",
      "North points down on screen.",
      "North points down and left on screen.",
      "North points left on screen.",
      "North points up and left on screen.",
    ]);
    expect(northScreenLabel(359.99)).toBe(northScreenLabel(0));
  });
});
