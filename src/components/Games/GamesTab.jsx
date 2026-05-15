import React, { useState } from 'react';
import { compressImage } from '../../utils/image';

const GamesTab = ({ db, setDb, showAlert, setLightbox, callIA }) => {
    const [gameState, setGameState] = useState({ view: 'list', data: null, play: null });

    const processGameAI = async (b64) => {
        showAlert("✨ IA analisando material para o jogo...");
        try {
            const res = await callIA([
                { role: 'user', parts: [{ text: "Gere 8 pares de termos médicos associados (Conceito e Definição Curta). Retorne APENAS JSON: { 'title': '...', 'pairs': [{'a': 'termo', 'b': 'definição'}] }" }, { inlineData: { mimeType: 'image/jpeg', data: b64.split(',')[1] } }] }
            ]);
            const match = res.match(/\{[\s\S]*\}/);
            if (match) {
                const data = JSON.parse(match[0]);
                const newGame = {
                    id: Date.now(),
                    title: data.title,
                    pairs: data.pairs.map(p => ({ id: Math.random(), a: { type: 'text', val: p.a }, b: { type: 'text', val: p.b } }))
                };
                setDb(p => ({ ...p, games: [newGame, ...(p.games || [])] }));
                showAlert("✅ Jogo gerado com sucesso!");
            }
        } catch (e) { showAlert("Erro na IA."); }
    };

    if (gameState.view === 'edit') {
        const g = gameState.data;
        const updatePair = (pId, field, type, val) => {
            setGameState(prev => ({ ...prev, data: { ...prev.data, pairs: prev.data.pairs.map(p => p.id === pId ? { ...p, [field]: { type, val } } : p) } }));
        };
        const saveGame = () => {
            if (!g.title.trim()) return showAlert('Dê um título!');
            setDb(p => {
                const isNew = !p.games?.find(x => x.id === g.id);
                return { ...p, games: isNew ? [g, ...(p.games || [])] : p.games.map(x => x.id === g.id ? g : x) };
            });
            setGameState({ view: 'list', data: null, play: null });
        };

        return (
            <div className="p-6 space-y-6 animate-in fade-in max-w-4xl mx-auto">
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-[40px] border shadow-xl">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-2xl font-black text-indigo-600">Editor de Jogo</h2>
                        <button onClick={() => setGameState({ view: 'list', data: null, play: null })} className="text-zinc-400"><i className="fa-solid fa-xmark"></i></button>
                    </div>
                    <input value={g.title} onChange={e => setGameState(p => ({ ...p, data: { ...p.data, title: e.target.value } }))} className="w-full p-4 mb-6 rounded-2xl border bg-zinc-50 dark:bg-zinc-950 font-bold" placeholder="Título do Jogo" />
                    <div className="space-y-4 mb-8">
                        {g.pairs.map((p, i) => (
                            <div key={p.id} className="flex gap-4 p-4 border rounded-2xl bg-zinc-50 dark:bg-zinc-950">
                                {['a', 'b'].map(side => (
                                    <div key={side} className="flex-1">
                                        {p[side].type === 'image' ? (
                                            <img src={p[side].val} className="h-20 w-full object-contain" />
                                        ) : (
                                            <textarea value={p[side].val} onChange={e => updatePair(p.id, side, 'text', e.target.value)} className="w-full h-20 p-2 text-xs border rounded-xl" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                    <button onClick={saveGame} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black">Salvar</button>
                </div>
            </div>
        );
    }

    if (gameState.view === 'play') {
        const { deck, flipped, matched, moves, isFinished } = gameState.play;
        const handleCardClick = (idx) => {
            if (isFinished || flipped.length === 2 || flipped.includes(idx) || matched.includes(idx)) return;
            const newFlipped = [...flipped, idx];
            setGameState(p => ({ ...p, play: { ...p.play, flipped: newFlipped } }));
            if (newFlipped.length === 2) {
                const match = deck[newFlipped[0]].pairId === deck[newFlipped[1]].pairId;
                setTimeout(() => {
                    setGameState(p => {
                        const play = p.play;
                        const newMatched = match ? [...play.matched, newFlipped[0], newFlipped[1]] : play.matched;
                        return { ...p, play: { ...play, flipped: [], matched: newMatched, moves: play.moves + 1, isFinished: newMatched.length === deck.length } };
                    });
                }, 1000);
            }
        };

        return (
            <div className="p-6 max-w-5xl mx-auto animate-in zoom-in">
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-[40px] border shadow-2xl">
                    <div className="flex justify-between mb-8">
                        <h2 className="text-2xl font-black">{gameState.data.title}</h2>
                        <div className="font-black text-indigo-500">Movimentos: {moves}</div>
                    </div>
                    {isFinished ? (
                        <div className="text-center py-20">
                            <h3 className="text-4xl font-black text-emerald-500 mb-8">Parabéns!</h3>
                            <button onClick={() => setGameState({ view: 'list', data: null, play: null })} className="px-10 py-4 bg-indigo-600 text-white rounded-3xl font-black">Voltar</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {deck.map((card, idx) => (
                                <div key={idx} onClick={() => handleCardClick(idx)} className={`aspect-square rounded-2xl cursor-pointer border-2 flex items-center justify-center p-4 text-center transition-all ${flipped.includes(idx) || matched.includes(idx) ? 'bg-white dark:bg-zinc-800 border-indigo-500' : 'bg-indigo-50 dark:bg-indigo-900/30 border-transparent'}`}>
                                    {(flipped.includes(idx) || matched.includes(idx)) ? (card.data.type === 'image' ? <img src={card.data.val} className="max-h-full" /> : <span className="text-[10px] font-black">{card.data.val}</span>) : <i className="fa-solid fa-brain text-indigo-200"></i>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8 animate-in fade-in max-w-7xl mx-auto">
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[40px] border shadow-lg flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-indigo-600 mb-2">Memory Games</h2>
                    <p className="text-sm font-bold text-zinc-400">Associação ativa para memorização de elite.</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => setGameState({ view: 'edit', data: { id: Date.now(), title: '', pairs: [{ id: Date.now() + 1, a: { type: 'text', val: '' }, b: { type: 'text', val: '' } }] } })} className="bg-indigo-600 text-white px-8 py-4 rounded-3xl font-black">Criar Jogo</button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(db.games || []).map(g => (
                    <div key={g.id} className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border shadow hover:shadow-xl transition-all">
                        <h3 className="font-black text-xl mb-4">{g.title}</h3>
                        <div className="flex gap-2">
                            <button onClick={() => {
                                let deck = [];
                                g.pairs.forEach(p => { deck.push({ id: p.id + '_a', pairId: p.id, data: p.a }); deck.push({ id: p.id + '_b', pairId: p.id, data: p.b }); });
                                setGameState({ view: 'play', data: g, play: { deck: deck.sort(() => 0.5 - Math.random()), flipped: [], matched: [], moves: 0, isFinished: false } });
                            }} className="flex-1 bg-indigo-100 text-indigo-700 py-3 rounded-xl font-black">Jogar</button>
                            <button onClick={() => setDb(p => ({ ...p, games: p.games.filter(x => x.id !== g.id) }))} className="p-3 bg-rose-50 text-rose-500 rounded-xl"><i className="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GamesTab;
