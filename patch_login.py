import sys
import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# I will replace the handleLogin logic from `if (input.toLowerCase() === masterKey.toLowerCase()) {` to `setIsLoggedIn(true);` (for the generic else block)
# Or I can just replace `gistConfig.id` with `''`, `setGistConfig` with `// setGistConfig`

content = re.sub(r'const decToken = dec\(.*\n.*gistConfig\.id.*\n.*DEBUG: handleLogin matched.*\n.*setGistConfig\(.*\n', '', content)
content = re.sub(r'setGistConfig\(.*\n', '', content)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied")
