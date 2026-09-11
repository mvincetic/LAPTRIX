import { expect, it } from "vitest";
import { clipPolyline } from "../../apps/web/src/clip-polyline";

it("clips crossing segments without moving interior vertices or joining data gaps", () => {
  expect(
    clipPolyline(
      [
        [0, 0],
        [10, 20],
        [20, 10],
      ],
      5,
      15,
    ),
  ).toBe("M5,10 L10,20 L15,15");
  expect(clipPolyline([[0, 0], [10, 20], null, [12, 8], [20, 0]], 5, 15)).toBe(
    "M5,10 L10,20 M12,8 L15,5",
  );
  expect(
    clipPolyline(
      [
        [20, 10],
        [10, 20],
        [0, 0],
      ],
      5,
      15,
    ),
  ).toBe("M15,15 L10,20 L5,10");
});

it("retains vertical steps and rejects segments wholly outside the viewport", () => {
  expect(
    clipPolyline(
      [
        [0, 2],
        [10, 2],
        [10, 3],
        [20, 3],
      ],
      8,
      12,
    ),
  ).toBe("M8,2 L10,2 L10,3 L12,3");
  expect(
    clipPolyline(
      [
        [1, 2],
        [1, 8],
      ],
      1,
      2,
    ),
  ).toBe("M1,2 L1,8");
  expect(
    clipPolyline(
      [
        [0, 2],
        [0, 8],
        [0.5, 8],
      ],
      1,
      2,
    ),
  ).toBe("");
  expect(clipPolyline([[0, 2], null, [3, 8]], 1, 2)).toBe("");
});

it("keeps a tiny crossing bounded and preserves its linear slope without rounding endpoints", () => {
  expect(
    clipPolyline(
      [
        [0, 0],
        [1000, 1000],
      ],
      100.1234567,
      100.1234568,
    ),
  ).toBe("M100.1234567,100.1234567 L100.1234568,100.1234568");
  expect(clipPolyline([], 0, 1)).toBe("");
  expect(
    clipPolyline(
      [
        [0, 0],
        [10, 10],
      ],
      1,
      1,
    ),
  ).toBe("");
  expect(
    clipPolyline(
      [
        [0, 0],
        [10, 10],
      ],
      NaN,
      1,
    ),
  ).toBe("");
});
