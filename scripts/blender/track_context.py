"""Read-only Blender authoring access to LAPTRIX's exported road/terrain frame."""

import bisect
import math

from contract import read_json, to_blender, to_runtime
from mathutils.bvhtree import BVHTree


class TrackContext:
    def __init__(self):
        self.data = read_json("assets/blender/tracks/red-bull-ring-context.json")
        self.points = self.data["points"]
        self.distances = self.data["distances"]
        self.length = self.data["length"]
        vertices, triangles = [], []
        for source in (
            self.data["terrain"],
            self.data["road"],
            {"positions": self.data["shoulders"]},
            {"positions": self.data["apron"]},
        ):
            raw = source["positions"]
            offset = len(vertices)
            vertices.extend(to_blender(raw[i : i + 3]) for i in range(0, len(raw), 3))
            indices = source.get("indices", list(range(len(raw) // 3)))
            triangles.extend(tuple(offset + v for v in indices[i : i + 3]) for i in range(0, len(indices), 3))
        self.ground = BVHTree.FromPolygons(vertices, triangles, all_triangles=True)

    def frame(self, distance):
        distance %= self.length
        i = max(0, bisect.bisect_right(self.distances, distance) - 1)
        j = (i + 1) % len(self.points)
        a, b = self.points[i], self.points[j]
        span = (self.distances[j] if j else self.length) - self.distances[i]
        t = (distance - self.distances[i]) / span
        p = tuple(a[k] + (b[k] - a[k]) * t for k in ("x", "y", "z"))
        normal = tuple(
            self.data["normals"][i][k] * (1 - t) + self.data["normals"][j][k] * t for k in range(3)
        )
        magnitude = math.hypot(normal[0], normal[2])
        normal = (normal[0] / magnitude, 0, normal[2] / magnitude)
        return p, normal, (-normal[2], 0, normal[0])

    def point(self, distance, lateral=0, height=0, ground=True):
        p, n, _ = self.frame(distance)
        x, z = p[0] + n[0] * lateral, p[2] + n[2] * lateral
        y = self.height(x, z) if ground else p[1] + 0.55
        return (x, y + height, z)

    def height(self, x, z):
        hit, _, _, _ = self.ground.ray_cast(to_blender((x, 10000, z)), (0, 0, -1))
        if hit is None:
            raise ValueError(f"Authored scenery lies beyond the source ground: {x}, {z}")
        return to_runtime(hit)[1]

    def nearby_distance(self, point):
        i = min(
            range(len(self.points)),
            key=lambda i: (self.points[i]["x"] - point[0]) ** 2 + (self.points[i]["z"] - point[2]) ** 2,
        )
        return self.distances[i]
