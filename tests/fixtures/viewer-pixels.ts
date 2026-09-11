import type { Page } from "@playwright/test";

/** Inspect the composited canvas; a paused WebGL drawing buffer may be discarded. */
export async function racingLinePixels(page: Page) {
  const png = await page.locator(".scene canvas").screenshot({
    style:
      ".scene * { visibility: hidden !important; } .scene canvas { visibility: visible !important; }",
  });
  return page.evaluate(async (base64) => {
    const canvas = document.querySelector<HTMLCanvasElement>(".scene canvas");
    const gl = canvas?.getContext("webgl2");
    if (!gl) throw new Error("The viewer has no WebGL2 context.");
    const blob = await (await fetch(`data:image/png;base64,${base64}`)).blob();
    const bitmap = await createImageBitmap(blob);
    try {
      const copy = new OffscreenCanvas(bitmap.width, bitmap.height);
      const context = copy.getContext("2d");
      if (!context) throw new Error("Canvas image inspection is unavailable.");
      context.drawImage(bitmap, 0, 0);
      const pixels = context.getImageData(
        0,
        0,
        bitmap.width,
        bitmap.height,
      ).data;
      let count = 0;
      for (let i = 0; i < pixels.length; i += 4)
        if (
          pixels[i + 2] > pixels[i] + 35 &&
          pixels[i + 2] > pixels[i + 1] + 25
        )
          count++;
      return { count, error: gl.getError() };
    } finally {
      bitmap.close();
    }
  }, png.toString("base64"));
}

export async function carPixels(page: Page) {
  const canvas = page.locator(".scene canvas");
  const options = {
    style:
      ".scene * { visibility: hidden !important; } .scene canvas { visibility: visible !important; }",
  };
  const visible = await canvas.screenshot(options);
  await page.getByRole("checkbox", { name: "Show current ghost" }).uncheck();
  const hidden = await canvas.screenshot(options);
  const result = await page.evaluate(
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
        const copy = new OffscreenCanvas(width, height);
        const context = copy.getContext("2d")!;
        const pixels = bitmaps.map((bitmap) => {
          context.drawImage(bitmap, 0, 0);
          return context.getImageData(0, 0, width, height).data;
        });
        let count = 0,
          left = width,
          right = 0,
          top = height,
          bottom = 0;
        for (let i = 0; i < pixels[0].length; i += 4) {
          if (
            Math.max(
              ...[0, 1, 2].map((c) =>
                Math.abs(pixels[0][i + c] - pixels[1][i + c]),
              ),
            ) < 24
          )
            continue;
          const x = (i / 4) % width,
            y = Math.floor(i / 4 / width);
          count++;
          left = Math.min(left, x);
          right = Math.max(right, x);
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
        return {
          count,
          width,
          height,
          left,
          right: width - 1 - right,
          top,
          bottom: height - 1 - bottom,
        };
      } finally {
        bitmaps.forEach((bitmap) => bitmap.close());
      }
    },
    [visible.toString("base64"), hidden.toString("base64")],
  );
  await page.getByRole("checkbox", { name: "Show current ghost" }).check();
  return result;
}
