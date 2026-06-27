import sys

with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

def get_line_index(search_str):
    for i, line in enumerate(lines):
        if search_str in line:
            return i
    return -1

idx_logic_start = get_line_index('// ----- GIST SYNC CONFIG -----')
idx_logic_end = get_line_index('// Garantir que os filtros padrão existam e sejam únicos')

if idx_logic_start == -1 or idx_logic_end == -1:
    print(f"Logic block not found: {idx_logic_start}, {idx_logic_end}")
    sys.exit(1)

new_logic = """            // ----- VERCEL KV SYNC CONFIG -----
            const [cloudConfig, setCloudConfig] = useState(() => {
                try {
                    const saved = localStorage.getItem('caderno_cloud_config');
                    return saved ? JSON.parse(saved) : { token: '', autoSync: true, version: 7 };
                } catch (e) {
                    return { token: '', autoSync: true, version: 7 };
                }
            });

            useEffect(() => {
                localStorage.setItem('caderno_cloud_config', JSON.stringify(cloudConfig));
            }, [cloudConfig]);

            // ----- Sincronização via Vercel KV -----
            const syncToCloud = async (dataToSave) => {
                const secret = cloudConfig.token?.trim();
                console.log("Sync KV: Iniciando upload...");
                setSyncStatus('syncing');
                
                try {
                    const response = await fetch('/api/sync', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(secret ? { 'Authorization': `Bearer ${secret}` } : {})
                        },
                        body: JSON.stringify(dataToSave)
                    });
                    
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.error || "Erro no servidor.");
                    
                    console.log("Sync KV: Sincronizado com sucesso.");
                    setSyncStatus('synced');
                    isDirty.current = false;
                } catch (err) {
                    console.error("Erro ao sincronizar KV:", err);
                    setSyncStatus('error');
                }
            };

            const syncFromCloud = async (isManual = false) => {
                const secret = cloudConfig.token?.trim();
                if (!isManual && !cloudConfig.autoSync) return;
                
                console.log("Sync KV: Iniciando download...");
                setSyncStatus('syncing');
                
                try {
                    const response = await fetch('/api/sync', {
                        method: 'GET',
                        headers: secret ? { 'Authorization': `Bearer ${secret}` } : {}
                    });
                    
                    const data = await response.json();
                    if (!response.ok) {
                        if (response.status === 401) throw new Error("Senha de acesso (API Secret) inválida.");
                        throw new Error(data?.error || "Erro ao baixar do servidor.");
                    }
                    
                    if (!data) {
                        if (isManual) showAlert("O Banco de Dados na nuvem está vazio.");
                        setSyncStatus('synced');
                        return;
                    }

                    if (data.version && data.version > CURRENT_VERSION) {
                        console.warn("Versão mais recente detectada.");
                    }
                    
                    if (!data.flowcharts) data.flowcharts = [];
                    if (!data.perceptions) data.perceptions = [];
                    if (!data.flashcards) data.flashcards = [];
                    
                    isIncomingSyncRef.current = true;
                    setDb(data);
                    setTimeout(() => isIncomingSyncRef.current = false, 1000);
                    
                    if (isManual) {
                        showAlert("✅ Dados sincronizados com sucesso a partir da Nuvem!");
                    }
                    
                    console.log("Sync KV: Download concluído.");
                    setSyncStatus('synced');
                    isDirty.current = false;
                    
                } catch (err) {
                    console.error("Erro ao baixar KV:", err);
                    if (isManual) showAlert(`❌ Erro ao sincronizar: ${err.message}`);
                    setSyncStatus('error');
                }
            };

            // Auto-Sync KV
            useEffect(() => {
                if (isFirstRenderDb.current || !cloudConfig.autoSync) {
                    if (isFirstRenderDb.current) isFirstRenderDb.current = false;
                    return;
                }
                const timer = setTimeout(() => {
                    if (!isDirty.current) return;
                    syncToCloud(db);
                }, 3000);
                return () => clearTimeout(timer);
            }, [db, chatMessages, chatSessions]);

            // Initial KV Load & Auto-Pull
            useEffect(() => {
                const initialTimer = setTimeout(() => {
                    syncFromCloud();
                }, 500);

                let interval;
                if (cloudConfig.autoSync) {
                    interval = setInterval(() => {
                        if (syncStatusRef.current !== 'syncing' && !isDirty.current) {
                            syncFromCloud();
                        }
                    }, 60000);
                }
                
                return () => {
                    clearTimeout(initialTimer);
                    if(interval) clearInterval(interval);
                };
            }, [cloudConfig.token, cloudConfig.autoSync]);

"""
# Replace lines from idx_logic_start to idx_logic_end - 1
lines = lines[:idx_logic_start] + [new_logic] + lines[idx_logic_end:]

