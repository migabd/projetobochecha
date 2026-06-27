import sys
import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# We want to remove the useEffect block that contains autoFetchLegacy
pattern = r"\s*useEffect\(\(\) => \{\s*const autoFetchLegacy = async \(\) => \{.*?// Aguarda 1\.5s após iniciar.*?return \(\) => clearTimeout\(t\);\s*\}, \[\]\);"

new_content = re.sub(pattern, "", content, flags=re.DOTALL)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("autoFetchLegacy removed successfully.")
