$baseUrl = "http://localhost:3000"
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

Write-Host "--- 1. Health Check ---"
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
    Write-Host "Status: $($health.status)"
} catch {
    Write-Host "Health Check Failed: $_"
}

Write-Host "`n--- 2. Register User ---"
$username = "user_$(Get-Date -Format 'yyyyMMddHHmmss')"
$body = @{
    username = $username
    password = "securePassword123!"
} | ConvertTo-Json

try {
    $register = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $body -ContentType "application/json"
    Write-Host "Registered: $($register.username)"
} catch {
    Write-Host "Registration Failed: $_"
}

Write-Host "`n--- 3. Login ---"
try {
    $login = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $body -ContentType "application/json" -SessionVariable sv
    Write-Host "Login Message: $($login.message)"
} catch {
    Write-Host "Login Failed: $_"
}

Write-Host "`n--- 4. Create Note ---"
$noteBody = @{
    title = "My Secure Note"
    content = "Confidential content"
} | ConvertTo-Json

try {
    $note = Invoke-RestMethod -Uri "$baseUrl/notes" -Method Post -Body $noteBody -ContentType "application/json" -WebSession $sv
    Write-Host "Note Created: $($note.title)"
} catch {
    Write-Host "Create Note Failed: $_"
}

Write-Host "`n--- 5. List Notes ---"
try {
    $notes = Invoke-RestMethod -Uri "$baseUrl/notes" -Method Get -WebSession $sv
    Write-Host "Notes Found: $($notes.Count)"
    $notes | Format-Table title, content, created_at
} catch {
    Write-Host "List Notes Failed: $_"
}
