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
    const [keyword, setKeyword] = useState('');
    const [activeTab, setActiveTab] = useState('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [alertText, setAlertText] = useState(null);
    const [lightbox, setLightbox] = useState(null);
    const [imageToEdit, setImageToEdit] = useState(null);
    const [fluxogramaPlay, setFluxogramaPlay] = useState(null);
    const [directSimulado, setDirectSimulado] = useState(null);
    const [availableModels, setAvailableModels] = useState([]);

    const showAlert = (txt) => {
        setAlertText(txt);
        setTimeout(() => setAlertText(null), 3000);
    };

    const { db, setDb, syncStatus, lastSyncTime, syncErrorMsg, syncFromGist, syncToGist } = usePersistence(
        INITIAL_DB, aiConfig.gist, 
        (newGist) => setAiConfig(p => ({ ...p, gist: newGist })), 
        showAlert
    );

    const [isOnline, setIsOnline] = useState(navigator.onLine);
    useEffect(() => {
        const h = () => setIsOnline(navigator.onLine);
        window.addEventListener('online', h);
        window.addEventListener('offline', h);
        return () => { window.removeEventListener('online', h); window.removeEventListener('offline', h); };
    }, []);

    const { callIA, getPersonaInstruction, fetchModels, isLoading: aiLoading } = useAI(aiConfig);

    useEffect(() => {
        if (aiConfig.apiKey) {
            fetchModels().then(setAvailableModels);
        }
    }, [aiConfig.apiKey, fetchModels]);

    useEffect(() => {
        if (isLoggedIn && aiConfig.gist.token && aiConfig.gist.id) {
            syncFromGist();
        }
    }, [isLoggedIn]);

    useEffect(() => {
        localStorage.setItem('caderno_ai_config', JSON.stringify(aiConfig));
    }, [aiConfig]);

    useEffect(() => {
        localStorage.setItem('caderno_db', JSON.stringify(db));
    }, [db]);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: 'house-medical' },
        { id: 'elaborador', label: 'Elaborador', icon: 'pen-nib' },
        { id: 'simulados', label: 'Simulados', icon: 'stopwatch-20' },
        { id: 'fluxogramas', label: 'Fluxogramas', icon: 'diagram-project' },
        { id: 'analise_reversa', label: 'Análise Reversa', icon: 'microscope' },
        { id: 'chat', label: 'Mentor IA', icon: 'brain' },
        { id: 'planner', label: 'Planner', icon: 'calendar-check' },
        { id: 'flashcards', label: 'Flashcards', icon: 'clone' },
        { id: 'checklists', label: 'Checklists', icon: 'list-check' },
        { id: 'insights', label: 'Insights', icon: 'lightbulb' },
        { id: 'resumos', label: 'Resumos', icon: 'file-lines' },
        { id: 'settings', label: 'Ajustes', icon: 'gear' }
    ];

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 font-sans">
                <div className="w-full max-w-lg animate-in fade-in zoom-in duration-700">
                    <div className="glass-obsidian p-12 rounded-[3rem] text-center shadow-2xl border border-white/5">
                        <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-emerald-500/20 rotate-3">
                            <i className="fa-solid fa-caduceus text-5xl text-zinc-950"></i>
                        </div>
                        <h1 className="text-4xl font-black text-white mb-2 tracking-tighter uppercase neon-emerald">CADERNO <span className="text-white opacity-40 font-black">PRO</span></h1>
                        <p className="text-zinc-500 font-black mb-12 text-[10px] tracking-[0.3em] uppercase">Elite Medical Performance</p>
                        
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
                                            showAlert("Sincronizando Nuvem...");
                                        } else { showAlert("Acesso Negado"); }
                                    }
                                }}
                                placeholder="CHAVE DE ACESSO"
                                className="w-full p-6 bg-black/40 rounded-2xl border border-white/5 outline-none text-center font-black text-white focus:border-emerald-500 transition-all placeholder:text-zinc-800"
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
                                        showAlert("Sincronizando Nuvem...");
                                    } else { showAlert("Acesso Negado"); }
                                }}
                                className="w-full py-6 premium-btn rounded-2xl font-black text-lg tracking-widest"
                            >
                                DESBLOQUEAR
                            </button>
                        </div>
                    </div>
                </div>
                {alertText && <div className="fixed bottom-12 left-1/2 -translate-x-1/2 glass-obsidian px-10 py-5 rounded-[2rem] font-black border border-emerald-500/30 text-emerald-400 z-[9999] shadow-2xl">{alertText}</div>}
            </div>
        );
    }

    const stats = {
        totalErrors: db.errors?.length || 0,
        activeFlashcards: db.flashcards?.length || 0,
        completedFlux: db.fluxogramas?.filter(f => f.completed)?.length || 0,
        efficiency: db.errors?.length > 0 ? Math.round((db.errors.filter(e => (e.history?.correct || 0) > (e.history?.wrong || 0)).length / db.errors.length) * 100) : 0
    };

    const Component = {
        elaborador: ElaboradorTab,
        simulados: SimuladosTab,
        fluxogramas: FluxogramasTab,
        analise_reversa: ReverseAnalysisTab,
        chat: MentorIATab,
        planner: PlannerTab,
        flashcards: FlashcardsTab,
        checklists: ChecklistsTab,
        insights: InsightsTab,
        resumos: ResumosHtmlTab
    }[activeTab];

    const SyncPanel = () => (
        <div className="p-4 bg-zinc-900/50 rounded-2xl border border-white/5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{isOnline ? 'Conectado' : 'Offline'}</span>
                </div>
                <span className="text-[9px] font-bold text-zinc-600 uppercase">{lastSyncTime ? `Sinc: ${lastSyncTime.toLocaleTimeString()}` : 'Sem Sinc'}</span>
            </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <i className={`fa-solid fa-${syncStatus === 'syncing' || syncStatus === 'connecting' ? 'rotate fa-spin' : syncStatus === 'error' ? 'circle-exclamation text-red-500' : 'cloud-check text-emerald-500'} text-xs`}></i>
                    <span className="text-[10px] font-black text-zinc-400 uppercase">{syncStatus === 'syncing' ? 'Sincronizando' : syncStatus === 'error' ? 'Erro de Sinc' : 'Nuvem OK'}</span>
                </div>
                <button onClick={() => syncFromGist(true)} className="text-zinc-600 hover:text-emerald-500 transition-colors"><i className="fa-solid fa-arrows-rotate text-xs"></i></button>
            </div>
            {syncErrorMsg && <p className="text-[8px] text-red-500/50 font-bold truncate italic">{syncErrorMsg}</p>}
        </div>
    );

    return (
        <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
            
            {/* SIDEBAR PRO */}
            <aside className={`fixed lg:relative h-full flex flex-col transition-all duration-500 z-[1001] ${sidebarOpen ? 'w-80' : 'w-24'} glass-obsidian border-r border-white/5`}>
                <div className="p-8 flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20 rotate-3">
                        <i className="fa-solid fa-caduceus text-zinc-950 text-xl font-black"></i>
                    </div>
                    {sidebarOpen && (
                        <div className="animate-in fade-in slide-in-from-left-4">
                            <h1 className="font-black text-xl tracking-tighter neon-emerald leading-tight">CADERNO <span className="text-white">PRO</span></h1>
                            <p className="text-[9px] font-black tracking-[0.2em] text-zinc-500 uppercase">Elite Assistant</p>
                        </div>
                    )}
                </div>

                <nav className="flex-1 px-4 space-y-2 overflow-y-auto planner-scroll">
                    {navItems.map(item => (
                        <button 
                            key={item.id} 
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all group relative ${activeTab === item.id ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-lg' : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'}`}
                        >
                            <i className={`fa-solid fa-${item.icon} text-lg w-6 shrink-0 ${activeTab === item.id ? 'text-emerald-400' : 'group-hover:scale-110 transition-transform'}`}></i>
                            {sidebarOpen && <span className="font-bold text-sm tracking-tight">{item.label}</span>}
                            {activeTab === item.id && <div className="absolute right-4 w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,1)]"></div>}
                        </button>
                    ))}
                </nav>

                <div className="p-6 border-t border-white/5 space-y-4">
                    {sidebarOpen && <SyncPanel />}
                    <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-black transition-all hover:bg-white/5 ${activeTab === 'settings' ? 'text-emerald-400 bg-emerald-500/5' : 'text-zinc-500'}`}>
                        <i className="fa-solid fa-gear text-lg w-6"></i>
                        {sidebarOpen && <span className="text-sm font-bold">Ajustes</span>}
                    </button>
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-full py-4 bg-zinc-900/50 hover:bg-zinc-800 rounded-2xl text-zinc-400 transition-all flex items-center justify-center">
                        <i className={`fa-solid fa-angle-${sidebarOpen ? 'left' : 'right'} text-xl`}></i>
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col relative overflow-hidden">
                {/* HEADER */}
                <header className="h-24 border-b border-white/5 flex items-center justify-between px-12 backdrop-blur-md sticky top-0 z-40 bg-zinc-950/80">
                    <div className="flex items-center gap-6">
                        <h2 className="text-2xl font-black italic tracking-tighter text-zinc-300 capitalize">{activeTab.replace('_', ' ')}</h2>
                        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                            <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? (syncStatus === 'syncing' ? 'bg-amber-500 animate-spin' : 'bg-emerald-500') : 'bg-red-500'}`}></div>
                            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{isOnline ? (syncStatus === 'syncing' ? 'Sincronizando' : 'Cloud OK') : 'Offline'}</span>
                        </div>
                        {aiLoading && <div className="flex items-center gap-3 px-4 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/20"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,1)]"></div><span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">IA Analisando...</span></div>}
                    </div>
                    <div className="flex items-center gap-8">
                        <div className="hidden md:flex flex-col items-end">
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Performance</span>
                            <span className="text-sm font-black text-emerald-500 tracking-tighter">HUNTER LEVEL 12</span>
                        </div>
                        <div className="w-12 h-12 bg-zinc-900 border border-white/5 rounded-2xl flex items-center justify-center text-zinc-400"><i className="fa-solid fa-user-doctor"></i></div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto planner-scroll">
                    {activeTab === 'settings' ? (
                        <div className="p-12 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                            <div className="glass-obsidian p-10 rounded-[3rem] border border-white/5 space-y-12">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-3xl font-black italic tracking-tighter neon-emerald">Configurações</h2>
                                    <button onClick={() => syncToGist(true)} className="premium-btn"><i className="fa-solid fa-cloud-arrow-up mr-2"></i> Backup Global</button>
                                </div>
                                <div className="grid grid-cols-1 gap-8">
                                    <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 space-y-6">
                                        <h3 className="font-black text-xl flex items-center gap-3"><i className="fa-solid fa-key text-emerald-500"></i> Inteligência Artificial</h3>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest ml-1">Chave API Gemini</label>
                                            <input type="password" value={aiConfig.apiKey} onChange={e => setAiConfig({...aiConfig, apiKey: e.target.value})} className="w-full p-6 bg-black/40 border border-white/10 rounded-2xl font-black focus:border-emerald-500 outline-none transition-all text-white" placeholder="Coloque sua chave aqui..." />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest ml-1">Modelo de Processamento</label>
                                            <select 
                                                value={aiConfig.model} 
                                                onChange={e => setAiConfig({...aiConfig, model: e.target.value})} 
                                                className="w-full p-6 bg-black/40 border border-white/10 rounded-2xl font-black focus:border-emerald-500 outline-none transition-all appearance-none text-white"
                                            >
                                                {availableModels.length > 0 ? (
                                                    availableModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)
                                                ) : <option value={aiConfig.model}>{aiConfig.model}</option>}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="p-8 bg-emerald-500/5 rounded-[2.5rem] border border-emerald-500/20 space-y-6">
                                        <h3 className="font-black text-xl flex items-center gap-3 text-emerald-400"><i className="fa-solid fa-cloud"></i> Sincronização em Nuvem (Gist)</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <input type="password" value={aiConfig.gist.token} onChange={e => setAiConfig({...aiConfig, gist: {...aiConfig.gist, token: e.target.value}})} className="w-full p-4 bg-black/40 border border-white/5 rounded-xl text-xs font-bold" placeholder="GitHub Token" />
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
                        /* DASHBOARD PRO */
                        <div className="p-12 lg:p-20 max-w-[1600px] mx-auto animate-in fade-in duration-1000 space-y-20">
                            
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                {[
                                    { label: 'QUESTÕES TOTAIS', val: stats.totalErrors, icon: 'shield-virus', color: 'emerald', spark: [30, 45, 35, 60, 55, 80] },
                                    { label: 'FLASHCARDS ATIVOS', val: stats.activeFlashcards, icon: 'clone', color: 'indigo', spark: [50, 40, 60, 50, 70, 65] },
                                    { label: 'FLUXOGRAMAS OK', val: stats.completedFlux, icon: 'diagram-project', color: 'amber', spark: [20, 30, 25, 40, 35, 50] },
                                    { label: 'EFICIÊNCIA IA', val: `${stats.efficiency}%`, icon: 'bolt-lightning', color: 'rose', spark: [80, 82, 78, 85, 84, 88] }
                                ].map(s => (
                                    <div key={s.label} className="glass-obsidian p-10 rounded-[3rem] border border-white/5 relative overflow-hidden group hover:scale-[1.02] transition-all">
                                        <div className={`w-14 h-14 bg-${s.color}-500/10 text-${s.color}-500 rounded-2xl flex items-center justify-center mb-8`}>
                                            <i className={`fa-solid fa-${s.icon} text-2xl`}></i>
                                        </div>
                                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2">{s.label}</p>
                                        <h4 className="text-4xl font-black tracking-tighter">{s.val}</h4>
                                        <div className={`absolute bottom-0 left-0 h-1.5 bg-${s.color}-500/20 w-full`}></div>
                                    </div>
                                ))}
                            </div>

                            {/* Charts Section */}
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                                <div className="xl:col-span-2 glass-obsidian p-12 rounded-[4rem] border border-white/5 min-h-[500px] flex flex-col">
                                    <div className="flex justify-between items-center mb-12">
                                        <div>
                                            <h3 className="text-3xl font-black italic tracking-tighter neon-emerald">Atividade Semanal</h3>
                                            <p className="text-xs font-black text-zinc-500 uppercase tracking-widest mt-2">Volume de Erros Fixados</p>
                                        </div>
                                        <button onClick={() => setActiveTab('elaborador')} className="premium-btn text-xs py-2 px-6">CAPTURAR NOVA</button>
                                    </div>
                                    <div className="flex-1 flex items-end justify-between gap-6 px-4 pb-8 border-b border-white/5">
                                        {[40, 70, 45, 90, 65, 100, 85].map((h, i) => (
                                            <div key={i} className="flex-1 bg-gradient-to-t from-emerald-600/20 to-emerald-400 rounded-2xl relative group transition-all" style={{ height: `${h}%`, minHeight: '10%' }}>
                                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-[10px] font-black px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-2xl border border-white/5 whitespace-nowrap">{h} Pontos</div>
                                                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-[10px] font-black text-zinc-600 uppercase">DIA {i+1}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="glass-obsidian p-12 rounded-[4rem] border border-white/5 flex flex-col">
                                    <h3 className="text-xl font-black mb-10 flex items-center gap-3"><i className="fa-solid fa-fire-flame-curved text-orange-500"></i> Tendências Atuais</h3>
                                    <div className="space-y-8 flex-1 overflow-y-auto planner-scroll pr-2">
                                        {db.errors?.slice(0, 5).map((err, i) => (
                                            <div key={i} className="flex gap-5 p-5 rounded-3xl bg-white/5 border border-white/5 hover:border-emerald-500/30 transition-all group">
                                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-all"><i className="fa-solid fa-check text-emerald-500"></i></div>
                                                <div>
                                                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">{err.subject || 'Geral'}</p>
                                                    <p className="text-sm font-bold text-zinc-300 line-clamp-1 italic">{err.title || 'Nova Questão'}</p>
                                                    <p className="text-[9px] font-black text-zinc-600 mt-2 uppercase">{err.date}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Module Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-8 pb-10">
                                {navItems.filter(n => n.id !== 'dashboard' && n.id !== 'settings').map(item => (
                                    <button 
                                        key={item.id} onClick={() => setActiveTab(item.id)}
                                        className="bento-card aspect-square flex flex-col items-center justify-center gap-6 group hover:border-emerald-500/40"
                                    >
                                        <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-500"><i className={`fa-solid fa-${item.icon} text-2xl`}></i></div>
                                        <span className="font-black text-xs uppercase tracking-widest">{item.label}</span>
                                    </button>
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
                    <img src={lightbox} className="max-h-full rounded-[3rem] shadow-2xl border border-white/5 animate-in zoom-in duration-500" />
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
