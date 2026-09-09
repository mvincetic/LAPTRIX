import { useEffect, useState, type ComponentProps } from "react";
import { LoaderCircle } from "lucide-react";

type Viewer = typeof import("./TrackView").TrackView;

/** Keep the engineering workspace independent of loading the larger WebGL module. */
export function DeferredTrackView(props: ComponentProps<Viewer>) {
  const [View, setView] = useState<Viewer | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    import("./TrackView")
      .then((module) => {
        if (active) setView(() => module.TrackView);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);
  if (View) return <View {...props} />;
  return (
    <section className="panel track-panel" aria-label="Track viewer status">
      <header className="panel-heading">
        <h2>TRACK VIEW</h2>
      </header>
      <div className="viewer-placeholder" role={failed ? "alert" : "status"}>
        {!failed && <LoaderCircle size={24} className="spin" />}
        <strong>
          {failed ? "The 3D viewer could not load" : "Loading 3D viewer…"}
        </strong>
        <p>Your lap, settings and telemetry remain available.</p>
        {failed && <p>Save your workspace before reloading the page.</p>}
        {failed && (
          <button onClick={() => window.location.reload()}>Reload page</button>
        )}
      </div>
    </section>
  );
}
