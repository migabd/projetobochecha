import React, { useState } from 'react';

const GamesTab = ({ db, setDb, showAlert }) => {
    const [view, setView] = useState('list'); // list, play, edit
    const [activeGame, setActiveGame] = useState(null);
    const [playState, setPlayState] = useState({ deck: [], flipped: [], matched: [], moves: 0, isFinished: false });

    const handleStartGame = (game) => {
        let deck = [];
        game.pairs.forEach(p => {
            deck.push({ id: p.id + '_a', pairId: p.id, data: p.a });
            deck.push({ id: p.id + '_b', pairId: p.id, data: p.b });
        });
        deck = deck.sort(() => 0.5 - Math.random());
        setPlayState({ deck, flipped: [], matched: [], moves: 0, isFinished: false });
        setActiveGame(game);
        setView('play');
    };

    const handleCardClick = (idx) => {
        if (playState.isFinished || playState.flipped.length === 2 || playState.flipped.includes(idx) || playState.matched.includes(idx)) return;

        const newFlipped = [...playState.flipped, idx];
        setPlayState(p => ({ ...p, flipped: newFlipped }));

        if (newFlipped.length === 2) {
            const match = playState.deck[newFlipped[0]].pairId === playState.deck[newFlipped[1]].pairId;
            setTimeout(() => {
                setPlayState(p => {
                    const newMatched = match ? [...p.matched, newFlipped[0], newFlipped[1]] : p.matched;
                    const finished = newMatched.length === playState.deck.length;
                    return { ...p, flipped: [], matched: newMatched, moves: p.moves + 1, isFinished: finished };
                });
            }, 1000);
        }
    };

    if (view === 'list') {
        return (
            <div className="p-10 max-w-7xl mx-auto animate-in fade-in duration-700">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                    <div>
                        <h2 className="text-5xl font-black italic tracking-tighter neon-emerald uppercase">Games <span className="text-white/20">MEMÓRIA</span></h2>
                        <p className="text-zinc-500 font-bold mt-2 uppercase tracking-widest text-xs">Retenção ativa através do desafio visual.</p>
                    </div>
                    <button 
                        onClick={() => {
                            setActiveGame({ id: Date.now(), title: '', pairs: [{ id: Date.now(), a: { type: 'text', val: '' }, b: { type: 'text', val: '' } }] });
                            setView('edit');
                        }}
                        className="premium-btn px-8 py-5 rounded-2xl font-black shadow-2xl flex items-center gap-3"
                    >
                        <i className="fa-solid fa-plus"></i> NOVO JOGO
                    </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {(db.games || []).map(g => (
                        <div 
                            key={g.id} onClick={() => handleStartGame(g)}
                            className="bento-card p-10 rounded-[3.5rem] cursor-pointer group relative overflow-hidden"
                        >
                            <div className="absolute -right-6 -top-6 text-emerald-500/5 group-hover:scale-110 transition-transform">
                                <i className="fa-solid fa-puzzle-piece text-9xl"></i>
                            </div>
                            <div className="relative z-10 space-y-6">
                                <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                                    <i className="fa-solid fa-gamepad text-2xl"></i>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black mb-2">{g.title}</h3>
                                    <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest">{g.pairs.length} PARES</p>
                                </div>
                                <div className="flex gap-4">
                                    <button onClick={(e) => { e.stopPropagation(); setActiveGame(g); setView('edit'); }} className="text-zinc-500 hover:text-emerald-500 transition-colors"><i className="fa-solid fa-pen-nib"></i></button>
                                    <button onClick={(e) => { e.stopPropagation(); if(window.confirm("Excluir jogo?")) setDb(p => ({...p, games: p.games.filter(x => x.id !== g.id)})); }} className="text-zinc-500 hover:text-red-500 transition-colors"><i className="fa-solid fa-trash"></i></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (view === 'play') {
        return (
            <div className="p-10 max-w-6xl mx-auto animate-in fade-in duration-500 pb-32">
                <header className="flex justify-between items-center mb-12">
                    <button onClick={() => setView('list')} className="w-14 h-14 glass-obsidian rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all">
                        <i className="fa-solid fa-arrow-left text-zinc-400"></i>
                    </button>
                    <div className="text-center">
                        <h2 className="text-3xl font-black italic tracking-tighter text-white uppercase">{activeGame.title}</h2>
                        <p className="text-emerald-500 font-black text-xs tracking-widest mt-2 uppercase">MOVIMENTOS: {playState.moves}</p>
                    </div>
                    <div className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center border border-white/5 font-black text-emerald-500">
                        {playState.matched.length / 2}
                    </div>
                </header>

                {playState.isFinished ? (
                    <div className="text-center space-y-8 py-20 animate-in zoom-in duration-700">
                        <div className="w-32 h-32 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/30">
                            <i className="fa-solid fa-trophy text-6xl"></i>
                        </div>
                        <h3 className="text-5xl font-black italic tracking-tighter neon-emerald">VITÓRIA!</h3>
                        <p className="text-zinc-500 font-bold text-xl uppercase tracking-[0.4em]">Concluído em {playState.moves} jogadas.</p>
                        <button onClick={() => setView('list')} className="premium-btn px-12 py-6 rounded-3xl font-black text-xl shadow-2xl transition-all active:scale-95">
                            SAIR DO DESAFIO
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {playState.deck.map((card, idx) => {
                            const isFlipped = playState.flipped.includes(idx) || playState.matched.includes(idx);
                            const isMatched = playState.matched.includes(idx);
                            return (
                                <div 
                                    key={idx} onClick={() => handleCardClick(idx)}
                                    className={`aspect-square rounded-[2rem] cursor-pointer transition-all duration-500 border-2 flex items-center justify-center p-6 text-center ${isFlipped ? (isMatched ? 'bg-emerald-500/10 border-emerald-500/50 shadow-emerald-500/20' : 'bg-zinc-800 border-emerald-500/50 shadow-2xl scale-105') : 'bg-zinc-900 border-white/5 hover:border-emerald-500/30 hover:scale-105'}`}
                                >
                                    {isFlipped ? (
                                        card.data.type === 'image' ? <img src={card.data.val} className="w-full h-full object-contain rounded-xl" /> : <span className="font-black text-xs text-white leading-tight uppercase tracking-widest">{card.data.val}</span>
                                    ) : (
                                        <i className="fa-solid fa-brain text-4xl text-zinc-800"></i>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    if (view === 'edit') {
        return (
            <div className="p-10 max-w-4xl mx-auto animate-in fade-in duration-500 space-y-12 pb-32">
                <header className="flex items-center gap-8">
                    <button onClick={() => setView('list')} className="w-14 h-14 glass-obsidian rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all">
                        <i className="fa-solid fa-arrow-left text-zinc-400"></i>
                    </button>
                    <h2 className="text-4xl font-black italic tracking-tighter neon-emerald uppercase">Criar Jogo</h2>
                </header>

                <div className="bento-card p-10 rounded-[3.5rem] space-y-10">
                    <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Título do Desafio</label>
                        <input 
                            value={activeGame.title} 
                            onChange={e => setActiveGame({...activeGame, title: e.target.value})}
                            className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl p-6 font-black text-xl text-white outline-none focus:border-emerald-500/50 transition-all"
                            placeholder="Ex: Anatomia Cardíaca"
                        />
                    </div>

                    <div className="space-y-6">
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest">Pares de Cartas</label>
                        {activeGame.pairs.map((p, i) => (
                            <div key={p.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-zinc-900/30 rounded-3xl border border-white/5 relative group">
                                <input 
                                    value={p.a.val} 
                                    onChange={e => {
                                        const newPairs = [...activeGame.pairs];
                                        newPairs[i].a.val = e.target.value;
                                        setActiveGame({...activeGame, pairs: newPairs});
                                    }}
                                    className="bg-zinc-800 p-4 rounded-xl text-sm font-bold text-white outline-none focus:ring-1 focus:ring-emerald-500"
                                    placeholder="Lado A (Texto)"
                                />
                                <input 
                                    value={p.b.val} 
                                    onChange={e => {
                                        const newPairs = [...activeGame.pairs];
                                        newPairs[i].b.val = e.target.value;
                                        setActiveGame({...activeGame, pairs: newPairs});
                                    }}
                                    className="bg-zinc-800 p-4 rounded-xl text-sm font-bold text-white outline-none focus:ring-1 focus:ring-emerald-500"
                                    placeholder="Lado B (Texto)"
                                />
                                <button 
                                    onClick={() => {
                                        const newPairs = activeGame.pairs.filter((_, idx) => idx !== i);
                                        setActiveGame({...activeGame, pairs: newPairs});
                                    }}
                                    className="absolute -right-3 -top-3 w-8 h-8 bg-red-500/20 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
                                >
                                    <i className="fa-solid fa-xmark text-xs"></i>
                                </button>
                            </div>
                        ))}
                        <button 
                            onClick={() => setActiveGame({...activeGame, pairs: [...activeGame.pairs, { id: Date.now(), a: { type: 'text', val: '' }, b: { type: 'text', val: '' } }]})}
                            className="w-full py-5 border-2 border-dashed border-white/5 rounded-[2rem] text-zinc-500 font-black hover:border-emerald-500/30 transition-all"
                        >
                            + NOVO PAR
                        </button>
                    </div>

                    <button 
                        onClick={() => {
                            if(!activeGame.title.trim()) return showAlert("Dê um título ao jogo!");
                            setDb(p => ({...p, games: [activeGame, ...(p.games || [])]}));
                            setView('list');
                            showAlert("Jogo salvo!");
                        }}
                        className="w-full py-6 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-3xl shadow-2xl transition-all"
                    >
                        SALVAR JOGO
                    </button>
                </div>
            </div>
        );
    }

    return null;
};

export default GamesTab;
