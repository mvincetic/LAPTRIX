import type { Page } from "@playwright/test";

/** Compare actual compositor PNGs, independent of the application's scene objects. */
export async function imageDifference(page: Page, a: Buffer, b: Buffer) {
  return page.evaluate(
    async (images) => {
      const bitmaps = await Promise.all(
        images.map(async (base64) =>
          createImageBitmap(
            await (await fetch(`data:image/png;base64,${base64}`)).blob(),
          ),
        ),
      );
      try {
        const { width, height } = bitmaps[0];
        if (bitmaps[1].width !== width || bitmaps[1].height !== height)
          throw new Error("Compositor image dimensions changed.");
        const context = new OffscreenCanvas(width, height).getContext("2d")!;
        const pixels = bitmaps.map((bitmap) => {
          context.drawImage(bitmap, 0, 0);
          return context.getImageData(0, 0, width, height).data;
        });
        let total = 0,
          changed = 0,
          blue = 0;
        for (let i = 0; i < width * height; i++) {
          let maximum = 0;
          for (const c of [0, 1, 2]) {
            const delta = Math.abs(pixels[0][i * 4 + c] - pixels[1][i * 4 + c]);
            total += delta;
            maximum = Math.max(maximum, delta);
          }
          if (maximum > 8) changed++;
          if (
            pixels[0][i * 4 + 2] > pixels[0][i * 4] + 35 &&
            pixels[0][i * 4 + 2] > pixels[0][i * 4 + 1] + 20
          )
            blue++;
        }
        return {
          mean: total / (width * height * 3),
          changed,
          blue,
          pixels: width * height,
        };
      } finally {
        bitmaps.forEach((bitmap) => bitmap.close());
      }
    },
    [a.toString("base64"), b.toString("base64")],
  );
}
