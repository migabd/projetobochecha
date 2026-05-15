import React, { useState } from 'react';

const ImageEditor = ({ initialImage, onSave, onCancel }) => {
    const [texts, setTexts] = useState([]);
    const [selectedId, setSelectedId] = useState(null);

    const handleImageClick = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        const id = Date.now();
        setTexts([...texts, { id, text: 'Nova Nota', x, y, color: '#10b981', size: 22 }]);
        setSelectedId(id);
    };

    const handleExport = () => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            ctx.textBaseline = 'top';
            
            texts.forEach(t => {
                const fs = Math.max(12, t.size * (img.width / 800));
                ctx.font = `bold ${fs}px sans-serif`;
                ctx.fillStyle = t.color;
                ctx.strokeStyle = (t.color === '#ffffff' || t.color === '#f59e0b') ? '#000000' : '#ffffff';
                ctx.lineWidth = Math.max(2, fs / 8);

                const lines = t.text.split('\n');
                lines.forEach((line, index) => {
                    const lineY = (t.y * img.height) + (index * fs * 1.2);
                    ctx.strokeText(line, t.x * img.width, lineY);
                    ctx.fillText(line, t.x * img.width, lineY);
                });
            });
            onSave(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = initialImage;
    };

    return (
        <div className="fixed inset-0 bg-[#09090b]/95 z-[9000] flex flex-col md:flex-row p-6 gap-6 animate-in fade-in duration-500">
            <div className="flex-1 glass-obsidian rounded-[3rem] flex items-center justify-center overflow-hidden relative border border-white/5 shadow-2xl">
                <div className="relative inline-block" style={{ maxWidth: '100%', maxHeight: '100%' }}>
                    <img 
                        src={initialImage} 
                        onClick={handleImageClick} 
                        className="max-w-full max-h-[80vh] object-contain cursor-crosshair rounded-2xl shadow-2xl" 
                        draggable="false" 
                    />
                    {texts.map(t => (
                        <div 
                            key={t.id} 
                            onClick={(e) => { e.stopPropagation(); setSelectedId(t.id); }} 
                            className={`absolute px-4 py-2 -translate-x-1/2 -translate-y-1/2 cursor-pointer border-2 font-black whitespace-pre-wrap rounded-2xl transition-all ${selectedId === t.id ? 'border-emerald-500 bg-emerald-500/20 scale-110 shadow-2xl' : 'border-transparent hover:scale-105'}`} 
                            style={{ 
                                left: `${t.x * 100}%`, 
                                top: `${t.y * 100}%`, 
                                color: t.color, 
                                fontSize: `${t.size}px`, 
                                lineHeight: '1.2', 
                                textShadow: `0 0 10px ${['#ffffff', '#f59e0b'].includes(t.color) ? '#000000' : 'transparent'}` 
                            }}
                        >
                            {t.text}
                        </div>
                    ))}
                </div>
            </div>

            <div className="w-full md:w-96 glass-obsidian rounded-[3rem] p-8 flex flex-col gap-6 shadow-2xl border border-white/5 h-full">
                <div className="flex justify-between items-center border-b border-white/5 pb-6">
                    <h3 className="font-black text-xl italic tracking-tighter neon-emerald uppercase"><i className="fa-solid fa-pen-nib mr-3"></i> Editor Visual</h3>
                    <button onClick={onCancel} className="w-10 h-10 flex items-center justify-center bg-white/5 text-zinc-500 hover:text-red-500 rounded-xl transition-all"><i className="fa-solid fa-xmark"></i></button>
                </div>

                <div className="flex-1 overflow-y-auto planner-scroll pr-2">
                    {selectedId ? (
                        <div className="space-y-8 animate-in slide-in-from-right-10 duration-500">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Conteúdo da Nota</label>
                                <textarea 
                                    value={texts.find(t => t.id === selectedId).text} 
                                    onChange={(e) => setTexts(texts.map(tx => tx.id === selectedId ? { ...tx, text: e.target.value } : tx))} 
                                    className="w-full p-5 bg-black/40 border border-white/5 rounded-2xl outline-none focus:border-emerald-500 font-bold text-white resize-none transition-all" 
                                    rows="4"
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Cor do Destaque</label>
                                <div className="flex flex-wrap gap-3">
                                    {['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ffffff', '#000000'].map(c => (
                                        <button 
                                            key={c} 
                                            onClick={() => setTexts(texts.map(tx => tx.id === selectedId ? { ...tx, color: c } : tx))} 
                                            className={`w-10 h-10 rounded-full border-4 transition-all ${texts.find(t => t.id === selectedId).color === c ? 'border-emerald-500 scale-110 shadow-lg' : 'border-white/5'}`} 
                                            style={{ backgroundColor: c }} 
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Tamanho da Fonte</label>
                                    <span className="text-emerald-500 font-black text-xs">{texts.find(t => t.id === selectedId).size}px</span>
                                </div>
                                <input 
                                    type="range" min="12" max="100" 
                                    value={texts.find(t => t.id === selectedId).size} 
                                    onChange={(e) => setTexts(texts.map(tx => tx.id === selectedId ? { ...tx, size: parseInt(e.target.value) } : tx))} 
                                    className="w-full accent-emerald-500 h-2 bg-white/5 rounded-full appearance-none cursor-pointer" 
                                />
                            </div>

                            <div className="pt-8 border-t border-white/5">
                                <button 
                                    onClick={() => { setTexts(texts.filter(t => t.id !== selectedId)); setSelectedId(null); }} 
                                    className="w-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-3 active:scale-95"
                                >
                                    <i className="fa-solid fa-trash-can"></i> APAGAR NOTA
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full opacity-20 text-center">
                            <i className="fa-solid fa-hand-pointer text-6xl mb-6"></i>
                            <p className="text-sm font-bold uppercase tracking-widest leading-tight">Toque em qualquer ponto da<br/>imagem para adicionar notas.</p>
                        </div>
                    )}
                </div>

                <button 
                    onClick={handleExport} 
                    className="w-full premium-btn text-white font-black py-5 rounded-[2rem] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 shrink-0"
                >
                    <i className="fa-solid fa-floppy-disk"></i> SALVAR ALTERAÇÕES
                </button>
            </div>
        </div>
    );
};

export default ImageEditor;
