import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Check,
  Download,
  Flag,
  FlaskConical,
  LoaderCircle,
  MoreHorizontal,
  Play,
  Save,
  Sun,
  Upload,
  X,
} from "lucide-react";
import {
  catalogSchema,
  defaultSetup,
  parseReference,
  isTimingReference,
  setupSchema,
  trackSchema,
  type Catalog,
  type Lap,
  type Reference,
  type Setup,
  type Track,
} from "../../../packages/shared/schema";
import { normalizeTrack } from "../../../packages/track-engine";
import {
  PlaybackClock,
  interpolate,
  formatTime,
} from "../../../packages/telemetry";
import { TelemetryAudioEngine } from "../../../packages/audio-engine";
import { getCatalog, runSimulation } from "./api";
import { DeferredTrackView } from "./components/DeferredTrackView";
import { Settings } from "./components/Settings";
import { Analysis } from "./components/Analysis";
import { Telemetry } from "./components/Telemetry";
import { useLapTools } from "./useLapTools";
import { restoreReference } from "./reference";
import { prepareProject } from "./project";
import { AeroSweepDialog } from "./components/AeroSweepDialog";
import { download } from "./download";

const clock = new PlaybackClock();
const audioEngine = new TelemetryAudioEngine();
const storageKey = "laptrix.project.v1";

