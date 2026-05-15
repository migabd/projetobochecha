import React, { useState } from 'react';

const InsightsTab = ({ db, setDb, showAlert }) => {
    const [newInsight, setNewInsight] = useState('');

    const addInsight = () => {
        if (!newInsight.trim()) return;
        const entry = {
            id: Date.now(),
            text: newInsight,
            date: new Date().toLocaleDateString('pt-PT')
        };
        setDb(prev => ({ ...prev, perceptions: [entry, ...(prev.perceptions || [])] }));
        setNewInsight('');
        showAlert('Insight clínico gravado na memória eterna.');
    };

    const deleteInsight = (id) => {
        if (window.confirm('Excluir este insight?')) {
            setDb(prev => ({ ...prev, perceptions: prev.perceptions.filter(x => x.id !== id) }));
        }
    };

    return (
        <div className="p-10 max-w-7xl mx-auto animate-in fade-in duration-700 pb-32">
            <header className="mb-12">
                <h2 className="text-5xl font-black italic tracking-tighter neon-emerald uppercase">Insights <span className="text-white/20">Clínicos</span></h2>
                <p className="text-zinc-500 font-bold mt-2 uppercase tracking-widest text-xs">Capture relâmpagos de genialidade médica.</p>
            </header>

            <div className="bento-card p-10 rounded-[4rem] border-amber-500/20 bg-amber-500/[0.02] mb-12">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="flex-1 w-full relative">
                        <div className="absolute top-6 left-6 text-amber-500 text-2xl animate-pulse"><i className="fa-solid fa-bolt"></i></div>
                        <textarea 
                            value={newInsight} 
                            onChange={e => setNewInsight(e.target.value)}
                            placeholder="Nova percepção clínica ou padrão identificado..."
                            className="w-full h-40 p-10 pl-16 bg-zinc-950/50 border border-white/5 rounded-[3rem] outline-none focus:border-amber-500/50 transition-all font-black text-xl text-white resize-none shadow-inner"
                        />
                    </div>
                    <button 
                        onClick={addInsight}
                        disabled={!newInsight.trim()}
                        className="w-full md:w-auto px-12 py-10 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black rounded-[3rem] shadow-2xl shadow-amber-500/20 transition-all active:scale-90 disabled:opacity-20 flex items-center justify-center gap-4 text-xl"
                    >
                        GRAVAR INSIGHT
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {(db.perceptions || []).map(p => (
                    <div key={p.id} className="bento-card p-10 rounded-[3.5rem] border-t-8 border-t-amber-500 relative group hover:scale-[1.02] transition-transform">
                        <p className="text-xl font-black leading-relaxed text-zinc-200 mb-8 italic">"{p.text}"</p>
                        <div className="flex justify-between items-center border-t border-white/5 pt-6">
                            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2"><i className="fa-regular fa-calendar"></i> {p.date}</span>
                            <button 
                                onClick={() => deleteInsight(p.id)}
                                className="w-10 h-10 bg-white/5 hover:bg-red-500/20 text-zinc-600 hover:text-red-500 rounded-xl flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                            >
                                <i className="fa-solid fa-trash-can text-xs"></i>
                            </button>
                        </div>
                    </div>
                ))}

                {(db.perceptions || []).length === 0 && (
                    <div className="col-span-full py-40 text-center opacity-10 flex flex-col items-center">
                        <i className="fa-solid fa-bolt text-9xl mb-8"></i>
                        <h3 className="text-4xl font-black uppercase tracking-tighter">Nenhum insight gravado</h3>
                        <p className="text-sm font-bold uppercase tracking-widest mt-4">Sua mente brilha no caos. Anote aqui quando a ficha cair.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InsightsTab;
