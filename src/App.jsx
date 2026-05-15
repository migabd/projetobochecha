import React, { useState, useEffect } from 'react';
import { usePersistence } from './hooks/usePersistence';
import { useAI } from './hooks/useAI';

// Módulos
import ElaboradorTab from './components/Elaborador/ElaboradorTab.jsx';
import SimuladosTab from './components/Simulados/SimuladosTab.jsx';
import FluxogramasTab from './components/Fluxogramas/FluxogramasTab.jsx';
import ChecklistsTab from './components/Checklists/ChecklistsTab.jsx';
import GamesTab from './components/Games/GamesTab.jsx';
import ResumosHtmlTab from './components/ResumosHtml/ResumosHtmlTab.jsx';
import FlashcardsTab from './components/Flashcards/FlashcardsTab.jsx';
import ReverseAnalysisTab from './components/ReverseAnalysis/ReverseAnalysisTab.jsx';
import MentorIATab from './components/MentorIA/MentorIATab.jsx';
import PlannerTab from './components/Planner/PlannerTab.jsx';
import InsightsTab from './components/Insights/InsightsTab.jsx';
import ImageEditor from './components/Common/ImageEditor.jsx';

const INITIAL_DB = {
    errors: [], flashcards: [], checklists: [], summariesHtml: [],
    weeks: [], games: [], fluxogramas: [], perceptions: [],
    subjects: [],
    processedQuestionLists: [],
    simuladoHistory: [],
    dailyStats: {},
    reverseAnalysisHistory: [],
    chatMessages: [],
    planner: {}
};

const _x = (b, k) => {
    try {
        const s = atob(b);
        return s.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ k.charCodeAt(i % k.length))).join('');
    } catch (e) { return ''; }
};

const SECRETS = {
    _t: 'IAlXEx0LClg2Jy11dg0KFjk3ASsTWCokAwEIFRwIDgcBABoVHgkUNRgI',
    _g: 'JChSQgsDCnIHA31fAgp/KABAcAMJVVRWFm8ACiYrAXh4',
    _k: 'BigYExocbywNMwEiDw8pCBdTNxYEUChdQChMLXgmDwE2FygF'
};

const INITIAL_CONFIG = {
    apiKey: '', model: 'gemini-2.0-flash',
    persona: 'amigavel',
    gist: { token: '', id: '', autoSync: true }
};

