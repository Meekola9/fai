# Football CV → Film Room

Claude's Football CV notebooks export `fai_tracking.json`. FAI can now import that file from Film Room while **Track players** mode is open.

## Import contract

The importer expects normalized image coordinates:

```json
{
  "meta": {
    "source": "scrimmage.mp4",
    "fps": 30,
    "angle": "sideline",
    "createdWith": "fai-football-cv v0.1"
  },
  "frames": [
    {
      "t": 1.2,
      "players": [
        {
          "trackId": 3,
          "team": "A",
          "number": 7,
          "img": { "x": 0.42, "y": 0.61 },
          "field": [33.5, 12.0],
          "confidence": 0.86
        }
      ]
    }
  ]
}
```

`img.x` and `img.y` must each be between 0 and 1. Invalid frames and samples are rejected rather than converted into false player movement.

## Coach review

Before import, the coach must:

1. Map each color-cluster team to **Our team** or **Opponent**.
2. Map that team to offense, defense, or special teams.
3. Review the selected identities. FAI initially selects the 11 longest tracks per color team.
4. Optionally assign tracks marked as **Our team** to roster athletes.
5. Set a timeline offset when the exported clip begins after the loaded Film Room video.

FAI never assigns a roster athlete from jersey color, jersey number, or tracker identity alone.

## Formation alignment

FAI suggests the earliest frame with the highest coverage among selected identities. That timestamp controls the dots used in the formation board. It is an alignment-frame suggestion only; FAI does not invent or classify a formation name from the export.

## Re-import behavior

Imported tracks use deterministic IDs. Re-importing the same Football CV identities replaces those imported trails while preserving unrelated manual arrows, zones, and notes.

## Validation

The acceptance test loads a representative export, maps one track to a roster athlete, imports two timed trails, logs the play, and verifies that the Film Room record preserves team, side, athlete, timestamp, and automatic-source metadata.
