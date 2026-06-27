import sys

with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

def get_line_index(search_str):
    for i, line in enumerate(lines):
        if search_str in line:
            return i
    return -1

start_idx = get_line_index('{/* SEÇÃO DE RESGATE HISTÓRICO */}')
end_idx = get_line_index('<i className="fa-solid fa-file-import"></i> Mesclar Dados Históricos')

if start_idx != -1 and end_idx != -1:
    # the section ends a few lines after end_idx
    # </button>
    # </div>
    # </section>
    
    # Let's find the closing section tag
    close_section_idx = -1
    for i in range(end_idx, min(end_idx + 10, len(lines))):
        if '</section>' in lines[i]:
            close_section_idx = i
            break
            
    if close_section_idx != -1:
        del lines[start_idx:close_section_idx+1]
        with open('index.html', 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print("Backup section removed successfully.")
    else:
        print("Could not find closing section tag.")
else:
    print(f"Could not find bounds: {start_idx}, {end_idx}")
