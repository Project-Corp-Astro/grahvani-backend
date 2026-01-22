# Grahvani Backend Clean Start Utility
# This script kills all processes holding ports 3001, 3002, and 3008

$ports = @(3001, 3002, 3008, 3014)
$foundAny = $false

foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        $foundAny = $true
        foreach ($conn in $connections) {
            $processId = $conn.OwningProcess
            if ($processId -gt 0) {
                # Get process name for better logging
                $processName = (Get-Process -Id $processId -ErrorAction SilentlyContinue).ProcessName
                Write-Host "Cleaning up $processName (PID: $processId) on port $port..." -ForegroundColor Yellow
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

if (-not $foundAny) {
    Write-Host "Ports 3001, 3002, and 3008 are already clear." -ForegroundColor Green
} else {
    Write-Host "Port cleanup complete." -ForegroundColor Green
}
