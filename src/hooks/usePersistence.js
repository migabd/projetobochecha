import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook para gerenciar a persistência de dados via LocalStorage e GitHub Gist.
 */
export const usePersistence = (initialDb, gistConfig, setGistConfig, showAlert) => {
    const [db, setDb] = useState(initialDb);
    const [syncStatus, setSyncStatus] = useState('idle'); // 'idle', 'syncing', 'connecting', 'synced', 'error'
    const [lastSyncTime, setLastSyncTime] = useState(null);
    const [syncErrorMsg, setSyncErrorMsg] = useState('');
    
    const isDirty = useRef(false);
    const isFirstRenderDb = useRef(true);
    const lastGistReceiveTime = useRef(0);
    const syncStatusRef = useRef('idle');

    useEffect(() => {
        syncStatusRef.current = syncStatus;
    }, [syncStatus]);

    // Mescla dados remotos com locais de forma aditiva (evita perda de dados)
    const mergeAdditive = (localArr, remoteArr) => {
        const map = new Map();
        (localArr || []).forEach(x => { if (x && x.id) map.set(x.id, x); });
        (remoteArr || []).forEach(x => {
            if (!x || !x.id) return;
            const loc = map.get(x.id);
            map.set(x.id, { ...loc, ...x });
        });
        return Array.from(map.values());
    };

    const performFullMerge = useCallback((remote) => {
        if (!remote) return;
        setDb(prev => ({
            ...prev,
            ...remote,
            errors: mergeAdditive(prev.errors, remote.errors),
            flashcards: mergeAdditive(prev.flashcards, remote.flashcards),
            checklists: mergeAdditive(prev.checklists, remote.checklists),
            summariesHtml: mergeAdditive(prev.summariesHtml, remote.summariesHtml),
            weeks: mergeAdditive(prev.weeks, remote.weeks),
            games: mergeAdditive(prev.games, remote.games),
            perceptions: mergeAdditive(prev.perceptions, remote.perceptions),
            processedQuestionLists: mergeAdditive(prev.processedQuestionLists, remote.processedQuestionLists),
            dailyStats: { ...(prev.dailyStats || {}), ...(remote.dailyStats || {}) }
        }));
        setSyncStatus('synced');
        setLastSyncTime(new Date());
    }, []);

    const syncToGist = useCallback(async (dataToSave) => {
        const token = gistConfig.token?.trim();
        const id = gistConfig.id?.trim();
        if (!token || !id) return;

        setSyncStatus('syncing');
        try {
            const response = await fetch(`https://api.github.com/gists/${id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    files: {
                        "caderno_med_data.json": {
                            content: JSON.stringify(dataToSave)
                        }
                    }
                })
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(`GitHub API ${response.status}: ${errData.message || 'Erro desconhecido'}`);
            }
            setSyncStatus('synced');
            setLastSyncTime(new Date());
            isDirty.current = false;
        } catch (err) {
            console.error("Erro ao sincronizar Gist:", err);
            setSyncErrorMsg(err.message);
            setSyncStatus('error');
        }
    }, [gistConfig]);

    const syncFromGist = useCallback(async (isManual = false) => {
        const token = gistConfig.token?.trim();
        const id = gistConfig.id?.trim();
        if (!token || !id) return;

        setSyncStatus('connecting');
        try {
            const response = await fetch(`https://api.github.com/gists/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28'
                }
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(`Erro GitHub ${response.status}: ${errData.message || 'Token ou ID inválido'}`);
            }

            const gist = await response.json();
            const file = gist.files["caderno_med_data.json"];

            if (!file) throw new Error("Arquivo de dados não encontrado no Gist.");

            let content = file.content;
            if (file.truncated || !content) {
                const rawRes = await fetch(file.raw_url);
                if (!rawRes.ok) throw new Error("Falha ao baixar conteúdo bruto.");
                content = await rawRes.text();
            }

            if (content) {
                const remote = JSON.parse(content);
                lastGistReceiveTime.current = Date.now();
                performFullMerge(remote);
                if (isManual) showAlert("✅ Sincronização concluída!");
            }
        } catch (err) {
            setSyncStatus('error');
            setSyncErrorMsg(err.message);
            if (isManual) showAlert(`❌ Erro: ${err.message}`);
        }
    }, [gistConfig, performFullMerge, showAlert]);

    // Auto-Save Effect
    useEffect(() => {
        if (isFirstRenderDb.current || !gistConfig.id || !gistConfig.token || !gistConfig.autoSync) {
            if (isFirstRenderDb.current) isFirstRenderDb.current = false;
            return;
        }
        const timer = setTimeout(() => {
            if (Date.now() - lastGistReceiveTime.current < 5000) return;
            syncToGist(db);
        }, 3000);
        return () => clearTimeout(timer);
    }, [db, gistConfig, syncToGist]);

    return {
        db,
        setDb,
        syncStatus,
        lastSyncTime,
        syncErrorMsg,
        syncToGist,
        syncFromGist
    };
};
