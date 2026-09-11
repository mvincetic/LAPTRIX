import type { Page } from "@playwright/test";

/** Difference the actual composited canvas, isolating apex paint from scenery. */
export async function apexPixels(page: Page) {
  const canvas = page.locator(".scene canvas");
  const bounds = (await canvas.boundingBox())!;
  const options = {
    style:
      ".scene * { visibility: hidden !important; } .scene canvas { visibility: visible !important; }",
  };
  const visible = await canvas.screenshot(options);
  const checkbox = page.getByRole("checkbox", {
    name: "Apex points",
    exact: true,
  });
  await checkbox.uncheck();
  const hidden = await canvas.screenshot(options);
  await checkbox.check();
  return page.evaluate(
    async ({ images, cssWidth }) => {
      const bitmaps = await Promise.all(
        images.map(async (base64) =>
          createImageBitmap(
            await (await fetch(`data:image/png;base64,${base64}`)).blob(),
          ),
        ),
      );
      try {
        const { width, height } = bitmaps[0],
          ratio = width / cssWidth;
        const copy = new OffscreenCanvas(width, height),
          context = copy.getContext("2d")!;
        const data = bitmaps.map((bitmap) => {
          context.drawImage(bitmap, 0, 0);
          return context.getImageData(0, 0, width, height).data;
        });
        const mask = new Uint8Array(width * height);
        for (let i = 0; i < mask.length; i++)
          if (
            Math.max(
              ...[0, 1, 2].map((channel) =>
                Math.abs(data[0][i * 4 + channel] - data[1][i * 4 + channel]),
              ),
            ) >= 24
          )
            mask[i] = 1;
        const clusters = [];
        for (let i = 0; i < mask.length; i++) {
          if (!mask[i]) continue;
          const queue = [i];
          mask[i] = 0;
          let left = width,
            right = 0,
            top = height,
            bottom = 0,
            count = 0;
          while (queue.length) {
            const index = queue.pop()!,
              x = index % width,
              y = Math.floor(index / width);
            left = Math.min(left, x);
            right = Math.max(right, x);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
            count++;
            for (let dy = -1; dy <= 1; dy++)
              for (let dx = -1; dx <= 1; dx++) {
                const xx = x + dx,
                  yy = y + dy,
                  next = yy * width + xx;
                if (
                  xx >= 0 &&
                  xx < width &&
                  yy >= 0 &&
                  yy < height &&
                  mask[next]
                ) {
                  mask[next] = 0;
                  queue.push(next);
                }
              }
          }
          clusters.push({
            width: (right - left + 1) / ratio,
            height: (bottom - top + 1) / ratio,
            count,
            distance:
              Math.hypot(
                (left + right) / 2 - width / 2,
                (top + bottom) / 2 - height / 2,
              ) / ratio,
          });
        }
        return clusters.sort((a, b) => a.distance - b.distance)[0] ?? null;
      } finally {
        bitmaps.forEach((bitmap) => bitmap.close());
      }
    },
    {
      images: [visible.toString("base64"), hidden.toString("base64")],
      cssWidth: bounds.width,
    },
  );
}
