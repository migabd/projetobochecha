import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'\b(bg|text|border|from|to|via|ring|shadow|decoration|accent|outline)-(indigo|violet|purple|fuchsia|blue|sky|cyan|teal|pink)-(\d{2,3}(?:/\d{1,2})?)\b'

def repl(match):
    prefix = match.group(1)
    shade = match.group(3)
    return f"{prefix}-emerald-{shade}"

new_content, count = re.subn(pattern, repl, content)

print(f"Replaced {count} occurrences.")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_content)
