## Deploy Fluxogramas Module
# This script copies the patched 'index - Copia.html' to 'index.html', stages the change, commits, and pushes to the main branch.
# Usage: Run this script from PowerShell in the project directory.

# Define paths
$source = "index - Copia.html"
$dest = "index.html"

# Ensure source file exists
if (-Not (Test-Path -Path $source)) {
    Write-Error "Source file '$source' not found. Abort."
    exit 1
}

# Copy (overwrite) the destination file
Copy-Item -Path $source -Destination $dest -Force

# Stage the file
git add $dest

# Commit with a descriptive message
$commitMessage = "Deploy Fluxogramas module integration"
# Check for changes to commit
$status = git status --porcelain
if ($status) {
    git commit -m $commitMessage
    # Push to remote main branch
    git push origin main
    Write-Host "Deployment completed and pushed to remote."
} else {
    Write-Host "No changes detected; nothing to commit."
}
