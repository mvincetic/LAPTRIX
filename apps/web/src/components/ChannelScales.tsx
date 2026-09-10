import { channelFraction, type Channel } from "../telemetryPlot";

function formatTelemetryBound(value: number) {
  if (Math.abs(value) < 100000) return String(value);
  const [mantissa, exponent] = value.toExponential(1).split("e");
  return `${Number(mantissa)}e${Number(exponent)}`;
}

/** These are plot scale limits, separate from the moving current/reference readouts. */
export function ChannelScales({ channels }: { channels: Channel[] }) {
  return (
    <div className="channel-scales">
      <small className="scale-caption" aria-hidden="true">
        SCALE
      </small>
      {channels.map((channel) => {
        const zero =
          channel.min < 0 && channel.max > 0
            ? channelFraction(0, channel)
            : null;
        const guide =
          channel.guide !== undefined &&
          channel.guide > channel.min &&
          channel.guide < channel.max
            ? channelFraction(channel.guide, channel)
            : null;
        return (
          <div
            key={channel.key}
            role="group"
            aria-label={`${channel.label} scale: ${channel.min} to ${channel.max}${channel.unit ? ` ${channel.unit}` : ""}${guide === null ? "" : `; dashed guide at ${channel.guide} ${channel.unit}`}`}
            data-testid={`channel-scale-${channel.key}`}
          >
            <span
              className="scale-max"
              aria-hidden="true"
              title={`${channel.max} ${channel.unit}`}
            >
              {formatTelemetryBound(channel.max)}
            </span>
            <span
              className="scale-min"
              aria-hidden="true"
              title={`${channel.min} ${channel.unit}`}
            >
              {formatTelemetryBound(channel.min)}
            </span>
            {zero !== null && zero >= 1 / 3 && zero <= 2 / 3 && (
              <span
                aria-hidden="true"
                style={{
                  top: `calc(var(--telemetry-svg-height) * ${27 - zero * 24} / 251)`,
                }}
              >
                0
              </span>
            )}
            {guide !== null && guide >= 1 / 3 && guide <= 2 / 3 && (
              <span
                aria-hidden="true"
                title={`${channel.guide} ${channel.unit}`}
                style={{
                  top: `calc(var(--telemetry-svg-height) * ${27 - guide * 24} / 251)`,
                }}
              >
                {channel.guide}×
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
