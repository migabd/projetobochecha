import sys

with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

def get_line_index(search_str):
    for i, line in enumerate(lines):
        if search_str in line:
            return i
    return -1

start_idx = get_line_index('const autoFetchLegacy = async () => {')
if start_idx != -1:
    # Go back to the useEffect line
    while start_idx > 0 and 'useEffect(() => {' not in lines[start_idx - 1]:
        start_idx -= 1
    if start_idx > 0:
        start_idx -= 1
        
end_idx = get_line_index('const t = setTimeout(autoFetchLegacy, 1500);')
if end_idx != -1:
    # Go forward to the closing '}, []);'
    while end_idx < len(lines) and '}, []);' not in lines[end_idx]:
        end_idx += 1

if start_idx != -1 and end_idx != -1:
    del lines[start_idx:end_idx + 1]
    with open('index.html', 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Deleted by exact index")
else:
    print(f"Indices not found {start_idx} {end_idx}")
