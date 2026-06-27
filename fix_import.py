import sys

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# We need to capture the new object and sync it
target = """                        setDb(prev => {
                            const importedMap = new Map(sanitized.map(e => [e.id, e]));
                            const updatedErrors = (prev.errors || []).map(localErr => {
                                const importedErr = importedMap.get(localErr.id);
                                if (importedErr) {
                                    const merged = { ...localErr, ...importedErr };
                                    importedMap.delete(localErr.id);
                                    return merged;
                                }
                                return localErr;
                            });
                            const brandNewErrors = Array.from(importedMap.values());

                            return {
                                ...prev,
                                errors: [...brandNewErrors, ...updatedErrors],
                                perceptions: [...(data.perceptions || []), ...(prev.perceptions || [])].filter((v, i, a) => v && v.id && a.findIndex(t => t.id === v.id) === i),
                                summaries: [...(data.summaries || []), ...(prev.summaries || [])].filter((v, i, a) => v && v.id && a.findIndex(t => t.id === v.id) === i),
                                summariesHtml: [...(data.summariesHtml || []), ...(prev.summariesHtml || [])].filter((v, i, a) => v && v.id && a.findIndex(t => t.id === v.id) === i),
                                simuladoHistory: [...(data.simuladoHistory || []), ...(prev.simuladoHistory || [])],
                                flashcards: [...(data.flashcards || []), ...(prev.flashcards || [])].filter((v, i, a) => v && v.id && a.findIndex(t => t.id === v.id) === i),
                                games: [...(data.games || []), ...(prev.games || [])].filter((v, i, a) => v && v.id && a.findIndex(t => t.id === v.id) === i),
                                weeks: [...(data.weeks || []), ...(prev.weeks || [])].filter((v, i, a) => v && v.id && a.findIndex(t => t.id === v.id) === i),
                                checklists: [...(data.checklists || []), ...(prev.checklists || [])].filter((v, i, a) => v && v.id && a.findIndex(t => t.id === v.id) === i),
                                fluxogramas: [...(data.fluxogramas || []), ...(prev.fluxogramas || [])].filter((v, i, a) => v && v.id && a.findIndex(t => t.id === v.id) === i)
                            };
                        });"""

replacement = """                        let syncedDb = null;
                        setDb(prev => {
                            const importedMap = new Map(sanitized.map(e => [e.id, e]));
                            const updatedErrors = (prev.errors || []).map(localErr => {
                                const importedErr = importedMap.get(localErr.id);
                                if (importedErr) {
                                    const merged = { ...localErr, ...importedErr };
                                    importedMap.delete(localErr.id);
                                    return merged;
                                }
                                return localErr;
                            });
                            const brandNewErrors = Array.from(importedMap.values());

                            const newDbState = {
                                ...prev,
                                errors: [...brandNewErrors, ...updatedErrors],
                                perceptions: [...(data.perceptions || []), ...(prev.perceptions || [])].filter((v, i, a) => v && v.id && a.findIndex(t => t.id === v.id) === i),
                                summaries: [...(data.summaries || []), ...(prev.summaries || [])].filter((v, i, a) => v && v.id && a.findIndex(t => t.id === v.id) === i),
                                summariesHtml: [...(data.summariesHtml || []), ...(prev.summariesHtml || [])].filter((v, i, a) => v && v.id && a.findIndex(t => t.id === v.id) === i),
                                simuladoHistory: [...(data.simuladoHistory || []), ...(prev.simuladoHistory || [])],
                                flashcards: [...(data.flashcards || []), ...(prev.flashcards || [])].filter((v, i, a) => v && v.id && a.findIndex(t => t.id === v.id) === i),
                                games: [...(data.games || []), ...(prev.games || [])].filter((v, i, a) => v && v.id && a.findIndex(t => t.id === v.id) === i),
                                weeks: [...(data.weeks || []), ...(prev.weeks || [])].filter((v, i, a) => v && v.id && a.findIndex(t => t.id === v.id) === i),
                                checklists: [...(data.checklists || []), ...(prev.checklists || [])].filter((v, i, a) => v && v.id && a.findIndex(t => t.id === v.id) === i),
                                fluxogramas: [...(data.fluxogramas || []), ...(prev.fluxogramas || [])].filter((v, i, a) => v && v.id && a.findIndex(t => t.id === v.id) === i)
                            };
                            
                            syncedDb = newDbState;
                            return newDbState;
                        });"""

if target in content:
    content = content.replace(target, replacement)
    
    # Also we need to replace the old setTimeout
    target2 = "                        setTimeout(() => syncToCloud(db), 1000);"
    replacement2 = "                        setTimeout(() => { if (syncedDb) syncToCloud(syncedDb); }, 1000);"
    content = content.replace(target2, replacement2)
    
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed importData.")
else:
    print("Could not find importData block")
