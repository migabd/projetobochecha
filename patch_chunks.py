import sys

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

target_to = """            const syncToCloud = async (dataToSave) => {
                console.log("Sync KV: Iniciando upload comprimido no client...");
                setSyncStatus('syncing');
                try {
                    let payloadToUpload = dataToSave;
                    if (window.JSZip) {
                        try {
                            const zip = new window.JSZip();
                            zip.file("data.json", JSON.stringify(dataToSave));
                            const base64Zipped = await zip.generateAsync({type:"base64", compression: "DEFLATE", compressionOptions: {level: 9}});
                            payloadToUpload = base64Zipped; // String base64
                            console.log("Sync KV: Comprimido de", JSON.stringify(dataToSave).length, "para", base64Zipped.length, "bytes");
                        } catch(e) {
                            console.error("Falha ao comprimir no front", e);
                        }
                    }

                    const response = await fetch('/api/sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payloadToUpload)
                    });
                    
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.error || "Erro no servidor.");
                    
                    console.log("Sync KV: Sincronizado com sucesso.");
                    setSyncStatus('synced');
                    isDirty.current = false;
                } catch (err) {
                    console.error("Erro ao sincronizar KV:", err);
                    showAlert("❌ Erro ao Enviar Nuvem: " + err.message);
                    setSyncStatus('error');
                }
            };"""

replacement_to = """            const syncToCloud = async (dataToSave) => {
                console.log("Sync KV: Iniciando upload em chunks...");
                setSyncStatus('syncing');
                try {
                    let payloadToUpload = dataToSave;
                    let isZipped = false;
                    if (window.JSZip) {
                        try {
                            const zip = new window.JSZip();
                            zip.file("data.json", JSON.stringify(dataToSave));
                            payloadToUpload = await zip.generateAsync({type:"base64", compression: "DEFLATE", compressionOptions: {level: 9}});
                            isZipped = true;
                            console.log("Sync KV: Comprimido de", JSON.stringify(dataToSave).length, "para", payloadToUpload.length, "bytes");
                        } catch(e) {
                            console.error("Falha ao comprimir no front", e);
                        }
                    }

                    const jsonStr = JSON.stringify({ isZipped, payload: payloadToUpload });
                    const chunkSize = 2 * 1024 * 1024; // 2MB
                    const chunks = [];
                    for (let i = 0; i < jsonStr.length; i += chunkSize) {
                        chunks.push(jsonStr.substring(i, i + chunkSize));
                    }
                    
                    // Upload chunks
                    for (let i = 0; i < chunks.length; i++) {
                        const res = await fetch('/api/sync', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'chunk', index: i, data: chunks[i] })
                        });
                        if (!res.ok) {
                            const errData = await res.json().catch(()=>({}));
                            throw new Error("Falha no chunk " + i + ": " + (errData.error || res.statusText));
                        }
                    }
                    
                    // Upload meta
                    const resMeta = await fetch('/api/sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'commit', count: chunks.length })
                    });
                    if (!resMeta.ok) {
                        const errData = await resMeta.json().catch(()=>({}));
                        throw new Error(errData.error || "Falha no commit");
                    }
                    
                    console.log("Sync KV: Sincronizado com sucesso.");
                    setSyncStatus('synced');
                    isDirty.current = false;
                } catch (err) {
                    console.error("Erro ao sincronizar KV:", err);
                    showAlert("❌ Erro ao Enviar Nuvem: " + err.message);
                    setSyncStatus('error');
                }
            };"""

target_from = """            const syncFromCloud = async (isManual = false) => {
                if (!isManual && !cloudConfig.autoSync) return;
                
                console.log("Sync KV: Iniciando download...");
                setSyncStatus('syncing');
                try {
                    const response = await fetch('/api/sync', { method: 'GET', headers: {} });
                    let data = await response.json();
                    if (!response.ok) {
                        if (response.status === 401) throw new Error("Senha de acesso (API Secret) inválida.");
                        throw new Error(data?.error || "Erro ao baixar do servidor.");
                    }
                    
                    if (data && typeof data === 'string') {
                        if (window.JSZip && (!data.trim().startsWith('{') && !data.trim().startsWith('['))) {
                            try {
                                const zip = new window.JSZip();
                                const unzipped = await zip.loadAsync(data, {base64: true});
                                const str = await unzipped.file("data.json").async("string");
                                data = JSON.parse(str);
                                console.log("Sync KV: Arquivo descompactado no front!");
                            } catch(e) {
                                let p = data; while(typeof p === 'string') { try { p=JSON.parse(p); } catch(x){break;} }
                                data = p;
                            }
                        } else {
                            let p = data; while(typeof p === 'string') { try { p=JSON.parse(p); } catch(x){break;} }
                            data = p;
                        }
                    }
                    
                    if (!data || Object.keys(data).length === 0) {"""

replacement_from = """            const syncFromCloud = async (isManual = false) => {
                if (!isManual && !cloudConfig.autoSync) return;
                
                console.log("Sync KV: Iniciando download...");
                setSyncStatus('syncing');
                try {
                    const response = await fetch('/api/sync', { method: 'GET', headers: {} });
                    let result = await response.json();
                    if (!response.ok) {
                        if (response.status === 401) throw new Error("Senha de acesso (API Secret) inválida.");
                        throw new Error(result?.error || "Erro ao baixar do servidor.");
                    }
                    
                    let data = null;
                    if (result && result.chunks) {
                        let fullJsonStr = '';
                        for (let i = 0; i < result.chunks; i++) {
                            const chunkRes = await fetch(`/api/sync?chunk=${i}`, { method: 'GET' });
                            if (!chunkRes.ok) throw new Error("Falha ao baixar chunk " + i);
                            const chunkData = await chunkRes.json();
                            fullJsonStr += chunkData.data;
                        }
                        try {
                            const parsedMeta = JSON.parse(fullJsonStr);
                            if (parsedMeta.isZipped && window.JSZip) {
                                const zip = new window.JSZip();
                                const unzipped = await zip.loadAsync(parsedMeta.payload, {base64: true});
                                const str = await unzipped.file("data.json").async("string");
                                data = JSON.parse(str);
                            } else if (typeof parsedMeta.payload === 'string') {
                                data = JSON.parse(parsedMeta.payload);
                            } else {
                                data = parsedMeta.payload;
                            }
                        } catch(e) {
                            throw new Error("Erro ao remontar chunks: " + e.message);
                        }
                    } else if (result && result.legacy) {
                        // Legacy handling
                        data = result.data;
                        if (typeof data === 'string') {
                            if (window.JSZip && (!data.trim().startsWith('{') && !data.trim().startsWith('['))) {
                                try {
                                    const zip = new window.JSZip();
                                    const unzipped = await zip.loadAsync(data, {base64: true});
                                    const str = await unzipped.file("data.json").async("string");
                                    data = JSON.parse(str);
                                } catch(e) {
                                    let p = data; while(typeof p === 'string') { try { p=JSON.parse(p); } catch(x){break;} }
                                    data = p;
                                }
                            } else {
                                let p = data; while(typeof p === 'string') { try { p=JSON.parse(p); } catch(x){break;} }
                                data = p;
                            }
                        }
                    } else if (result && typeof result === 'object' && !result.legacy && !result.chunks) {
                       data = result;
                    }
                    
                    if (!data || Object.keys(data).length === 0) {"""

content = content.replace(target_to, replacement_to)
content = content.replace(target_from, replacement_from)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated index.html chunking logic")
