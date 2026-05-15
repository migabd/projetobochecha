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
        
        const prompt = `Você é um Professor de Medicina de Elite criando um resumo EXTREMAMENTE DETALHADO, LONGO E APROFUNDADO em formato HTML puro.
        O usuário espera um conteúdo denso, com múltiplas seções, tabelas comparativas, critérios diagnósticos completos e mnemônicas de memorização.
        
        ESTRUTURA OBRIGATÓRIA:
        1. Utilize Tailwind CSS (light/dark mode) para um design premium. Use cores como esmeralda, zinco, índigo.
        2. Use <h3> para seções principais e <h4> para subseções.
        3. SEMPRE inclua pelo menos uma tabela estilizada se houver dados comparativos.
        4. Use blocos de destaque (bg-emerald-500/10, border border-emerald-500/20) para avisos importantes.
        
        Tema/Contexto: ${editor.aiPrompt} 
        Material de Base: ${editor.materialText}
        
        RETORNE APENAS O CÓDIGO HTML INTERNO (sem <html> ou <body>).`;

        const res = await callIA([{ role: 'user', parts: [{ text: prompt }] }]);
        if (res) {
            setEditor(p => ({ ...p, content: res.replace(/```html|```/g, '').trim(), isGenerating: false }));
            showAlert("✅ Resumo de Elite gerado!");
        } else {
            setEditor(p => ({ ...p, isGenerating: false }));
        }
    };

    const smartModifyWithAI = async () => {
        if (!editor.content.trim()) return showAlert("O resumo atual está vazio.");
        if (!editor.aiPrompt.trim()) return showAlert("Digite o que deseja alterar no campo de tema.");

        setEditor(p => ({ ...p, isGenerating: true }));
        const prompt = `Você é um Assistente de Elite. Aplique a modificação solicitada no resumo HTML preservando o estilo premium.
        CÓDIGO ATUAL:
        ${editor.content}
        INSTRUÇÃO DE MUDANÇA: "${editor.aiPrompt}"
        Retorne apenas o novo código HTML completo, sem explicações.`;

        const res = await callIA([{ role: 'user', parts: [{ text: prompt }] }]);
        if (res) {
            setEditor(p => ({ ...p, content: res.replace(/```html|```/g, '').trim(), isGenerating: false }));
            showAlert("✨ Resumo atualizado inteligentemente!");
        } else {
            setEditor(p => ({ ...p, isGenerating: false }));
        }
    };

    const injectSnippet = (snippet) => {
        setEditor(p => ({ ...p, content: p.content + snippet }));
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        const name = file.name.toLowerCase();
        
        if (name.endsWith('.html') || name.endsWith('.htm')) {
            reader.onload = (ev) => setEditor(p => ({ ...p, content: ev.target.result, title: p.title || file.name }));
            reader.readAsText(file);
        } else if (name.endsWith('.pdf')) {
            showAlert("Processando PDF... Aguarde.");
            // Note: In a real environment, you'd use pdfjsLib here. 
            // For now, we'll just read as text if possible or ask user to copy-paste.
            reader.onload = (ev) => setEditor(p => ({ ...p, materialText: ev.target.result }));
            reader.readAsText(file);
        } else {
            reader.onload = (ev) => setEditor(p => ({ ...p, materialText: ev.target.result }));
            reader.readAsText(file);
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
                            <label className="block text-[10px] font-black text-emerald-500 uppercase tracking-widest">Tema ou Contexto</label>
                            <textarea 
                                value={editor.aiPrompt} onChange={e => setEditor({...editor, aiPrompt: e.target.value})}
                                placeholder="Sobre o que vamos escrever hoje?" className="w-full bg-transparent border-none outline-none font-bold text-zinc-400 h-24 resize-none"
                            />
                            
                            <div className="border-t border-white/5 pt-4">
                                <label className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Material de Base</span>
                                    <label className="cursor-pointer text-emerald-500 hover:text-emerald-400 transition-colors">
                                        <i className="fa-solid fa-paperclip"></i>
                                        <input type="file" className="hidden" onChange={handleFileUpload} accept=".html,.htm,.pdf,.txt" />
                                    </label>
                                </label>
                                <textarea 
                                    value={editor.materialText} onChange={e => setEditor({...editor, materialText: e.target.value})}
                                    placeholder="Cole aqui o texto ou anexe um arquivo..." className="w-full bg-zinc-950/30 rounded-xl p-4 border border-white/5 outline-none font-bold text-zinc-500 text-xs h-32 resize-none"
                                />
                            </div>

                            <div className="flex gap-4">
                                <button 
                                    onClick={handleGenerate} disabled={editor.isGenerating}
                                    className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-emerald-600/20"
                                >
                                    {editor.isGenerating ? <><i className="fa-solid fa-circle-notch fa-spin mr-2"></i> ...</> : 'GERAR'}
                                </button>
                                <button 
                                    onClick={smartModifyWithAI} disabled={editor.isGenerating}
                                    className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-black rounded-2xl transition-all"
                                >
                                    REFIDAR
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="bento-card p-10 rounded-[3.5rem] flex-1 flex flex-col">
                        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 planner-scroll">
                            {[
                                { label: 'Título', icon: 'fa-heading', code: '\n<h3 class="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-6 mb-3 border-b border-emerald-100 dark:border-emerald-900/40 pb-2 flex items-center gap-2"><i class="fa-solid fa-stethoscope"></i> Seção</h3>\n' },
                                { label: 'Alerta', icon: 'fa-triangle-exclamation', code: '\n<div class="p-4 bg-red-500/10 border-l-4 border-red-500 rounded-r-2xl text-red-400 font-bold my-4 shadow-sm">Alerta Médica</div>\n' },
                                { label: 'Tabela', icon: 'fa-table', code: '\n<div class="overflow-x-auto my-4"><table class="w-full border border-white/5 text-sm"><tr><th class="p-3 bg-white/5 border-b border-white/5">Item</th><th class="p-3 bg-white/5 border-b border-white/5">Valor</th></tr><tr><td class="p-3 border-b border-white/5">A</td><td class="p-3 border-b border-white/5">B</td></tr></table></div>\n' }
                            ].map((snip, i) => (
                                <button key={i} onClick={() => injectSnippet(snip.code)} className="px-3 py-2 glass-obsidian rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap shrink-0 hover:bg-white/10 transition-all">
                                    <i className={`fa-solid ${snip.icon} mr-2 text-emerald-500`}></i> {snip.label}
                                </button>
                            ))}
                        </div>
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
