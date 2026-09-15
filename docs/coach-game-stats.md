# Coach game entry and comparison repair

Game Stats replaces Film Room in navigation, including the mobile quick links. `/film` redirects to Game Stats. Film Room source and stored film data remain available for separate development; the page no longer mounts in the background.

Choose a player, enter date/opponent and stats, then Save game. Add another game keeps the form accessible for consecutive entries. The latest three games appear first; Edit game corrects the original record. Confirmed zero is stored; blank means unknown. Other position fields are available through Show all offense and defense stats. Duplicate date/opponent entry is blocked and imports require review.

CSV/TSV and modern Excel stat exports offer row selection and column mapping. Screenshots use lazy-loaded Tesseract.js on the device; the worker, WebAssembly core, and English model are served with FAI itself, without a third-party CDN at runtime. Coaches correct extracted text, choose the stats section, map columns, copy reviewed numbers into the form, and explicitly save. This imports a single-game box score for the selected player, not play-by-play footage, season totals, or automatic Hudl account synchronization. Excel uses the existing workbook reader; the selected worksheet is disclosed, and CSV is the fallback for a different worksheet. No athlete names are guessed or created.

## Rating policy

Latest three saved game lines supply rates only when both fields were explicitly recorded. Game efficiency replaces impact-event efficiency when at least one valid rate exists; otherwise existing impact efficiency remains. It does not generate duplicate impact events. The existing impact level and awareness bonuses remain.

| Signal | Neutral | Distance from neutral for full ±5% swing | Full sample |
|---|---:|---:|---:|
| Completions / attempts | 60% | 20 percentage points | 30 attempts |
| Receptions / targets | 65% | 25 percentage points | 15 targets |
| Rush yards / carries | 4 | 3 yards/carry | 20 carries |
| Tackles / (tackles + missed tackles) | 85% | 15 percentage points | 20 opportunities |

Each signal is clamped to ±5% and scaled by min(1, opportunities/full sample). Available signals are averaged. These are explicit FAI coaching settings, not external recruiting standards. The resulting percent multiplies tested base FAI alongside existing bonuses; overall is clamped 0–100. No testing means no invented overall.

## Comparisons and badges

Live and active-season cards recompute against the current roster position, including detailed CB/S and EDGE routing. Historical event views retain recorded snapshots. Saved testing data is not rewritten.

Study cards and player nameplates expose build preferences from the archetype catalog, relative-fit explanation, raw marks for 60/80 training targets, and a player's top three fit scores. Targets use the actual normalizers, including vertical and Illinois special scoring. Power clean uses its separate body-weight scale and is explained separately. Targets are not archetype eligibility gates; the existing fit algorithm still decides the winner.

Every player badge now uses the complete original vector design set, uniform frames/tier colors, and opaque cores. Game-day SVG instances have unique IDs so repeated badges cannot resolve another badge's gradient.

Validation: unit coverage for position edits vs historical views, latest-three efficiency, correction changes, missing vs zero, invalid inputs, imported headers, and repeated badge IDs. Mobile browser coverage enters three games, edits/reloads, reviews imports, and exercises real screenshot OCR before saving.

Historical roster merging now retains game stats, game scores, and other current data collections on reload.
