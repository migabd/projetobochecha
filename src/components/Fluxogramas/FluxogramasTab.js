import React, { useState, useEffect } from 'react';

const FluxogramasTab = ({ db, setDb, showAlert, callIA, setLightbox, fluxogramaPlay, setFluxogramaPlay }) => {
    const [view, setView] = useState('gallery'); // gallery, upload
    const [fluxogramaState, setFluxogramaState] = useState({ isAnalyzing: false, isCorrecting: false });
    const [editingFlux, setEditingFlux] = useState({ title: '', image: '', category: 'Geral' });
    const [selectedDeck, setSelectedDeck] = useState('Todos');

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => setEditingFlux({ ...editingFlux, image: ev.target.result });
        reader.readAsDataURL(file);
    };

    const analyzeFlowchart = async () => {
        if (!editingFlux.image || !editingFlux.title) return showAlert("Dê um título e selecione uma imagem!");
        setFluxogramaState(p => ({ ...p, isAnalyzing: true }));
        try {
            const prompt = `Você é um preceptor médico especialista em análise visual de diretrizes. Analise este fluxograma e extraia os pontos de decisão.
            1. Identifique de 6 a 12 blocos de conduta/decisão.
            2. Para cada bloco, determine:
               - "text": O conteúdo original (gabarito).
               - "hint": Uma pergunta instigante (Ex: "Qual medicação agora?", "Qual o próximo passo?").
               - "x": Posição horizontal aproximada (0-100%).
               - "y": Posição vertical aproximada (0-100%).
            3. Sugira uma categoria (Especialidade).
            Retorne APENAS JSON: { "nodes": [{"id":"1","text":"...","hint":"...","x":20,"y":30}], "suggestedCategory": "..." }`;

            const res = await callIA([
                { role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: 'image/jpeg', data: editingFlux.image.split(',')[1] } }] }
            ]);

            const match = res.match(/\{[\s\S]*\}/);
            if (match) {
                const resJSON = JSON.parse(match[0]);
                const newFlux = {
                    id: Date.now(),
                    title: editingFlux.title,
                    image: editingFlux.image,
                    category: resJSON.suggestedCategory || editingFlux.category,
                    nodes: resJSON.nodes,
                    nextReview: Date.now(),
                    interval: 1
                };
                setDb(p => ({ ...p, fluxogramas: [newFlux, ...(p.fluxogramas || [])] }));
                setEditingFlux({ title: '', image: '', category: 'Geral' });
                setView('gallery');
                showAlert("✅ Fluxograma materializado com sucesso!");
            }
        } catch (e) {
            showAlert("Erro na análise: " + e.message);
        } finally {
            setFluxogramaState(p => ({ ...p, isAnalyzing: false }));
        }
    };

    const finalizeFluxograma = async () => {
        const { flowchart, userAnswers } = fluxogramaPlay;
        setFluxogramaState(p => ({ ...p, isCorrecting: true }));
        try {
            const prompt = `Corrija estas respostas de um fluxograma médico.
            Gabarito: ${JSON.stringify(flowchart.nodes.map(n => ({ id: n.id, expected: n.text })))}
            Respostas: ${JSON.stringify(userAnswers)}
            Retorne JSON: { "score": 0-100, "generalFeedback": "...", "corrections": [{ "nodeId": "1", "correct": true/false, "explanation": "..." }] }`;

            const res = await callIA([{ role: 'user', parts: [{ text: prompt }] }]);
            const match = res.match(/\{[\s\S]*\}/);
            if (match) {
                const results = JSON.parse(match[0]);
                setFluxogramaPlay(p => ({ ...p, results }));
                
                // Atualizar SRS
                const updatedFluxs = db.fluxogramas.map(f => {
                    if (f.id === flowchart.id) {
                        const newInterval = results.score > 80 ? f.interval * 2 : 1;
                        return { ...f, interval: newInterval, nextReview: Date.now() + (newInterval * 24 * 60 * 60 * 1000) };
                    }
                    return f;
                });
                setDb(p => ({ ...p, fluxogramas: updatedFluxs }));
            }
        } catch (e) {
            showAlert("Erro na correção: " + e.message);
        } finally {
            setFluxogramaState(p => ({ ...p, isCorrecting: false }));
        }
    };

    const createAnkiFromFlux = () => {
        const { flowchart, results } = fluxogramaPlay;
        const errors = results.corrections.filter(c => !c.correct);
        if (errors.length === 0) return showAlert("Sem erros para gerar cards!");

        const newCards = errors.map(err => {
            const node = flowchart.nodes.find(n => n.id === err.nodeId);
            return {
                id: Date.now() + Math.random(),
                deckName: `Fluxogramas: ${flowchart.category}`,
                front: `[CONDUTA] No fluxograma de ${flowchart.title}: ${node.hint}`,
                back: `<b>Resposta Correta:</b> ${node.text}<br><br><b>Explicação:</b> ${err.explanation}`,
                date: new Date().toLocaleDateString('pt-PT')
            };
        });

        setDb(p => ({ ...p, flashcards: [...newCards, ...(p.flashcards || [])] }));
        showAlert(`${newCards.length} Cards de Conduta gerados!`);
    };

    const fluxogramaPlayView = () => {
        const { flowchart, userAnswers, results } = fluxogramaPlay;
        const nodes = flowchart.nodes || [];

        return (
            <div className="fixed inset-0 z-[6000] bg-zinc-950 flex flex-col animate-in fade-in duration-300 overflow-hidden">
                <header className="p-4 md:p-6 bg-zinc-900 border-b border-zinc-800 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-lg md:text-xl font-black text-white truncate max-w-xs md:max-w-md">{flowchart.title}</h2>
                        <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">Reconstrução Visual Ativa</p>
                    </div>
                    <div className="flex gap-2 md:gap-4">
                        {!results ? (
                            <button onClick={finalizeFluxograma} disabled={fluxogramaState.isCorrecting} className="px-4 md:px-8 py-2 md:py-3 bg-emerald-600 text-white font-black rounded-xl text-xs md:text-base">
                                {fluxogramaState.isCorrecting ? 'Corrigindo...' : 'Finalizar'}
                            </button>
                        ) : (
                            <button onClick={createAnkiFromFlux} className="px-4 md:px-8 py-2 md:py-3 bg-indigo-600 text-white font-black rounded-xl text-xs md:text-base">Anki</button>
                        )}
                        <button onClick={() => setFluxogramaPlay(null)} className="p-2 md:p-3 bg-zinc-800 text-white rounded-xl"><i className="fa-solid fa-xmark"></i></button>
                    </div>
                </header>

                <div className="flex-1 relative overflow-auto bg-zinc-900/50 flex items-start justify-center p-4">
                    <div className="relative w-full max-w-4xl h-fit shadow-2xl rounded-3xl overflow-hidden border border-zinc-800">
                        <img src={flowchart.image} className={`w-full h-auto transition-all duration-1000 ${results ? 'blur-0 opacity-100' : 'blur-3xl opacity-30 grayscale'}`} />
                        
                        <div className="absolute inset-0 overflow-hidden">
                            {nodes.map((node, i) => {
                                const correction = results?.corrections.find(c => c.nodeId === node.id);
                                return (
                                    <div 
                                        key={node.id} 
                                        style={{ 
                                            position: 'absolute', 
                                            left: `${node.x}%`, 
                                            top: `${node.y}%`,
                                            width: '240px',
                                            transform: 'translate(-50%, -50%)'
                                        }}
                                        className="z-10 group"
                                    >
                                        <div className={`p-3 md:p-4 rounded-2xl border-2 shadow-2xl transition-all ${results ? (correction?.correct ? 'border-emerald-500 bg-emerald-500/20' : 'border-rose-500 bg-rose-500/20') : 'border-white/20 bg-zinc-900/90 backdrop-blur-md focus-within:border-emerald-500 focus-within:scale-105'}`}>
                                            {!results && (
                                                <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1 md:mb-2 italic">
                                                    <i className="fa-solid fa-lightbulb"></i> {node.hint}
                                                </p>
                                            )}
                                            <textarea 
                                                value={userAnswers[node.id] || ''} 
                                                onChange={e => setFluxogramaPlay(p => ({ ...p, userAnswers: { ...p.userAnswers, [node.id]: e.target.value } }))} 
                                                disabled={!!results}
                                                placeholder="..." 
                                                className="w-full bg-transparent text-white font-bold text-xs md:text-sm outline-none resize-none" 
                                                rows="2"
                                            />
                                            {results && (
                                                <div className="mt-2 pt-2 border-t border-white/10">
                                                    <p className="text-[8px] font-black text-white/40 uppercase mb-1">Gabarito:</p>
                                                    <p className="text-[10px] md:text-xs font-bold text-white leading-tight">{node.text}</p>
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
                    <div className="p-4 md:p-8 bg-zinc-900 border-t border-zinc-800 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-12 shrink-0">
                        <div className="text-center">
                            <p className="text-zinc-500 text-[10px] font-black uppercase mb-1">Score</p>
                            <p className={`text-4xl md:text-5xl font-black ${results.score > 70 ? 'text-emerald-500' : 'text-rose-500'}`}>{results.score}%</p>
                        </div>
                        <p className="text-xs md:text-sm font-bold text-zinc-400 text-center max-w-sm">"{results.generalFeedback}"</p>
                    </div>
                )}
            </div>
        );
    };

    const getStatusSRS = (f) => {
        const now = Date.now();
        if (now >= f.nextReview) return { label: 'Revisão', color: 'blue' };
        return { label: 'Em Dia', color: 'emerald' };
    };

    const fluxogramasList = db.fluxogramas || [];
    const decks = [...new Set(fluxogramasList.map(f => f.category || 'Geral'))];
    const filteredList = selectedDeck === 'Todos' ? fluxogramasList : fluxogramasList.filter(f => (f.category || 'Geral') === selectedDeck);

    if (fluxogramaPlay) return fluxogramaPlayView();

    if (view === 'upload') {
        return (
            <div className="p-6 md:p-12 max-w-4xl mx-auto animate-in zoom-in-95">
                <div className="bg-white dark:bg-zinc-900 p-8 md:p-12 rounded-[48px] shadow-2xl border border-zinc-200 dark:border-zinc-800">
                    <button onClick={() => setView('gallery')} className="text-zinc-400 hover:text-zinc-600 mb-8 flex items-center gap-2 font-black uppercase text-xs tracking-widest"><i className="fa-solid fa-arrow-left"></i> Voltar</button>
                    <h2 className="text-3xl font-black mb-8">Novo Fluxograma</h2>
                    <div className="space-y-8">
                        <div>
                            <label className="block text-xs font-black text-zinc-400 uppercase mb-4">Título do Estudo</label>
                            <input type="text" value={editingFlux.title} onChange={e => setEditingFlux({...editingFlux, title: e.target.value})} placeholder="Ex: Protocolo de ACLS, Manejo de Sepse..." className="w-full p-6 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl font-black text-xl outline-none" />
                        </div>
                        <div className="relative border-4 border-dashed border-zinc-100 dark:border-zinc-800 rounded-[40px] p-12 text-center group hover:border-emerald-500 transition-all cursor-pointer">
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                            {editingFlux.image ? (
                                <img src={editingFlux.image} className="max-h-64 mx-auto rounded-2xl shadow-xl" />
                            ) : (
                                <div className="space-y-4">
                                    <i className="fa-solid fa-cloud-arrow-up text-5xl text-zinc-300 group-hover:text-emerald-500 transition-colors"></i>
                                    <p className="font-black text-zinc-400 uppercase text-xs tracking-widest">Arraste a diretriz aqui</p>
                                </div>
                            )}
                        </div>
                        <button disabled={fluxogramaState.isAnalyzing} onClick={analyzeFlowchart} className="w-full py-6 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-3xl font-black text-xl shadow-2xl transition-all disabled:opacity-50">
                            {fluxogramaState.isAnalyzing ? 'Processando Imagem...' : 'Materializar para Treino'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-12 max-w-7xl mx-auto animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <h2 className="text-4xl font-black tracking-tighter">Fluxogramas <span className="text-blue-500">PRO</span></h2>
                    <p className="text-zinc-500 font-bold uppercase text-xs tracking-widest mt-1">Treino Ativo e Repetição Espaçada</p>
                </div>
                <button onClick={() => setView('upload')} className="w-full md:w-auto px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2">
                    <i className="fa-solid fa-plus"></i> Novo Fluxo
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12">
                <div onClick={() => setSelectedDeck('Todos')} className={`p-6 md:p-8 rounded-[32px] md:rounded-[40px] shadow-2xl cursor-pointer hover:scale-[1.02] transition-all group relative overflow-hidden ${selectedDeck === 'Todos' ? 'bg-zinc-800 text-white' : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-400'}`}>
                    <h3 className="text-xl md:text-2xl font-black mb-1 md:mb-2">Todos</h3>
                    <p className="text-xs md:text-base font-bold">{fluxogramasList.length} itens</p>
                </div>
                {decks.map(deck => (
                    <div key={deck} onClick={() => setSelectedDeck(deck)} className={`p-6 md:p-8 rounded-[32px] md:rounded-[40px] shadow-xl border cursor-pointer hover:shadow-2xl transition-all relative overflow-hidden ${selectedDeck === deck ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400'}`}>
                        <h3 className="text-xl md:text-2xl font-black mb-1 md:mb-2 truncate">{deck}</h3>
                        <p className="text-xs md:text-base font-bold">{fluxogramasList.filter(f => (f.category || 'Geral') === deck).length} itens</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {filteredList.map(flow => {
                    const srs = getStatusSRS(flow);
                    return (
                        <div key={flow.id} className="bg-white dark:bg-zinc-900 rounded-[32px] md:rounded-[40px] border border-zinc-200 dark:border-zinc-800 shadow-lg overflow-hidden transition-all hover:-translate-y-2">
                            <div className="relative h-48 md:h-56">
                                <img src={flow.image} className="w-full h-full object-cover opacity-60 grayscale group-hover:grayscale-0 transition-all" />
                                <div className="absolute top-4 left-4 flex gap-2">
                                    <div className="bg-black/60 px-3 py-1 rounded-full text-white text-[8px] font-black uppercase">{flow.category}</div>
                                    <div className={`bg-${srs.color}-500/80 px-3 py-1 rounded-full text-white text-[8px] font-black uppercase`}>{srs.label}</div>
                                </div>
                            </div>
                            <div className="p-6 md:p-8">
                                <h4 className="text-lg md:text-xl font-black truncate">{flow.title}</h4>
                                <div className="flex gap-3 mt-6">
                                    <button onClick={() => setFluxogramaPlay({ flowchart: flow, userAnswers: {}, startTime: Date.now(), results: null })} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs md:text-sm shadow-lg active:scale-95 transition-all">Treinar</button>
                                    <button onClick={() => { if (window.confirm('Excluir?')) setDb(p => ({ ...p, fluxogramas: p.fluxogramas.filter(x => x.id !== flow.id) })); }} className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 rounded-2xl flex items-center justify-center"><i className="fa-solid fa-trash text-sm"></i></button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default FluxogramasTab;
