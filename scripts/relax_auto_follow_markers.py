from pathlib import Path

p = Path('scripts/add_film_auto_follow.py')
s = p.read_text()
old = '''def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'Missing marker: {label}')
    return text.replace(old, new, 1)
'''
new = '''def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old in text:
        return text.replace(old, new, 1)

    import re
    old_lines = old.strip('\\n').splitlines()
    pattern_parts: list[str] = []
    for index, line in enumerate(old_lines):
        content = line.lstrip()
        if index > 0:
            pattern_parts.append(r'\\n[ \\t]*')
        pattern_parts.append(re.escape(content))
    pattern = ''.join(pattern_parts)
    match = re.search(pattern, text)
    if not match:
        raise SystemExit(f'Missing marker: {label}')

    first_indent = re.match(r'[ \\t]*', match.group(0)).group(0)
    new_lines = new.strip('\\n').splitlines()
    replacement = '\\n'.join(first_indent + line.lstrip() for line in new_lines)
    return text[:match.start()] + replacement + text[match.end():]
'''
if old not in s:
    raise SystemExit('replace_once helper not found')
p.write_text(s.replace(old, new, 1))
