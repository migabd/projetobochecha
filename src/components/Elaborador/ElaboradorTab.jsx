import React, { useState, useEffect, useMemo } from 'react';

const KILL_STREAKS = ["FIRST BLOOD", "DOUBLE KILL", "TRIPLE KILL", "QUADRA KILL", "PENTA KILL", "GODLIKE", "LEGENDARY", "UNSTOPPABLE"];

const ElaboradorTab = ({ db, setDb, showAlert, callIA, aiConfig }) => {
    const [view, setView] = useState('menu'); // menu, sim, results
    const [simQty, setSimQty] = useState(10);
    const [simFilters, setSimFilters] = useState({ subj: [], tag: 'ALL', exam: 'ALL' });
    const [cebraspeMode, setCebraspeMode] = useState(false);
    
    const [currentDeck, setCurrentDeck] = useState([]);
    const [curIdx, setCurIdx] = useState(0);
    const [selAlt, setSelAlt] = useState(null);
    const [showAns, setShowAns] = useState(false);
    const [streak, setStreak] = useState(0);
    const [killAnim, setKillAnim] = useState(null);
    const [results, setResults] = useState([]);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [timerActive, setTimerActive] = useState(false);

    // IA State
    const [aiExplaining, setAiExplaining] = useState(false);
    const [aiExplanation, setAiExplanation] = useState('');
    const [isAiChatting, setIsAiChatting] = useState(false);
    const [aiChatMessages, setAiChatMessages] = useState([]);
    const [crossedAlts, setCrossedAlts] = useState([]);
    const [highlightedText, setHighlightedText] = useState('');

    // Timer Logic
    useEffect(() => {
        let interval;
        if (timerActive) {
            interval = setInterval(() => setTimeElapsed(prev => prev + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [timerActive]);

    const formatTime = (sec) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const generateDeck = () => {
        let pool = [...db.errors];
        
        if (simFilters.tag === 'ERROS') pool = pool.filter(e => (e.history?.wrong || 0) > 0);
        else if (simFilters.tag === 'NOVAS') pool = pool.filter(e => (e.history?.correct || 0) === 0 && (e.history?.wrong || 0) === 0);
        
        if (simFilters.subj.length > 0) pool = pool.filter(e => simFilters.subj.includes(e.subject));
        if (simFilters.exam !== 'ALL') pool = pool.filter(e => e.examId === simFilters.exam);

        if (pool.length === 0) {
            showAlert("Nenhuma questão encontrada com esses filtros.");
            return null;
        }

        return pool.sort(() => Math.random() - 0.5).slice(0, simQty);
    };

    const startSim = () => {
        const deck = generateDeck();
        if (!deck) return;
        setCurrentDeck(deck);
        setCurIdx(0);
        setSelAlt(null);
        setShowAns(false);
        setResults([]);
        setStreak(0);
        setTimeElapsed(0);
        setTimerActive(true);
        setView('sim');
    };

    const handleAnswer = (letter) => {
        if (showAns) return;
        const q = currentDeck[curIdx];
        const isCorrect = letter === q.correctAlternative;

        setSelAlt(letter);
        setShowAns(true);
        setTimerActive(false);
        
        if (isCorrect) {
            const newStreak = streak + 1;
            setStreak(newStreak);
            const anim = KILL_STREAKS[Math.min(newStreak - 1, KILL_STREAKS.length - 1)];
            setKillAnim(anim);
            setTimeout(() => setKillAnim(null), 2000);
        } else {
            setStreak(0);
        }

        const resObj = { id: q.id, isCorrect, userAns: letter, timeSpent: timeElapsed };
        setResults(prev => [...prev, resObj]);

        // Update DB History
        setDb(prev => ({
            ...prev,
            errors: prev.errors.map(e => e.id === q.id ? { ...e, history: { correct: (e.history?.correct || 0) + (isCorrect ? 1 : 0), wrong: (e.history?.wrong || 0) + (isCorrect ? 0 : 1) } } : e)
        }));
    };

    const nextQuestion = () => {
        if (curIdx + 1 < currentDeck.length) {
            setCurIdx(curIdx + 1);
            setSelAlt(null);
            setShowAns(false);
            setAiExplanation('');
            setIsAiChatting(false);
            setAiChatMessages([]);
            setCrossedAlts([]);
            setHighlightedText('');
            setTimeElapsed(0);
            setTimerActive(true);
        } else {
            setTimerActive(false);
            setView('results');
        }
    };

    const handleAITool = async (mode) => {
        const q = currentDeck[curIdx];
        setAiExplaining(true);
        setAiExplanation('');
        
        let prompt = "";
        if (mode === 'explain') prompt = `Explique didaticamente por que a alternativa ${q.correctAlternative} é a correta e por que as outras estão erradas. Use bullet points.`;
        if (mode === 'mnemonic') prompt = `Crie uma mnemônica infalível e criativa para memorizar o conceito principal desta questão.`;
        if (mode === 'summary') prompt = `Faça um resumo flash (ponto-chave) do tema abordado nesta questão para revisão rápida.`;
        if (mode === 'pitfalls') prompt = `Quais são as principais pegadinhas e distratores que as bancas costumam usar neste tema?`;

        const fullPrompt = `${prompt}\n\nQUESTÃO: ${q.question}\nGABARITO: ${q.correctAlternative}`;
        const r = await callIA([{ role: 'user', parts: [{ text: fullPrompt }] }]);
        setAiExplanation(r || "Falha ao obter resposta.");
        setAiExplaining(false);
    };

    const handleHighlight = () => {
        const selection = window.getSelection().toString();
        if (!selection) return;
        const qText = currentDeck[curIdx].question;
        const highlighted = qText.replace(selection, `<mark class="bg-yellow-400/40 text-inherit rounded-sm px-1">${selection}</mark>`);
        setHighlightedText(highlighted);
    };

    if (view === 'menu') {
        return (
            <div className="p-10 max-w-6xl mx-auto space-y-12 animate-in fade-in duration-700">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    <div>
                        <h2 className="text-6xl font-black italic tracking-tighter neon-emerald uppercase">Elaborador <span className="text-white/20">DE ELITE</span></h2>
                        <p className="text-zinc-500 font-bold mt-2 uppercase tracking-[0.2em] text-xs">Simulador de alta performance com Mentor IA integrado.</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="glass-obsidian p-6 rounded-3xl border border-white/5 text-center min-w-[140px]">
                            <span className="block text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Questões</span>
                            <span className="text-3xl font-black">{db.errors.length}</span>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bento-card p-10 rounded-[3.5rem] space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Volume do Treino</label>
                                <div className="grid grid-cols-4 gap-3">
                                    {[5, 10, 20, 50].map(n => (
                                        <button key={n} onClick={() => setSimQty(n)} className={`py-4 rounded-2xl font-black transition-all ${simQty === n ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-white/5 text-zinc-500 hover:text-white'}`}>{n}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-6">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Modo Cebraspe</label>
                                <button 
                                    onClick={() => setCebraspeMode(!cebraspeMode)}
                                    className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all ${cebraspeMode ? 'bg-rose-600/20 border border-rose-500/50 text-rose-500' : 'bg-white/5 text-zinc-500 border border-transparent'}`}
                                >
                                    <i className={`fa-solid ${cebraspeMode ? 'fa-toggle-on' : 'fa-toggle-off'} text-xl`}></i>
                                    {cebraspeMode ? 'ATIVADO (-1 p/ erro)' : 'DESATIVADO (Padrão)'}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Filtros de Especialidade</label>
                            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-4 bg-black/20 rounded-2xl border border-white/5 custom-scroll">
                                {db.subjects.map(s => (
                                    <button 
                                        key={s.id} 
                                        onClick={() => setSimFilters(p => ({...p, subj: p.subj.includes(s.id) ? p.subj.filter(x => x !== s.id) : [...p.subj, s.id]}))}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${simFilters.subj.includes(s.id) ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' : 'bg-white/5 text-zinc-500'}`}
                                    >
                                        {s.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button onClick={startSim} className="w-full py-7 premium-btn rounded-[2.5rem] font-black text-2xl shadow-2xl flex items-center justify-center gap-4">
                            <i className="fa-solid fa-play"></i> DECOLAR TREINO
                        </button>
                    </div>

                    <div className="space-y-8">
                        <div className="bento-card p-10 rounded-[3.5rem] bg-emerald-500/5 border border-emerald-500/10">
                            <h3 className="text-xl font-black mb-6 flex items-center gap-3"><i className="fa-solid fa-bolt text-yellow-500"></i> Dica de Hoje</h3>
                            <p className="text-sm text-zinc-400 leading-relaxed font-medium italic">"A repetição espaçada é o segredo da memória de longo prazo. Foque nos temas com mais erros primeiro."</p>
                        </div>
                        <div className="bento-card p-10 rounded-[3.5rem] border border-white/5">
                            <h3 className="text-xl font-black mb-6 flex items-center gap-3"><i className="fa-solid fa-chart-pie text-sky-500"></i> Performance</h3>
                            <div className="space-y-4">
                                {db.simuladoHistory?.slice(0,3).map((h, i) => (
                                    <div key={i} className="flex justify-between items-center text-xs font-black">
                                        <span className="text-zinc-500">{h.date}</span>
                                        <span className="text-emerald-500">{Math.round((h.hits/h.total)*100)}%</span>
                                    </div>
                                ))}
                                {(!db.simuladoHistory || db.simuladoHistory.length === 0) && <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest text-center py-4">Sem histórico</p>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'sim') {
        const q = currentDeck[curIdx];
        return (
            <div className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto animate-in fade-in duration-500 relative pb-40">
                {killAnim && (
                    <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center">
                        <span className="kill-text">{killAnim}</span>
                    </div>
                )}

                <header className="flex justify-between items-center mb-12">
                    <button onClick={() => setView('menu')} className="w-14 h-14 glass-obsidian rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all border border-white/5">
                        <i className="fa-solid fa-arrow-left text-zinc-400"></i>
                    </button>
                    
                    <div className="flex gap-8 items-center bg-black/40 px-10 py-4 rounded-3xl border border-white/5 shadow-2xl">
                        <div className="text-center">
                            <span className="block text-[10px] font-black text-emerald-500 uppercase tracking-widest">Tempo</span>
                            <span className="text-2xl font-mono font-black text-white">{formatTime(timeElapsed)}</span>
                        </div>
                        <div className="w-px h-10 bg-white/10"></div>
                        <div className="text-center">
                            <span className="block text-[10px] font-black text-sky-500 uppercase tracking-widest">Questão</span>
                            <span className="text-2xl font-black text-white">{curIdx + 1}<span className="text-zinc-600">/{currentDeck.length}</span></span>
                        </div>
                        <div className="w-px h-10 bg-white/10"></div>
                        <div className="text-center">
                            <span className="block text-[10px] font-black text-yellow-500 uppercase tracking-widest">Streak</span>
                            <span className="text-2xl font-black text-yellow-500">x{streak}</span>
                        </div>
                    </div>

                    <button onClick={() => window.print()} className="w-14 h-14 glass-obsidian rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all border border-white/5">
                        <i className="fa-solid fa-print text-zinc-400"></i>
                    </button>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                    <div className="lg:col-span-8 bento-card p-10 md:p-16 rounded-[4rem] relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-zinc-800">
                            <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${((curIdx + 1) / currentDeck.length) * 100}%` }}></div>
                        </div>

                        <div className="space-y-12">
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-sm font-black text-emerald-500 uppercase tracking-[0.3em]">{q.subject}</h3>
                                    <button onClick={handleHighlight} className="text-[10px] font-black text-zinc-500 hover:text-emerald-500 transition-colors uppercase"><i className="fa-solid fa-highlighter mr-2"></i> Grifar Texto</button>
                                </div>
                                <h2 className="text-3xl font-black tracking-tight leading-tight">{q.title}</h2>
                                <p 
                                    className="text-xl text-zinc-300 font-bold leading-relaxed text-justify-custom"
                                    dangerouslySetInnerHTML={{ __html: highlightedText || q.question }}
                                ></p>
                                {q.image && <img src={q.image} className="max-h-96 rounded-3xl border border-white/5 shadow-2xl mx-auto cursor-zoom-in" alt="Material" />}
                            </div>

                            <div className="space-y-4">
                                {q.alternatives.map((alt, i) => {
                                    const letter = String.fromCharCode(65 + i);
                                    const isCorrect = letter === q.correctAlternative;
                                    const isSelected = selAlt === letter;
                                    const isCrossed = crossedAlts.includes(letter);

                                    let style = "bg-zinc-900/50 border-white/5 hover:border-white/10 hover:bg-white/5";
                                    if (showAns) {
                                        if (isCorrect) style = "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-lg shadow-emerald-500/10";
                                        else if (isSelected) style = "bg-red-500/20 border-red-500/50 text-red-400";
                                        else style = "opacity-20 border-transparent grayscale";
                                    } else if (isSelected) {
                                        style = "bg-emerald-500/10 border-emerald-500/50 text-emerald-500";
                                    } else if (isCrossed) {
                                        style = "opacity-20 line-through grayscale cursor-not-allowed";
                                    }

                                    return (
                                        <div key={i} className="flex gap-4">
                                            {!showAns && (
                                                <button 
                                                    onClick={() => setCrossedAlts(p => isCrossed ? p.filter(x => x !== letter) : [...p, letter])}
                                                    className={`w-12 rounded-2xl flex items-center justify-center transition-all ${isCrossed ? 'bg-zinc-800 text-zinc-600' : 'bg-white/5 text-zinc-700 hover:text-red-500'}`}
                                                >
                                                    <i className="fa-solid fa-strikethrough text-xs"></i>
                                                </button>
                                            )}
                                            <button 
                                                disabled={showAns || isCrossed}
                                                onClick={() => handleAnswer(letter)}
                                                className={`flex-1 p-6 rounded-[2rem] border text-left font-bold text-lg transition-all flex items-center gap-6 ${style}`}
                                            >
                                                <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black ${isSelected || (showAns && isCorrect) ? 'bg-emerald-500 text-white' : 'bg-white/5 text-zinc-400'}`}>
                                                    {letter}
                                                </span>
                                                {alt}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            {showAns && (
                                <div className="pt-10 border-t border-white/5 animate-in slide-in-from-top-6 space-y-10">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <button onClick={() => handleAITool('explain')} className="tool-btn bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-3xl flex flex-col items-center gap-3 hover:bg-emerald-500/10 transition-all group">
                                            <i className="fa-solid fa-chalkboard-user text-2xl text-emerald-500 group-hover:scale-110 transition-transform"></i>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Professor</span>
                                        </button>
                                        <button onClick={() => handleAITool('mnemonic')} className="tool-btn bg-amber-500/5 border border-amber-500/10 p-5 rounded-3xl flex flex-col items-center gap-3 hover:bg-amber-500/10 transition-all group">
                                            <i className="fa-solid fa-lightbulb text-2xl text-amber-500 group-hover:scale-110 transition-transform"></i>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Mnemônica</span>
                                        </button>
                                        <button onClick={() => handleAITool('summary')} className="tool-btn bg-sky-500/5 border border-sky-500/10 p-5 rounded-3xl flex flex-col items-center gap-3 hover:bg-sky-500/10 transition-all group">
                                            <i className="fa-solid fa-bolt text-2xl text-sky-500 group-hover:scale-110 transition-transform"></i>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Flash Resumo</span>
                                        </button>
                                        <button onClick={() => handleAITool('pitfalls')} className="tool-btn bg-rose-500/5 border border-rose-500/10 p-5 rounded-3xl flex flex-col items-center gap-3 hover:bg-rose-500/10 transition-all group">
                                            <i className="fa-solid fa-triangle-exclamation text-2xl text-rose-500 group-hover:scale-110 transition-transform"></i>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Pegadinhas</span>
                                        </button>
                                    </div>

                                    {aiExplaining && (
                                        <div className="p-10 bg-emerald-500/5 rounded-[3rem] border border-emerald-500/10 flex items-center justify-center gap-4 text-emerald-500 font-black italic animate-pulse">
                                            <i className="fa-solid fa-circle-notch fa-spin text-2xl"></i> Mentor IA está analisando...
                                        </div>
                                    )}

                                    {aiExplanation && (
                                        <div className="p-10 bg-zinc-900/50 rounded-[3rem] border border-white/5 text-zinc-300 font-medium leading-relaxed whitespace-pre-wrap relative animate-in fade-in">
                                            <button onClick={() => setAiExplanation('')} className="absolute top-6 right-6 text-zinc-600 hover:text-white transition-colors"><i className="fa-solid fa-xmark"></i></button>
                                            <h4 className="text-emerald-500 font-black text-xs uppercase tracking-[0.3em] mb-6 flex items-center gap-2"><i className="fa-solid fa-robot"></i> Análise do Mentor</h4>
                                            <div dangerouslySetInnerHTML={{ __html: aiExplanation.replace(/\*\*(.*?)\*\*/g, '<b class="text-white font-black">$1</b>') }}></div>
                                        </div>
                                    )}

                                    <button onClick={nextQuestion} className="w-full py-7 bg-white text-black rounded-[2.5rem] font-black text-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-2xl shadow-white/5 flex items-center justify-center gap-4">
                                        {curIdx + 1 === currentDeck.length ? 'VER RESULTADOS FINAIS' : 'PRÓXIMA QUESTÃO'}
                                        <i className="fa-solid fa-arrow-right"></i>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-12">
                        <div className="bento-card p-10 rounded-[3.5rem] space-y-8">
                            <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <i className="fa-solid fa-list-ol text-emerald-500"></i> MAPA DO SIMULADO
                            </h3>
                            <div className="grid grid-cols-5 gap-3">
                                {currentDeck.map((_, i) => {
                                    const res = results.find((r, idx) => idx === i);
                                    let bg = "bg-white/5 text-zinc-600";
                                    if (i === curIdx) bg = "bg-white text-black scale-110 shadow-xl z-10";
                                    else if (res) bg = res.isCorrect ? "bg-emerald-500 text-white" : "bg-rose-500 text-white";

                                    return (
                                        <div key={i} className={`aspect-square rounded-xl flex items-center justify-center font-black text-[10px] transition-all ${bg}`}>
                                            {i + 1}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bento-card p-10 rounded-[3.5rem] bg-indigo-500/5 border border-indigo-500/10 space-y-6">
                            <h3 className="text-xs font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                                <i className="fa-solid fa-comments"></i> CHAT COM MENTOR
                            </h3>
                            <div className="h-64 overflow-y-auto pr-2 custom-scroll space-y-4 text-xs font-medium">
                                {aiChatMessages.length === 0 && <p className="text-zinc-600 italic text-center py-10">Tire suas dúvidas técnicas aqui.</p>}
                                {aiChatMessages.map((m, i) => (
                                    <div key={i} className={`${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                                        <span className={`inline-block p-3 rounded-2xl ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-300'}`}>{m.text}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input 
                                    placeholder="Dúvida técnica..."
                                    onKeyDown={async (e) => {
                                        if (e.key === 'Enter' && e.target.value.trim()) {
                                            const val = e.target.value;
                                            e.target.value = '';
                                            const newMsgs = [...aiChatMessages, { role: 'user', text: val }];
                                            setAiChatMessages(newMsgs);
                                            const r = await callIA(newMsgs.map(m => ({ role: m.role, parts: [{ text: m.text }] })));
                                            setAiChatMessages([...newMsgs, { role: 'model', text: r || "Erro ao responder." }]);
                                        }
                                    }}
                                    className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500/50"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'results') {
        const hits = results.filter(r => r.isCorrect).length;
        const total = currentDeck.length;
        const perc = Math.round((hits / total) * 100);
        const avgTime = Math.round(results.reduce((acc, r) => acc + r.timeSpent, 0) / total);

        return (
            <div className="p-10 max-w-5xl mx-auto space-y-12 animate-in zoom-in duration-700">
                <div className="glass-obsidian p-16 rounded-[4rem] text-center space-y-12 border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-zinc-800">
                        <div className={`h-full transition-all duration-1000 ${perc >= 70 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${perc}%` }}></div>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-6xl font-black italic tracking-tighter uppercase">Treino <span className="neon-emerald">Concluído</span></h2>
                        <p className="text-zinc-500 font-black text-xs uppercase tracking-[0.4em]">Análise de Desempenho Tático</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-8 bg-black/40 rounded-[2.5rem] border border-white/5">
                            <span className="block text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Aproveitamento</span>
                            <span className="text-5xl font-black">{perc}%</span>
                        </div>
                        <div className="p-8 bg-black/40 rounded-[2.5rem] border border-white/5">
                            <span className="block text-[10px] font-black text-sky-500 uppercase tracking-widest mb-2">Tempo Médio</span>
                            <span className="text-5xl font-black font-mono">{formatTime(avgTime)}</span>
                        </div>
                        <div className="p-8 bg-black/40 rounded-[2.5rem] border border-white/5">
                            <span className="block text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-2">Score Líquido</span>
                            <span className="text-5xl font-black">{cebraspeMode ? hits - (total - hits) : hits}</span>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h3 className="text-left text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-3">
                            <i className="fa-solid fa-history text-emerald-500"></i> Gabarito Detalhado
                        </h3>
                        <div className="space-y-3">
                            {results.map((r, i) => {
                                const q = currentDeck[i];
                                return (
                                    <div key={i} className="flex justify-between items-center p-6 bg-black/20 rounded-2xl border border-white/5 group hover:bg-white/5 transition-all">
                                        <div className="flex items-center gap-6">
                                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${r.isCorrect ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>{i + 1}</span>
                                            <span className="font-bold text-sm text-zinc-300 truncate max-w-md">{q.title}</span>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <span className="text-[10px] font-mono text-zinc-600">{formatTime(r.timeSpent)}</span>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${r.isCorrect ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {r.isCorrect ? 'CERTO' : `ERRO (${r.userAns})`}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button 
                            onClick={async () => {
                                setAiExplaining(true);
                                const prompt = `Analise meu desempenho neste simulado de medicina. Acertei ${hits} de ${total}. Temas abordados: ${currentDeck.map(q => q.subject).join(', ')}. Quais são meus pontos cegos e onde devo focar?`;
                                const r = await callIA([{ role: 'user', parts: [{ text: prompt }] }]);
                                setAiExplanation(r || "Erro na análise.");
                                setAiExplaining(false);
                            }}
                            className="py-6 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-3xl shadow-xl flex items-center justify-center gap-3 transition-all"
                        >
                            <i className="fa-solid fa-robot"></i> ANÁLISE IA PROFUNDA
                        </button>
                        <button onClick={() => setView('menu')} className="py-6 bg-white/5 hover:bg-white/10 text-zinc-400 font-black rounded-3xl transition-all">
                            VOLTAR AO MENU
                        </button>
                    </div>

                    {aiExplanation && (
                        <div className="mt-12 p-10 bg-zinc-950/50 rounded-[3rem] border border-white/5 text-left animate-in fade-in">
                            <h4 className="text-emerald-500 font-black text-xs uppercase tracking-[0.3em] mb-6 flex items-center gap-2"><i className="fa-solid fa-brain"></i> Feedback Estratégico</h4>
                            <div className="text-zinc-400 text-sm font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: aiExplanation.replace(/\*\*(.*?)\*\*/g, '<b class="text-white font-black">$1</b>').replace(/\n/g, '<br/>') }}></div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return null;
};

export default ElaboradorTab;
