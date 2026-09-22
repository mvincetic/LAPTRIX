import { expect, test } from "@playwright/test";
import type { Lap } from "../../packages/shared/schema";
import { interpolate } from "../../packages/telemetry";

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
        point = interpolate(lap.samples, center.distance + offset, "distance"),
        position = [point.x, point.y + 0.58, point.z];
      await atDistance.fill(String(center.distance + offset));
      await atDistance.press("Enter");
      await expect(cursor).toHaveAttribute(
        "aria-valuetext",
        `${time.toFixed(3)} seconds, ${(center.distance + offset).toFixed(3)} metres`,
      );
      let result:
        | {
            ready: boolean;
            yaw: number;
            steering: number;
            position: number[];
            linePoints: number;
            lineGap: number;
          }
        | undefined;
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
              wheel = car?.getObjectByName("WHEEL_FL"),
              line = root?.store
                .getState()
                .scene.getObjectByName("racing-line") as
                import("three").Mesh | undefined,
              start = line?.geometry.getAttribute("instanceStart"),
              end = line?.geometry.getAttribute("instanceEnd");
            let lineGap = Infinity;
            if (start && end && car) {
              const p = [car.position.x, car.position.y + 0.05, car.position.z];
              for (let i = 0; i < start.count; i++) {
                const a = [start.getX(i), start.getY(i), start.getZ(i)],
                  d = [
                    end.getX(i) - a[0],
                    end.getY(i) - a[1],
                    end.getZ(i) - a[2],
                  ],
                  f = Math.max(
                    0,
                    Math.min(
                      1,
                      d.reduce((s, v, k) => s + v * (p[k] - a[k]), 0) /
                        d.reduce((s, v) => s + v * v, 0),
                    ),
                  );
                lineGap = Math.min(
                  lineGap,
                  Math.hypot(...p.map((v, k) => v - a[k] - f * d[k])),
                );
              }
            }
            return {
              ready:
                !!wheel &&
                car!.position
                  .toArray()
                  .every((v, i) => Math.abs(v - position[i]) < 1e-6),
              yaw: car?.rotation.y ?? 0,
              steering: wheel?.rotation.y ?? 0,
              position: car?.position.toArray() ?? [],
              linePoints: start?.count ?? 0,
              lineGap,
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
    expect(exact.position).toEqual([center.x, center.y + 0.58, center.z]);
    // The actual path's velocity direction must be continuous, not only body yaw.
    for (let k = 0; k < 3; k++)
      expect(
        Math.abs(
          (exact.position[k] - before.position[k]) / eps -
            (after.position[k] - exact.position[k]) / eps,
        ),
      ).toBeLessThan(0.005);
    const middle = await read((right.distance - center.distance) / 2),
      sourceChord = [
        (center.x + right.x) / 2,
        (center.y + right.y) / 2 + 0.58,
        (center.z + right.z) / 2,
      ];
    expect(
      Math.hypot(...middle.position.map((v, k) => v - sourceChord[k])),
    ).toBeGreaterThan(0.01);
    expect(middle.linePoints).toBeGreaterThan(lap.samples.length);
    expect(middle.lineGap).toBeLessThan(0.006);
    await read(1);
    expect(await read(0)).toEqual(exact);
    expect(solves).toBe(0);
    expect(errors).toEqual([]);
  });
}
