import { expect, it } from "vitest";
import data from "../../data/tracks/ardennes-development.json";
import { inspectTrackGeometry } from "../../packages/track-engine/diagnostics";

const points = (values: number[][]) =>
  values.map(([x, z, y = 0]) => ({ x, y, z }));
const bow = points([
  [-20, -20],
  [20, 20],
  [-20, 20],
  [20, -20],
]);

it("finds a planar crossing and includes the closing segment after start rotation", () => {
  const report = inspectTrackGeometry(bow);
  expect(report.contactCount).toBe(1);
  expect(report.counts).toEqual({ crossing: 1, touch: 0, overlap: 0 });
  expect(report.contacts[0]).toMatchObject({
    firstSegment: 0,
    secondSegment: 2,
    minHeightGap: 0,
    from: { x: 0, z: 0, firstFraction: 0.5, secondFraction: 0.5 },
  });
  const rotated = inspectTrackGeometry([...bow.slice(1), bow[0]]);
  expect(rotated.contactCount).toBe(1);
  expect(rotated.contacts[0]).toMatchObject({
    firstSegment: 1,
    secondSegment: 3,
    minHeightGap: 0,
  });
});

it("interpolates independent source heights and preserves geometry under rigid transforms", () => {
  const elevated = points([
    [-20, -20, 0],
    [20, 20, 4],
    [-20, 20, 10],
    [20, -20, 14],
  ]);
  const result = inspectTrackGeometry(elevated).contacts[0];
  expect(result).toMatchObject({
    minHeightGap: 10,
    maxHeightGap: 10,
    from: { firstHeight: 2, secondHeight: 12 },
  });
  const angle = 0.37;
  const transformed = elevated.map(({ x, y, z }) => ({
    x: x * Math.cos(angle) - z * Math.sin(angle) + 90000,
    z: x * Math.sin(angle) + z * Math.cos(angle) - 90000,
    y: y + 55,
  }));
  const shifted = inspectTrackGeometry(transformed);
  expect(shifted.contactCount).toBe(1);
  expect(shifted.contacts[0].minHeightGap).toBeCloseTo(10, 8);
});

it("ignores ordinary joins but counts nonadjacent endpoint contact pairs", () => {
  const report = inspectTrackGeometry(
    points([
      [0, 0],
      [20, 0],
      [20, 20],
      [10, 0],
      [0, 20],
    ]),
  );
  expect(report.counts).toEqual({ crossing: 0, touch: 2, overlap: 0 });
  expect(report.contacts.map((c) => [c.firstSegment, c.secondSegment])).toEqual(
    [
      [0, 2],
      [0, 3],
    ],
  );
});

it("finds a full collinear overlap and its interior zero height gap", () => {
  const report = inspectTrackGeometry(
    points([
      [0, 0, 0],
      [20, 0, 0],
      [20, 20, 0],
      [15, 0, 3],
      [5, 0, -3],
      [0, 20, 0],
    ]),
  );
  const overlap = report.contacts.find(
    (c) => c.firstSegment === 0 && c.secondSegment === 3,
  )!;
  expect(overlap.kind).toBe("overlap");
  expect(overlap.from).toMatchObject({ x: 5, secondHeight: -3 });
  expect(overlap.to).toMatchObject({ x: 15, secondHeight: 3 });
  expect(overlap.minHeightGap).toBe(0);
  expect(overlap.maxHeightGap).toBe(3);
});

it("reports an adjacent reversal overlap instead of suppressing it as a normal join", () => {
  const report = inspectTrackGeometry(
    points([
      [0, 0],
      [20, 0],
      [10, 0],
      [10, 20],
      [0, 20],
    ]),
  );
  expect(
    report.contacts.find((c) => c.firstSegment === 0 && c.secondSegment === 1)
      ?.kind,
  ).toBe("overlap");
});

it("does not invent contacts in parallel lanes or the development source", () => {
  expect(
    inspectTrackGeometry(
      points([
        [0, 0],
        [20, 0],
        [20, 0.00001],
        [0, 0.00001],
      ]),
    ).contactCount,
  ).toBe(0);
  const original = JSON.stringify(data.points);
  const report = inspectTrackGeometry(data.points);
  expect(report.contactCount).toBe(0);
  expect(report.minHeightGap).toBeNull();
  expect(report.checkedPairs).toBe((720 * 719) / 2);
  expect(JSON.stringify(data.points)).toBe(original);
});

it("checks every pair at the 2,000-point source limit without treating polygon joins as contacts", () => {
  const circle = Array.from({ length: 2000 }, (_, i) => {
    const angle = (i * 2 * Math.PI) / 2000;
    return { x: 200 * Math.cos(angle), y: 0, z: 200 * Math.sin(angle) };
  });
  const report = inspectTrackGeometry(circle);
  expect(report.checkedPairs).toBe(1999000);
  expect(report.scanComplete).toBe(true);
  expect(report.contactCount).toBe(0);
});

it("finishes the bounded scan and retains total counts when contact details are capped", () => {
  const star = Array.from({ length: 101 }, (_, i) => {
    const angle = (((i * 50) % 101) * 2 * Math.PI) / 101;
    return { x: 100 * Math.cos(angle), y: 0, z: 100 * Math.sin(angle) };
  });
  const report = inspectTrackGeometry(star);
  expect(report.scanComplete).toBe(true);
  expect(report.checkedPairs).toBe(5050);
  expect(report.contactCount).toBe(4949);
  expect(report.contacts).toHaveLength(100);
  expect(report.omittedContacts).toBe(4849);
});
