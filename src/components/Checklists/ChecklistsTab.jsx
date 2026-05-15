import React, { useState } from 'react';

const CHECKLIST_THEMES = [
    { id: 'emerald', bg: 'bg-emerald-600', text: 'text-emerald-600', light: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-500' },
    { id: 'rose', bg: 'bg-rose-600', text: 'text-rose-600', light: 'bg-rose-50 dark:bg-rose-950/40', border: 'border-rose-500' },
    { id: 'amber', bg: 'bg-amber-600', text: 'text-amber-600', light: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-500' },
    { id: 'sky', bg: 'bg-sky-600', text: 'text-sky-600', light: 'bg-sky-50 dark:bg-sky-950/40', border: 'border-sky-500' },
];

const ChecklistsTab = ({ db, setDb, showAlert }) => {
    const [view, setView] = useState('list'); // list, edit, execute
    const [activeData, setActiveData] = useState(null);

    const handleSave = (c) => {
        if (!c.title.trim()) return showAlert('O checklist precisa de um título!');
        setDb(p => {
            const isNew = !p.checklists?.find(x => x.id === c.id);
            const newList = isNew ? [c, ...(p.checklists || [])] : p.checklists.map(x => x.id === c.id ? c : x);
            return { ...p, checklists: newList };
        });
        setView('list');
        showAlert('Checklist guardado com sucesso!');
    };

    if (view === 'list') {
        return (
            <div className="p-10 max-w-7xl mx-auto animate-in fade-in duration-700">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                    <div>
                        <h2 className="text-5xl font-black italic tracking-tighter neon-emerald uppercase">Checklists <span className="text-white/20">DE ELITE</span></h2>
                        <p className="text-zinc-500 font-bold mt-2 uppercase tracking-widest text-xs">Transforme protocolos complexos em rotinas infalíveis.</p>
                    </div>
                    <button 
                        onClick={() => {
                            setActiveData({ id: Date.now(), title: '', description: '', theme: 'emerald', items: [{ id: Date.now() + 1, text: '', note: '', done: false }] });
                            setView('edit');
                        }}
                        className="premium-btn px-8 py-5 rounded-2xl font-black shadow-2xl flex items-center gap-3"
                    >
                        <i className="fa-solid fa-plus"></i> NOVO PROTOCOLO
                    </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {(db.checklists || []).map(c => {
                        const theme = CHECKLIST_THEMES.find(t => t.id === c.theme) || CHECKLIST_THEMES[0];
                        const doneCount = c.items.filter(i => i.done).length;
                        const total = c.items.length;
                        const progress = total === 0 ? 0 : Math.round((doneCount / total) * 100);

                        return (
                            <div 
                                key={c.id} onClick={() => { setActiveData(c); setView('execute'); }}
                                className="bento-card p-10 rounded-[3.5rem] cursor-pointer group relative overflow-hidden border-t-8 border-t-emerald-500/50"
                                style={{ borderTopColor: theme.id === 'emerald' ? '#10b981' : theme.id === 'rose' ? '#f43f5e' : theme.id === 'amber' ? '#f59e0b' : '#0ea5e9' }}
                            >
                                <div className="flex justify-between items-start mb-10">
                                    <div className={`w-14 h-14 ${theme.light} rounded-2xl flex items-center justify-center ${theme.text}`}>
                                        <i className="fa-solid fa-list-check text-xl"></i>
                                    </div>
                                    <span className="bg-zinc-800 text-zinc-400 px-4 py-1 rounded-full font-black text-[10px] tracking-widest">{progress}%</span>
                                </div>
                                <h3 className="text-2xl font-black mb-4 leading-tight">{c.title}</h3>
                                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden mb-8">
                                    <div className={`h-full ${theme.bg} transition-all duration-500`} style={{ width: `${progress}%` }}></div>
                                </div>
                                <div className="flex gap-4">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setActiveData(c); setView('edit'); }}
                                        className="w-12 h-12 bg-white/5 hover:bg-emerald-500/20 text-zinc-400 hover:text-emerald-500 rounded-xl flex items-center justify-center transition-all"
                                    >
                                        <i className="fa-solid fa-pen-nib"></i>
                                    </button>
                                    <button 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            if(window.confirm("Excluir checklist?")) {
                                                setDb(prev => ({ ...prev, checklists: prev.checklists.filter(x => x.id !== c.id) }));
                                            }
                                        }}
                                        className="w-12 h-12 bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-500 rounded-xl flex items-center justify-center transition-all"
                                    >
                                        <i className="fa-solid fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
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
                    <h2 className="text-4xl font-black italic tracking-tighter neon-emerald uppercase">Editar Protocolo</h2>
                </header>

                <div className="bento-card p-10 rounded-[3.5rem] space-y-10">
                    <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Título do Checklist</label>
                        <input 
                            value={activeData.title} 
                            onChange={e => setActiveData({...activeData, title: e.target.value})}
                            className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl p-6 font-black text-xl text-white outline-none focus:border-emerald-500/50 transition-all"
                            placeholder="Ex: Protocolo de Sepse 1h"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-6">Itens de Verificação</label>
                        <div className="space-y-4">
                            {activeData.items.map((item, i) => (
                                <div key={item.id} className="flex gap-4 items-center bg-zinc-900/30 p-4 rounded-2xl border border-white/5 group">
                                    <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center text-xs font-black text-zinc-500">{i+1}</div>
                                    <input 
                                        value={item.text}
                                        onChange={e => {
                                            const newItems = [...activeData.items];
                                            newItems[i].text = e.target.value;
                                            setActiveData({...activeData, items: newItems});
                                        }}
                                        className="flex-1 bg-transparent border-none outline-none font-bold text-white"
                                        placeholder="Nome do passo..."
                                    />
                                    <button 
                                        onClick={() => {
                                            const newItems = activeData.items.filter((_, idx) => idx !== i);
                                            setActiveData({...activeData, items: newItems});
                                        }}
                                        className="text-zinc-600 hover:text-red-500 p-2 transition-colors"
                                    >
                                        <i className="fa-solid fa-trash-can"></i>
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button 
                            onClick={() => setActiveData({...activeData, items: [...activeData.items, { id: Date.now(), text: '', note: '', done: false }]})}
                            className="w-full mt-6 py-5 border-2 border-dashed border-white/5 rounded-[2rem] text-zinc-500 font-black hover:border-emerald-500/30 hover:text-emerald-500 transition-all"
                        >
                            + ADICIONAR PASSO
                        </button>
                    </div>

                    <button 
                        onClick={() => handleSave(activeData)}
                        className="w-full py-6 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-3xl shadow-2xl transition-all active:scale-95"
                    >
                        SALVAR PROTOCOLO
                    </button>
                </div>
            </div>
        );
    }

    if (view === 'execute') {
        const theme = CHECKLIST_THEMES.find(t => t.id === activeData.theme) || CHECKLIST_THEMES[0];
        const doneCount = activeData.items.filter(i => i.done).length;
        const progress = Math.round((doneCount / activeData.items.length) * 100);

        return (
            <div className="p-10 max-w-4xl mx-auto animate-in fade-in duration-500 pb-32">
                <header className="flex items-center gap-8 mb-12">
                    <button onClick={() => setView('list')} className="w-14 h-14 glass-obsidian rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all">
                        <i className="fa-solid fa-arrow-left text-zinc-400"></i>
                    </button>
                    <div className="flex-1">
                        <h2 className="text-4xl font-black italic tracking-tighter text-white">{activeData.title}</h2>
                        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden mt-4">
                            <div className={`h-full ${theme.bg} transition-all duration-500`} style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                </header>

                <div className="space-y-4">
                    {activeData.items.map((item, i) => (
                        <div 
                            key={item.id} 
                            onClick={() => {
                                const newItems = activeData.items.map(it => it.id === item.id ? {...it, done: !it.done} : it);
                                const updated = {...activeData, items: newItems};
                                setActiveData(updated);
                                setDb(p => ({...p, checklists: p.checklists.map(x => x.id === activeData.id ? updated : x)}));
                            }}
                            className={`p-8 rounded-[2.5rem] border-2 transition-all cursor-pointer flex items-center gap-8 ${item.done ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-zinc-900/50 border-white/5 hover:border-white/10'}`}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${item.done ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                                {item.done ? <i className="fa-solid fa-check"></i> : <i className="fa-solid fa-circle-notch"></i>}
                            </div>
                            <span className={`text-xl font-black transition-all ${item.done ? 'text-emerald-500 line-through opacity-50' : 'text-zinc-200'}`}>{item.text}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return null;
};

export default ChecklistsTab;
