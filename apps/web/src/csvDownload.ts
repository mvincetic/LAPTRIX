import { strToU8, zipSync } from "fflate";
import type { Track } from "../../../packages/shared/schema";

/** Keep numeric CSV unchanged while carrying the source's redistribution notices. */
export function csvDownload(
  name: string,
  csv: string,
  attributions: Track["attribution"][],
) {
  const sources = [
    ...new Set(
      attributions.filter(Boolean).map((value) => JSON.stringify(value)),
    ),
  ].map((value) => JSON.parse(value) as NonNullable<Track["attribution"]>);
  if (!sources.length) return { name, content: csv, type: "text/csv" };
  const notice =
    [
      "LAPTRIX source attribution",
      "This archive contains calculated development-model output using the following source data.",
      "Keep these notices and the supplied source-attribution.json with any redistributed data.",
      ...sources.flatMap((attribution) => [
        "",
        ...attribution.sources.flatMap((source) => [
          source.credit,
          `${source.title} — ${source.license}`,
          source.licenseUrl,
          source.url,
        ]),
        "",
        attribution.notes,
        attribution.documentationUrl,
      ]),
      "",
      "Calculated telemetry is approximate. Source licenses do not imply endorsement or survey accuracy.",
    ].join("\n") + "\n";
  // STORE avoids a compression pass over a potentially large numeric comparison.
  const content = zipSync(
    {
      [name]: strToU8(csv),
      "SOURCE_LICENSES.txt": strToU8(notice),
      "source-attribution.json": strToU8(
        JSON.stringify(sources, null, 2) + "\n",
      ),
    },
    { level: 0 },
  );
  return {
    name: name.replace(/\.csv$/i, "-with-sources.zip"),
    content: new Uint8Array(content),
    type: "application/zip",
  };
}
