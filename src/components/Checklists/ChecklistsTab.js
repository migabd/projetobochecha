import React, { useState } from 'react';

const CHECKLIST_THEMES = [
    { id: 'emerald', bg: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-50', border: 'border-emerald-100' },
    { id: 'blue', bg: 'bg-blue-500', text: 'text-blue-600', light: 'bg-blue-50', border: 'border-blue-100' },
    { id: 'indigo', bg: 'bg-indigo-500', text: 'text-indigo-600', light: 'bg-indigo-50', border: 'border-indigo-100' },
    { id: 'rose', bg: 'bg-rose-500', text: 'text-rose-600', light: 'bg-rose-50', border: 'border-rose-100' },
    { id: 'amber', bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-50', border: 'border-amber-100' }
];

const ChecklistsTab = ({ db, setDb, showAlert }) => {
    const [checklistState, setChecklistState] = useState({ view: 'list', data: null });

    if (checklistState.view === 'edit') {
        const c = checklistState.data;
        const updateChecklist = (field, val) => setChecklistState(p => ({ ...p, data: { ...p.data, [field]: val } }));

        const addItem = () => updateChecklist('items', [...c.items, { id: Date.now() + Math.random(), text: '', note: '', done: false }]);
        const updateItem = (id, field, val) => updateChecklist('items', c.items.map(i => i.id === id ? { ...i, [field]: val } : i));
        const removeItem = (id) => updateChecklist('items', c.items.filter(i => i.id !== id));

        const saveChecklist = () => {
            if (!c.title.trim()) return showAlert('O checklist precisa de um título!');
            if (c.items.length === 0 || c.items.every(i => !i.text.trim())) return showAlert('Adicione pelo menos um item válido.');

            setDb(p => {
                const cleanItems = c.items.filter(i => i.text.trim());
                const finalChecklist = { ...c, items: cleanItems, lastUpdated: Date.now() };
                const isNew = !p.checklists?.find(x => x.id === c.id);
                return { ...p, checklists: isNew ? [finalChecklist, ...(p.checklists || [])] : (p.checklists || []).map(x => x.id === c.id ? finalChecklist : x) };
            });
            setChecklistState({ view: 'list', data: null });
            showAlert('Checklist guardado com sucesso!');
        };

        const selectedTheme = CHECKLIST_THEMES.find(t => t.id === c.theme) || CHECKLIST_THEMES[0];

        return (
            <div className="max-w-3xl mx-auto p-6 space-y-6 animate-in fade-in pb-20">
                <button onClick={() => setChecklistState({ view: 'list', data: null })} className="flex items-center gap-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 font-bold transition-colors mb-4"><i className="fa-solid fa-arrow-left"></i> Voltar à Galeria</button>

                <div className={`bg-white dark:bg-zinc-900 p-8 rounded-[40px] shadow-xl border-t-8 border-x border-b border-zinc-200 dark:border-zinc-800 ${selectedTheme.border.replace('border-', 'border-t-')}`}>
                    <div className="mb-8">
                        <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Tema de Cores</label>
                        <div className="flex gap-3">
                            {CHECKLIST_THEMES.map(theme => (
                                <button key={theme.id} onClick={() => updateChecklist('theme', theme.id)} className={`w-8 h-8 rounded-full transition-all ${theme.bg} ${c.theme === theme.id ? 'ring-4 ring-zinc-200 dark:ring-zinc-700 scale-110 shadow-md' : 'opacity-40 hover:opacity-100'}`} title={`Tema ${theme.id}`}></button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-6 mb-10">
                        <div>
                            <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Título do Protocolo / Checklist</label>
                            <input value={c.title} onChange={e => updateChecklist('title', e.target.value)} placeholder="Ex: Protocolo de Sepse - 1ª Hora" className={`w-full p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 font-black text-xl outline-none focus:ring-2 focus:ring-${c.theme}-500 transition-all border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100`} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Descrição Curta (Opcional)</label>
                            <textarea value={c.description} onChange={e => updateChecklist('description', e.target.value)} placeholder="Ex: Passos críticos para evitar mortalidade..." className="w-full p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 font-bold text-sm outline-none focus:ring-2 focus:ring-zinc-500 transition-all resize-none border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400" rows="2"></textarea>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-black text-zinc-700 dark:text-zinc-300">Itens de Verificação</h3>
                        </div>

                        {c.items.map((item, i) => (
                            <div key={item.id} className={`p-4 rounded-2xl border transition-all bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 group relative`}>
                                <div className="flex items-start gap-4">
                                    <div className={`mt-1 w-6 h-6 rounded-full border-2 border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-[10px] font-black text-zinc-400`}>{i + 1}</div>
                                    <div className="flex-1 space-y-3">
                                        <input value={item.text} onChange={e => updateItem(item.id, 'text', e.target.value)} placeholder="Nome do passo (Ex: Medir Lactato)" className="w-full bg-transparent font-bold text-zinc-800 dark:text-zinc-100 outline-none border-b border-dashed border-zinc-300 dark:border-zinc-700 focus:border-zinc-500 pb-1" />
                                        <div className="flex gap-2">
                                            <i className="fa-solid fa-lightbulb text-amber-500 mt-2 opacity-70"></i>
                                            <textarea value={item.note} onChange={e => updateItem(item.id, 'note', e.target.value)} placeholder="Dica didática ou detalhe do protocolo (opcional)..." rows="1" className="w-full bg-transparent text-xs font-medium text-zinc-500 dark:text-zinc-400 italic outline-none resize-none"></textarea>
                                        </div>
                                    </div>
                                    <button onClick={() => removeItem(item.id)} className="text-zinc-300 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400 transition-colors p-2"><i className="fa-solid fa-trash"></i></button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 flex flex-col sm:flex-row gap-4">
                        <button onClick={addItem} className="flex-1 py-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-black hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors shadow-sm"><i className="fa-solid fa-plus mr-2"></i> Adicionar Passo</button>
                        <button onClick={saveChecklist} className={`flex-1 py-4 rounded-2xl text-white font-black transition-colors shadow-lg shadow-${c.theme}-500/30 ${selectedTheme.bg} hover:brightness-110`}><i className="fa-solid fa-floppy-disk mr-2"></i> Gravar Checklist</button>
                    </div>
                </div>
            </div>
        );
    }

    if (checklistState.view === 'execute') {
        const c = db.checklists?.find(x => x.id === checklistState.data?.id);
        if (!c) return null;

        const theme = CHECKLIST_THEMES.find(t => t.id === c.theme) || CHECKLIST_THEMES[0];
        const completedCount = c.items.filter(i => i.done).length;
        const totalCount = c.items.length;
        const progress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
        const isAllDone = totalCount > 0 && completedCount === totalCount;

        const toggleItem = (itemId) => {
            setDb(p => ({
                ...p, checklists: p.checklists.map(chk => {
                    if (chk.id !== c.id) return chk;
                    return {
                        ...chk,
                        lastUpdated: Date.now(),
                        items: chk.items.map(i => i.id === itemId ? { ...i, done: !i.done } : i)
                    };
                })
            }));
        };

        const resetChecklist = () => {
            if (window.confirm('Deseja desmarcar todos os itens e recomeçar?')) {
                setDb(p => ({
                    ...p, checklists: p.checklists.map(chk => chk.id === c.id ? { ...chk, items: chk.items.map(i => ({ ...i, done: false })) } : chk)
                }));
            }
        };

        return (
            <div className="max-w-3xl mx-auto p-6 space-y-6 animate-in fade-in pb-24">
                <button onClick={() => setChecklistState({ view: 'list', data: null })} className="flex items-center gap-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 font-bold transition-colors mb-2"><i className="fa-solid fa-arrow-left"></i> Voltar à Galeria</button>

                <div className="bg-white dark:bg-zinc-900 rounded-[40px] shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                    <div className={`${theme.light} p-8 md:p-10 border-b ${theme.border} relative overflow-hidden transition-all`}>
                        {isAllDone && <div className="absolute inset-0 bg-white/20 dark:bg-black/20 flex items-center justify-center pointer-events-none"><i className={`fa-solid fa-check text-[150px] opacity-10 ${theme.text}`}></i></div>}
                        <div className="relative z-10">
                            <div className="flex justify-between items-start gap-4 mb-6">
                                <div>
                                    <h2 className={`text-3xl font-black ${theme.text} mb-2 leading-tight`}>{c.title}</h2>
                                    {c.description && <p className="text-zinc-600 dark:text-zinc-400 font-medium">{c.description}</p>}
                                </div>
                                <button onClick={resetChecklist} className="w-10 h-10 shrink-0 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 shadow-sm transition-colors" title="Recomeçar Checklist"><i className="fa-solid fa-rotate-left"></i></button>
                            </div>

                            <div className="bg-white/60 dark:bg-zinc-950/40 rounded-2xl p-4 border border-white/40 dark:border-zinc-800/50 backdrop-blur-sm">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Progresso</span>
                                    <span className={`text-sm font-black ${theme.text}`}>{completedCount} / {totalCount} ({progress}%)</span>
                                </div>
                                <div className="h-2.5 bg-zinc-200/50 dark:bg-zinc-800 rounded-full overflow-hidden">
                                    <div className={`h-full ${theme.bg} transition-all duration-500 ease-out`} style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 md:p-8 space-y-3">
                        {c.items.map((item, i) => (
                            <div key={item.id} onClick={() => toggleItem(item.id)} className={`group p-4 md:p-5 rounded-3xl border-2 transition-all cursor-pointer flex gap-4 ${item.done ? 'bg-zinc-50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 opacity-60' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 shadow-sm'}`}>
                                <div className="mt-1">
                                    <input type="checkbox" checked={item.done} onChange={() => { }} className={`check-custom ${item.done ? theme.text : 'text-zinc-300 dark:text-zinc-600'}`} />
                                </div>
                                <div className="flex-1 pt-0.5">
                                    <h4 className={`text-lg font-bold leading-tight transition-colors ${item.done ? 'line-through text-zinc-500' : 'text-zinc-800 dark:text-zinc-100'}`}>{item.text}</h4>
                                    {item.note && (
                                        <div className={`mt-2 flex gap-2 items-start ${item.done ? 'opacity-50' : ''}`}>
                                            <i className="fa-solid fa-lightbulb text-amber-500 mt-1 flex-shrink-0"></i>
                                            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 italic leading-relaxed">{item.note}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    {isAllDone && (
                        <div className={`p-6 border-t border-zinc-100 dark:border-zinc-800 text-center font-black ${theme.text} bg-zinc-50 dark:bg-zinc-950 animate-in slide-in-from-bottom-4`}>
                            <i className="fa-solid fa-check-double text-2xl mb-2 block"></i>
                            Protocolo concluído com sucesso!
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8 animate-in fade-in">
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[40px] shadow-xl border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
                <div>
                    <h2 className="text-2xl font-black text-emerald-600 dark:text-emerald-500 mb-2"><i className="fa-solid fa-list-check mr-2"></i> Checklists Médicos</h2>
                    <p className="text-sm font-bold text-zinc-400">Crie protocolos didáticos passo-a-passo. Ótimo para fixar rotinas de emergência ou enfermarias.</p>
                </div>
                <button onClick={() => setChecklistState({ view: 'edit', data: { id: Date.now(), title: '', description: '', theme: 'emerald', items: [{ id: Date.now() + 1, text: '', note: '', done: false }] } })} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-3xl font-black shadow-lg shadow-emerald-600/20 flex items-center gap-3 transition-all active:scale-95 shrink-0 whitespace-nowrap"><i className="fa-solid fa-plus text-lg"></i> Criar Protocolo</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(db.checklists || []).map(c => {
                    const theme = CHECKLIST_THEMES.find(t => t.id === c.theme) || CHECKLIST_THEMES[0];
                    const doneCount = c.items.filter(i => i.done).length;
                    const total = c.items.length;
                    const isAllDone = total > 0 && doneCount === total;

                    return (
                        <div key={c.id} className="bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-200 dark:border-zinc-800 shadow-lg group transition-all flex flex-col relative overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-xl" onClick={() => setChecklistState({ view: 'execute', data: { id: c.id } })}>
                            <div className={`h-3 w-full ${theme.bg}`}></div>
                            <div className="p-6 md:p-8 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-4 gap-2">
                                    <h3 className={`font-black text-xl ${theme.text} leading-tight line-clamp-2`}>{c.title}</h3>
                                </div>
                                {c.description && <p className="text-sm font-bold text-zinc-500 mb-6 line-clamp-2 leading-relaxed">{c.description}</p>}

                                <div className="mt-auto">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-xs font-black uppercase text-zinc-400 tracking-widest">{total} Passos</span>
                                        <span className={`font-black ${isAllDone ? theme.text : 'text-zinc-400'}`}>{doneCount}/{total}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                        <div className={`h-full ${theme.bg} transition-all duration-300`} style={{ width: `${total === 0 ? 0 : (doneCount / total) * 100}%` }}></div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800 p-4 flex justify-between items-center">
                                <span className="text-xs font-bold text-zinc-400 flex items-center gap-1"><i className="fa-regular fa-clock"></i> Atualizado</span>
                                <div className="flex gap-2">
                                    <button onClick={(e) => { e.stopPropagation(); setChecklistState({ view: 'edit', data: c }); }} className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-500 hover:text-indigo-500 transition-colors"><i className="fa-solid fa-pen-nib"></i></button>
                                    <button onClick={(e) => { e.stopPropagation(); if (window.confirm('Excluir este checklist?')) setDb(p => ({ ...p, checklists: p.checklists.filter(x => x.id !== c.id) })); }} className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-500 hover:text-red-500 transition-colors"><i className="fa-solid fa-trash"></i></button>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {(!db.checklists || db.checklists.length === 0) && (
                    <div className="col-span-full py-20 text-center text-zinc-400 font-black italic">
                        <i className="fa-solid fa-list-check text-6xl mb-4 block opacity-30"></i>
                        Nenhum checklist criado. <br />Crie protocolos passo-a-passo para memorização e prática!
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChecklistsTab;
