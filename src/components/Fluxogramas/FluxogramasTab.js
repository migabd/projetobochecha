import React, { useState } from 'react';
import { compressImage } from '../../utils/image';

/**
 * Componente para o sistema de fluxogramas médicos com treino ativo.
 */
const FluxogramasTab = ({ db, setDb, showAlert, callIA, setLightbox }) => {
    const [fluxogramaPlay, setFluxogramaPlay] = useState(null);
    const [editingFlux, setEditingFlux] = useState(null);
    const [fluxogramaState, setFluxogramaState] = useState({ isAnalyzing: false, isCorrecting: false });
    const [selectedDeck, setSelectedDeck] = useState(null);

    const fluxogramasList = db.fluxogramas || [];
    const decks = [...new Set(fluxogramasList.map(f => f.category || 'Geral'))];

    // --- LÓGICA DE REPETIÇÃO ESPAÇADA (SRS) ---
    const getStatusSRS = (flow) => {
        if (!flow.nextReview) return { label: 'Novo', color: 'blue' };
        const now = new Date();
        const next = new Date(flow.nextReview);
        if (now >= next) return { label: 'Revisão', color: 'indigo' };
        return { label: 'Memorizado', color: 'emerald' };
    };

    const handleFluxogramaUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const b64 = await compressImage(ev.target.result);
            setEditingFlux({ 
                id: Date.now(), 
                title: file.name.split('.')[0], 
                image: b64, 
                data: null, 
                category: selectedDeck && selectedDeck !== 'Todos' ? selectedDeck : 'Geral' 
            });
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const analyzeFlowchart = async () => {
        if (!editingFlux) return;
        setFluxogramaState(p => ({ ...p, isAnalyzing: true }));
        try {
            const prompt = `Você é um especialista em educação médica e OCR. Analise este fluxograma médico e extraia o raciocínio clínico.
            1. Extraia de 5 a 10 blocos de decisão/conduta principais.
            2. Para cada bloco, crie uma "dica" ou pergunta instigante (hint) que ajude o aluno a lembrar o que preencher (ex: "Qual medicação vai agora?", "Qual o critério diagnóstico?", "Qual o próximo passo?").
            3. Tente identificar a categoria/especialidade médica.
            Retorne APENAS um JSON: { "nodes": [{ "id": "1", "text": "Gabarito do Bloco", "hint": "Pergunta ou dica instigante" }], "suggestedCategory": "Especialidade" }`;
            
            const res = await callIA([
                { role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: 'image/jpeg', data: editingFlux.image.split(',')[1] } }] }
            ]);
            
            const match = res.match(/\{[\s\S]*\}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                const newFlow = { 
                    ...editingFlux, 
                    data: parsed, 
                    category: editingFlux.category || parsed.suggestedCategory || 'Geral',
                    date: new Date().toLocaleDateString('pt-PT'),
                    history: [],
                    nextReview: new Date().toISOString(), // Pronto para treino imediato
                    interval: 1
                };
                setDb(p => ({ ...p, fluxogramas: [newFlow, ...(p.fluxogramas || [])] }));
                setEditingFlux(null);
                showAlert("✅ Fluxograma processado e integrado ao sistema de treino!");
            }
        } catch (e) { showAlert("Erro ao analisar: " + e.message); }
        setFluxogramaState(p => ({ ...p, isAnalyzing: false }));
    };

    const finalizeFluxogramaGame = async () => {
        const { flowchart, userAnswers } = fluxogramaPlay;
        setFluxogramaState(p => ({ ...p, isCorrecting: true }));
        
        try {
            const prompt = `Você é um preceptor médico. Corrija as respostas do aluno para o fluxograma "${flowchart.title}".
            Abaixo estão os pares (Gabarito Original vs Resposta do Aluno).
            Gabarito: ${JSON.stringify(flowchart.data.nodes)}
            Respostas Aluno: ${JSON.stringify(userAnswers)}
            
            Para cada item, avalie se o sentido médico está correto (correção semântica).
            Retorne APENAS um JSON: { "score": 0-100, "corrections": [{ "nodeId": "id", "correct": true/false, "explanation": "Por que está errado ou nuances" }], "feedback": "Feedback geral" }`;

            const res = await callIA([{ role: 'user', parts: [{ text: prompt }] }]);
            const match = res.match(/\{[\s\S]*\}/);
            
            if (match) {
                const results = JSON.parse(match[0]);
                setFluxogramaPlay(p => ({ ...p, results }));
                
                // Lógica de SRS baseada no score
                const isGood = results.score >= 80;
                const newInterval = isGood ? (flowchart.interval || 1) * 2 : 1;
                const nextDate = new Date();
                nextDate.setDate(nextDate.getDate() + newInterval);

                setDb(p => ({
                    ...p,
                    fluxogramas: p.fluxogramas.map(f => f.id === flowchart.id ? { 
                        ...f, 
                        history: [...(f.history || []), { date: new Date().toLocaleDateString('pt-PT'), score: results.score }],
                        nextReview: nextDate.toISOString(),
                        interval: newInterval
                    } : f)
                }));
            }
        } catch (e) { showAlert("Erro na correção: " + e.message); }
        setFluxogramaState(p => ({ ...p, isCorrecting: false }));
    };

    const createAnkiFromFlux = () => {
        const { flowchart, results } = fluxogramaPlay;
        const errors = results.corrections.filter(c => !c.correct);
        if (errors.length === 0) return showAlert("Parabéns! Nenhuma falha detectada.");
        
        const newCards = errors.map(c => {
            const node = flowchart.data.nodes.find(n => n.id === c.nodeId);
            return {
                id: Date.now() + Math.random(),
                deckName: `Fluxogramas: ${flowchart.category || 'Geral'}`,
                front: `Qual a conduta correta no fluxograma "${flowchart.title}" para este passo?\n\nContexto: ${node.text}`,
                back: `<b>Gabarito:</b> ${node.text}<br><br><b>Explicação IA:</b> ${c.explanation || 'Reveja o fluxo original.'}`,
                date: new Date().toLocaleDateString('pt-PT')
            };
        });
        
        setDb(p => ({ ...p, flashcards: [...newCards, ...(p.flashcards || [])] }));
        showAlert(`✅ ${newCards.length} Flashcards de "Condutas" gerados com sucesso!`);
    };

    if (fluxogramaPlay) {
        const { flowchart, results, userAnswers } = fluxogramaPlay;
        return (
            <div className="p-4 md:p-8 space-y-8 animate-in zoom-in-95 max-w-6xl mx-auto pb-20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <div>
                        <h2 className="text-2xl font-black text-emerald-600 dark:text-emerald-500 flex items-center gap-3"><i className="fa-solid fa-gamepad"></i> {flowchart.title}</h2>
                        <p className="text-sm font-bold text-zinc-400 mt-1">Reconstrua o raciocínio clínico preenchendo os blocos.</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setFluxogramaPlay(null)} className="px-6 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-black rounded-xl">Sair</button>
                        {!results && (
                            <button onClick={finalizeFluxogramaGame} disabled={fluxogramaState.isCorrecting} className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-lg transition-all active:scale-95">
                                {fluxogramaState.isCorrecting ? <i className="fa-solid fa-spinner fa-spin mr-2"></i> : <i className="fa-solid fa-brain mr-2"></i>} 
                                Finalizar & Corrigir (IA)
                            </button>
                        )}
                    </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 bg-zinc-100 dark:bg-zinc-950 rounded-[40px] p-4 md:p-10 border border-zinc-200 dark:border-zinc-800 shadow-inner min-h-[600px] relative overflow-auto">
                        {results && (
                            <div className="absolute inset-0 bg-zinc-900/10 dark:bg-black/40 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center animate-in fade-in duration-500 p-10 pointer-events-none">
                                <div className="bg-white dark:bg-zinc-900 p-10 rounded-[40px] shadow-2xl border-4 border-emerald-500 text-center pointer-events-auto max-w-md">
                                    <div className="text-6xl font-black text-emerald-600 mb-4">{results.score}%</div>
                                    <h3 className="text-xl font-black mb-2">Desempenho Final</h3>
                                    <p className="text-zinc-500 font-bold mb-8">{results.feedback}</p>
                                    <div className="flex flex-col gap-3">
                                        <button onClick={createAnkiFromFlux} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg"><i className="fa-solid fa-clone"></i> Criar Cards dos Erros</button>
                                        <button onClick={() => setFluxogramaPlay(null)} className="w-full py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-black rounded-2xl">Voltar ao Painel</button>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="space-y-6">
                            {(flowchart.data?.nodes || []).map((node, i) => {
                                const corr = results?.corrections?.find(c => d => d.nodeId === node.id); // Fixed typo from d => d.nodeId to c => c.nodeId if needed, wait line 5003 was find(c => c.nodeId === node.id)
                                // Actually line 5003 is c => c.nodeId === node.id
                                return (
                                    <div key={node.id} className={`p-5 rounded-2xl border-2 transition-all shadow-sm ${results ? (results.corrections.find(c => c.nodeId === node.id)?.correct ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-red-500 bg-red-50 dark:bg-red-900/20') : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-emerald-500 focus-within:border-emerald-500 group'}`}>
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-focus-within:text-emerald-500 transition-colors">Bloco de Conduta {i + 1}</span>
                                            {results && (results.corrections.find(c => c.nodeId === node.id)?.correct ? <i className="fa-solid fa-circle-check text-emerald-500"></i> : <i className="fa-solid fa-circle-xmark text-red-500"></i>)}
                                        </div>
                                        <div className="mb-2">
                                            <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 italic">
                                                <i className="fa-solid fa-lightbulb mr-2"></i> {node.hint || "O que deve ser feito neste passo?"}
                                            </p>
                                        </div>
                                        <textarea 
                                            value={userAnswers[node.id] || ''} 
                                            onChange={e => setFluxogramaPlay(p => ({ ...p, userAnswers: { ...p.userAnswers, [node.id]: e.target.value } }))} 
                                            disabled={!!results} 
                                            placeholder="Sua resposta clínica..." 
                                            className="w-full bg-transparent font-bold text-zinc-800 dark:text-zinc-100 outline-none resize-none text-lg border-b border-zinc-100 dark:border-zinc-800 focus:border-emerald-500 transition-colors" 
                                            rows="2" 
                                        />
                                        {results && !results.corrections.find(c => c.nodeId === node.id)?.correct && (
                                            <div className="mt-3 pt-3 border-t border-red-100 dark:border-red-900/30">
                                                <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest mb-1">Feedback Corretivo:</p>
                                                <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{results.corrections.find(c => c.nodeId === node.id)?.explanation || node.text}</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-[32px] border border-zinc-200 dark:border-zinc-800 shadow-md sticky top-6">
                            <h3 className="font-black text-sm mb-4 flex items-center gap-2 uppercase tracking-widest text-zinc-400"><i className="fa-solid fa-image text-emerald-500"></i> Guia Original</h3>
                            <div className="relative overflow-hidden rounded-2xl group cursor-zoom-in" onClick={() => setLightbox(flowchart.image)}>
                                <img src={flowchart.image} className="w-full rounded-2xl shadow-sm group-hover:scale-105 transition-transform duration-500 opacity-40 blur-sm grayscale hover:blur-none hover:opacity-100 hover:grayscale-0" />
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:opacity-0 transition-opacity">
                                    <div className="bg-black/60 text-white px-4 py-2 rounded-full text-xs font-black"><i className="fa-solid fa-eye-slash mr-2"></i> Oculto para Treino</div>
                                </div>
                            </div>
                            <p className="text-[10px] font-bold text-zinc-400 mt-4 leading-relaxed italic text-center">Passe o mouse para espiar o fluxograma original em caso de dúvida extrema.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (editingFlux) {
        return (
            <div className="p-6 md:p-12 max-w-4xl mx-auto animate-in slide-in-from-bottom-8">
                <div className="bg-white dark:bg-zinc-900 p-8 md:p-12 rounded-[40px] shadow-2xl border border-zinc-200 dark:border-zinc-800 text-center">
                    <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl">
                        <i className="fa-solid fa-microscope text-4xl"></i>
                    </div>
                    <h2 className="text-3xl font-black text-zinc-800 dark:text-zinc-100 mb-2">Treino Ativo: Fluxograma</h2>
                    <p className="text-zinc-500 font-bold mb-10 max-w-lg mx-auto text-lg">A IA irá remover o texto e criar um desafio de reconstrução clínica.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                        <div className="space-y-6 text-left">
                            <div>
                                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Título do Estudo</label>
                                <input type="text" value={editingFlux.title} onChange={e => setEditingFlux({...editingFlux, title: e.target.value})} className="w-full p-5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl font-black text-lg outline-none focus:ring-4 focus:ring-emerald-500/10 mb-4" />
                                
                                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Baralho / Especialidade</label>
                                <input type="text" value={editingFlux.category} onChange={e => setEditingFlux({...editingFlux, category: e.target.value})} list="flowchart-decks" className="w-full p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 placeholder:text-zinc-300" placeholder="Ex: Cardiologia, Emergência..." />
                                <datalist id="flowchart-decks">
                                    {decks.map(d => <option key={d} value={d} />)}
                                </datalist>
                            </div>
                        </div>
                        <div className="relative">
                            <img src={editingFlux.image} className="w-full h-full object-cover rounded-[32px] shadow-2xl border-4 border-white dark:border-zinc-800" />
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => setEditingFlux(null)} className="flex-1 py-5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-black rounded-2xl hover:bg-zinc-200 transition-all">Cancelar</button>
                        <button onClick={analyzeFlowchart} disabled={fluxogramaState.isAnalyzing} className="flex-[2] py-5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-xl shadow-emerald-900/20 transition-all flex items-center justify-center gap-3">
                            {fluxogramaState.isAnalyzing ? <i className="fa-solid fa-spinner fa-spin text-xl"></i> : <i className="fa-solid fa-wand-magic-sparkles text-xl"></i>}
                            <span>{fluxogramaState.isAnalyzing ? 'IA Mapeando Condutas...' : 'Gerar Treino Ativo'}</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!selectedDeck && fluxogramasList.length > 0) {
        return (
            <div className="p-4 md:p-8 space-y-8 animate-in fade-in max-w-[1600px] mx-auto w-full pb-20">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 tracking-tighter">Decks de Condutas</h2>
                        <p className="text-sm md:text-lg font-bold text-zinc-500 dark:text-zinc-400 mt-2">Escolha uma especialidade para reconstrução ativa.</p>
                    </div>
                    <div className="relative group shrink-0">
                        <input type="file" accept="image/*" onChange={handleFluxogramaUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                        <div className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-900/20 flex items-center gap-3 transition-all hover:scale-105 active:scale-95">
                            <i className="fa-solid fa-plus"></i> Novo Fluxograma
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    <div onClick={() => setSelectedDeck('Todos')} className="bg-gradient-to-br from-zinc-800 to-black p-6 md:p-8 rounded-[32px] md:rounded-[40px] shadow-2xl cursor-pointer hover:scale-[1.02] transition-all group relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 text-white/5 text-6xl md:text-8xl font-black group-hover:scale-110 transition-transform"><i className="fa-solid fa-layer-group"></i></div>
                        <h3 className="text-xl md:text-2xl font-black text-white mb-1 md:mb-2">Todos</h3>
                        <p className="text-white/60 text-xs md:text-base font-bold">{fluxogramasList.length} fluxogramas</p>
                    </div>
                    {decks.map(deck => {
                        const cards = fluxogramasList.filter(f => (f.category || 'Geral') === deck);
                        const needsReview = cards.filter(f => getStatusSRS(f).label === 'Revisão').length;
                        return (
                            <div key={deck} onClick={() => setSelectedDeck(deck)} className={`bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-zinc-200 dark:border-zinc-800 shadow-xl cursor-pointer hover:shadow-2xl transition-all group relative overflow-hidden ${needsReview > 0 ? 'border-blue-500 ring-4 ring-blue-500/10' : ''}`}>
                                <div className="absolute -right-4 -bottom-4 text-zinc-100 dark:text-zinc-800 text-6xl md:text-8xl font-black group-hover:scale-110 transition-transform"><i className="fa-solid fa-folder-open"></i></div>
                                <h3 className="text-xl md:text-2xl font-black text-zinc-800 dark:text-zinc-100 mb-1 md:mb-2 truncate">{deck}</h3>
                                <div className="flex items-center gap-3">
                                    <p className="text-zinc-400 text-xs md:text-base font-bold">{cards.length} itens</p>
                                    {needsReview > 0 && <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[8px] md:text-[10px] font-black rounded-full uppercase tracking-widest animate-pulse">{needsReview} revisão</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    const filteredList = selectedDeck === 'Todos' ? fluxogramasList : fluxogramasList.filter(f => (f.category || 'Geral') === selectedDeck);

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in max-w-[1600px] mx-auto w-full pb-20">
            <div className="bg-white dark:bg-zinc-900 p-8 md:p-12 rounded-[40px] shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col lg:flex-row justify-between items-center gap-10 relative overflow-hidden">
                <div className="relative z-10 text-center lg:text-left">
                    <div className="flex items-center justify-center lg:justify-start gap-4 mb-4">
                        <button onClick={() => setSelectedDeck(null)} className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-500 hover:text-blue-500 transition-all border border-zinc-200 dark:border-zinc-700 shadow-sm"><i className="fa-solid fa-arrow-left"></i></button>
                        <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 tracking-tighter">{selectedDeck || 'Fluxogramas'}</h2>
                    </div>
                    <p className="text-sm md:text-lg font-bold text-zinc-500 dark:text-zinc-400 max-w-2xl leading-relaxed">Pratique a reconstrução ativa e receba feedback semântico da IA.</p>
                </div>
                <div className="relative group shrink-0">
                    <input type="file" accept="image/*" onChange={handleFluxogramaUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                    <div className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-3xl font-black shadow-2xl shadow-blue-900/30 flex items-center gap-4 transition-all hover:scale-105 active:scale-95">
                        <i className="fa-solid fa-cloud-arrow-up text-2xl"></i>
                        <div className="text-left"><span className="block text-xs opacity-70 uppercase tracking-widest">Novo Material</span><span className="text-lg">Upload Imagem</span></div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {filteredList.map(flow => {
                    const srs = getStatusSRS(flow);
                    return (
                        <div key={flow.id} className={`bg-white dark:bg-zinc-900 rounded-[32px] md:rounded-[40px] border border-zinc-200 dark:border-zinc-800 shadow-lg group overflow-hidden transition-all hover:-translate-y-2 hover:shadow-2xl ${srs.label === 'Revisão' ? 'border-blue-500 ring-2 ring-blue-500/10' : ''}`}>
                            <div className="relative h-48 md:h-56 overflow-hidden">
                                <img src={flow.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                <div className="absolute top-4 left-4 flex gap-2">
                                    <div className="bg-black/60 backdrop-blur-md px-3 md:px-4 py-1 md:py-1.5 rounded-full text-white text-[8px] md:text-[10px] font-black uppercase tracking-widest">{flow.category || 'Geral'}</div>
                                    <div className={`bg-${srs.color}-500/80 backdrop-blur-md px-3 md:px-4 py-1 md:py-1.5 rounded-full text-white text-[8px] md:text-[10px] font-black uppercase tracking-widest`}>{srs.label}</div>
                                </div>
                            </div>
                            <div className="p-6 md:p-8">
                                <h4 className="text-lg md:text-xl font-black text-zinc-800 dark:text-zinc-100 mb-1 md:mb-2 truncate">{flow.title}</h4>
                                <div className="flex items-center gap-2 mb-4 md:mb-6">
                                    <i className="fa-solid fa-calendar-check text-[10px] text-zinc-400"></i>
                                    <span className="text-[9px] md:text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Revisão: {new Date(flow.nextReview).toLocaleDateString('pt-PT')}</span>
                                </div>
                                <div className="flex gap-3 mt-4">
                                    <button onClick={() => setFluxogramaPlay({ flowchart: flow, userAnswers: {}, startTime: Date.now(), results: null })} className="flex-1 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-xs md:text-sm shadow-lg transition-all active:scale-95 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"><i className="fa-solid fa-play"></i> Treinar</button>
                                    <button onClick={() => { if (window.confirm('Excluir este fluxograma?')) setDb(p => ({ ...p, fluxogramas: p.fluxogramas.filter(x => x.id !== flow.id) })); }} className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-red-500 flex items-center justify-center transition-all shadow-sm"><i className="fa-solid fa-trash text-sm"></i></button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            {filteredList.length === 0 && (
                <div className="col-span-full py-24 text-center bg-white dark:bg-zinc-900 rounded-[40px] border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                    <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <i className="fa-solid fa-diagram-project text-3xl"></i>
                    </div>
                    <p className="text-zinc-500 dark:text-zinc-400 font-black text-xl mb-2">Nenhum fluxograma neste baralho.</p>
                    <p className="text-zinc-400 text-sm font-bold">Faça o upload de uma imagem de conduta para preencher este baralho.</p>
                </div>
            )}
        </div>
    );
};

export default FluxogramasTab;
