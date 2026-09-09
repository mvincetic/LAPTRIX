"""Validated SI-unit contracts. Coordinates: x east, y up, z south."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class TrackPoint(StrictModel):
    x: float
    y: float
    z: float
    widthLeft: float = Field(ge=2, le=40)
    widthRight: float = Field(ge=2, le=40)
    banking: float = Field(default=0, ge=-0.3, le=0.3)


class Track(StrictModel):
    schemaVersion: Literal[1] = 1
    id: str = Field(pattern=r"^[a-z0-9-]{1,64}$")
    name: str = Field(min_length=1, max_length=100)
    country: str = Field(max_length=100)
    provenance: str = Field(max_length=500)
    synthetic: bool
    closed: Literal[True] = True
    sectorFractions: list[float] = Field(min_length=2, max_length=6)
    points: list[TrackPoint] = Field(min_length=40, max_length=2000)

    @model_validator(mode="after")
    def valid_geometry(self):
        import numpy as np

        p = np.array([[p.x, p.y, p.z] for p in self.points])
        lengths = np.linalg.norm(np.roll(p, -1, axis=0) - p, axis=1)
        if np.any(lengths < 0.1) or np.any(lengths > 150):
            raise ValueError("Adjacent samples, including the seam, must be 0.1–150 m apart")
        local_tangent = np.roll(p[:, [0, 2]], -1, axis=0) - np.roll(p[:, [0, 2]], 1, axis=0)
        if np.any(np.linalg.norm(local_tangent, axis=1) < 0.1):
            raise ValueError("Track contains a degenerate horizontal frame or reversing cusp")
        if np.any(np.abs(np.roll(p[:, 1], -1) - p[:, 1]) / lengths > 0.3):
            raise ValueError("Development solver supports track gradients up to 30%")
        if np.max(np.abs(p)) > 100_000 or lengths.sum() > 30_000:
            raise ValueError("Use local coordinates within 100 km and a circuit below 30 km")
        if self.sectorFractions[-1] != 1 or any(
            a >= b for a, b in zip([0] + self.sectorFractions[:-1], self.sectorFractions)
        ):
            raise ValueError("Sector fractions must increase from above zero to exactly one")
        if any(abs(p.banking) > 1e-8 for p in self.points):
            raise ValueError("Banking is reserved in v1; the development solver supports zero banking")
        return self


class PowerPoint(StrictModel):
    rpm: float = Field(gt=0)
    powerKw: float = Field(gt=0, le=2000)


class Vehicle(StrictModel):
    id: str
    name: str
    synthetic: bool
    mass: float = Field(gt=100)
    powerKw: float = Field(gt=0)
    powerCurve: list[PowerPoint] = Field(min_length=2)
    dragArea: float = Field(gt=0)
    downforceArea: float = Field(ge=0)
    friction: float = Field(gt=0)
    maxBrakeG: float = Field(gt=0)
    gearRatios: list[float] = Field(min_length=1)
    finalDrive: float = Field(gt=0)
    wheelRadius: float = Field(gt=0)
    wheelbase: float = Field(gt=0)
    idleRpm: float = Field(gt=0)
    maxRpm: float = Field(gt=0)
    width: float = Field(gt=0)

    @model_validator(mode="after")
    def drivetrain(self):
        if any(r <= 0 for r in self.gearRatios):
            raise ValueError("Gear ratios must be positive")
        if self.maxRpm <= self.idleRpm:
            raise ValueError("Redline must exceed idle RPM")
        if any(a.rpm >= b.rpm for a, b in zip(self.powerCurve, self.powerCurve[1:])):
            raise ValueError("Power curve RPM must increase")
        return self


class Setup(StrictModel):
    tire: Literal["soft", "medium", "hard"] = "soft"
    fuel: float = Field(default=15, ge=0, le=110)
    aero: float = Field(default=0, ge=-5, le=5)
    brakeBias: float = Field(default=56, ge=50, le=70)
    temperature: float = Field(default=26, ge=5, le=45)
    trackState: Literal["optimum", "green"] = "optimum"
    solver: Literal["optimized", "centerline", "lap-time"] = "optimized"
    airDensity: float = Field(default=1.225, ge=0.9, le=1.4)
    sampling: Literal["source", "5m", "3m"] = "source"


class SimulationRequest(StrictModel):
    trackId: str = "ardennes-development"
    vehicleId: str = "formula-development"
    setup: Setup = Field(default_factory=Setup)
    track: Track | None = None
