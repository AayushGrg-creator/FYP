# PowerShell script to create project folder structure

$folders = @(
    # Root level
    "client/public/fonts",
    "client/src/assets",
    "client/src/components",
    "client/src/constants",
    "client/src/context",
    "client/src/hooks",
    "client/src/layouts",
    "client/src/pages",
    "client/src/services",
    "client/src/styles",
    "client/src/utils",
    
    # Server folders
    "server/ai",
    "server/config",
    "server/controllers",
    "server/helpers",
    "server/middleware",
    "server/models",
    "server/routes",
    "server/scripts",
    "server/services",
    "server/tests/e2e",
    "server/utils"
)

# Create all folders
foreach ($folder in $folders) {
    $path = Join-Path -Path "." -ChildPath $folder
    if (-not (Test-Path $path)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
        Write-Host "Created: $folder"
    }
}

Write-Host "`nFolder structure created successfully!"
