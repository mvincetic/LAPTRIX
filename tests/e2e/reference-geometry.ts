import { expect, type Locator } from "@playwright/test";

/** Browser-native geometry is an independent oracle for the clipped paint path. */
export async function referenceGeometry(chart: Locator, originals: string[]) {
  const result = await chart.evaluate((svg, sourcePaths) => {
    const [left, , width] = svg.getAttribute("viewBox")!.split(" ").map(Number);
    const paths = [
      ...svg.querySelectorAll<SVGPathElement>(
        '[data-testid^="reference-trace-"]',
      ),
    ];
    let error = 0;
    let bounded = true;
    for (const [index, painted] of paths.entries()) {
      const original = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      original.setAttribute("d", sourcePaths[index]);
      const box = painted.getBBox();
      bounded &&=
        box.x >= left - 0.001 && box.x + box.width <= left + width + 0.001;
      const lengths = [original.getTotalLength(), painted.getTotalLength()];
      for (const fraction of [0.13, 0.37, 0.61, 0.89]) {
        const x = left + width * fraction;
        const positions = [original, painted].map((path, i) => {
          let low = 0,
            high = lengths[i];
          for (let step = 0; step < 40; step++) {
            const middle = (low + high) / 2;
            if (path.getPointAtLength(middle).x < x) low = middle;
            else high = middle;
          }
          return path.getPointAtLength((low + high) / 2);
        });
        error = Math.max(error, Math.abs(positions[0].y - positions[1].y));
      }
    }
    return { bounded, error, count: paths.length };
  }, originals);
  expect(result.count).toBe(originals.length);
  expect(result.count).toBeGreaterThan(0);
  expect(result.bounded).toBe(true);
  // Native SVG length/point queries use single-precision geometry internally.
  expect(result.error).toBeLessThan(0.015);
}
