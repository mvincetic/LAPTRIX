"""Sparse curvature quadratic and a feasible active-set box solver, implemented here."""

import numpy as np
from scipy.sparse import coo_matrix, diags
from scipy.sparse.linalg import spsolve


def curvature_quadratic(center, normals, ds):
    """Integral of squared spatial second derivative on a nonuniform periodic grid."""
    n = len(ds)
    previous = np.roll(ds, 1)
    weights = (previous + ds) / 2
    indices = np.arange(n)
    derivative = coo_matrix(
        (
            np.r_[1 / (previous * weights), -2 / (previous * ds), 1 / (ds * weights)],
            (np.tile(indices, 3), np.r_[(indices - 1) % n, indices, (indices + 1) % n]),
        ),
        shape=(n, n),
    ).tocsr()
    # A distance-integrated regularizer keeps its strength independent of sample count.
    hessian = diags(2e-8 * weights).tocsr()
    linear = np.zeros(n)
    second = derivative @ center
    constant = float(np.sum(weights[:, None] * second**2))
    for axis in (0, 2):
        operator = derivative @ diags(normals[:, axis])
        hessian += 2 * operator.T @ diags(weights) @ operator
        linear += 2 * operator.T @ (weights * second[:, axis])
    return hessian.tocsr(), linear, constant


def box_quadratic(hessian, linear, lower, upper, max_iterations=None):
    """Minimize .5*x'Hx + g'x for positive-definite H, retaining feasibility.

    Free variables take a sparse Newton step up to the first bound. At a stationary
    face, release the bound with the largest incorrect multiplier. Convergence is
    checked using the projected gradient, not an objective-change heuristic.
    """
    n = len(linear)
    if np.any(lower >= upper):
        raise ValueError("Quadratic bounds must have positive width")
    x = np.clip(np.zeros(n), lower, upper)
    active = np.zeros(n, dtype=int)
    budget = max_iterations if max_iterations is not None else 5 * n
    if budget < 1:
        raise ValueError("Iteration budget must be positive")
    for iteration in range(budget):
        gradient = hessian @ x + linear
        free = np.flatnonzero(active == 0)
        step = np.zeros(n)
        if len(free):
            step[free] = spsolve(hessian[free][:, free].tocsc(), -gradient[free])
        if not np.isfinite(step).all():
            break
        if np.max(np.abs(step)) < 1e-7:
            violation = np.where(
                active == -1,
                np.maximum(-gradient, 0),
                np.where(active == 1, np.maximum(gradient, 0), 0),
            )
            if np.max(violation) < 1e-9:
                break
            active[np.argmax(violation)] = 0
            continue
        fractions = np.ones(n)
        up, down = step > 1e-12, step < -1e-12
        fractions[up] = (upper[up] - x[up]) / step[up]
        fractions[down] = (lower[down] - x[down]) / step[down]
        alpha = np.clip(np.min(fractions), 0, 1)
        x = np.clip(x + alpha * step, lower, upper)
        if alpha < 1:
            hit = (fractions <= alpha + 1e-12) & (np.abs(step) > 1e-12)
            active[hit] = np.sign(step[hit]).astype(int)
    gradient = hessian @ x + linear
    at_optimal_bound = ((x <= lower + 1e-7) & (gradient > 0)) | ((x >= upper - 1e-7) & (gradient < 0))
    residual = float(np.max(np.abs(np.where(at_optimal_bound, 0, gradient))))
    return x, dict(converged=residual < 1e-9, iterations=iteration + 1, projectedGradient=residual)
