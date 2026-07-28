from pathlib import Path

needles = ('scoreMetric(', 'completionPct', 'categoryWeightsFor(', 'categories:', 'scoreStatus')
for path in sorted(Path('src').rglob('*.ts*')):
    text = path.read_text(errors='ignore')
    if any(needle in text for needle in needles):
        matches = [i for i, line in enumerate(text.splitlines(), 1) if any(needle in line for needle in needles)]
        if matches:
            print(f'\n===== {path} =====')
            lines = text.splitlines()
            shown = set()
            for line_no in matches:
                start = max(1, line_no - 12)
                end = min(len(lines), line_no + 22)
                key = (start, end)
                if key in shown:
                    continue
                shown.add(key)
                print(f'--- lines {start}-{end} ---')
                for idx in range(start, end + 1):
                    print(f'{idx:04d}: {lines[idx - 1]}')
