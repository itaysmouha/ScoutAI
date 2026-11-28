import json

from ml.eval.ground_truth import Box, load_clip


def test_load_clip(tmp_path):
    labels = {
        "info": {"name": "SNGS-000"},
        "images": [
            {"image_id": "1000001", "file_name": "000001.jpg"},
            {"image_id": "1000002", "file_name": "000002.jpg"},
        ],
        "categories": [
            {"supercategory": "object", "id": 1, "name": "player"},
            {"supercategory": "object", "id": 4, "name": "ball"},
            {"supercategory": "pitch", "id": 5, "name": "pitch"},
        ],
        "annotations": [
            {
                "image_id": "1000001",
                "track_id": 7,
                "supercategory": "object",
                "category_id": 1,
                "attributes": {"role": "player", "jersey": "4", "team": "left"},
                "bbox_image": {"x": 136, "y": 520, "w": 51, "h": 135},
            },
            {
                "image_id": "1000001",
                "track_id": 9,
                "supercategory": "object",
                "category_id": 4,
                "attributes": {"role": "ball", "jersey": None, "team": None},
                "bbox_image": {"x": 900, "y": 400, "w": 12, "h": 12},
            },
            {
                "image_id": "1000001",
                "supercategory": "pitch",
                "category_id": 5,
                "lines": {},
            },
        ],
    }
    (tmp_path / "Labels-GameState.json").write_text(json.dumps(labels))

    frames = load_clip(tmp_path)

    assert frames == {
        1: [
            Box(7, "player", "left", 136, 520, 51, 135),
            Box(9, "ball", None, 900, 400, 12, 12),
        ],
        2: [],
    }
