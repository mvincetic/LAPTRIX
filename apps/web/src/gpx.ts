import {
  trackSchema,
  type Point,
  type Track,
} from "../../../packages/shared/schema";
import { normalizeTrack } from "../../../packages/track-engine";
import { projectGeographicPoints, type GeographicPoint } from "./geographic";

const GPX = "http://www.topografix.com/GPX/1/1";
const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
const children = (element: Element, name: string) =>
  Array.from(element.children).filter(
    (node) => node.namespaceURI === GPX && node.localName === name,
  );

export type GpxSource = {
  id: string;
  name: string;
  origin: GeographicPoint;
  points: Point[];
  inputCount: number;
  closingPointRemoved: boolean;
  seam: number;
};
export type GpxOptions = {
  name: string;
  source: string;
  widthLeft: number;
  widthRight: number;
};

function readDecimal(value: string | null, label: string) {
  const text = value?.trim() ?? "";
  if (!decimal.test(text) || !Number.isFinite(Number(text)))
    throw new Error(`${label} must be a finite decimal number.`);
  return Number(text);
}

/** Bounded geometry subset, not an XSD validator or a telemetry importer. */
export function parseGpx(text: string): GpxSource {
  if (new TextEncoder().encode(text).length > 1_500_000)
    throw new Error("GPX file must be smaller than 1.5 MB.");
  if (/<!DOCTYPE/i.test(text))
    throw new Error("GPX document types are not supported.");
  const document = new DOMParser().parseFromString(text, "application/xml");
  const root = document.documentElement;
  if (document.querySelector("parsererror"))
    throw new Error("The GPX XML is malformed.");
  if (
    root.localName !== "gpx" ||
    root.namespaceURI !== GPX ||
    root.getAttribute("version") !== "1.1"
  )
    throw new Error("Use a GPX 1.1 file with its standard namespace.");
  const tracks = children(root, "trk");
  if (tracks.length !== 1 || children(root, "rte").length)
    throw new Error(
      "Use one GPX track with one segment and no routes. Select a single circuit before importing.",
    );
  const segments = children(tracks[0], "trkseg");
  if (segments.length !== 1)
    throw new Error(
      "Use one continuous GPX track segment; gaps are not joined automatically.",
    );
  const nodes = children(segments[0], "trkpt");
  if (nodes.length < 40 || nodes.length > 2001)
    throw new Error(
      "Use 40–2,000 circuit points, plus an optional repeated closing point.",
    );
  const source = nodes.map((node, index) => {
    const elevations = children(node, "ele");
    if (elevations.length !== 1 || elevations[0].children.length)
      throw new Error(
        `Point ${index + 1} needs one elevation value in metres. Missing elevation is not filled in.`,
      );
    return {
      latitude: readDecimal(
        node.getAttribute("lat"),
        `Point ${index + 1} latitude`,
      ),
      longitude: readDecimal(
        node.getAttribute("lon"),
        `Point ${index + 1} longitude`,
      ),
      elevation: readDecimal(
        elevations[0].textContent,
        `Point ${index + 1} elevation`,
      ),
    };
  });
  const points = projectGeographicPoints(source);
  const distance = (a: Point, b: Point) =>
    Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  const closingPointRemoved = distance(points[0], points.at(-1)!) < 0.0001;
  if (closingPointRemoved) points.pop();
  if (points.length < 40 || points.length > 2000)
    throw new Error(
      "The circuit must retain 40–2,000 points after removing a repeated closing point.",
    );
  const spacing = points
    .slice(1)
    .map((point, i) => distance(point, points[i]))
    .sort((a, b) => a - b);
  const median =
    (spacing[Math.floor((spacing.length - 1) / 2)] +
      spacing[Math.floor(spacing.length / 2)]) /
    2;
  const seam = distance(points[0], points.at(-1)!);
  if (!closingPointRemoved && seam > Math.min(30, 2 * median))
    throw new Error(
      `The endpoints are ${seam.toFixed(1)} m apart. Use a closed circuit with a join no longer than 30 m or twice its median spacing.`,
    );
  return {
    id: `gpx-${crypto.randomUUID()}`,
    name: (
      children(tracks[0], "name")[0]?.textContent?.trim() ||
      "Imported GPX circuit"
    ).slice(0, 100),
    origin: source[0],
    points,
    inputCount: source.length,
    closingPointRemoved,
    seam,
  };
}

export function prepareGpxTrack(source: GpxSource, options: GpxOptions): Track {
  if (!options.name.trim() || options.name.trim().length > 100)
    throw new Error("Enter a track name with 1–100 characters.");
  if (!options.source.trim() || options.source.trim().length > 140)
    throw new Error("Describe the source in 1–140 characters.");
  const track = trackSchema.safeParse({
    schemaVersion: 2,
    id: source.id,
    name: options.name.trim(),
    country: "",
    synthetic: false,
    closed: true,
    provenance: `User-supplied GPX 1.1, unverified. WGS84 surface EN origin ${source.origin.latitude.toFixed(7)},${source.origin.longitude.toFixed(7)}; supplied elevation/datum unverified. Assumed centerline, half-widths L${options.widthLeft}/R${options.widthRight} m, zero bank, 3 equal source-distance sectors. ${source.closingPointRemoved ? "Repeated endpoint removed." : `Endpoint join ${source.seam.toFixed(2)} m.`} Source: ${options.source.trim()}`,
    sectorFractions: [1 / 3, 2 / 3, 1],
    points: source.points.map((point) => ({
      ...point,
      widthLeft: options.widthLeft,
      widthRight: options.widthRight,
      banking: 0,
    })),
  });
  if (!track.success)
    throw new Error(
      "Track geometry is outside the supported model: " +
        track.error.issues
          .slice(0, 2)
          .map((issue) => issue.message)
          .join("; "),
    );
  normalizeTrack(track.data);
  return track.data;
}
