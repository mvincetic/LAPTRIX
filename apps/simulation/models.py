"""Validated SI-unit contracts. Coordinates: x east, y up, z south."""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, model_validator


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
    schemaVersion: Literal[1, 2] = 1
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
            raise ValueError("Banking is reserved; the development solver supports zero banking")
        return self


class PowerPoint(StrictModel):
    rpm: float = Field(gt=0)
    powerKw: float = Field(gt=0, le=2000)


class VehicleSource(StrictModel):
    title: str
    url: HttpUrl
    fields: list[str] = Field(min_length=1)


class Vehicle(StrictModel):
    id: str
    name: str
    synthetic: bool
    bodyStyle: Literal["formula", "coupe"] = "formula"
    description: str = "Synthetic development vehicle. No measured calibration."
    sources: list[VehicleSource] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
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
        if any(a <= b for a, b in zip(self.gearRatios, self.gearRatios[1:])):
            raise ValueError("Forward gear ratios must decrease")
        if self.maxRpm <= self.idleRpm:
            raise ValueError("Redline must exceed idle RPM")
        if any(a.rpm >= b.rpm for a, b in zip(self.powerCurve, self.powerCurve[1:])):
            raise ValueError("Power curve RPM must increase")
        if self.powerCurve[0].rpm > self.idleRpm or self.powerCurve[-1].rpm < self.maxRpm:
            raise ValueError("Power curve must cover idle through redline")
        if abs(max(p.powerKw for p in self.powerCurve) - self.powerKw) > 1e-6:
            raise ValueError("Rated peak power must equal the power curve maximum")
        return self


class ProfilePowerPoint(PowerPoint):
    model_config = ConfigDict(strict=True)
    rpm: float = Field(gt=0, le=30_000)


class ProfileSource(VehicleSource):
    model_config = ConfigDict(strict=True)
    title: str = Field(min_length=1, max_length=200)
    fields: list[Annotated[str, Field(min_length=1, max_length=100)]] = Field(
        min_length=1, max_length=32
    )


class VehicleProfile(Vehicle):
    """Bounded editable input; archived Vehicle snapshots keep their existing reader."""

    model_config = ConfigDict(strict=True)
    id: str = Field(pattern=r"^[a-z0-9-]{1,64}$")
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1, max_length=1000)
    sources: list[ProfileSource] = Field(default_factory=list, max_length=16)
    assumptions: list[Annotated[str, Field(min_length=1, max_length=500)]] = Field(
        min_length=1, max_length=32
    )
    mass: float = Field(gt=100, le=4000)
    powerKw: float = Field(ge=1, le=2000)
    powerCurve: list[ProfilePowerPoint] = Field(min_length=2, max_length=128)
    dragArea: float = Field(ge=0.1, le=10)
    downforceArea: float = Field(ge=0, le=20)
    friction: float = Field(ge=0.3, le=3)
    maxBrakeG: float = Field(ge=0.3, le=8)
    gearRatios: list[Annotated[float, Field(ge=0.1, le=20)]] = Field(min_length=1, max_length=12)
    finalDrive: float = Field(ge=0.1, le=20)
    wheelRadius: float = Field(ge=0.15, le=0.6)
    wheelbase: float = Field(ge=1, le=5)
    idleRpm: float = Field(ge=100, le=5000)
    maxRpm: float = Field(ge=1000, le=25_000)
    width: float = Field(ge=0.8, le=3)


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
    vehicle: VehicleProfile | None = None
