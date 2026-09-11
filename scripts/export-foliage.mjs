/* global createImageBitmap, fetch, OffscreenCanvas */
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { URL } from "node:url";
import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

// Offline asset encoding only: the original alpha cutout remains untouched.
const source = new URL(
  "../assets/environment/spruce-bough-source.png",
  import.meta.url,
);
const destination = new URL(
  "../assets/environment/spruce-bough.webp",
  import.meta.url,
);
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const result = await page.evaluate(
    async (base64) => {
      const bitmap = await createImageBitmap(
        await (await fetch(`data:image/png;base64,${base64}`)).blob(),
      );
      const canvas = new OffscreenCanvas(512, 512),
        ctx = canvas.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, 0, 0, 512, 512);
      const originalSize = [bitmap.width, bitmap.height];
      bitmap.close();
      const blob = await canvas.convertToBlob({
        type: "image/webp",
        quality: 0.9,
      });
      const data = Array.from(new Uint8Array(await blob.arrayBuffer()));
      return { data, originalSize };
    },
    (await readFile(source)).toString("base64"),
  );
  const bytes = Buffer.from(result.data);
  assert(
    bytes.length <= 131072,
    "Foliage runtime texture must stay below 128 KiB.",
  );
  if (process.argv.includes("--check"))
    assert.deepEqual(
      bytes,
      await readFile(destination),
      "Re-export foliage with the pinned Playwright Chromium.",
    );
  else await writeFile(destination, bytes);
  console.log(
    JSON.stringify({
      source: result.originalSize,
      runtime: [512, 512],
      bytes: bytes.length,
      checked: process.argv.includes("--check"),
    }),
  );
} finally {
  await browser.close();
}
