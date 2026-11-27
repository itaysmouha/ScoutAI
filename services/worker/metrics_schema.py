"""Metrics JSON written to S3 at metrics/{jobId}.json.

frontend/src/types/index.ts mirrors this. Bump schemaVersion on breaking changes.
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class MetricsSummary(_Strict):
    playersDetected: int | None = None
    frames: int | None = None
    durationSeconds: float | None = None


class TeamMetrics(_Strict):
    name: str
    shots: int | None = None
    xg: float | None = None
    possessionPercent: float | None = None


class TeamsMetrics(_Strict):
    home: TeamMetrics | None = None
    away: TeamMetrics | None = None


class PlayerMetrics(_Strict):
    name: str
    distanceKm: float | None = None
    topSpeedKmh: float | None = None
    touches: int | None = None


class Metrics(_Strict):
    schemaVersion: Literal[1] = 1
    jobId: str
    generatedAt: str
    summary: MetricsSummary | None = None
    teams: TeamsMetrics | None = None
    topPlayers: list[PlayerMetrics] | None = None
