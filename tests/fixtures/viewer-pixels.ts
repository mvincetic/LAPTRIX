import type { Page } from "@playwright/test";

/** Read rendered blue line pixels, excluding HTML labels; no framebuffer modification. */
export async function racingLinePixels(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ count: number; error: number }>((resolve, reject) =>
        requestAnimationFrame(() => {
          const canvas =
            document.querySelector<HTMLCanvasElement>(".scene canvas");
          const gl = canvas?.getContext("webgl2");
          if (!canvas || !gl) {
            reject(new Error("The viewer has no WebGL2 context."));
            return;
          }
          const pixels = new Uint8Array(canvas.width * canvas.height * 4);
          gl.readPixels(
            0,
            0,
            canvas.width,
            canvas.height,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            pixels,
          );
          let count = 0;
          for (let i = 0; i < pixels.length; i += 4)
            if (
              pixels[i + 2] > pixels[i] + 35 &&
              pixels[i + 2] > pixels[i + 1] + 25
            )
              count++;
          resolve({ count, error: gl.getError() });
        }),
      ),
  );
}
