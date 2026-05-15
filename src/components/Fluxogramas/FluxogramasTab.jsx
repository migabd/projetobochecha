import React, { useState, useMemo } from 'react';

const ActiveTraining = ({ flowchart, userAnswers, results, fluxogramaState, onFinalize, onCreateAnki, onClose, onUpdateAnswer }) => {
    const nodes = flowchart.nodes || [];

    return (
        <div className="fixed inset-0 z-[6000] bg-[#09090b] flex flex-col animate-in fade-in duration-500 overflow-hidden font-sans">
            <header className="p-8 glass-obsidian border-b border-white/5 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-6">
                    <button onClick={onClose} className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-all">
                        <i className="fa-solid fa-arrow-left text-zinc-400"></i>
                    </button>
                    <div>
                        <h2 className="text-2xl font-black italic tracking-tighter neon-emerald">{flowchart.title}</h2>
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Treino de Reconstrução Ativa</p>
                    </div>
                </div>
                <div className="flex gap-4 shrink-0">
                    {!results ? (
                        <button 
                            onClick={onFinalize} 
                            disabled={fluxogramaState.isCorrecting} 
                            className="premium-btn px-10 py-4 rounded-2xl font-black shadow-2xl active:scale-95 disabled:opacity-50"
                        >
                            {fluxogramaState.isCorrecting ? 'PROCESSANDO...' : 'FINALIZAR TREINO'}
                        </button>
                    ) : (
                        <>
                            <button 
                                onClick={onCreateAnki} 
                                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 flex items-center gap-2"
                            >
                                <i className="fa-solid fa-clone"></i> GERAR ANKI
                            </button>
                            <button 
                                onClick={onClose} 
                                className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-black rounded-2xl transition-all"
                            >
                                CONCLUIR
                            </button>
                        </>
                    )}
                </div>
            </header>

            <div className="flex-1 relative overflow-auto p-12 flex items-start justify-center planner-scroll">
                <div className="relative w-full max-w-5xl shadow-[0_0_100px_rgba(0,0,0,0.5)] rounded-[3rem] overflow-hidden border border-white/5 bg-black/40">
                    <img 
                        src={flowchart.image} 
                        alt="Flowchart"
                        className={`w-full h-auto transition-all duration-1000 ${results ? 'blur-0 opacity-100' : 'blur-3xl opacity-20 grayscale'}`} 
                    />
                    
                    <div className="absolute inset-0">
                        {nodes.map((node) => {
                            const correction = results?.corrections?.find(c => c.nodeId === node.id);
                            const answer = userAnswers[node.id] || '';
                            
                            return (
                                <div 
                                    key={node.id} 
                                    style={{ 
                                        position: 'absolute', 
                                        left: `${node.x}%`, 
                                        top: `${node.y}%`,
                                        width: '280px',
                                        transform: 'translate(-50%, -50%)'
                                    }}
                                    className="z-10 group"
                                >
                                    <div className={`p-6 rounded-3xl border-2 shadow-2xl transition-all backdrop-blur-xl ${results ? (correction?.correct ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-rose-500/50 bg-rose-500/10') : 'border-white/10 bg-black/60 focus-within:border-emerald-500/50 focus-within:scale-105'}`}>
                                        {!results && (
                                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2 flex items-center gap-2 italic">
                                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                                DICA: {node.hint}
                                            </p>
                                        )}
                                        <textarea 
                                            value={answer} 
                                            onChange={e => onUpdateAnswer(node.id, e.target.value)} 
                                            disabled={!!results}
                                            placeholder="Descreva este passo..." 
                                            className="w-full bg-transparent text-white font-bold text-sm outline-none resize-none placeholder:text-white/20" 
                                            rows="2"
                                        />
                                        {results && (
                                            <div className="mt-4 pt-4 border-t border-white/5">
                                                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Gabarito:</p>
                                                <p className="text-xs font-bold text-zinc-300 leading-relaxed">{node.text}</p>
                                                {!correction?.correct && (
                                                    <p className="mt-2 text-[10px] font-bold text-rose-400 italic bg-rose-500/5 p-2 rounded-lg border border-rose-500/10">
                                                        {correction?.feedback}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {results && (
                <div className="p-10 glass-obsidian border-t border-white/5 flex flex-col md:flex-row items-center justify-center gap-16 shrink-0 animate-in slide-in-from-bottom-10">
                    <div className="text-center">
                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.4em] mb-2">Aproveitamento</p>
                        <p className={`text-6xl font-black italic tracking-tighter ${results.score > 70 ? 'neon-emerald' : 'text-rose-500'}`}>{results.score}%</p>
                    </div>
                    <div className="max-w-xl">
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <i className="fa-solid fa-robot"></i> Parecer do Mentor IA
                        </p>
                        <p className="text-lg font-bold text-zinc-300 italic leading-relaxed">"{results.generalFeedback}"</p>
                    </div>
                </div>
            )}
        </div>
    );
};

const FluxogramasTab = ({ db, setDb, showAlert, callIA, setLightbox, fluxogramaPlay, setFluxogramaPlay }) => {
    const [view, setView] = useState('gallery');
    const [selectedDeck, setSelectedDeck] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [fluxogramaState, setFluxogramaState] = useState({ isAnalyzing: false, isCorrecting: false });

    const decks = useMemo(() => {
        const d = {};
        db.fluxogramas?.forEach(f => {
            const category = f.category || 'Geral';
            if (!d[category]) d[category] = [];
            d[category].push(f);
        });
        return d;
    }, [db.fluxogramas]);

    const handleUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const b64 = ev.target.result;
            setIsGenerating(true);
            
            const prompt = `Você é um preceptor médico especialista. Analise visualmente este fluxograma médico.
            Identifique os pontos de decisão (nós). 
            Retorne APENAS um JSON: 
            {
                "title": "Título Curto",
                "category": "Especialidade",
                "nodes": [
                    {
                        "id": "1",
                        "text": "Conteúdo real do nó (o que está escrito)",
                        "hint": "Uma dica curta para o estudante lembrar o que está escrito aqui",
                        "x": 20, // Posição horizontal em % (0-100)
                        "y": 30  // Posição vertical em % (0-100)
                    }
                ]
            }`;
            
            try {
                const res = await callIA([{ role: 'user', parts: [{ inlineData: { data: b64.split(',')[1], mimeType: file.type } }, { text: prompt }] }]);
                const data = JSON.parse(res.replace(/```json|```/g, ''));
                const newFlux = {
                    id: Date.now(),
                    title: data.title || 'Novo Fluxograma',
                    category: data.category || 'Geral',
                    nodes: data.nodes || [],
                    image: b64,
                    date: new Date().toLocaleDateString('pt-PT'),
                    nextReview: Date.now(),
                    interval: 1
                };
                setDb(prev => ({ ...prev, fluxogramas: [newFlux, ...(prev.fluxogramas || [])] }));
                showAlert("Fluxograma materializado com sucesso!");
            } catch (err) {
                showAlert("Erro ao processar fluxograma. Verifique o formato.");
            }
            setIsGenerating(false);
        };
        reader.readAsDataURL(file);
    };

    const finalizeFluxograma = async () => {
        const { flowchart, userAnswers } = fluxogramaPlay;
        setFluxogramaState(p => ({ ...p, isCorrecting: true }));
        try {
            const prompt = `Você é um preceptor. Corrija as respostas do estudante para este fluxograma.
            Gabarito: ${JSON.stringify(flowchart.nodes.map(n => ({ id: n.id, expected: n.text })))} 
            Respostas do Estudante: ${JSON.stringify(userAnswers)}
            
            Retorne APENAS um JSON:
            {
                "score": 0-100,
                "corrections": [
                    {"nodeId": "1", "correct": true/false, "feedback": "Breve motivo se errou"}
                ],
                "generalFeedback": "Mensagem motivacional ou corretiva curta"
            }`;
            
            const res = await callIA([{ role: 'user', parts: [{ text: prompt }] }]);
            const results = JSON.parse(res.replace(/```json|```/g, ''));
            setFluxogramaPlay(p => ({ ...p, results }));
            
            // Atualizar SRS (Repetição Espaçada)
            const updatedFluxs = db.fluxogramas.map(f => {
                if (f.id === flowchart.id) {
                    const newInterval = results.score > 80 ? f.interval * 2 : 1;
                    return { ...f, interval: newInterval, nextReview: Date.now() + (newInterval * 24 * 60 * 60 * 1000) };
                }
                return f;
            });
            setDb(p => ({ ...p, fluxogramas: updatedFluxs }));
        } catch (e) {
            showAlert("Erro na correção via IA.");
        } finally {
            setFluxogramaState(p => ({ ...p, isCorrecting: false }));
        }
    };

    const createAnkiFromFlux = () => {
        const { flowchart, results } = fluxogramaPlay;
        const errors = results.corrections.filter(c => !c.correct);
        if (errors.length === 0) return showAlert("Excelente! Nenhum erro para converter.");
        
        const newCards = errors.map(err => {
            const node = flowchart.nodes.find(n => n.id === err.nodeId);
            return {
                id: Date.now() + Math.random(),
                deckName: `CONDUTAS: ${flowchart.category}`,
                front: `<div class="text-emerald-500 font-black mb-2">[FLUXOGRAMA] ${flowchart.title}</div><div class="font-bold">${node.hint}</div>`,
                back: `<div class="text-zinc-500 text-xs mb-2">Gabarito:</div><div class="font-black">${node.text}</div>`,
                date: new Date().toLocaleDateString('pt-PT')
            };
        });
        
        setDb(p => ({ ...p, flashcards: [...newCards, ...(p.flashcards || [])] }));
        showAlert(`${newCards.length} Flashcards gerados no baralho de Condutas!`);
    };

    if (fluxogramaPlay) {
        return (
            <ActiveTraining 
                {...fluxogramaPlay} 
                fluxogramaState={fluxogramaState}
                onFinalize={finalizeFluxograma}
                onCreateAnki={createAnkiFromFlux}
                onClose={() => setFluxogramaPlay(null)}
                onUpdateAnswer={(id, val) => setFluxogramaPlay(p => ({ ...p, userAnswers: { ...p.userAnswers, [id]: val } }))}
            />
        );
    }

    if (view === 'gallery') {
        return (
            <div className="p-10 max-w-7xl mx-auto animate-in fade-in duration-700 space-y-12">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h2 className="text-5xl font-black italic tracking-tighter neon-emerald uppercase">Fluxogramas <span className="text-white/20">DE CONDUTA</span></h2>
                        <p className="text-zinc-500 font-bold mt-2 uppercase tracking-widest text-xs">Domine protocolos através da visualização ativa.</p>
                    </div>
                    <label className="premium-btn px-8 py-5 rounded-2xl font-black cursor-pointer shadow-2xl flex items-center gap-3">
                        <i className={isGenerating ? "fa-solid fa-circle-notch fa-spin" : "fa-solid fa-plus"}></i> {isGenerating ? 'PROCESSANDO...' : 'NOVO PROTOCOLO'}
                        <input type="file" className="hidden" onChange={handleUpload} accept="image/*" disabled={isGenerating} />
                    </label>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {Object.keys(decks).map(cat => (
                        <div 
                            key={cat} onClick={() => { setSelectedDeck(cat); setView('deck'); }}
                            className="bento-card p-10 rounded-[3.5rem] cursor-pointer group relative overflow-hidden"
                        >
                            <div className="flex justify-between items-start mb-10">
                                <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                                    <i className="fa-solid fa-folder-tree text-2xl"></i>
                                </div>
                                <span className="bg-emerald-600 text-white px-4 py-1 rounded-full font-black text-[10px] tracking-widest">{decks[cat].length} ITENS</span>
                            </div>
                            <h3 className="text-2xl font-black mb-2">{cat}</h3>
                            <p className="text-zinc-500 font-bold text-sm">Toque para abrir este baralho.</p>
                            <i className="fa-solid fa-layer-group absolute -right-6 -bottom-6 text-9xl text-emerald-500/5 group-hover:text-emerald-500/10 transition-colors"></i>
                        </div>
                    ))}
                    {(!db.fluxogramas || db.fluxogramas.length === 0) && (
                        <div className="col-span-full py-32 text-center opacity-20 italic font-black text-2xl">
                            NENHUM FLUXOGRAMA CADASTRADO
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (view === 'deck') {
        const currentFluxs = decks[selectedDeck] || [];
        return (
            <div className="p-10 max-w-7xl mx-auto animate-in fade-in duration-500">
                <header className="flex items-center gap-8 mb-16">
                    <button onClick={() => setView('gallery')} className="w-14 h-14 glass-obsidian rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all shadow-xl">
                        <i className="fa-solid fa-arrow-left text-zinc-400"></i>
                    </button>
                    <div>
                        <h2 className="text-4xl font-black italic tracking-tighter neon-emerald">{selectedDeck}</h2>
                        <p className="text-zinc-500 font-bold text-xs uppercase tracking-[0.3em]">Baralho de especialidade</p>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {currentFluxs.map(f => (
                        <div key={f.id} className="glass-obsidian rounded-[2.5rem] overflow-hidden group border border-white/5 hover:border-emerald-500/30 transition-all flex flex-col">
                            <div className="h-48 overflow-hidden relative cursor-pointer" onClick={() => setLightbox(f.image)}>
                                <img src={f.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <i className="fa-solid fa-expand text-white text-3xl"></i>
                                </div>
                            </div>
                            <div className="p-8 space-y-4 flex-1 flex flex-col justify-between">
                                <h4 className="font-black text-lg leading-tight">{f.title}</h4>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setFluxogramaPlay({ flowchart: f, userAnswers: {}, results: null })}
                                        className="flex-1 py-3 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-xl font-black text-xs transition-all uppercase tracking-widest"
                                    >
                                        Treinar
                                    </button>
                                    <button 
                                        onClick={() => {
                                            if(window.confirm("Excluir fluxograma?")) {
                                                setDb(prev => ({ ...prev, fluxogramas: prev.fluxogramas.filter(x => x.id !== f.id) }));
                                            }
                                        }}
                                        className="w-12 h-12 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl flex items-center justify-center transition-all"
                                    >
                                        <i className="fa-solid fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return null;
};

export default FluxogramasTab;