export function App() {
  const [projectName, setProjectName] = useState("Development workspace");
  const [catalog, setCatalog] = useState<Catalog | null>(null),
    [track, setTrack] = useState<Track | null>(null),
    [vehicleId, setVehicleId] = useState("formula-development");
  const [setup, setSetup] = useState<Setup>(defaultSetup),
    [lap, setLap] = useState<Lap | null>(null),
    [reference, setReference] = useState<Reference | null>(null);
  const [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [selectedCorner, setSelectedCorner] = useState<number | null>(null),
    [menu, setMenu] = useState(false),
    [audio, setAudio] = useState(false);
  const [errorAction, setErrorAction] = useState<
    "retry" | "import-reference" | "import-project" | "import-track"
  >("retry");
  const fileInput = useRef<HTMLInputElement>(null),
    referenceInput = useRef<HTMLInputElement>(null),
    projectInput = useRef<HTMLInputElement>(null),
    generation = useRef(0);
  const customTracks = useRef(new Set<string>());
  const retryTarget = useRef<{ track: Track; makeReference: boolean } | null>(
    null,
  );
  const [aeroComparison, setAeroComparison] = useState(false);
  const actionsButton = useRef<HTMLButtonElement>(null);
  const closeAeroComparison = () => {
    setAeroComparison(false);
    actionsButton.current?.focus();
  };
  useLapTools(lap, clock);
  const run = useCallback(
    async (
      selectedTrack: Track,
      selectedVehicle: string,
      selectedSetup: Setup,
      makeReference = false,
    ) => {
      const id = ++generation.current;
      retryTarget.current = null;
      setBusy(true);
      setError("");
      setErrorAction("retry");
      clock.play(false);
      try {
        const custom = customTracks.current.has(selectedTrack.id);
        const [result, baseline] = await Promise.all([
          runSimulation(selectedTrack, selectedVehicle, selectedSetup, custom),
          makeReference
            ? runSimulation(
                selectedTrack,
                selectedVehicle,
                { ...selectedSetup, solver: "centerline" },
                custom,
              )
            : Promise.resolve(null),
        ]);
        if (id !== generation.current) return;
        setTrack(selectedTrack);
        setLap(result);
        if (baseline) setReference(baseline);
        setSelectedCorner(null);
        clock.configure(result.lapTime);
      } catch (e) {
        if (id === generation.current) {
          retryTarget.current = { track: selectedTrack, makeReference };
          setError(
            `${selectedTrack.name}: ${e instanceof Error ? e.message : "Simulation failed. Please retry."}`,
          );
        }
      } finally {
        if (id === generation.current) setBusy(false);
      }
    },
    [],
  );
  useEffect(() => clock.start(), []);
  useEffect(() => {
    if (!lap || !audio) return;
    const update = () => {
      const state = clock.getSnapshot();
      audioEngine.update(interpolate(lap.samples, state.time), state.playing);
    };
    update();
    return clock.subscribe(update);
  }, [lap, audio]);
  useEffect(() => () => audioEngine.dispose(), []);
  const toggleAudio = async () => {
    if (audio) {
      audioEngine.mute();
      setAudio(false);
      return;
    }
    try {
      await audioEngine.enable();
      setAudio(true);
      setNotice("Procedural engine audio enabled · play the lap to listen");
    } catch {
      setError(
        "Audio could not start in this browser. Try enabling audio again.",
      );
    }
  };
  useEffect(() => {
    let active = true;
    getCatalog()
      .then(async (data) => {
        if (!active) return;
        const parsed = catalogSchema.parse(data);
        let chosen = parsed.tracks[0],
          initialSetup = defaultSetup,
          chosenVehicle = parsed.vehicles[0].id;
        let restoredReference: Reference | null = null;
        try {
          const raw = localStorage.getItem(storageKey);
          if (raw) {
            const saved = JSON.parse(raw);
            if (saved.version !== 1)
              throw new Error("Unsupported saved project");
            if (typeof saved.projectName === "string")
              setProjectName(saved.projectName.slice(0, 80));
            initialSetup = setupSchema.parse(saved.setup);
            chosen =
              parsed.tracks.find((t) => t.id === saved.trackId) ?? chosen;
            chosenVehicle =
              parsed.vehicles.find((v) => v.id === saved.vehicleId)?.id ??
              chosenVehicle;
            if (saved.customTrack) {
              const imported = trackSchema.parse(saved.customTrack);
              customTracks.current.add(imported.id);
              parsed.tracks.push(imported);
              chosen = imported;
            }
            if (saved.reference) {
              const ref = parseReference(saved.reference);
              restoredReference = await restoreReference(ref, chosen);
            }
            setNotice("Saved local project restored");
          }
        } catch {
          chosen = parsed.tracks[0];
          initialSetup = defaultSetup;
          chosenVehicle = parsed.vehicles[0].id;
          restoredReference = null;
          setNotice("Saved project could not be read. Default setup loaded.");
        }
        if (!active) return;
        setReference(restoredReference);
        setCatalog(parsed);
        setTrack(chosen);
        setVehicleId(chosenVehicle);
        setSetup(initialSetup);
        await run(chosen, chosenVehicle, initialSetup, !restoredReference);
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setBusy(false);
        }
      });
    return () => {
      active = false;
      // This numeric ref is a request generation counter, not a DOM ref.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
    };
  }, [run]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);
  const dirty =
    !!lap &&
    (vehicleId !== lap.vehicleId ||
      JSON.stringify(setup) !== JSON.stringify(lap.setup));
  const onCorner = (id: number) => {
    setSelectedCorner(id);
    const c = lap?.corners.find((c) => c.id === id);
    if (c && lap) {
      clock.play(false);
      clock.seek(lap.samples[c.apexIndex].time);
    }
  };
  const save = () => {
    if (!track) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          version: 1,
          projectName,
          trackId: track.id,
          vehicleId,
          setup,
          reference,
          customTrack: customTracks.current.has(track.id) ? track : undefined,
        }),
      );
      setNotice("Project saved on this device");
    } catch {
      setError(
        "Local storage is unavailable or full. Export the project from the actions menu.",
      );
    }
  };
  const importTrack = async (file: File) => {
    if (!catalog) return;
    const id = ++generation.current;
    retryTarget.current = null;
    setBusy(true);
    setError("");
    setNotice("");
    setMenu(false);
    clock.play(false);
    try {
      if (file.size > 1_500_000)
        throw new Error("Track file must be smaller than 1.5 MB.");
      const validation = trackSchema.safeParse(JSON.parse(await file.text()));
      if (!validation.success)
        throw new Error(
          "Track JSON is invalid: " +
            validation.error.issues
              .slice(0, 2)
              .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
              .join("; "),
        );
      const imported = validation.data;
      normalizeTrack(imported);
      if (catalog?.tracks.some((t) => t.id === imported.id))
        throw new Error(
          "A track with this ID is already loaded. Use a unique ID.",
        );
      if (id !== generation.current) return;
      const [result, baseline] = await Promise.all([
        runSimulation(imported, vehicleId, setup, true),
        runSimulation(
          imported,
          vehicleId,
          { ...setup, solver: "centerline" },
          true,
        ),
      ]);
      if (id !== generation.current) return;
      customTracks.current.add(imported.id);
      setCatalog((c) => (c ? { ...c, tracks: [...c.tracks, imported] } : c));
      setTrack(imported);
      setLap(result);
      setReference(baseline);
      setSelectedCorner(null);
      clock.configure(result.lapTime);
      setNotice("Track imported and simulated");
    } catch (e) {
      if (id === generation.current) {
        setErrorAction("import-track");
        setError(
          `Track import failed: ${e instanceof Error ? e.message : "Invalid track JSON"}. Current workspace kept.`,
        );
      }
    } finally {
      if (id === generation.current) setBusy(false);
    }
  };
  const vehicle = catalog?.vehicles.find((v) => v.id === vehicleId);
  const importProject = async (file: File) => {
    if (!catalog) return;
    const id = ++generation.current;
    setBusy(true);
    setError("");
    setMenu(false);
    clock.play(false);
    try {
      if (file.size > 10_000_000)
        throw new Error("Project file must be smaller than 10 MB.");
      const prepared = await prepareProject(
        JSON.parse(await file.text()),
        catalog,
      );
      const custom =
        prepared.addTrack || customTracks.current.has(prepared.track.id);
      const [result, baseline] = await Promise.all([
        runSimulation(
          prepared.track,
          prepared.vehicle.id,
          prepared.setup,
          custom,
        ),
        prepared.reference
          ? Promise.resolve(null)
          : runSimulation(
              prepared.track,
              prepared.vehicle.id,
              { ...prepared.setup, solver: "centerline" },
              custom,
            ),
      ]);
      if (id !== generation.current) return;
      if (prepared.addTrack) {
        customTracks.current.add(prepared.track.id);
        setCatalog((c) =>
          c ? { ...c, tracks: [...c.tracks, prepared.track] } : c,
        );
      }
      setProjectName(prepared.projectName);
      setTrack(prepared.track);
      setVehicleId(prepared.vehicle.id);
      setSetup(prepared.setup);
      setReference(prepared.reference ?? baseline);
      setLap(result);
      setSelectedCorner(null);
      clock.configure(result.lapTime);
      setNotice(
        prepared.renamedTrack
          ? "Project imported · colliding track ID renamed locally"
          : "Project imported and recalculated",
      );
    } catch (e) {
      if (id === generation.current) {
        setErrorAction("import-project");
        setError(
          `Project import failed: ${e instanceof Error ? e.message : "Invalid JSON"}. Current workspace kept.`,
        );
      }
    } finally {
      if (id === generation.current) setBusy(false);
    }
  };
  const importReference = async (file: File) => {
    if (!track) return;
    const currentGeneration = generation.current;
    try {
      if (file.size > 5_000_000)
        throw new Error("Reference file must be smaller than 5 MB.");
      const parsed = parseReference(JSON.parse(await file.text()));
      const restored = await restoreReference(parsed, track);
      if (!restored)
        throw new Error(
          "Reference does not match this source track. Use its original track and start/finish alignment.",
        );
      if (generation.current !== currentGeneration)
        throw new Error(
          "The workspace changed during import. Import the reference again.",
        );
      setReference(
        isTimingReference(restored)
          ? restored
          : {
              ...restored,
              referenceImport: { fileName: file.name.slice(0, 255) },
            },
      );
      setError("");
      setMenu(false);
      setNotice("Reference imported · current simulation retained");
    } catch (e) {
      setErrorAction("import-reference");
      setError(
        `Reference import failed: ${e instanceof Error ? e.message : "Invalid JSON"}. Current reference kept.`,
      );
      setMenu(false);
    }
  };
  const resultVehicle =
    lap?.vehicle ?? catalog?.vehicles.find((v) => v.id === lap?.vehicleId);
  const referenceVehicle =
    reference && !isTimingReference(reference)
      ? (reference.vehicle ??
        catalog?.vehicles.find((v) => v.id === reference.vehicleId))
      : undefined;
  const simulationTrack = useMemo(
    () =>
      track && lap?.sampling
        ? { ...track, points: lap.sampling.points }
        : track,
    [track, lap?.sampling],
  );
  return (
    <div className="application">
      <header className="topbar">
        <a className="brand" href="/" aria-label="LAPTRIX home">
          <span className="brand-word">
            LAPTR<span>I</span>X
          </span>
          <span className="brand-subtitle">RACING ENGINEERING</span>
        </a>
        <div className="topbar-field project-field">
          <span>Project</span>
          <div className="project-name">
            <i className="project-dot" />
            <input
              aria-label="Project name"
              disabled={busy}
              value={projectName}
              maxLength={80}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>
        </div>
        <label className="topbar-field track-field">
          <span>Track</span>
          <select
            aria-label="Track"
            disabled={busy || !catalog}
            value={track?.id ?? ""}
            onChange={(e) => {
              const next = catalog?.tracks.find((t) => t.id === e.target.value);
              if (next) void run(next, vehicleId, setup, true);
            }}
          >
            {catalog?.tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="topbar-field vehicle-field">
          <span>Car profile</span>
          <select
            aria-label="Car profile"
            disabled={busy || !catalog}
            value={vehicleId}
            onChange={(e) => {
              setVehicleId(e.target.value);
              if (track) void run(track, e.target.value, setup, !reference);
            }}
          >
            {catalog?.vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
        <div className="conditions">
          <span>Conditions</span>
          <div>
            <Sun size={20} strokeWidth={1.3} />
            <strong>{setup.temperature}°C</strong>
            <span>Dry</span>
            <span>{setup.trackState === "optimum" ? "Optimum" : "Green"}</span>
          </div>
        </div>
        <div className="topbar-actions">
          <button
            className="primary-button"
            disabled={busy || !track}
            onClick={() => track && void run(track, vehicleId, setup)}
          >
            {busy ? (
              <LoaderCircle size={16} className="spin" />
            ) : (
              <Play size={15} />
            )}
            <span>{busy ? "Calculating…" : "Run Simulation"}</span>
          </button>
          <button
            className="save-button"
            aria-label="Save"
            onClick={save}
            disabled={!track}
          >
            <Save size={16} />
            <span>Save</span>
          </button>
          <div className="menu-wrap">
            <button
              className="icon-button"
              aria-label="Additional actions"
              ref={actionsButton}
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              <MoreHorizontal size={19} />
            </button>
            {menu && (
              <>
                <button
                  className="menu-dismiss"
                  aria-label="Close actions"
                  onClick={() => setMenu(false)}
                />
                <div className="actions-menu">
                  <button
                    disabled={busy || !track || !vehicle}
                    onClick={() => {
                      clock.play(false);
                      setMenu(false);
                      setAeroComparison(true);
                    }}
                  >
                    <FlaskConical size={14} />
                    Compare aero settings
                  </button>
                  <button
                    disabled={!catalog || busy}
                    onClick={() => projectInput.current?.click()}
                  >
                    <Upload size={14} /> Import project JSON
                  </button>
                  <button
                    disabled={!catalog || busy}
                    onClick={() => fileInput.current?.click()}
                  >
                    <Upload size={14} />
                    Import track JSON
                  </button>
                  <button
                    disabled={!track || busy}
                    onClick={() => referenceInput.current?.click()}
                  >
                    <Upload size={14} /> Import reference JSON
                  </button>
                  <button
                    disabled={!lap?.alignment}
                    onClick={() => {
                      if (lap?.alignment)
                        download(
                          "laptrix-timing-reference.json",
                          JSON.stringify(
                            {
                              format: "laptrix-timing-reference-v1",
                              label: `${resultVehicle?.name ?? lap.vehicleId} · ${formatTime(lap.lapTime)}`,
                              vehicleLabel:
                                resultVehicle?.name ?? lap.vehicleId,
                              origin: "external-simulation",
                              source:
                                "LAPTRIX Development Physics Model; synthetic inputs, not measured telemetry.",
                              trackId: lap.trackId,
                              lapTime: lap.lapTime,
                              units: { time: "s", progress: "fraction" },
                              alignment: lap.alignment,
                              samples: lap.samples.map((s) => ({
                                time: s.time,
                              })),
                            },
                            null,
                            2,
                          ),
                        );
                      setMenu(false);
                    }}
                  >
                    <Download size={14} /> Export timing reference
                  </button>
                  <button
                    disabled={!lap}
                    onClick={() => {
                      if (lap)
                        download(
                          "laptrix-telemetry.json",
                          JSON.stringify(lap, null, 2),
                        );
                      setMenu(false);
                    }}
                  >
                    <Download size={14} />
                    Export telemetry JSON
                  </button>
                  <button
                    disabled={!lap}
                    onClick={() => {
                      if (lap) {
                        const keys = Object.keys(
                          lap.samples[0],
                        ) as (keyof (typeof lap.samples)[0])[];
                        download(
                          "laptrix-telemetry-si.csv",
                          [
                            keys.join(","),
                            ...lap.samples.map((s) =>
                              keys.map((k) => s[k]).join(","),
                            ),
                          ].join("\n"),
                          "text/csv",
                        );
                      }
                      setMenu(false);
                    }}
                  >
                    <Download size={14} />
                    Export telemetry CSV (SI)
                  </button>
                  <button
                    disabled={!track}
                    onClick={() => {
                      download(
                        "laptrix-project.json",
                        JSON.stringify(
                          {
                            version: 2,
                            projectName,
                            track,
                            vehicle,
                            setup,
                            lap,
                            reference,
                          },
                          null,
                          2,
                        ),
                      );
                      setMenu(false);
                    }}
                  >
                    <Save size={14} />
                    Export project
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          hidden
          aria-label="Import track file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void importTrack(file);
            e.target.value = "";
          }}
        />
        <input
          ref={referenceInput}
          type="file"
          accept=".json,application/json"
          hidden
          aria-label="Import reference file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void importReference(file);
            e.target.value = "";
          }}
        />
        <input
          ref={projectInput}
          type="file"
          accept=".json,application/json"
          hidden
          aria-label="Import project file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void importProject(file);
            e.target.value = "";
          }}
        />
      </header>
      <div className="workspace-bar">
        <div>
          <Flag size={13} />
          <strong>Lap engineering</strong>
          <span>/</span>
          <span>{track?.name ?? "Connecting to simulation service"}</span>
        </div>
        <span className="development-badge">
          DEVELOPMENT MODEL <i>v0.1</i>
        </span>
      </div>
      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button
            onClick={() => {
              if (errorAction === "import-reference")
                referenceInput.current?.click();
              else if (errorAction === "import-project")
                projectInput.current?.click();
              else if (errorAction === "import-track")
                fileInput.current?.click();
              else if (track)
                void run(
                  retryTarget.current?.track ?? track,
                  vehicleId,
                  setup,
                  retryTarget.current?.makeReference ?? !reference,
                );
              else window.location.reload();
            }}
          >
            {errorAction === "retry"
              ? "Retry"
              : errorAction === "import-reference"
                ? "Import reference again"
                : errorAction === "import-project"
                  ? "Import project again"
                  : "Import track again"}
          </button>
          <button aria-label="Dismiss error" onClick={() => setError("")}>
            <X size={15} />
          </button>
        </div>
      )}
      <main className="workspace">
        <Settings
          setup={setup}
          onChange={setSetup}
          onReset={() => setSetup({ ...defaultSetup })}
          disabled={busy}
          dirty={dirty}
          vehicle={vehicle}
          track={track}
        />
        <div className="center-column">
          {simulationTrack ? (
            <DeferredTrackView
              calculating={busy}
              track={simulationTrack}
              lap={lap}
              vehicle={resultVehicle}
              clock={clock}
              onCorner={onCorner}
              selectedCorner={selectedCorner}
            />
          ) : (
            <section className="panel loading-scene">
              <Activity size={28} />
              <h2>
                {error
                  ? "Simulation service unavailable"
                  : "Preparing your engineering workspace"}
              </h2>
              <p>
                {error
                  ? "Start both services with npm run dev, then retry."
                  : "Loading procedural track geometry…"}
              </p>
            </section>
          )}
          <Telemetry
            lap={lap}
            reference={reference}
            clock={clock}
            audio={audio}
            onAudio={() => void toggleAudio()}
          />
        </div>
        <Analysis
          lap={lap}
          reference={reference}
          currentVehicleName={resultVehicle?.name}
          referenceVehicleName={referenceVehicle?.name}
          onReference={() => {
            if (lap) {
              setReference(lap);
              setNotice("Current simulation set as reference");
            }
          }}
          onCorner={onCorner}
          onSeek={(time) => {
            clock.play(false);
            clock.seek(time);
          }}
          selectedCorner={selectedCorner}
        />
      </main>
      <footer className="statusbar">
        <span>
          <span className={`status-dot ${busy ? "working" : ""}`} />
          {busy ? "Solving lap…" : lap ? "Simulation complete" : "Ready"}
        </span>
        <span>
          {vehicle
            ? `${vehicle.mass} kg base · ${vehicle.powerKw} kW · synthetic vehicle`
            : "Local simulation service"}
        </span>
        <span>
          {lap
            ? `${lap.computationMs.toFixed(0)} ms solve · ${lap.samples.length} telemetry samples`
            : "LAPTRIX v0.1"}
        </span>
      </footer>
      {aeroComparison && track && vehicle && (
        <AeroSweepDialog
          track={track}
          vehicle={vehicle}
          projectName={projectName}
          setup={setup}
          custom={customTracks.current.has(track.id)}
          onClose={closeAeroComparison}
          onApply={(result) => {
            setSetup(result.setup);
            setLap(result);
            setSelectedCorner(null);
            setError("");
            clock.configure(result.lapTime);
            closeAeroComparison();
            setNotice("Aero comparison result applied · reference retained");
          }}
        />
      )}
      {notice && (
        <div className="toast" role="status">
          <Check size={16} />
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
