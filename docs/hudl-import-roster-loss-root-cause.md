# Hudl import roster-loss root cause

Release 1 originally called `replaceAll({ ...data, filmPlays: [...] })` from the import component. That API replaces and cloud-syncs the complete application dataset using the component render's snapshot. If roster/cloud activation changes while the import wizard is open, that snapshot can be stale or incomplete and the full-save path can delete athletes that are absent from it.

The repair replaces full-dataset replacement with a store-owned functional batch append. The append recipe receives the latest committed store state and changes only `filmPlays`, preserving athletes, sessions, events, plays, and awareness results.
