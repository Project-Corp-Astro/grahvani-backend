# Grahvani Backend Clean Start Utility
# This script kills all processes holding ports 3001, 3002, and 3008

$ports = @(3001, 3002, 3008)
$found = $false

foreach ($port in $ports) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connection) {
        $found = $true
        foreach ($conn in $connection) {
            $pid = $conn.OwningProcess
            if ($pid -gt 0) {
                Write-Host "Killing process $pid on port $port..." -ForegroundColor Yellow
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

if (-not $found) {
    Write-Host "No active processes found on ports 3001, 3002, or 3008." -ForegroundColor Green
} else {
    Write-Host "Cleanup complete! You can now run 'npm run dev' safely." -ForegroundColor Green
}
