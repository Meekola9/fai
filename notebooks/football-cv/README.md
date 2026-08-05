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
4. For the top-down map, run the calibration cell and **click 4 field points**
   on the image (near-left, near-right, far-left, far-right). You can skip it and
   still get image-space tracking.

## What it does (v0.1) — and doesn't

| Stage | v0.1 | Upgrade path |
|---|---|---|
| Detect players | RF-DETR (COCO `person`) | Fine-tuned football detector |
| Track | ByteTrack | SAM2 segmentation tracking |
| Team split | jersey chroma (LAB a/b) + K-means | SigLIP embeddings + UMAP + K-means |
| Field map | click 4 points (homography) | trained field-keypoint model |
| Jersey numbers | not run | SmolVLM2 OCR |
| Ball tracking | **not included** | — |

Works best on stable, wide sideline film. Pan/zoom, end-zone piles, overlapping
bodies, and similar jerseys are where it degrades — that's the real challenge and
why this is a proof step.

**Night games** are the hard case: low light + stadium glare wash out colors and
add motion blur. The notebook fights that with an optional low-light boost
(CLAHE, `CFG.low_light`) and a brightness-independent team split (LAB chroma), and
starts detection confidence low (`CFG.conf = 0.4`). Expect night film to be
noisier than daytime; if detections are sparse, lower `CFG.conf` further or raise
the CLAHE `clipLimit`. **Ball tracking is intentionally omitted** — impractical
with a brown ball under lights and unnecessary for formation/tendency scouting.

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

## Fine-tuning a football-specific detector

`football_detector_finetune.ipynb` is the next step once the proof holds: it
walks through extracting frames, labeling players in Roboflow, fine-tuning
RF-DETR into a **football player detector**, and plugging the trained weights
back into the tracking pipeline. The generic COCO `person` detector only catches
roughly half the players on night film; fine-tuning on your own labeled frames
(~100–200, both teams boxed) is what gets it toward all 22 with a clean team
split. Needs a free Roboflow account + API key and a GPU runtime.

## Not run in this repo's CI

This is a standalone Colab artifact — it needs a GPU and downloads model weights,
so it is intentionally outside the app build/test pipeline.
