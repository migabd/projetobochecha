import React, { useState, useEffect } from 'react';
import { usePersistence } from './hooks/usePersistence';
import { useAI } from './hooks/useAI';
import FluxogramasTab from './components/Fluxogramas/FluxogramasTab';
import ElaboradorTab from './components/Elaborador/ElaboradorTab';

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
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [lightbox, setLightbox] = useState(null);

    const { db, setDb, syncStatus, syncFromGist } = usePersistence(INITIAL_DB, gistConfig, setGistConfig, (msg) => console.log(msg));
    const { callIA } = useAI(aiConfig);

    useEffect(() => {
        localStorage.setItem('gist_config', JSON.stringify(gistConfig));
    }, [gistConfig]);

    useEffect(() => {
        localStorage.setItem('ai_config', JSON.stringify(aiConfig));
    }, [aiConfig]);

    if (!isLoggedIn) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-zinc-950">
                <div className="p-8 bg-zinc-900 rounded-3xl border border-zinc-800 shadow-2xl">
                    <h1 className="text-2xl font-black text-white mb-6">Caderno de Elite</h1>
                    <button 
                        onClick={() => setIsLoggedIn(true)}
                        className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-500 transition-all"
                    >
                        Entrar
                    </button>
                </div>
            </div>
        );
    }

    const renderTab = () => {
        switch (activeTab) {
            case 'fluxogramas':
                return <FluxogramasTab db={db} setDb={setDb} showAlert={alert} callIA={callIA} setLightbox={setLightbox} />;
            case 'elaborador':
                return <ElaboradorTab db={db} setDb={setDb} showAlert={alert} setActiveTab={setActiveTab} callIA={callIA} aiConfig={aiConfig} />;
            default:
                return (
                    <div className="p-10">
                        <h2 className="text-3xl font-black mb-6">Dashboard</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <button onClick={() => setActiveTab('fluxogramas')} className="p-8 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-lg text-left">
                                <i className="fa-solid fa-diagram-project text-3xl text-blue-500 mb-4"></i>
                                <h3 className="text-xl font-black">Fluxogramas</h3>
                                <p className="text-zinc-500 text-sm">Treino ativo de condutas médicas.</p>
                            </button>
                            <button onClick={() => setActiveTab('elaborador')} className="p-8 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-lg text-left">
                                <i className="fa-solid fa-wand-magic-sparkles text-3xl text-amber-500 mb-4"></i>
                                <h3 className="text-xl font-black">Elaborador</h3>
                                <p className="text-zinc-500 text-sm">Geração de simulados por IA.</p>
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
