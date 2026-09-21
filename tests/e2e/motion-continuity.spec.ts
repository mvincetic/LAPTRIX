import { expect, test } from "@playwright/test";
import type { Lap } from "../../packages/shared/schema";

const turn = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

for (const [vehicle, width] of [
  ["formula-development", 1600],
  ["gt-development", 390],
] as const) {
  test(`rendered ${vehicle} turns continuously through a native steering extremum at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    let [response] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/simulate") &&
          r.ok() &&
          r.request().postDataJSON().setup.solver === "optimized",
      ),
      page
        .getByRole("combobox", { name: "Track", exact: true })
        .selectOption("red-bull-ring"),
    ]);
    if (vehicle === "gt-development")
      [response] = await Promise.all([
        page.waitForResponse(
          (r) =>
            r.url().endsWith("/api/simulate") &&
            r.ok() &&
            r.request().postDataJSON().setup.solver === "optimized",
        ),
        page
          .getByRole("combobox", { name: "Car profile", exact: true })
          .selectOption(vehicle),
      ]);
    const lap = (await response.json()) as Lap;
    expect(lap.vehicleId).toBe(vehicle);
    expect(lap.setup.solver).toBe("optimized");
    await page.getByRole("button", { name: "Chase", exact: true }).click();
    const index = lap.samples
        .slice(1, -1)
        .reduce(
          (best, s, i) =>
            Math.abs(s.steering) > Math.abs(lap.samples[best].steering)
              ? i + 1
              : best,
          1,
        ),
      left = lap.samples[index - 1],
      center = lap.samples[index],
      right = lap.samples[index + 1],
      eps = 0.02,
      cursor = page.getByRole("slider", {
        name: "Viewer lap position",
        exact: true,
      });
    await page.getByRole("tab", { name: "Cursor Data", exact: true }).click();
    const atDistance = page.getByRole("spinbutton", {
      name: "Inspect at distance (m)",
    });
    let solves = 0;
    page.on("request", (r) => {
      if (r.url().endsWith("/api/simulate")) solves++;
    });
    async function read(offset: number) {
      const a = offset < 0 ? left : center,
        b = offset < 0 ? center : right,
        fraction =
          (center.distance + offset - a.distance) / (b.distance - a.distance),
        time = a.time + (b.time - a.time) * fraction,
        position = [
          a.x + (b.x - a.x) * fraction,
          a.y + (b.y - a.y) * fraction + 0.58,
          a.z + (b.z - a.z) * fraction,
        ];
      await atDistance.fill(String(center.distance + offset));
      await atDistance.press("Enter");
      await expect(cursor).toHaveAttribute(
        "aria-valuetext",
        `${time.toFixed(3)} seconds, ${(center.distance + offset).toFixed(3)} metres`,
      );
      let result: { ready: boolean; yaw: number; steering: number } | undefined;
      await expect
        .poll(async () => {
          result = await page.evaluate(async (position) => {
            const url = "/node_modules/.vite/deps/@react-three_fiber.js";
            const { _roots } = (await import(
              url
            )) as typeof import("@react-three/fiber");
            const root = _roots.get(
              document.querySelector(".scene canvas") as HTMLCanvasElement,
            );
            const car = root?.store
                .getState()
                .scene.getObjectByName("current-ghost"),
              wheel = car?.getObjectByName("WHEEL_FL");
            return {
              ready:
                !!wheel &&
                car!.position
                  .toArray()
                  .every((v, i) => Math.abs(v - position[i]) < 1e-6),
              yaw: car?.rotation.y ?? 0,
              steering: wheel?.rotation.y ?? 0,
            };
          }, position);
          return result.ready;
        })
        .toBe(true);
      return result!;
    }
    const before = await read(-eps),
      exact = await read(0),
      after = await read(eps);
    for (const field of ["yaw", "steering"] as const) {
      const entering = turn(exact[field] - before[field]) / eps,
        leaving = turn(after[field] - exact[field]) / eps;
      expect(
        Math.abs(entering - leaving),
        `${field} derivative at native sample`,
      ).toBeLessThan(0.002);
    }
    expect(exact.steering).toBeCloseTo(center.steering, 8);
    await read(1);
    expect(await read(0)).toEqual(exact);
    expect(solves).toBe(0);
    expect(errors).toEqual([]);
  });
}
