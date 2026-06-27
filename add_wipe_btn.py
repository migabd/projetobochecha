import sys

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

target = """                                    <section className="pt-6 border-t border-slate-100 dark:border-slate-800">
                                        <h3 className="text-xs font-black uppercase text-red-500 mb-4 tracking-widest flex items-center gap-2"><i className="fa-solid fa-triangle-exclamation"></i> Zona de Perigo</h3>"""

replacement = """                                    <section className="pt-6 border-t border-slate-100 dark:border-slate-800">
                                        <h3 className="text-xs font-black uppercase text-red-500 mb-4 tracking-widest flex items-center gap-2"><i className="fa-solid fa-triangle-exclamation"></i> Zona de Perigo</h3>
                                        <button
                                            onClick={() => {
                                                showConfirm("⚠️ Deseja realmente APAGAR TODOS OS DADOS DA NUVEM (Vercel KV)?\\nIsso deixará seu banco na nuvem completamente vazio.", async () => {
                                                    try {
                                                        setSyncStatus('syncing');
                                                        const res = await fetch('/api/sync', { method: 'DELETE' });
                                                        if (res.ok) {
                                                            showAlert("✅ Nuvem (Vercel KV) esvaziada com sucesso!");
                                                            setSyncStatus('synced');
                                                        } else {
                                                            showAlert("❌ Falha ao esvaziar a nuvem.");
                                                            setSyncStatus('error');
                                                        }
                                                    } catch(e) {
                                                        showAlert("❌ Erro: " + e.message);
                                                        setSyncStatus('error');
                                                    }
                                                });
                                            }}
                                            className="w-full bg-orange-50 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400 p-5 rounded-2xl font-black flex justify-between items-center text-sm shadow-sm transition-all hover:bg-orange-600 hover:text-white group border border-orange-100 dark:border-orange-900/30 mb-3"
                                        >
                                            <span>Limpar Storage Vercel KV (Nuvem)</span>
                                            <i className="fa-solid fa-cloud-showers-heavy group-hover:animate-pulse"></i>
                                        </button>"""

if target in content:
    content = content.replace(target, replacement)
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added Clear Cloud Storage button to UI")
else:
    print("Target not found")
