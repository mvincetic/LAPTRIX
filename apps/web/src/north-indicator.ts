export type CameraRotation = { x: number; y: number; z: number; w: number };

/** World north is -z. Project it onto camera right/up using inverse unit quaternion. */
export function northScreenAngle(q: CameraRotation): number | null {
  if (![q.x, q.y, q.z, q.w].every(Number.isFinite)) return null;
  const right = 2 * (q.y * q.w - q.x * q.z);
  const up = -2 * (q.x * q.w + q.y * q.z);
  if (Math.hypot(right, up) < 1e-8) return null;
  return ((Math.atan2(right, up) * 180) / Math.PI + 360) % 360;
}

export function northScreenLabel(angle: number | null) {
  if (angle === null) return "North is along the viewing direction.";
  const directions = [
    "up",
    "up and right",
    "right",
    "down and right",
    "down",
    "down and left",
    "left",
    "up and left",
  ];
  return `North points ${directions[Math.round(angle / 45) % 8]} on screen.`;
}
