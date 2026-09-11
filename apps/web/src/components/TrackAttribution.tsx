import type { Track } from "../../../../packages/shared/schema";

export function TrackAttribution({ track }: { track: Track }) {
  if (!track.attribution) return null;
  return (
    <nav className="track-attribution" aria-label="Track source attribution">
      {track.attribution.sources.map((source, i) => (
        <a
          key={i}
          href={source.licenseUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={`${source.title} · ${source.license}`}
        >
          {source.credit}
        </a>
      ))}
      <a
        href={track.attribution.documentationUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Sources &amp; assumptions
      </a>
    </nav>
  );
}
