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
    _t: '',
    _g: '',
    _k: ''
};

const INITIAL_CONFIG = {
    apiKey: '', model: 'gemini-2.0-flash',
    persona: 'amigavel',
    gist: { token: '', id: '', autoSync: false }
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

    const { callIA, getPersonaInstruction, fetchModels, isLoading: aiLoading } = useAI(aiConfig);
    const [availableModels, setAvailableModels] = useState([]);

    useEffect(() => {
        if (aiConfig.apiKey) {
            fetchModels().then(setAvailableModels);
        }
    }, [aiConfig.apiKey, fetchModels]);

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
     const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Cálculos para o Dashboard
    const stats = {
        totalErrors: db.errors?.length || 0,
        activeFlashcards: db.flashcards?.length || 0,
        completedFlux: db.fluxogramas?.filter(f => f.history?.length > 0)?.length || 0,
        efficiency: 85 // Mock
    };

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
        <div className={`flex h-screen ${theme === 'dark' ? 'bg-[#060608] text-zinc-100' : 'bg-zinc-50 text-zinc-900'} font-sans overflow-hidden transition-colors duration-500`}>
            
            {/* Overlay Mobile */}
            {mobileMenuOpen && (
                <div onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000] lg:hidden animate-in fade-in"></div>
            )}

            {/* Sidebar Modular e Premium */}
            <aside className={`
                fixed lg:relative h-full flex flex-col transition-all duration-700 z-[1001]
                ${sidebarOpen ? 'w-80' : 'w-24'} 
                ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                glass-obsidian border-r border-white/5
            `}>
                <div className="p-8 flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-700 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20 rotate-3">
                            <i className="fa-solid fa-brain text-white text-xl"></i>
                        </div>
                        {sidebarOpen && (
                            <div className="animate-in fade-in slide-in-from-left-4">
                                <span className="font-black text-2xl tracking-tighter neon-emerald">CADERNO <span className="text-white">IA</span></span>
                                <p className="text-[8px] font-black tracking-[0.3em] text-zinc-500 uppercase mt-1">Elite Performance</p>
                            </div>
                        )}
                    </div>
                    <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-white">
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto planner-scroll">
                    {navItems.map(item => (
                        <button 
                            key={item.id} 
                            onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                            className={`
                                w-full flex items-center gap-4 p-4 rounded-2xl font-black transition-all group relative overflow-hidden
                                ${activeTab === item.id 
                                    ? 'bg-emerald-500/10 text-emerald-400 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]' 
                                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'}
                            `}
                        >
                            {activeTab === item.id && <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-emerald-500 rounded-full"></div>}
                            <i className={`fa-solid fa-${item.icon} text-lg w-6 shrink-0 ${activeTab === item.id ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'opacity-70 group-hover:opacity-100'}`}></i>
                            {sidebarOpen && <span className="text-sm tracking-tight">{item.label}</span>}
                        </button>
                    ))}
                </nav>

                <div className="p-4 mt-auto border-t border-white/5 space-y-2 bg-black/20">
                    <button 
                        onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl text-zinc-500 hover:text-white transition-all hover:bg-white/5"
                    >
                        <i className={`fa-solid fa-${theme === 'dark' ? 'sun' : 'moon'} text-lg w-6`}></i>
                        {sidebarOpen && <span className="text-sm font-bold">{theme === 'dark' ? 'Visual Claro' : 'Visual Escuro'}</span>}
                    </button>
                    <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-black transition-all hover:bg-white/5 ${activeTab === 'settings' ? 'text-emerald-400' : 'text-zinc-500'}`}>
                        <i className="fa-solid fa-gear text-lg w-6"></i>
                        {sidebarOpen && <span className="text-sm font-bold">Ajustes</span>}
                    </button>
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden lg:flex w-full items-center gap-4 p-4 rounded-2xl text-zinc-600 hover:text-white transition-all">
                        <i className={`fa-solid fa-chevron-${sidebarOpen ? 'left' : 'right'} text-lg w-6`}></i>
                        {sidebarOpen && <span className="text-[10px] uppercase font-black tracking-widest">Recolher</span>}
                    </button>
                </div>
            </aside>

            {/* Main Area */}
            <div className="flex-1 flex flex-col relative overflow-hidden">
                
                {/* Header Superior Mobile & Desktop */}
                <header className="h-24 glass-obsidian border-b border-white/5 flex items-center justify-between px-8 shrink-0 z-50">
                    <div className="flex items-center gap-6">
                        <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center">
                            <i className="fa-solid fa-bars"></i>
                        </button>
                        <div>
                            <h2 className="text-2xl font-black tracking-tighter uppercase italic neon-emerald">
                                {navItems.find(i => i.id === activeTab)?.label || 'Painel'}
                            </h2>
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Ambiente de Estudo Monitorado</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex flex-col items-end mr-4">
                            <span className="text-xs font-black text-white">DR. GABRIEL</span>
                            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Status: Super Hunter</span>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-br from-zinc-700 to-zinc-900 rounded-full border border-white/10 flex items-center justify-center overflow-hidden shadow-xl">
                             <i className="fa-solid fa-user text-zinc-500"></i>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto planner-scroll relative">
                    {/* Background Glows */}
                    <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] pointer-events-none rounded-full animate-pulse"></div>
                    <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] pointer-events-none rounded-full"></div>

                    {activeTab === 'settings' ? (
                        <div className="p-6 lg:p-12 max-w-5xl mx-auto animate-in slide-in-from-bottom-10">
                            <div className="glass-obsidian p-10 rounded-[3rem] border border-white/5 shadow-2xl">
                                <h2 className="text-4xl font-black mb-10 tracking-tight neon-emerald italic">Configurações</h2>
                                <div className="space-y-10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest ml-1">Chave API Gemini</label>
                                            <input type="password" value={aiConfig.apiKey} onChange={e => setAiConfig({...aiConfig, apiKey: e.target.value})} className="w-full p-6 bg-black/40 border border-white/10 rounded-2xl font-black focus:border-emerald-500 outline-none transition-all" placeholder="sk-..." />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest ml-1">Modelo da IA (Dinâmico)</label>
                                            <select 
                                                value={aiConfig.model} 
                                                onChange={e => setAiConfig({...aiConfig, model: e.target.value})} 
                                                className="w-full p-6 bg-black/40 border border-white/10 rounded-2xl font-black focus:border-emerald-500 outline-none transition-all appearance-none text-white"
                                            >
                                                {availableModels.length > 0 ? (
                                                    availableModels.map(m => (
                                                        <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
                                                    ))
                                                ) : (
                                                    <option value={aiConfig.model}>{aiConfig.model} (Buscando...)</option>
                                                )}
                                            </select>
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
                                        <button onClick={() => syncFromGist(true)} className="w-full py-5 premium-btn rounded-xl font-black shadow-xl">Sincronizar Agora</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : Component ? (
                        <div className="animate-in fade-in duration-500 min-h-full">
                            <Component 
                                db={db} setDb={setDb} 
                                showAlert={showAlert} callIA={callIA} 
                                aiConfig={aiConfig} setLightbox={setLightbox} 
                                fluxogramaPlay={fluxogramaPlay} setFluxogramaPlay={setFluxogramaPlay} 
                                setActiveTab={setActiveTab} directSimulado={directSimulado}
                                setDirectSimulado={setDirectSimulado}
                            />
                        </div>
                    ) : (
                        /* DASHBOARD REAL E MODERNO */
                        <div className="p-6 lg:p-16 max-w-[1600px] mx-auto animate-in fade-in duration-1000 space-y-16">
                            
                            {/* Seção de Resumo de Performance */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[
                                    { label: 'ERROS FIXADOS', val: stats.totalErrors, icon: 'shield-virus', color: 'emerald', spark: [30, 45, 35, 60, 55, 80] },
                                    { label: 'FLASHCARDS ATIVOS', val: stats.activeFlashcards, icon: 'clone', color: 'indigo', spark: [50, 40, 60, 50, 70, 65] },
                                    { label: 'FLUXOGRAMAS OK', val: stats.completedFlux, icon: 'diagram-project', color: 'amber', spark: [20, 30, 25, 40, 35, 50] },
                                    { label: 'EFICIÊNCIA IA', val: `${stats.efficiency}%`, icon: 'bolt-lightning', color: 'rose', spark: [80, 82, 78, 85, 84, 88] }
                                ].map(s => (
                                    <div key={s.label} className="glass-obsidian p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden group hover:scale-[1.02] transition-all">
                                        <div className={`w-12 h-12 bg-${s.color}-500/10 text-${s.color}-500 rounded-xl flex items-center justify-center mb-6`}>
                                            <i className={`fa-solid fa-${s.icon} text-xl`}></i>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{s.label}</p>
                                                <h4 className="text-3xl font-black mt-1 tracking-tighter">{s.val}</h4>
                                            </div>
                                            {/* Mini Sparkline SVG */}
                                            <svg className="w-20 h-10 overflow-visible">
                                                <path 
                                                    d={`M 0 40 ${s.spark.map((v, i) => `L ${(i / (s.spark.length - 1)) * 80} ${40 - (v / 2)}`).join(' ')}`}
                                                    fill="none" stroke={`var(--tw-gradient-from, currentColor)`} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                                                    className={`text-${s.color}-500 opacity-50`}
                                                />
                                            </svg>
                                        </div>
                                        <div className={`absolute bottom-0 left-0 h-1 bg-${s.color}-500/20 w-full`}></div>
                                    </div>
                                ))}
                            </div>

                            {/* Gráfico Central e Atividade */}
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                                <div className="xl:col-span-2 glass-obsidian p-10 rounded-[3rem] border border-white/5 min-h-[400px] flex flex-col">
                                    <div className="flex justify-between items-center mb-10">
                                        <div>
                                            <h3 className="text-2xl font-black italic tracking-tighter neon-emerald">Progressão de Elite</h3>
                                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Análise de Retenção Semanal</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="px-4 py-2 bg-emerald-500/10 text-emerald-500 text-[10px] font-black rounded-lg">ATIVIDADE ALTA</span>
                                        </div>
                                    </div>
                                    
                                    {/* Gráfico Principal em SVG Custom */}
                                    <div className="flex-1 w-full relative flex items-end justify-between px-4 pb-4 border-b border-white/5">
                                        {[60, 80, 45, 90, 70, 100, 85].map((h, i) => (
                                            <div key={i} className="w-12 bg-gradient-to-t from-emerald-600/20 to-emerald-400 rounded-t-xl relative group transition-all" style={{ height: `${h}%` }}>
                                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl border border-white/5">{h}% Score</div>
                                                <div className="absolute bottom-[-30px] left-1/2 -translate-x-1/2 text-[9px] font-black text-zinc-600 uppercase tracking-widest">DIA {i+1}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="glass-obsidian p-10 rounded-[3rem] border border-white/5 flex flex-col">
                                    <h3 className="text-xl font-black mb-8 flex items-center gap-3"><i className="fa-solid fa-clock-rotate-left text-emerald-500"></i> Atividade Recente</h3>
                                    <div className="space-y-6 flex-1 overflow-y-auto planner-scroll pr-2">
                                        {(db.errors?.slice(0, 5) || []).map((err, i) => (
                                            <div key={i} className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-emerald-500/20 transition-all">
                                                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                                                    <i className="fa-solid fa-check text-emerald-500 text-xs"></i>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Questão Capturada</p>
                                                    <p className="text-xs font-bold text-zinc-300 line-clamp-1">{err.question || 'Erro sem descrição'}</p>
                                                    <p className="text-[9px] font-bold text-zinc-600 mt-1 uppercase">{err.subject || 'Geral'}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {(!db.errors || db.errors.length === 0) && (
                                            <div className="text-center py-10">
                                                <i className="fa-solid fa-ghost text-4xl text-zinc-800 mb-4"></i>
                                                <p className="text-xs font-black text-zinc-600 uppercase tracking-widest">Nenhuma atividade registrada</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Grid de Módulos (Estilo Bento Moderno) */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                {navItems.filter(i => i.id !== 'dashboard').map(item => (
                                    <div 
                                        key={item.id} onClick={() => setActiveTab(item.id)}
                                        className="bento-card p-8 rounded-[2.5rem] group cursor-pointer shadow-xl relative overflow-hidden flex flex-col items-center text-center justify-center min-h-[180px]"
                                    >
                                        <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4 text-emerald-500 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500"><i className={`fa-solid fa-${item.icon} text-xl`}></i></div>
                                        <h3 className="text-sm font-black tracking-tight">{item.label}</h3>
                                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {alertText && <div className="fixed bottom-12 right-12 glass-obsidian px-10 py-5 rounded-[2rem] font-black border border-emerald-500/30 text-emerald-400 z-[9999] shadow-2xl animate-in slide-in-from-right-10 flex items-center gap-4">
                <i className="fa-solid fa-circle-check"></i> {alertText}
            </div>}
            
            {lightbox && (
                <div onClick={() => setLightbox(null)} className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-10 animate-in fade-in">
                    <img src={lightbox} className="max-h-full rounded-[2rem] shadow-2xl border border-white/5 animate-in zoom-in duration-500" />
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
