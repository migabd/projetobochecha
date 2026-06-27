import sys

with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

def get_line_index(search_str):
    for i, line in enumerate(lines):
        if search_str in line:
            return i
    return -1

idx_start = get_line_index('<div>')
idx_end = get_line_index('<p className="text-[10px] text-zinc-400 mt-1">Protege seu banco de dados contra acessos não autorizados. Deixe em branco se a sua API não tiver senha.</p>')

if idx_start != -1 and idx_end != -1:
    # We want to find the exact block for the password input inside the Vercel KV UI.
    # A safer way is string replacement
    pass

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the password input UI
ui_to_remove = """                                            <div>
                                                <label className="block text-xs font-bold text-zinc-500 mb-1">Senha de Acesso (API Secret)</label>
                                                <input 
                                                    type="password"
                                                    value={cloudConfig.token}
                                                    onChange={e => setCloudConfig(p => ({ ...p, token: e.target.value }))}
                                                    placeholder="Digite a senha configurada na Vercel (API_SECRET)..."
                                                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 transition-colors font-mono text-sm"
                                                />
                                                <p className="text-[10px] text-zinc-400 mt-1">Protege seu banco de dados contra acessos não autorizados. Deixe em branco se a sua API não tiver senha.</p>
                                            </div>"""

content = content.replace(ui_to_remove, '')

# Let's remove the Authorization header from frontend fetch
content = content.replace("...(secret ? { 'Authorization': `Bearer ${secret}` } : {})", "")
content = content.replace("headers: secret ? { 'Authorization': `Bearer ${secret}` } : {}", "headers: {}")
content = content.replace("const secret = cloudConfig.token?.trim();", "")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("UI simplified")
