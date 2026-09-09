"""Exact power-curve evaluation without interpolation across gear redline drops."""

from bisect import bisect_right
from math import pi

from .models import Vehicle


def available_power(vehicle: Vehicle):
    """Compile an inexpensive scalar evaluator for the maximum valid gear power.

    Each gear evaluates its own piecewise-linear RPM curve. Taking the maximum
    afterwards preserves gear crossings and discontinuities when a gear reaches
    redline, unlike interpolating a uniformly sampled maximum-power envelope.
    """
    ratios = tuple(ratio * vehicle.finalDrive for ratio in vehicle.gearRatios)
    rpm_nodes = tuple(point.rpm for point in vehicle.powerCurve)
    power_nodes = tuple(point.powerKw * 1000 for point in vehicle.powerCurve)
    slopes = tuple(
        (power_nodes[i + 1] - power_nodes[i]) / (rpm_nodes[i + 1] - rpm_nodes[i])
        for i in range(len(rpm_nodes) - 1)
    )
    radius, idle, redline = vehicle.wheelRadius, vehicle.idleRpm, vehicle.maxRpm

    def evaluate(speed):
        base_rpm = float(speed) / radius * 60 / (2 * pi)
        best = 0.0
        for ratio in ratios:
            rpm = max(base_rpm * ratio, idle)
            if rpm > redline:
                continue
            index = bisect_right(rpm_nodes, rpm) - 1
            power = power_nodes[index]
            if index < len(slopes):
                power += (rpm - rpm_nodes[index]) * slopes[index]
            if power > best:
                best = power
        return best

    return evaluate
