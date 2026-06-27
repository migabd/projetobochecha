import sys

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Update syncToCloud catch block
target1 = """                    console.error("Erro ao sincronizar KV:", err);
                    setSyncStatus('error');"""
replacement1 = """                    console.error("Erro ao sincronizar KV:", err);
                    showAlert("❌ Erro ao Enviar Nuvem: " + err.message);
                    setSyncStatus('error');"""

# Update syncFromCloud catch block
target2 = """                    console.error("Erro ao sincronizar KV:", err);
                    setSyncStatus('error');"""
replacement2 = """                    console.error("Erro ao sincronizar KV:", err);
                    if (isManual) showAlert("❌ Erro ao Baixar Nuvem: " + err.message);
                    setSyncStatus('error');"""

content = content.replace(target1, replacement1)
content = content.replace(target2, replacement2)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated UI to show alert on sync error")
