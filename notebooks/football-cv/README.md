# FAI Football CV — tracking pipeline (proof of concept)

A GPU/Python pipeline that turns a short clip of game film into per-frame player
tracking, a two-team split, an optional top-down field map, and a JSON export the
FAI Film Room can import. It's the football-adapted, lightweight cousin of
Roboflow's *Basketball AI* pipeline — built to **prove the CV holds up on your
own film before investing in fine-tuning**, not as a finished product.

## Run it

1. Open `football_tracking_pipeline.ipynb` in **Google Colab**
   (File ▸ Upload notebook, or push this repo and use "Open in Colab").
2. **Runtime ▸ Change runtime type ▸ GPU.**
3. Upload a short clip (10–30s), set `CFG.clip_path`, and run the cells top to bottom.
4. For the top-down map, fill in four known field points (pixels → yards) in the
   homography cell. You can skip that and still get image-space tracking.

## What it does (v0.1) — and doesn't

| Stage | v0.1 | Upgrade path |
|---|---|---|
| Detect players | RF-DETR (COCO `person`) | Fine-tuned football detector |
| Track | ByteTrack | SAM2 segmentation tracking |
| Team split | jersey color + K-means | SigLIP embeddings + UMAP + K-means |
| Field map | manual 4-point homography | trained field-keypoint model |
| Jersey numbers | not run | SmolVLM2 OCR |

Works best on stable, wide sideline film. Pan/zoom, end-zone piles, overlapping
bodies, and similar jerseys are where it degrades — that's the real challenge and
why this is a proof step.

## Output contract

`fai_tracking.json` — grouped by frame, using the Film Room's **normalized 0–1
image coordinates** so a future importer can drop tracks straight in:

```json
{
  "meta": { "source": "clip.mp4", "fps": 30, "angle": "sideline", "createdWith": "fai-football-cv v0.1" },
  "frames": [
    { "t": 1.23, "players": [
      { "trackId": 3, "team": "A", "number": null,
        "img": { "x": 0.42, "y": 0.61 },
        "field": [33.5, 12.0] }
    ] }
  ]
}
```

`img` is normalized to the frame (matches the Film Room overlay). `field` is
yards (length 0–100, width 0–53.3) when homography is set, otherwise `null`.

## Not run in this repo's CI

This is a standalone Colab artifact — it needs a GPU and downloads model weights,
so it is intentionally outside the app build/test pipeline.
