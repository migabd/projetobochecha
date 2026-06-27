import sys
import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

target_to = """            const syncToCloud = async (dataToSave) => {
                
                console.log("Sync KV: Iniciando upload...");
                setSyncStatus('syncing');
                
                try {
                    const response = await fetch('/api/sync', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            
                        },
                        body: JSON.stringify(dataToSave)
                    });
                    
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.error || "Erro no servidor.");
                    
                    console.log("Sync KV: Sincronizado com sucesso.");
                    setSyncStatus('synced');
                    isDirty.current = false;
                } catch (err) {
                    console.error("Erro ao sincronizar KV:", err);
                    setSyncStatus('error');
                }
            };"""

replacement_to = """            const syncToCloud = async (dataToSave) => {
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
                    setSyncStatus('error');
                }
            };"""

target_from = """            const syncFromCloud = async (isManual = false) => {
                
                if (!isManual && !cloudConfig.autoSync) return;
                
                console.log("Sync KV: Iniciando download...");
                setSyncStatus('syncing');
                
                try {
                    const response = await fetch('/api/sync', {
                        method: 'GET',
                        headers: {}
                    });
                    
                    const data = await response.json();
                    if (!response.ok) {
                        if (response.status === 401) throw new Error("Senha de acesso (API Secret) inválida.");
                        throw new Error(data?.error || "Erro ao baixar do servidor.");
                    }
                    
                    if (!data) {"""

replacement_from = """            const syncFromCloud = async (isManual = false) => {
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

content = content.replace(target_to, replacement_to)
content = content.replace(target_from, replacement_from)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated index.html frontend compression logic")
