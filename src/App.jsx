import React, { useState, useEffect } from 'react';
import { usePersistence } from './hooks/usePersistence';
import { useAI } from './hooks/useAI';
import FluxogramasTab from './components/Fluxogramas/FluxogramasTab.jsx';
import ElaboradorTab from './components/Elaborador/ElaboradorTab.jsx';
import ChecklistsTab from './components/Checklists/ChecklistsTab.jsx';
import GamesTab from './components/Games/GamesTab.jsx';
import ResumosHtmlTab from './components/ResumosHtml/ResumosHtmlTab.jsx';

const DEFAULT_SUBJECTS = [
    { id: 'cli', name: 'Clínica Médica', color: 'emerald' },
    { id: 'cir', name: 'Cirurgia Geral', color: 'blue' },
    { id: 'ped', name: 'Pediatria', color: 'amber' },
    { id: 'go', name: 'Ginecologia e Obstetrícia', color: 'rose' },
    { id: 'prev', name: 'Medicina Preventiva', color: 'indigo' }
];

const INITIAL_DB = {
    errors: [],
    subjects: DEFAULT_SUBJECTS,
    perceptions: [],
    exams: [],
    fac: [],
    simuladoHistory: [],
    flashcards: [],
    games: [],
    weeks: [],
    checklists: [],
    summaries: [],
    summariesHtml: [],
    dailyStats: {},
    darkMode: true
};

function App() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [gistConfig, setGistConfig] = useState(() => JSON.parse(localStorage.getItem('gist_config')) || { token: '', id: '', autoSync: false });
    const [aiConfig, setAiConfig] = useState(() => JSON.parse(localStorage.getItem('ai_config')) || { key: '', model: 'gemini-2.0-flash', persona: 'amigavel' });
    const [keyword, setKeyword] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [lightbox, setLightbox] = useState(null);
    const [fluxogramaPlay, setFluxogramaPlay] = useState(null);

    const { db, setDb, syncStatus, syncFromGist } = usePersistence(INITIAL_DB, gistConfig, setGistConfig, (msg) => console.log(msg));
    const { callIA } = useAI(aiConfig);

    useEffect(() => {
        localStorage.setItem('gist_config', JSON.stringify(gistConfig));
    }, [gistConfig]);

    useEffect(() => {
        localStorage.setItem('ai_config', JSON.stringify(aiConfig));
    }, [aiConfig]);

    const handleLogin = () => {
        if (keyword === 'Gabriel') {
            setIsLoggedIn(true);
        } else {
            alert("Palavra-chave incorreta.");
        }
    };

    if (!isLoggedIn) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-zinc-950 p-6">
                <div className="w-full max-w-md p-10 bg-zinc-900 rounded-[40px] border border-zinc-800 shadow-2xl animate-in zoom-in-95 duration-500">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mb-8 mx-auto border border-emerald-500/20">
                        <i className="fa-solid fa-user-shield text-3xl text-emerald-500"></i>
                    </div>
                    <h1 className="text-3xl font-black text-white mb-2 text-center tracking-tighter">CADERNO <span className="text-emerald-500">IA</span></h1>
                    <p className="text-zinc-500 text-sm font-bold text-center mb-8 uppercase tracking-widest">Acesso Restrito Preceptoria</p>
                    
                    <div className="space-y-4">
                        <input 
                            type="password" 
                            value={keyword} 
                            onChange={e => setKeyword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleLogin()}
                            placeholder="Palavra-chave" 
                            className="w-full p-5 bg-zinc-950 border border-zinc-800 rounded-2xl text-white font-bold text-center outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-inner"
                        />
                        <button 
                            onClick={handleLogin}
                            className="w-full py-5 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-500 active:scale-95 transition-all shadow-lg shadow-emerald-900/20"
                        >
                            AUTENTICAR
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const renderTab = () => {
        switch (activeTab) {
            case 'fluxogramas':
                return <FluxogramasTab db={db} setDb={setDb} showAlert={alert} callIA={callIA} setLightbox={setLightbox} fluxogramaPlay={fluxogramaPlay} setFluxogramaPlay={setFluxogramaPlay} />;
            case 'elaborador':
                return <ElaboradorTab db={db} setDb={setDb} showAlert={alert} setActiveTab={setActiveTab} callIA={callIA} aiConfig={aiConfig} />;
            case 'checklists':
                return <ChecklistsTab db={db} setDb={setDb} showAlert={alert} />;
            case 'games':
                return <GamesTab db={db} setDb={setDb} showAlert={alert} setLightbox={setLightbox} callIA={callIA} />;
            case 'resumos':
                return <ResumosHtmlTab db={db} setDb={setDb} showAlert={alert} callIA={callIA} />;
            default:
                return (
                    <div className="p-10">
                        <h2 className="text-3xl font-black mb-6">Dashboard</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <button onClick={() => setActiveTab('fluxogramas')} className="p-8 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-lg text-left hover:scale-[1.02] transition-all">
                                <i className="fa-solid fa-diagram-project text-3xl text-blue-500 mb-4"></i>
                                <h3 className="text-xl font-black">Fluxogramas</h3>
                                <p className="text-zinc-500 text-sm">Treino ativo de condutas médicas.</p>
                            </button>
                            <button onClick={() => setActiveTab('elaborador')} className="p-8 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-lg text-left hover:scale-[1.02] transition-all">
                                <i className="fa-solid fa-wand-magic-sparkles text-3xl text-amber-500 mb-4"></i>
                                <h3 className="text-xl font-black">Elaborador</h3>
                                <p className="text-zinc-500 text-sm">Geração de simulados por IA.</p>
                            </button>
                            <button onClick={() => setActiveTab('checklists')} className="p-8 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-lg text-left hover:scale-[1.02] transition-all">
                                <i className="fa-solid fa-list-check text-3xl text-emerald-500 mb-4"></i>
                                <h3 className="text-xl font-black">Checklists</h3>
                                <p className="text-zinc-500 text-sm">Protocolos clínicos passo-a-passo.</p>
                            </button>
                            <button onClick={() => setActiveTab('games')} className="p-8 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-lg text-left hover:scale-[1.02] transition-all">
                                <i className="fa-solid fa-gamepad text-3xl text-indigo-500 mb-4"></i>
                                <h3 className="text-xl font-black">Memory Games</h3>
                                <p className="text-zinc-500 text-sm">Memorização ativa por associação.</p>
                            </button>
                            <button onClick={() => setActiveTab('resumos')} className="p-8 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-lg text-left hover:scale-[1.02] transition-all">
                                <i className="fa-solid fa-file-code text-3xl text-rose-500 mb-4"></i>
                                <h3 className="text-xl font-black">Resumos HTML</h3>
                                <p className="text-zinc-500 text-sm">Material denso e formatado por IA.</p>
                            </button>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            <header className="px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                <h1 className="text-xl font-black tracking-tighter" onClick={() => setActiveTab('dashboard')}>CADERNO <span className="text-emerald-500">IA</span></h1>
                <div className="flex gap-4">
                    <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 text-zinc-400'}`}>
                        {syncStatus}
                    </span>
                    <button onClick={() => syncFromGist(true)} className="text-zinc-400 hover:text-emerald-500 transition-colors">
                        <i className="fa-solid fa-rotate"></i>
                    </button>
                </div>
            </header>
            <main className="flex-1 overflow-y-auto">
                {renderTab()}
            </main>
            {lightbox && (
                <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-10" onClick={() => setLightbox(null)}>
                    <img src={lightbox} className="max-w-full max-h-full object-contain shadow-2xl" />
                </div>
            )}
        </div>
    );
}

export default App;
