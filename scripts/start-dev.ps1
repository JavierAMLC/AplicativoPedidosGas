$env:NODE_ENV='development'

# Cambiar esta URL si usas otro backend.
$env:API_URL='http://localhost:3000'
$env:MYSQL_URL='mysql://root:PwtQcWjrxNHjvTLlJOXDrApNXoIFyZWJ@sakura.proxy.rlwy.net:47817/railway'
$env:PORT='3000'

Write-Host 'Starting backend...'
Start-Process pwsh -ArgumentList '-NoExit', "-Command cd '$PWD'; pnpm --filter @workspace/api-server run build; pnpm --filter @workspace/api-server run start" -NoNewWindow

Start-Sleep -Seconds 4

Write-Host 'Starting frontend...'
Start-Process pwsh -ArgumentList '-NoExit', "-Command cd '$PWD'; pnpm dev" -NoNewWindow

Write-Host 'Backend y frontend iniciados. Verifica la salida en las ventanas de PowerShell.'
