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