# Now replace the UI block
idx_ui_start = get_line_index('Sincronização Gist (GitHub)</h3>')
if idx_ui_start != -1:
    idx_ui_start -= 1 # Include the <section> line

idx_ui_end = get_line_index('{/* SEÇÃO DE RESGATE HISTÓRICO */}')

if idx_ui_start == -1 or idx_ui_end == -1:
    print(f"UI block not found: {idx_ui_start}, {idx_ui_end}")
    sys.exit(1)

new_ui = """                                    {/* Sincronização Vercel KV */}
                                    <section className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-900/30 shadow-inner">
                                        <h3 className="text-xs font-black uppercase text-emerald-500 mb-4 tracking-widest"><i className="fa-solid fa-cloud mr-2"></i> Sincronização em Nuvem (Vercel KV)</h3>
                                        
                                        <div className="space-y-4">
                                            <div className="bg-white/50 dark:bg-black/20 p-3 rounded-xl border border-emerald-100/50 dark:border-emerald-900/30 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 leading-relaxed italic">
                                                <i className="fa-solid fa-circle-info mr-1"></i> A sincronização agora é nativa e instantânea usando o banco de dados da Vercel. Nenhum dado é salvo no Gist.
                                            </div>
                                            
                                            <div>
                                                <label className="block text-xs font-bold text-zinc-500 mb-1">Senha de Acesso (API Secret)</label>
                                                <input 
                                                    type="password"
                                                    value={cloudConfig.token}
                                                    onChange={e => setCloudConfig(p => ({ ...p, token: e.target.value }))}
                                                    placeholder="Digite a senha configurada na Vercel (API_SECRET)..."
                                                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 transition-colors font-mono text-sm"
                                                />
                                                <p className="text-[10px] text-zinc-400 mt-1">Protege seu banco de dados contra acessos não autorizados. Deixe em branco se a sua API não tiver senha.</p>
                                            </div>
                                            
                                            <label className="flex items-center gap-3 cursor-pointer group mt-4">
                                                <div className={`w-10 h-5 rounded-full p-1 transition-colors ${cloudConfig.autoSync ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
                                                    <div className={`bg-white w-3 h-3 rounded-full transition-transform ${cloudConfig.autoSync ? 'translate-x-5' : ''}`}></div>
                                                </div>
                                                <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 group-hover:text-emerald-500 transition-colors">Sincronização Automática (Auto-Sync)</span>
                                            </label>
                                            
                                            <div className="flex gap-2 pt-2">
                                                <button onClick={() => syncFromCloud(true)} className="flex-1 py-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-200 transition-all"><i className="fa-solid fa-cloud-arrow-down mr-1"></i> Baixar da Nuvem</button>
                                                <button onClick={() => { syncToCloud(db); showAlert("✅ Enviando dados locais para a nuvem de forma forçada!"); }} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition-all"><i className="fa-solid fa-cloud-arrow-up mr-1"></i> Enviar p/ Nuvem</button>
                                            </div>
                                            
                                            <div className="text-[10px] font-black text-emerald-400/80 uppercase text-center border-t border-emerald-100 dark:border-emerald-900/30 pt-4 mt-4 flex flex-col gap-1">
                                                <span><i className="fa-solid fa-server"></i> Conectado à Vercel KV ({cloudConfig.autoSync ? 'Sincronizando' : 'Em Pausa'})</span>
                                            </div>
                                        </div>
                                    </section>
"""

lines = lines[:idx_ui_start] + [new_ui] + lines[idx_ui_end:]

with open('index.html', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Line replace success")
