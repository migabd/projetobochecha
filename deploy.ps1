## Deploy Caderno IA PRO
# Este script automatiza o build e prepara os arquivos para o GitHub Pages.

Write-Host "--- Iniciando processo de deployment ---"

# 1. Limpeza de arquivos legados conflitantes
if (Test-Path "src/components/Fluxogramas/FluxogramasTab.js") {
    Write-Host "Limpando: Removendo FluxogramasTab.js legado..."
    Remove-Item "src/components/Fluxogramas/FluxogramasTab.js" -Force
}

# 2. Executar Build do Vite
Write-Host "Build: Executando npm run build..."
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Error "ERRO: Falha no build. Abortando."
    exit $LASTEXITCODE
}

# 3. Backup do index.html monolítico (se existir)
if ((Test-Path "index.html") -and (-Not (Test-Path "index_legacy.html"))) {
    Write-Host "Backup: Salvando index.html atual como index_legacy.html..."
    Rename-Item "index.html" "index_legacy.html"
}

# 4. Copiar arquivos do dist para a raiz
Write-Host "Deploy: Copiando arquivos do build para a raiz..."
Copy-Item -Path "dist/*" -Destination "." -Recurse -Force

# 5. Git Operations
Write-Host "Git: Removendo calc_xor.py do rastreamento (por seguranca)..."
git rm --cached calc_xor.py --ignore-unmatch

Write-Host "Git: Adicionando mudancas..."
git add .

$commitMsg = "Deploy: Atualizacao modular do sistema e Fluxogramas (" + (Get-Date -Format "yyyy-MM-dd HH:mm") + ")"
Write-Host "Git: Commit: $commitMsg"
git commit -m $commitMsg

Write-Host "Git: Push para o remote..."
git push origin main

Write-Host "SUCESSO: Deployment concluido!"
Write-Host "Aguarde alguns minutos para o GitHub Pages atualizar."
