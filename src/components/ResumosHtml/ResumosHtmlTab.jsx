import React, { useState } from 'react';

const ResumosHtmlTab = ({ db, setDb, showAlert, callIA }) => {
    const [view, setView] = useState('list'); // list, edit
    const [editor, setEditor] = useState({ id: null, title: '', category: 'Clínica Médica', content: '', isGenerating: false, aiPrompt: '', materialText: '' });
    const [search, setSearch] = useState('');

    const handleSave = () => {
        if (!editor.title.trim()) return showAlert("O resumo precisa de um título!");
        setDb(p => {
            const isNew = !p.summariesHtml?.find(x => x.id === editor.id);
            const newList = isNew ? [{...editor, id: Date.now(), date: new Date().toLocaleDateString('pt-PT')}, ...(p.summariesHtml || [])] : p.summariesHtml.map(x => x.id === editor.id ? editor : x);
            return { ...p, summariesHtml: newList };
        });
        setView('list');
        showAlert("Resumo salvo com sucesso!");
    };

    const handleGenerate = async () => {
        if (!editor.aiPrompt.trim() && !editor.materialText.trim()) return showAlert("Forneça um tema ou material.");
        setEditor(p => ({ ...p, isGenerating: true }));
        
        const prompt = `Você é um Professor de Medicina de Elite. Crie um resumo HTML aprofundado com Tailwind CSS. 
        Tema: ${editor.aiPrompt} 
        Material: ${editor.materialText}
        Retorne apenas o código HTML interno.`;

        const res = await callIA([{ role: 'user', parts: [{ text: prompt }] }]);
        if (res) {
            setEditor(p => ({ ...p, content: res.replace(/```html|```/g, '').trim(), isGenerating: false }));
            showAlert("Resumo gerado!");
        } else {
            setEditor(p => ({ ...p, isGenerating: false }));
        }
    };

    if (view === 'list') {
        const filtered = (db.summariesHtml || []).filter(s => s.title.toLowerCase().includes(search.toLowerCase()));
        return (
            <div className="p-10 max-w-7xl mx-auto animate-in fade-in duration-700">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                    <div>
                        <h2 className="text-5xl font-black italic tracking-tighter neon-emerald uppercase">Resumos <span className="text-white/20">HTML</span></h2>
                        <p className="text-zinc-500 font-bold mt-2 uppercase tracking-widest text-xs">Aprofundamento técnico com design premium.</p>
                    </div>
                    <div className="flex gap-4">
                        <input 
                            value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Procurar resumo..."
                            className="bg-zinc-900 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:border-emerald-500/50"
                        />
                        <button 
                            onClick={() => { setEditor({ id: null, title: '', category: 'Geral', content: '', isGenerating: false, aiPrompt: '', materialText: '' }); setView('edit'); }}
                            className="premium-btn px-8 py-4 rounded-2xl font-black shadow-2xl flex items-center gap-3"
                        >
                            <i className="fa-solid fa-plus"></i> NOVO
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filtered.map(s => (
                        <div key={s.id} onClick={() => { setEditor(s); setView('edit'); }} className="bento-card p-10 rounded-[3.5rem] cursor-pointer group hover:border-emerald-500/30 transition-all">
                            <div className="flex justify-between items-start mb-6">
                                <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full uppercase tracking-widest">{s.category}</span>
                                <span className="text-[10px] font-bold text-zinc-600">{s.date}</span>
                            </div>
                            <h3 className="text-2xl font-black mb-6 line-clamp-2">{s.title}</h3>
                            <div className="flex gap-4 border-t border-white/5 pt-6">
                                <button onClick={(e) => { e.stopPropagation(); setEditor(s); setView('edit'); }} className="text-zinc-500 hover:text-emerald-500 transition-colors"><i className="fa-solid fa-pen-nib"></i></button>
                                <button onClick={(e) => { e.stopPropagation(); if(window.confirm("Excluir?")) setDb(p => ({...p, summariesHtml: p.summariesHtml.filter(x => x.id !== s.id)})); }} className="text-zinc-500 hover:text-red-500 transition-colors"><i className="fa-solid fa-trash"></i></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-10 max-w-7xl mx-auto animate-in fade-in duration-500 pb-32">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div className="flex items-center gap-8">
                    <button onClick={() => setView('list')} className="w-14 h-14 glass-obsidian rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all">
                        <i className="fa-solid fa-arrow-left text-zinc-400"></i>
                    </button>
                    <h2 className="text-4xl font-black italic tracking-tighter neon-emerald uppercase">{editor.id ? 'Editar Resumo' : 'Novo Resumo'}</h2>
                </div>
                <button onClick={handleSave} className="premium-btn px-10 py-5 rounded-2xl font-black shadow-2xl flex items-center gap-3">
                    <i className="fa-solid fa-floppy-disk"></i> SALVAR
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-8">
                    <div className="bento-card p-10 rounded-[3.5rem] space-y-6">
                        <input 
                            value={editor.title} onChange={e => setEditor({...editor, title: e.target.value})}
                            placeholder="Título do Resumo" className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-6 font-black text-xl text-white outline-none"
                        />
                        <div className="bg-emerald-500/5 p-6 rounded-3xl border border-emerald-500/10 space-y-4">
                            <textarea 
                                value={editor.aiPrompt} onChange={e => setEditor({...editor, aiPrompt: e.target.value})}
                                placeholder="Sobre o que vamos escrever hoje?" className="w-full bg-transparent border-none outline-none font-bold text-zinc-400 h-24 resize-none"
                            />
                            <button 
                                onClick={handleGenerate} disabled={editor.isGenerating}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-emerald-600/20"
                            >
                                {editor.isGenerating ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'GERAR COM IA'}
                            </button>
                        </div>
                    </div>
                    <div className="bento-card p-10 rounded-[3.5rem] flex-1">
                        <textarea 
                            value={editor.content} onChange={e => setEditor({...editor, content: e.target.value})}
                            placeholder="Código HTML/Tailwind..." className="w-full h-96 bg-zinc-950/50 p-6 rounded-3xl font-mono text-xs text-zinc-400 outline-none border border-white/5 resize-none"
                        />
                    </div>
                </div>

                <div className="bento-card p-10 rounded-[3.5rem] bg-white text-zinc-900 overflow-y-auto max-h-[800px]">
                    <div className="flex justify-between items-center mb-10 border-b border-zinc-100 pb-6">
                        <span className="font-black text-xs uppercase tracking-widest text-emerald-600">PREVIEW LIVE</span>
                    </div>
                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: editor.content }} />
                </div>
            </div>
        </div>
    );
};

export default ResumosHtmlTab;
