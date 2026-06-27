import sys

with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

def get_line_index(search_str):
    for i, line in enumerate(lines):
        if search_str in line:
            return i
    return -1

insert_idx = get_line_index('<h3 className="text-xs font-black uppercase text-emerald-400 mb-5 tracking-widest">Backup Base de Dados</h3>')

if insert_idx != -1:
    # Need to go up to the <section> tag
    while insert_idx > 0 and '<section' not in lines[insert_idx - 1]:
        insert_idx -= 1
    insert_idx -= 1

    section_code = """
                                    {/* SEÇÃO DE RESGATE HISTÓRICO */}
                                    <section className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-900/30 shadow-inner">
                                        <h3 className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 mb-4 tracking-widest"><i className="fa-solid fa-clock-rotate-left mr-2"></i> Resgate Histórico (Backup Antigo)</h3>
                                        <p className="text-[10px] font-bold text-emerald-700/60 dark:text-emerald-400/60 mb-4 leading-relaxed">Cole aqui o link RAW do Gist antigo para trazer de volta todos os seus dados e salvá-los no novo banco!</p>
                                        <div className="space-y-3">
                                            <input
                                                id="legacy-url"
                                                type="text"
                                                placeholder="https://gist.githubusercontent.com/..."
                                                value={legacyUrl}
                                                onChange={e => setLegacyUrl(e.target.value)}
                                                className="w-full p-4 bg-white dark:bg-zinc-950 border border-emerald-200 dark:border-emerald-800 rounded-2xl outline-none text-[11px] font-mono shadow-inner text-emerald-900 dark:text-emerald-200"
                                            />
                                            <button
                                                onClick={async () => {
                                                    const url = legacyUrl.trim();
                                                    if (!url) return showAlert("⚠️ Defina a URL RAW do arquivo JSON antigo.");
                                                    setSyncStatus('connecting');
                                                    try {
                                                        const res = await fetch(url);
                                                        if (!res.ok) throw new Error("Erro ao acessar link.");
                                                        const json = await res.json();
                                                        const data = json.data || json;
                                                        const rawErrors = Array.isArray(data) ? data : (data.errors || []);
                                                        const sanitized = sanitizeErrors(rawErrors);
                                                        
                                                        const newDb = {
                                                            ...db,
                                                            errors: [...sanitized, ...db.errors].filter((v, i, a) => v && v.id && a.findIndex(t => t.id === v.id) === i),
                                                            perceptions: [...(data.perceptions || []), ...(db.perceptions || [])].filter((v, i, a) => v && v.id && a.findIndex(t => t.id === v.id) === i),
                                                            summaries: [...(data.summaries || []), ...(db.summaries || [])].filter((v, i, a) => v && v.id && a.findIndex(t => t.id === v.id) === i),
                                                            flashcards: [...(data.flashcards || []), ...(db.flashcards || [])].filter((v, i, a) => v && v.id && a.findIndex(t => t.id === v.id) === i)
                                                        };
                                                        
                                                        setDb(newDb);
                                                        showAlert(`✅ Foram resgatadas ${sanitized.length} questões do Gist antigo! Salvando no novo banco KV...`);
                                                        
                                                        setTimeout(() => syncToCloud(newDb), 1000);
                                                    } catch (e) {
                                                        showAlert("❌ Falha: " + e.message);
                                                        setSyncStatus('error');
                                                    }
                                                }}
                                                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                                            >
                                                <i className="fa-solid fa-file-import"></i> Resgatar e Mesclar Dados
                                            </button>
                                        </div>
                                    </section>
"""
    lines.insert(insert_idx, section_code)
    with open('index.html', 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Section added successfully")
else:
    print("Target not found")
