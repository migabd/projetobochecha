import React, { useState, useMemo } from 'react';
import { syncFlashcardsToAnki } from '../../utils/anki';

const FlashcardItem = ({ card, onDelete }) => {
    const [flipped, setFlipped] = useState(false);
    return (
        <div 
            onClick={() => setFlipped(!flipped)}
            className={`bento-card p-8 rounded-[2.5rem] cursor-pointer relative min-h-[200px] flex items-center justify-center text-center group transition-all duration-500 transform-gpu ${flipped ? 'rotate-y-180 bg-emerald-500/10 border-emerald-500/50' : 'bg-zinc-900 border-white/5 hover:border-emerald-500/30'}`}
        >
            <div className={`transition-all duration-500 ${flipped ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest absolute top-6 left-1/2 -translate-x-1/2">Frente</span>
                <div className="font-bold text-lg leading-relaxed text-zinc-100" dangerouslySetInnerHTML={{ __html: card.front }}></div>
            </div>
            <div className={`absolute inset-0 p-8 flex items-center justify-center transition-all duration-500 ${flipped ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest absolute top-6 left-1/2 -translate-x-1/2">Verso</span>
                <div className="font-black text-xl text-emerald-400" dangerouslySetInnerHTML={{ __html: card.back }}></div>
            </div>
            <button 
                onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
                className="absolute bottom-6 right-6 w-10 h-10 bg-white/5 hover:bg-red-500/20 text-zinc-600 hover:text-red-500 rounded-xl flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
            >
                <i className="fa-solid fa-trash text-xs"></i>
            </button>
        </div>
    );
};

const FlashcardsTab = ({ db, setDb, showAlert, callIA }) => {
    const [activeDeck, setActiveDeck] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [genSettings, setGenSettings] = useState({ qty: 10, focus: '' });

    const decks = useMemo(() => {
        const d = {};
        db.flashcards?.forEach(c => {
            const name = c.deckName || 'Geral';
            if (!d[name]) d[name] = [];
            d[name].push(c);
        });
        return d;
    }, [db.flashcards]);

    const handleGenerate = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const b64 = ev.target.result;
            setIsGenerating(true);
            showAlert("Iniciando extração de conhecimento...");

            const prompt = `Você é um preceptor médico de elite. Analise este material (PDF/Imagem) e gere ${genSettings.qty} flashcards de ALTO NÍVEL (estilo Anki).
            FOCO ADICIONAL: ${genSettings.focus || 'Conhecimento Geral'}
            
            Regras:
            1. Use o formato JSON.
            2. "front" deve ser uma pergunta curta e desafiadora ou uma "cloze deletion".
            3. "back" deve ser a resposta direta e precisa.
            4. Tente agrupar em uma categoria (deckName).
            
            Retorne APENAS o JSON:
            {
                "deckName": "Nome da Categoria",
                "flashcards": [
                    { "front": "...", "back": "..." }
                ]
            }`;

            try {
                const res = await callIA([{ role: 'user', parts: [{ inlineData: { data: b64.split(',')[1], mimeType: file.type } }, { text: prompt }] }]);
                const data = JSON.parse(res.replace(/```json|```/g, ''));
                const newCards = data.flashcards.map(c => ({
                    ...c,
                    id: Date.now() + Math.random(),
                    deckName: data.deckName || 'Importados',
                    date: new Date().toLocaleDateString('pt-PT')
                }));
                setDb(prev => ({ ...prev, flashcards: [...newCards, ...(prev.flashcards || [])] }));
                showAlert(`${newCards.length} Flashcards gerados com sucesso!`);
            } catch (err) {
                showAlert("Erro ao gerar flashcards. Tente um material mais legível.");
            }
            setIsGenerating(false);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleSync = async () => {
        const target = activeDeck ? decks[activeDeck] : db.flashcards;
        if (!target?.length) return showAlert("Nada para sincronizar.");
        
        showAlert("Iniciando sincronização com Anki...");
        const res = await syncFlashcardsToAnki(target);
        if (res.success) showAlert("✅ Sincronização concluída com sucesso!");
        else showAlert("❌ Erro: " + res.error);
    };

    if (activeDeck) {
        return (
            <div className="p-10 max-w-7xl mx-auto animate-in fade-in duration-500">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
                    <div className="flex items-center gap-8">
                        <button onClick={() => setActiveDeck(null)} className="w-14 h-14 glass-obsidian rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all shadow-xl">
                            <i className="fa-solid fa-arrow-left text-zinc-400"></i>
                        </button>
                        <div>
                            <h2 className="text-4xl font-black italic tracking-tighter neon-emerald">{activeDeck}</h2>
                            <p className="text-zinc-500 font-bold text-xs uppercase tracking-[0.3em]">{decks[activeDeck].length} Cartões no Baralho</p>
                        </div>
                    </div>
                    <button onClick={handleSync} className="px-8 py-5 premium-btn rounded-2xl font-black shadow-2xl flex items-center gap-3 active:scale-95 transition-all">
                        <i className="fa-solid fa-cloud-arrow-up"></i> SINCRONIZAR ESTE BARALHO
                    </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {decks[activeDeck].map(c => (
                        <FlashcardItem key={c.id} card={c} onDelete={(id) => setDb(prev => ({ ...prev, flashcards: prev.flashcards.filter(x => x.id !== id) }))} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-10 max-w-7xl mx-auto animate-in fade-in duration-700 pb-32">
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10 mb-16">
                <div>
                    <h2 className="text-5xl font-black italic tracking-tighter neon-emerald uppercase">Flashcards <span className="text-white/20">IA ELITE</span></h2>
                    <p className="text-zinc-500 font-bold mt-2 uppercase tracking-widest text-xs">Transforme materiais passivos em revisão ativa imediata.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-6 bg-zinc-950/50 p-6 rounded-[2.5rem] border border-white/5">
                    <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Quantidade</label>
                        <input type="number" value={genSettings.qty} onChange={e => setGenSettings({...genSettings, qty: e.target.value})} className="w-20 bg-black/40 border border-white/5 rounded-xl p-3 font-black text-center text-white outline-none focus:border-emerald-500/50" />
                    </div>
                    <div className="flex-1 min-w-[200px] flex flex-col gap-1">
                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Foco Temático</label>
                        <input type="text" placeholder="Ex: Farmacologia..." value={genSettings.focus} onChange={e => setGenSettings({...genSettings, focus: e.target.value})} className="bg-black/40 border border-white/5 rounded-xl p-3 font-black text-white outline-none focus:border-emerald-500/50" />
                    </div>
                    <label className="premium-btn px-10 py-4 rounded-xl font-black cursor-pointer shadow-2xl flex items-center gap-3 self-end">
                        <i className={isGenerating ? "fa-solid fa-circle-notch fa-spin" : "fa-solid fa-wand-magic-sparkles"}></i> {isGenerating ? 'ANALISANDO...' : 'GERAR FLASHCARDS'}
                        <input type="file" className="hidden" onChange={handleGenerate} accept=".pdf,image/*" disabled={isGenerating} />
                    </label>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {Object.keys(decks).map(name => (
                    <div 
                        key={name} onClick={() => setActiveDeck(name)}
                        className="bento-card p-10 rounded-[3.5rem] cursor-pointer group relative overflow-hidden"
                    >
                        <div className="flex justify-between items-start mb-10">
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                                <i className="fa-solid fa-layer-group text-2xl"></i>
                            </div>
                            <span className="bg-emerald-600 text-white px-4 py-1 rounded-full font-black text-[10px] tracking-widest">{decks[name].length} CARDS</span>
                        </div>
                        <h3 className="text-2xl font-black mb-2">{name}</h3>
                        <p className="text-zinc-500 font-bold text-sm">Toque para revisar este deck.</p>
                        <i className="fa-solid fa-clone absolute -right-6 -bottom-6 text-9xl text-emerald-500/5 group-hover:text-emerald-500/10 transition-colors"></i>
                    </div>
                ))}
                
                {Object.keys(decks).length === 0 && (
                    <div className="col-span-full py-40 text-center opacity-20 flex flex-col items-center">
                        <i className="fa-solid fa-clone text-8xl mb-8"></i>
                        <h3 className="text-3xl font-black uppercase tracking-tighter">Nenhum deck encontrado</h3>
                        <p className="text-sm font-bold uppercase tracking-widest mt-4">Gere novos flashcards a partir de seus materiais de estudo.</p>
                    </div>
                )}
            </div>

            {db.flashcards?.length > 0 && (
                <div className="mt-20 flex justify-center">
                    <button onClick={handleSync} className="glass-obsidian px-12 py-6 rounded-[2.5rem] font-black text-zinc-400 hover:text-white border border-white/5 hover:border-emerald-500/20 transition-all flex items-center gap-4 group">
                        <i className="fa-solid fa-cloud-arrow-up text-2xl group-hover:scale-110 transition-transform"></i>
                        <div>
                            <span className="block text-left text-[10px] font-black uppercase tracking-widest text-zinc-600">Global Sync</span>
                            <span className="text-lg">SINCRONIZAR TUDO COM O ANKI</span>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
};

export default FlashcardsTab;