const App = () => {
    const [aiConfig, setAiConfig] = useState(() => {
        try {
            const saved = localStorage.getItem('caderno_ai_config');
            if (saved) return { ...INITIAL_CONFIG, ...JSON.parse(saved) };
        } catch (e) {}
        return INITIAL_CONFIG;
    });

    const [isLoggedIn, setIsLoggedIn] = useState(() => !!aiConfig.apiKey);
    const [theme, setTheme] = useState(() => localStorage.getItem('caderno_theme') || 'dark');
    const [keyword, setKeyword] = useState('');
    const [activeTab, setActiveTab] = useState('dashboard');
    const [imageToEdit, setImageToEdit] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const [alertText, setAlertText] = useState(null);
    const [lightbox, setLightbox] = useState(null);
    const [fluxogramaPlay, setFluxogramaPlay] = useState(null);
    const [directSimulado, setDirectSimulado] = useState(null);

    const showAlert = (txt) => {
        setAlertText(txt);
        setTimeout(() => setAlertText(null), 3000);
    };

    const { db, setDb, syncStatus, syncFromGist } = usePersistence(
        INITIAL_DB, aiConfig.gist, 
        (newGist) => setAiConfig(p => ({ ...p, gist: newGist })), 
        showAlert
    );

    const { callIA, getPersonaInstruction, isLoading: aiLoading } = useAI(aiConfig);

    useEffect(() => {
        if (isLoggedIn && aiConfig.gist.token && aiConfig.gist.id) {
            syncFromGist();
        }
    }, [isLoggedIn]); // Only run on login or when gist config changes after login

    useEffect(() => {
        const seedLegacyData = async () => {
            if (!isLoggedIn) return;
            try {
                const response = await fetch('./restored_db.json');
                if (response.ok) {
                    const legacyData = await response.json();
                    setDb(prev => ({
                        ...prev,
                        ...legacyData,
                        summariesHtml: legacyData.summaries || legacyData.summariesHtml || prev.summariesHtml,
                        dailyStats: legacyData.daily_stats || legacyData.dailyStats || prev.dailyStats,
                        simuladoHistory: legacyData.simuladoHistory || prev.simuladoHistory,
                        processedQuestionLists: legacyData.processedQuestionLists || prev.processedQuestionLists
                    }));
                    showAlert("📦 Dados legados integrados!");
                }
            } catch (err) {
                console.log("Sem semente de dados encontrada.");
            }
        };
        seedLegacyData();
    }, [isLoggedIn]);

    useEffect(() => {
        if (isLoggedIn && aiConfig.gist.token && aiConfig.gist.id) {
            syncFromGist();
        }
    }, [isLoggedIn, aiConfig.gist.token, aiConfig.gist.id]);

    useEffect(() => {
        localStorage.setItem('caderno_ai_config', JSON.stringify(aiConfig));
    }, [aiConfig]);

    useEffect(() => {
        localStorage.setItem('caderno_db', JSON.stringify(db));
    }, [db]);

    useEffect(() => {
        localStorage.setItem('caderno_theme', theme);
        document.documentElement.className = theme;
    }, [theme]);

    const navItems = [
        { id: 'dashboard', icon: 'house', label: 'Dashboard' },
        { id: 'elaborador', icon: 'wand-magic-sparkles', label: 'Elaborador' },
        { id: 'simulados', icon: 'list-ol', label: 'Simulados' },
        { id: 'fluxogramas', icon: 'diagram-project', label: 'Fluxogramas' },
        { id: 'checklists', icon: 'list-check', label: 'Checklists' },
        { id: 'games', icon: 'gamepad', label: 'Games' },
        { id: 'resumos', icon: 'file-code', label: 'Resumos' },
        { id: 'flashcards', icon: 'clone', label: 'Flashcards' },
        { id: 'planner', icon: 'calendar-days', label: 'Planner' },
        { id: 'insights', icon: 'bolt', label: 'Insights' },
        { id: 'analise_reversa', icon: 'magnifying-glass-chart', label: 'Análise' },
        { id: 'chat', icon: 'robot', label: 'Mentor IA' }
    ];

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6 font-sans">
                <div className="w-full max-w-lg animate-in fade-in zoom-in duration-700">
                    <div className="glass-obsidian p-12 rounded-[3rem] text-center shadow-2xl">
                        <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-emerald-500/20 rotate-3">
                            <i className="fa-solid fa-brain text-4xl text-white"></i>
                        </div>
                        <h1 className="text-4xl font-black text-white mb-2 tracking-tighter uppercase neon-emerald">CADERNO IA <span className="text-white opacity-40">PRO</span></h1>
                        <p className="text-zinc-500 font-bold mb-12 text-xs tracking-widest">SISTEMA MÉDICO DE ALTA PERFORMANCE</p>
                        
                        <div className="space-y-4">
                            <input 
                                type="password" value={keyword} onChange={e => setKeyword(e.target.value)} 
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        if (keyword.toLowerCase() === 'gabriel') {
                                            const k = "Gabriel";
                                            setAiConfig(prev => ({
                                                ...prev,
                                                apiKey: _x(SECRETS._k, k),
                                                gist: { ...prev.gist, token: _x(SECRETS._t, k), id: _x(SECRETS._g, k) }
                                            }));
                                            setIsLoggedIn(true);
                                            showAlert("Sistema Desbloqueado. Sincronizando...");
                                        } else {
                                            showAlert("Acesso Negado");
                                        }
                                    }
                                }}
                                placeholder="DIGITE A CHAVE"
                                className="w-full p-6 bg-black/40 rounded-2xl border border-white/5 outline-none text-center font-black text-white focus:border-emerald-500 transition-all"
                            />
                            <button 
                                onClick={() => {
                                    if (keyword.toLowerCase() === 'gabriel') {
                                        const k = "Gabriel";
                                        setAiConfig(prev => ({
                                            ...prev,
                                            apiKey: _x(SECRETS._k, k),
                                            gist: { ...prev.gist, token: _x(SECRETS._t, k), id: _x(SECRETS._g, k) }
                                        }));
                                        setIsLoggedIn(true);
                                        showAlert("Sistema Desbloqueado. Sincronizando...");
                                    } else {
                                        showAlert("Acesso Negado");
                                    }
                                }}
                                className="w-full py-6 premium-btn rounded-2xl font-black text-lg"
                            >
                                AUTENTICAR
                            </button>
                        </div>
                    </div>
                </div>
                {alertText && <div className="fixed bottom-10 left-1/2 -translate-x-1/2 glass-obsidian px-8 py-4 rounded-2xl font-black border border-emerald-500/30 text-emerald-400 z-[9999]">{alertText}</div>}
            </div>
        );
    }

    const Component = {
        elaborador: ElaboradorTab,
        simulados: SimuladosTab,
        fluxogramas: FluxogramasTab,
        checklists: ChecklistsTab,
        games: GamesTab,
        resumos: ResumosHtmlTab,
        flashcards: FlashcardsTab,
        analise_reversa: ReverseAnalysisTab, 
        chat: MentorIATab,
        planner: PlannerTab,
        insights: InsightsTab
    }[activeTab];

    return (
        <div className={`flex h-screen ${theme === 'dark' ? 'bg-[#09090b] text-zinc-100' : 'bg-zinc-50 text-zinc-900'} font-sans overflow-hidden transition-colors duration-500`}>
            {/* Sidebar Original */}
            <aside className={`glass-obsidian h-full flex flex-col transition-all duration-500 ${sidebarOpen ? 'w-72' : 'w-24'} shrink-0 z-[100]`}>
                <div className="p-8 flex items-center gap-4 mb-10">
                    <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                        <i className="fa-solid fa-brain text-white text-xl"></i>
                    </div>
                    {sidebarOpen && <span className="font-black text-xl tracking-tighter neon-emerald">CADERNO IA</span>}
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    {navItems.map(item => (
                        <button 
                            key={item.id} onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-4 p-4 rounded-2xl font-black transition-all group ${activeTab === item.id ? 'sidebar-active shadow-xl' : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'}`}
                        >
                            <i className={`fa-solid fa-${item.icon} text-lg w-6 shrink-0`}></i>
                            {sidebarOpen && <span className="text-sm tracking-wide">{item.label}</span>}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-white/5 space-y-2">
                    <button 
                        onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl text-zinc-500 hover:text-white transition-all"
                    >
                        <i className={`fa-solid fa-${theme === 'dark' ? 'sun' : 'moon'} text-lg w-6`}></i>
                        {sidebarOpen && <span className="text-sm">{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>}
                    </button>
                    <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-black transition-all ${activeTab === 'settings' ? 'sidebar-active' : 'text-zinc-500 hover:text-zinc-200'}`}>
                        <i className="fa-solid fa-gear text-lg w-6"></i>
                        {sidebarOpen && <span className="text-sm">Configurações</span>}
                    </button>
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-full flex items-center gap-4 p-4 rounded-2xl text-zinc-600 hover:text-white transition-all">
                        <i className={`fa-solid fa-chevron-${sidebarOpen ? 'left' : 'right'} text-lg w-6`}></i>
                        {sidebarOpen && <span className="text-[10px] uppercase font-black tracking-widest">Recolher</span>}
                    </button>
                </div>
            </aside>

            {/* Main Area */}
            <div className={`flex-1 flex flex-col relative overflow-hidden ${theme === 'dark' ? 'bg-[#09090b]' : 'bg-white'}`}>
                {/* Sync Bar */}
                <div className={`fixed top-0 left-0 w-full h-1 z-[1000] ${syncStatus === 'syncing' ? 'sync-active' : ''}`}></div>
                
                <main className="flex-1 overflow-y-auto planner-scroll">
                    {activeTab === 'settings' ? (
                        <div className="p-10 max-w-4xl mx-auto animate-in slide-in-from-bottom-10">
                            <div className="glass-obsidian p-12 rounded-[3rem] border border-white/5">
                                <h2 className="text-4xl font-black mb-10 tracking-tight neon-emerald italic">Configurações</h2>
                                <div className="space-y-10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest ml-1">Chave API Gemini</label>
                                            <input type="password" value={aiConfig.apiKey} onChange={e => setAiConfig({...aiConfig, apiKey: e.target.value})} className="w-full p-6 bg-black/40 border border-white/10 rounded-2xl font-black focus:border-emerald-500 outline-none transition-all" placeholder="sk-..." />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest ml-1">Humor do Mentor IA</label>
                                            <select value={aiConfig.persona} onChange={e => setAiConfig({...aiConfig, persona: e.target.value})} className="w-full p-6 bg-black/40 border border-white/10 rounded-2xl font-black focus:border-emerald-500 outline-none transition-all appearance-none text-white">
                                                <option value="amigavel">Amigável (Padrão)</option>
                                                <option value="compreensiva">Compreensiva (Empático)</option>
                                                <option value="ironica">Irônica (Sarcástica)</option>
                                                <option value="arrogante">Arrogante (Mentor IA Clássico)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="p-8 bg-emerald-500/5 rounded-[2.5rem] border border-emerald-500/20 space-y-6">
                                        <h3 className="font-black text-xl flex items-center gap-3 text-emerald-400"><i className="fa-solid fa-cloud"></i> Sincronização em Nuvem</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <input type="password" value={aiConfig.gist.token} onChange={e => setAiConfig({...aiConfig, gist: {...aiConfig.gist, token: e.target.value}})} className="w-full p-4 bg-black/40 border border-white/5 rounded-xl text-xs font-bold" placeholder="GitHub Personal Token" />
                                            <input type="text" value={aiConfig.gist.id} onChange={e => setAiConfig({...aiConfig, gist: {...aiConfig.gist, id: e.target.value}})} className="w-full p-4 bg-black/40 border border-white/5 rounded-xl text-xs font-bold" placeholder="Gist ID" />
                                        </div>
                                        <button onClick={() => syncFromGist(true)} className="w-full py-5 premium-btn rounded-xl font-black">Sincronizar Agora</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : Component ? (
                        <div className="animate-in fade-in duration-500">
                            <Component 
                                db={db} 
                                setDb={setDb} 
                                showAlert={showAlert} 
                                callIA={callIA} 
                                aiConfig={aiConfig} 
                                setLightbox={setLightbox} 
                                fluxogramaPlay={fluxogramaPlay} 
                                setFluxogramaPlay={setFluxogramaPlay} 
                                setActiveTab={setActiveTab}
                                directSimulado={directSimulado}
                                setDirectSimulado={setDirectSimulado}
                            />
                        </div>
                    ) : (
                        <div className="p-10 md:p-16 max-w-[1600px] mx-auto animate-in fade-in duration-1000">
                            <header className="mb-20">
                                <h2 className="text-6xl font-black tracking-tighter mb-4 italic">Painel de <span className="neon-emerald">Controle</span></h2>
                                <p className="text-zinc-500 font-bold text-lg ml-1">Central de Inteligência Médica aplicada.</p>
                            </header>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {[
                                    { id: 'elaborador', icon: 'wand-magic-sparkles', title: 'Elaborador de Elite', desc: 'Gerador de questões por IA.' },
                                    { id: 'simulados', icon: 'list-ol', title: 'Simulados PRO', desc: 'Treino exaustivo com Mentor IA.' },
                                    { id: 'fluxogramas', icon: 'diagram-project', title: 'Fluxogramas', desc: 'Treino visual e reconstrução ativa.' },
                                    { id: 'checklists', icon: 'list-check', title: 'Checklists PRO', desc: 'Protocolos de urgência e rotina.' },
                                    { id: 'games', icon: 'gamepad', title: 'Memory Games', desc: 'Retenção por associação rápida.' },
                                    { id: 'flashcards', icon: 'clone', title: 'Flashcards IA', desc: 'Sincronia direta com Anki.' },
                                    { id: 'planner', icon: 'calendar-days', title: 'Meu Planner', desc: 'Sincronize sua rotina de elite.' },
                                    { id: 'insights', icon: 'bolt', title: 'Insights Clínicos', desc: 'Capture padrões e relâmpagos.' },
                                    { id: 'analise_reversa', icon: 'magnifying-glass-chart', title: 'Análise Reversa', desc: 'DNA das bancas decodificado.' },
                                    { id: 'chat', icon: 'robot', title: 'Mentor IA PRO', desc: 'Consultoria médica em tempo real.' }
                                ].map(item => (
                                    <div 
                                        key={item.id} onClick={() => setActiveTab(item.id)}
                                        className="bento-card p-10 rounded-[3.5rem] group cursor-pointer shadow-xl relative overflow-hidden"
                                    >
                                        <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-8 text-emerald-500 group-hover:scale-110 transition-transform"><i className={`fa-solid fa-${item.icon} text-2xl`}></i></div>
                                        <h3 className="text-2xl font-black mb-3">{item.title}</h3>
                                        <p className="text-zinc-500 font-bold text-sm leading-relaxed">{item.desc}</p>
                                        <i className={`fa-solid fa-${item.icon} absolute -right-6 -bottom-6 text-8xl text-emerald-500/5 group-hover:text-emerald-500/10 transition-colors`}></i>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {alertText && <div className="fixed bottom-12 right-12 glass-obsidian px-10 py-5 rounded-[2rem] font-black border border-emerald-500/30 text-emerald-400 z-[9999] shadow-2xl animate-in slide-in-from-right-10">{alertText}</div>}
            
            {lightbox && (
                <div onClick={() => setLightbox(null)} className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-10 animate-in fade-in">
                    <img src={lightbox} className="max-w-full max-h-full rounded-[2rem] shadow-2xl border border-white/5 animate-in zoom-in duration-500" />
                </div>
            )}

            {imageToEdit && (
                <ImageEditor 
                    initialImage={imageToEdit.image} 
                    onSave={(newImg) => {
                        imageToEdit.onSave(newImg);
                        setImageToEdit(null);
                    }} 
                    onCancel={() => setImageToEdit(null)} 
                />
            )}
        </div>
    );
};

export default App;
