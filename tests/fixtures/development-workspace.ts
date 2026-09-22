import type { Page } from "@playwright/test";
import { defaultSetup } from "../../packages/shared/schema";

/** Explicit source for Dev Track geometry, CSV and asset-specific regressions. */
export async function useDevelopmentWorkspace(page: Page) {
  await page.addInitScript((setup) => {
    if (!localStorage.getItem("laptrix.project.v1"))
      localStorage.setItem(
        "laptrix.project.v1",
        JSON.stringify({
          version: 1,
          trackId: "ardennes-development",
          setup,
        }),
      );
  }, defaultSetup);
}
