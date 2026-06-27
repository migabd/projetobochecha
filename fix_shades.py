import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Map invalid shades to valid ones
shade_mapping = {
    '150': '100',
    '250': '200',
    '350': '300',
    '450': '400',
    '550': '500',
    '650': '600',
    '750': '700',
    '850': '800'
}

def repl(match):
    prefix = match.group(1) # color name e.g. emerald
    invalid_shade = match.group(2) # 650
    suffix = match.group(3) # /50 or empty
    valid_shade = shade_mapping[invalid_shade]
    return f"-{prefix}-{valid_shade}{suffix}"

# Match -color-shade
pattern = r'-([a-z]+)-(150|250|350|450|550|650|750|850)(/\d{1,2})?\b'

new_content, count = re.subn(pattern, repl, content)

print(f"Replaced {count} invalid shades.")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_content)
