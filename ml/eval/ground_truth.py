"""Load SoccerNet GSR ground truth (Labels-GameState.json) for one eval clip."""

import json
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Box:
    track_id: int
    cls: str  # player | goalkeeper | referee | ball
    team: str | None  # left | right; None for referees and the ball
    x: float  # top-left corner and size, in pixels
    y: float
    w: float
    h: float


def load_clip(clip_dir: str | Path) -> dict[int, list[Box]]:
    """Map frame number (1-based, as in img1/000001.jpg) to the boxes in that frame."""
    labels = json.loads((Path(clip_dir) / "Labels-GameState.json").read_text())
    classes = {
        c["id"]: c["name"]
        for c in labels["categories"]
        if c["supercategory"] == "object"
    }
    frame_of = {
        im["image_id"]: int(Path(im["file_name"]).stem) for im in labels["images"]
    }
    frames: dict[int, list[Box]] = {n: [] for n in frame_of.values()}
    for a in labels["annotations"]:
        if a["supercategory"] != "object":
            continue  # pitch-line annotations; not needed for detection/tracking/team eval
        b = a["bbox_image"]
        frames[frame_of[a["image_id"]]].append(
            Box(
                a["track_id"],
                classes[a["category_id"]],
                a["attributes"].get("team"),
                b["x"],
                b["y"],
                b["w"],
                b["h"],
            )
        )
    return frames
