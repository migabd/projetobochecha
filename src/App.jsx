import React, { useState, useEffect } from 'react';
import { usePersistence } from './hooks/usePersistence';
import { useAI } from './hooks/useAI';

// Componentes das Abas
import ElaboradorTab from './components/Elaborador/ElaboradorTab.jsx';
import FluxogramasTab from './components/Fluxogramas/FluxogramasTab.jsx';
import ChecklistsTab from './components/Checklists/ChecklistsTab.jsx';
import GamesTab from './components/Games/GamesTab.jsx';
import ResumosHtmlTab from './components/ResumosHtml/ResumosHtmlTab.jsx';

const INITIAL_DB = {
    errors: [],
    flashcards: [],
    checklists: [],
    summariesHtml: [],
    weeks: [],
    games: [],
    fluxogramas: [],
    perceptions: [],
    processedQuestionLists: [],
    dailyStats: {}
};

const INITIAL_CONFIG = {
    apiKey: '',
    model: 'gemini-1.5-flash',
    gist: { token: '', id: '', autoSync: false }
};

const App = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [keyword, setKeyword] = useState('');
    const [activeTab, setActiveTab] = useState('dashboard');
    const [lightbox, setLightbox] = useState(null);
    const [alert, setAlertState] = useState(null);
    const [fluxogramaPlay, setFluxogramaPlay] = useState(null);

    // Carregar Configurações com Segurança
    const [aiConfig, setAiConfig] = useState(() => {
        try {
            const saved = localStorage.getItem('caderno_ai_config');
            if (saved) {
                const parsed = JSON.parse(saved);
                return { ...INITIAL_CONFIG, ...parsed, gist: { ...INITIAL_CONFIG.gist, ...(parsed.gist || {}) } };
            }
        } catch (e) { console.error("Falha ao ler config"); }
        return INITIAL_CONFIG;
    });

    const showAlert = (text) => {
        setAlertState(text);
        setTimeout(() => setAlertState(null), 3000);
    };

    const { db, setDb, syncStatus, lastSyncTime, syncToGist, syncFromGist } = usePersistence(
        INITIAL_DB, 
        aiConfig.gist, 
        (newGist) => setAiConfig(p => ({ ...p, gist: newGist })),
        showAlert
    );

    const { callIA, isLoading: aiLoading } = useAI({ key: aiConfig.apiKey, model: aiConfig.model });

    useEffect(() => {
        localStorage.setItem('caderno_ai_config', JSON.stringify(aiConfig));
    }, [aiConfig]);

    useEffect(() => {
        localStorage.setItem('caderno_db', JSON.stringify(db));
    }, [db]);

    const handleLogin = () => {
        if (keyword.toLowerCase() === 'gabriel') {
            setIsLoggedIn(true);
            showAlert("🔓 Acesso Autorizado");
        } else {
            showAlert("❌ Palavra-Chave Incorreta");
        }
    };

    const resetEverything = () => {
        if(confirm("Deseja apagar todos os dados locais? Isso resolverá problemas de tela preta.")) {
            localStorage.clear();
            window.location.reload();
        }
    };

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-6 font-sans selection:bg-indigo-500/30">
                <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
                    <div className="bg-white dark:bg-zinc-800 p-10 rounded-[2.5rem] shadow-2xl border border-white/5 text-center">
                        <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl rotate-3">
                            <i className="fa-solid fa-brain text-4xl text-white"></i>
                        </div>
                        <h1 className="text-4xl font-black text-zinc-800 dark:text-white mb-2 tracking-tighter uppercase">CADERNO <span className="text-indigo-500">IA</span></h1>
                        <p className="text-zinc-500 dark:text-zinc-400 font-bold mb-10 text-sm">Plataforma de Medicina de Elite</p>
                        
                        <div className="space-y-4">
                            <input 
                                type="password" 
                                value={keyword} 
                                onChange={e => setKeyword(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                                placeholder="Palavra-Chave"
                                className="w-full p-5 bg-zinc-100 dark:bg-zinc-900 rounded-2xl border-2 border-transparent focus:border-indigo-500 outline-none text-center font-black transition-all dark:text-white"
                            />
                            <button 
                                onClick={handleLogin}
                                className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                            >
                                ENTRAR
                            </button>
                        </div>

                        <button onClick={resetEverything} className="mt-8 text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:text-red-500 transition-colors">
                            Problemas ao carregar? Resetar App
                        </button>
                    </div>
                </div>
                {alert && (
                    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-bottom-10">
                        <div className="bg-zinc-900 text-white px-8 py-4 rounded-2xl font-black shadow-2xl border border-white/10">{alert}</div>
                    </div>
                )}
            </div>
        );
    }

    const Component = {
        dashboard: null,
        elaborador: ElaboradorTab,
        fluxogramas: FluxogramasTab,
        checklists: ChecklistsTab,
        games: GamesTab,
        resumos: ResumosHtmlTab
    }[activeTab];

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col font-sans">
            {/* Header / Nav */}
            <nav className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div onClick={() => setActiveTab('dashboard')} className="flex items-center gap-3 cursor-pointer group">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform">
                            <i className="fa-solid fa-brain text-white text-lg"></i>
                        </div>
                        <span className="font-black text-xl tracking-tighter hidden sm:block">CADERNO <span className="text-indigo-500">IA</span></span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                            {['dashboard', 'elaborador', 'fluxogramas', 'checklists', 'games', 'resumos'].map(tab => (
                                <button 
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white dark:bg-zinc-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 hover:text-zinc-600'}`}
                                >
                                    {tab === 'resumos' ? 'Resumos' : tab}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setActiveTab('settings')} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                            <i className="fa-solid fa-gear"></i>
                        </button>
                    </div>
                </div>
            </nav>

            <main className="flex-1 overflow-y-auto">
                {activeTab === 'settings' ? (
                    <div className="p-6 md:p-12 max-w-2xl mx-auto animate-in slide-in-from-bottom-8">
                        <div className="bg-white dark:bg-zinc-900 p-10 rounded-[3rem] border shadow-2xl">
                            <h2 className="text-3xl font-black mb-8 flex items-center gap-4"><i className="fa-solid fa-sliders text-indigo-500"></i> Configurações</h2>
                            <div className="space-y-8">
                                <div>
                                    <label className="block text-[10px] font-black text-zinc-400 uppercase mb-3">Chave API Gemini</label>
                                    <input type="password" value={aiConfig.apiKey} onChange={e => setAiConfig({...aiConfig, apiKey: e.target.value})} className="w-full p-5 bg-zinc-50 dark:bg-zinc-950 border rounded-2xl font-black" placeholder="AI_..." />
                                </div>
                                <div className="p-6 bg-indigo-50 dark:bg-indigo-950/20 rounded-3xl border border-indigo-100 dark:border-indigo-900/50">
                                    <h3 className="font-black mb-4 flex items-center gap-2"><i className="fa-solid fa-cloud"></i> Sincronização Gist</h3>
                                    <div className="space-y-4">
                                        <input type="password" value={aiConfig.gist.token} onChange={e => setAiConfig({...aiConfig, gist: {...aiConfig.gist, token: e.target.value}})} className="w-full p-4 bg-white dark:bg-zinc-900 border rounded-xl text-sm font-bold" placeholder="Token GitHub" />
                                        <input type="text" value={aiConfig.gist.id} onChange={e => setAiConfig({...aiConfig, gist: {...aiConfig.gist, id: e.target.value}})} className="w-full p-4 bg-white dark:bg-zinc-900 border rounded-xl text-sm font-bold" placeholder="Gist ID" />
                                        <button onClick={() => syncFromGist(true)} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black">Sincronizar Agora</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : Component ? (
                    <Component 
                        db={db} setDb={setDb} 
                        showAlert={showAlert} 
                        callIA={callIA} 
                        aiConfig={aiConfig} 
                        setLightbox={setLightbox} 
                        fluxogramaPlay={fluxogramaPlay} 
                        setFluxogramaPlay={setFluxogramaPlay} 
                        setActiveTab={setActiveTab}
                    />
                ) : (
                    <div className="p-6 md:p-12 max-w-7xl mx-auto animate-in fade-in duration-700">
                        <header className="mb-12">
                            <h2 className="text-5xl font-black tracking-tighter">Olá, <span className="text-indigo-500">Gabriel</span>.</h2>
                            <p className="text-zinc-500 font-bold mt-2">Pronto para mais um dia de estudos de alto rendimento?</p>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[
                                { id: 'elaborador', icon: 'wand-magic-sparkles', color: 'amber', title: 'Elaborador PRO', desc: 'Simulados de IA personalizados.' },
                                { id: 'fluxogramas', icon: 'diagram-project', color: 'blue', title: 'Fluxogramas', desc: 'Treino ativo visual.' },
                                { id: 'checklists', icon: 'list-check', color: 'emerald', title: 'Checklists', desc: 'Protocolos e rotinas médicas.' },
                                { id: 'games', icon: 'gamepad', color: 'indigo', title: 'Memory Games', desc: 'Associação rápida e retenção.' },
                                { id: 'resumos', icon: 'file-code', color: 'rose', title: 'Resumos HTML', desc: 'Materiais ricos e interativos.' }
                            ].map(item => (
                                <div 
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className="group bg-white dark:bg-zinc-900 p-8 rounded-[3rem] border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer relative overflow-hidden"
                                >
                                    <div className={`w-16 h-16 bg-${item.color}-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                        <i className={`fa-solid fa-${item.icon} text-2xl text-${item.color}-500`}></i>
                                    </div>
                                    <h3 className="text-2xl font-black mb-2">{item.title}</h3>
                                    <p className="text-zinc-500 text-sm font-medium">{item.desc}</p>
                                    <div className="absolute top-6 right-8 text-zinc-100 dark:text-zinc-800 text-6xl font-black -z-10 group-hover:text-indigo-50 dark:group-hover:text-zinc-800/50 transition-colors">
                                        <i className={`fa-solid fa-${item.icon}`}></i>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {alert && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-bottom-10">
                    <div className="bg-zinc-900 text-white px-8 py-4 rounded-2xl font-black shadow-2xl border border-white/10">{alert}</div>
                </div>
            )}

            {lightbox && (
                <div onClick={() => setLightbox(null)} className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in">
                    <img src={lightbox} className="max-w-full max-h-full rounded-2xl shadow-2xl animate-in zoom-in" />
                    <button className="absolute top-8 right-8 text-white text-3xl"><i className="fa-solid fa-xmark"></i></button>
                </div>
            )}
        </div>
    );
};

export default App;
