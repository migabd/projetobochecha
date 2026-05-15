import React, { useState } from 'react';
import { compressImage } from '../../utils/image';

const GamesTab = ({ db, setDb, showAlert, setLightbox, processGameAI }) => {
    const [gameState, setGameState] = useState({ view: 'list', data: null, play: null });

    if (gameState.view === 'edit') {
        const g = gameState.data;
        const updatePair = (pId, field, type, val) => {
            setGameState(prev => ({ 
                ...prev, 
                data: { 
                    ...prev.data, 
                    pairs: prev.data.pairs.map(p => p.id === pId ? { ...p, [field]: { type, val } } : p) 
                } 
            }));
        };
        const addPair = () => setGameState(prev => ({ 
            ...prev, 
            data: { 
                ...prev.data, 
                pairs: [...prev.data.pairs, { id: Date.now() + Math.random(), a: { type: 'text', val: '' }, b: { type: 'text', val: '' } }] 
            } 
        }));
        const removePair = (pId) => setGameState(prev => ({ 
            ...prev, 
            data: { ...prev.data, pairs: prev.data.pairs.filter(p => p.id !== pId) } 
        }));

        const handleImg = (e, pId, field) => {
            const file = e.target.files[0]; 
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (ev) => {
                const b64 = await compressImage(ev.target.result);
                updatePair(pId, field, 'image', b64);
            };
            reader.readAsDataURL(file); 
            e.target.value = '';
        };

        const saveGame = () => {
            if (!g.title.trim()) return showAlert('Dê um título ao jogo!');
            if (g.pairs.length < 2) return showAlert('Adicione pelo menos 2 pares para jogar.');

            setDb(p => {
                const isNew = !p.games?.find(x => x.id === g.id);
                const newGames = isNew ? [g, ...(p.games || [])] : (p.games || []).map(x => x.id === g.id ? g : x);
                return { ...p, games: newGames };
            });
            setGameState({ view: 'list', data: null, play: null });
            showAlert('Jogo guardado com sucesso!');
        };

        const deleteGame = () => {
            if (window.confirm('Excluir este jogo permanentemente?')) {
                setDb(p => ({ ...p, games: (p.games || []).filter(x => x.id !== g.id) }));
                setGameState({ view: 'list', data: null, play: null });
                showAlert('Jogo excluído com sucesso!');
            }
        };

        return (
            <div className="p-6 space-y-6 animate-in fade-in">
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-xl border border-zinc-200 dark:border-zinc-800 max-w-4xl mx-auto">
                    <div className="flex justify-between items-center mb-8 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                        <h2 className="text-2xl font-black text-indigo-600 dark:text-indigo-50 flex items-center gap-3"><i className="fa-solid fa-gamepad"></i> Criador de Jogos</h2>
                        <button onClick={() => setGameState({ view: 'list', data: null, play: null })} className="w-10 h-10 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-red-500 rounded-full transition-colors"><i className="fa-solid fa-xmark text-lg"></i></button>
                    </div>

                    <div className="mb-6">
                        <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Título do Jogo</label>
                        <input value={g.title} onChange={e => setGameState(p => ({ ...p, data: { ...p.data, title: e.target.value } }))} placeholder="Ex: Anatomia Cardíaca" className="w-full p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-zinc-800 dark:text-zinc-100" />
                    </div>

                    <div className="space-y-4 mb-8">
                        {g.pairs.map((p, i) => (
                            <div key={p.id} className="flex flex-col md:flex-row gap-4 p-5 border border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-50 dark:bg-zinc-950 relative group">
                                <button onClick={() => removePair(p.id)} className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-red-100 text-red-500 dark:bg-red-900/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md"><i className="fa-solid fa-trash text-xs"></i></button>

                                {['a', 'b'].map(side => (
                                    <div key={side} className="flex-1 flex flex-col gap-2">
                                        <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Par {i + 1} - Lado {side.toUpperCase()}</span>
                                        {p[side].type === 'image' ? (
                                            <div className="relative h-24 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden flex items-center justify-center group/img">
                                                <img src={p[side].val} onClick={(e) => { e.stopPropagation(); setLightbox(p[side].val); }} className="max-h-full max-w-full object-contain cursor-zoom-in hover:scale-105 transition-transform" title="Clique para ampliar" />
                                                <button onClick={() => updatePair(p.id, side, 'text', '')} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-all font-bold text-sm"><i className="fa-solid fa-trash mr-2"></i> Remover Imagem</button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2 h-24">
                                                <textarea value={p[side].val} onChange={(e) => updatePair(p.id, side, 'text', e.target.value)} placeholder="Texto correspondente..." className="flex-1 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-bold text-sm text-zinc-800 dark:text-zinc-200 shadow-sm"></textarea>
                                                <label className="w-16 shrink-0 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors border border-indigo-100 dark:border-indigo-800 shadow-sm" title="Adicionar Imagem">
                                                    <i className="fa-solid fa-image text-xl mb-1"></i><span className="text-[9px] font-black uppercase">Img</span>
                                                    <input type="file" accept="image/*" className="hidden" onChange={e => handleImg(e, p.id, side)} />
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <button onClick={addPair} className="flex-1 py-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-black hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"><i className="fa-solid fa-plus"></i> Novo Par</button>
                        <button onClick={saveGame} className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white font-black hover:bg-indigo-700 transition-colors shadow-lg flex items-center justify-center gap-2"><i className="fa-solid fa-floppy-disk"></i> Salvar Jogo</button>
                        {db.games?.some(x => x.id === g.id) && (
                            <button onClick={deleteGame} className="py-4 px-6 rounded-2xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-black hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors shadow-sm flex items-center justify-center gap-2" title="Excluir este jogo permanentemente"><i className="fa-solid fa-trash"></i> Excluir</button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (gameState.view === 'play') {
        const { deck, flipped, matched, moves, isFinished } = gameState.play;

        const handleCardClick = (idx) => {
            if (isFinished || flipped.length === 2 || flipped.includes(idx) || matched.includes(idx)) return;

            const newFlipped = [...flipped, idx];
            setGameState(prev => ({ ...prev, play: { ...prev.play, flipped: newFlipped } }));

            if (newFlipped.length === 2) {
                const match = deck[newFlipped[0]].pairId === deck[newFlipped[1]].pairId;
                setTimeout(() => {
                    setGameState(prev => {
                        const p = prev.play;
                        const newMatched = match ? [...p.matched, newFlipped[0], newFlipped[1]] : p.matched;
                        const finished = newMatched.length === deck.length;
                        return {
                            ...prev, play: {
                                ...p,
                                flipped: [],
                                matched: newMatched,
                                moves: p.moves + 1,
                                isFinished: finished
                            }
                        };
                    });
                }, 1200); 
            }
        };

        return (
            <div className="p-6 space-y-6 animate-in fade-in">
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-xl border border-zinc-200 dark:border-zinc-800 min-h-[60vh]">
                    <div className="flex justify-between items-center mb-8 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                        <div>
                            <h2 className="text-2xl font-black text-indigo-600 dark:text-indigo-500">{gameState.data.title}</h2>
                            <p className="text-sm font-bold text-zinc-400">Movimentos: <span className="text-indigo-500">{moves}</span> | Pares: {matched.length / 2}/{deck.length / 2}</p>
                        </div>
                        <button onClick={() => setGameState({ view: 'list', data: null, play: null })} className="px-6 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-black rounded-2xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">Voltar</button>
                    </div>

                    {isFinished ? (
                        <div className="text-center py-20 animate-in zoom-in duration-500">
                            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/20"><i className="fa-solid fa-trophy text-5xl"></i></div>
                            <h3 className="text-4xl font-black text-emerald-600 mb-4">Desafio Concluído!</h3>
                            <p className="text-lg text-zinc-600 dark:text-zinc-400 font-bold mb-8">Memória afiada. Resolvido em {moves} movimentos.</p>
                            <button onClick={() => setGameState({ view: 'list', data: null, play: null })} className="px-10 py-4 bg-indigo-600 text-white rounded-3xl font-black shadow-xl hover:bg-indigo-700 transition-all text-lg">Escolher Outro Jogo</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {deck.map((card, idx) => {
                                const isFlipped = flipped.includes(idx) || matched.includes(idx);
                                const isMatchedThis = matched.includes(idx);
                                return (
                                    <div key={idx} onClick={() => handleCardClick(idx)} className={`aspect-[4/3] rounded-3xl cursor-pointer transition-all duration-300 border-[3px] flex items-center justify-center p-2 sm:p-3 text-center shadow-sm relative overflow-hidden ${isFlipped ? (isMatchedThis ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400 dark:border-emerald-600' : 'bg-white dark:bg-zinc-800 border-indigo-400 dark:border-indigo-600 scale-[1.02] shadow-lg') : 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:scale-105'}`}>
                                        {isFlipped ? (
                                            card.data.type === 'image'
                                                ? <img src={card.data.val} onClick={(e) => { e.stopPropagation(); setLightbox(card.data.val); }} className="w-full h-full object-contain rounded-xl animate-in fade-in cursor-zoom-in" title="Clique para ampliar" />
                                                : <div className="w-full h-full overflow-y-auto flex flex-col justify-center" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}><span className="font-bold text-xs sm:text-sm text-zinc-800 dark:text-zinc-100 break-words leading-tight animate-in fade-in m-auto">{card.data.val}</span></div>
                                        ) : (
                                            <i className="fa-solid fa-brain text-4xl text-indigo-300 dark:text-indigo-700/50 opacity-50"></i>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8 animate-in fade-in">
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-xl border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
                <div>
                    <h2 className="text-2xl font-black text-indigo-600 dark:text-indigo-500 mb-2"><i className="fa-solid fa-gamepad mr-2"></i> Jogos de Memória</h2>
                    <p className="text-sm font-bold text-zinc-400">Crie os seus próprios jogos associando imagens a textos ou textos a textos para reter a memória ativamente.</p>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                    <input type="file" id="game-ai-up" accept="image/*,application/pdf" onChange={(e) => {
                        const file = e.target.files[0]; if (!file) return;
                        const reader = new FileReader();
                        reader.onload = async (ev) => {
                            const b64 = await compressImage(ev.target.result);
                            processGameAI(b64);
                        };
                        reader.readAsDataURL(file); e.target.value = '';
                    }} className="hidden" />
                    <label htmlFor="game-ai-up" className="w-full md:w-auto cursor-pointer bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-8 py-4 rounded-3xl font-black shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95 whitespace-nowrap border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"><i className="fa-solid fa-wand-magic-sparkles text-lg text-amber-500"></i> Gerar com IA</label>
                    <button onClick={() => setGameState({ view: 'edit', data: { id: Date.now(), title: '', pairs: [{ id: Date.now() + 1, a: { type: 'text', val: '' }, b: { type: 'text', val: '' } }, { id: Date.now() + 2, a: { type: 'text', val: '' }, b: { type: 'text', val: '' } }] }, play: null })} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-3xl font-black shadow-lg shadow-indigo-600/20 flex items-center gap-3 transition-all active:scale-95 shrink-0 whitespace-nowrap"><i className="fa-solid fa-plus text-lg"></i> Criar Jogo</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(db.games || []).map(g => (
                    <div key={g.id} className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-zinc-200 dark:border-zinc-800 shadow-lg group transition-all flex flex-col relative overflow-hidden">
                        <div className="absolute -right-6 -top-6 text-indigo-50 dark:text-indigo-900/10 transition-transform group-hover:scale-110 z-0">
                            <i className="fa-solid fa-puzzle-piece text-9xl"></i>
                        </div>
                        <div className="relative z-10 flex-1">
                            <h3 className="font-black text-xl text-zinc-800 dark:text-zinc-100 mb-2 leading-tight pr-8">{g.title}</h3>
                            <p className="text-zinc-500 font-bold text-sm uppercase tracking-widest mb-8">{g.pairs.length} Pares de Cartas</p>
                        </div>

                        <div className="flex gap-3 relative z-10">
                            <button onClick={() => {
                                let deck = [];
                                g.pairs.forEach(p => {
                                    if ((p.a.val || p.a.type === 'image') && (p.b.val || p.b.type === 'image')) {
                                        deck.push({ id: p.id + '_a', pairId: p.id, data: p.a });
                                        deck.push({ id: p.id + '_b', pairId: p.id, data: p.b });
                                    }
                                });
                                deck = deck.sort(() => 0.5 - Math.random());
                                setGameState({ view: 'play', data: g, play: { deck, flipped: [], matched: [], moves: 0, isFinished: false } });
                            }} className="flex-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 py-3 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-indigo-200 dark:hover:bg-indigo-900/60 transition-colors"><i className="fa-solid fa-play"></i> Jogar</button>
                            <button onClick={() => setGameState({ view: 'edit', data: g, play: null })} className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-indigo-600 rounded-2xl flex items-center justify-center transition-colors"><i className="fa-solid fa-pen-nib"></i></button>
                            <button onClick={() => { if (window.confirm('Excluir este jogo permanentemente?')) setDb(p => ({ ...p, games: p.games.filter(x => x.id !== g.id) })); }} className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-2xl flex items-center justify-center transition-colors"><i className="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                ))}
                {(!db.games || db.games.length === 0) && (
                    <div className="col-span-full py-20 text-center text-zinc-400 font-black italic">
                        <i className="fa-solid fa-gamepad text-6xl mb-4 block opacity-30"></i>
                        Nenhum jogo criado ainda. <br />Crie um jogo da memória para estudar!
                    </div>
                )}
            </div>
        </div>
    );
};

export default GamesTab;
