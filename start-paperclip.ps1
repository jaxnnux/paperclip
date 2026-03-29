# Run this as Administrator to register Paperclip boot service
$action = New-ScheduledTaskAction -Execute "pwsh.exe" -Argument "-NoProfile -WindowStyle Hidden -Command `"cd C:\Users\jaxnn\paperclip; pnpm dev 2>&1 | Out-File C:\Users\jaxnn\paperclip\paperclip-service.log -Append`"" -WorkingDirectory "C:\Users\jaxnn\paperclip"
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName "Paperclip-Server" -Action $action -Trigger $trigger -Settings $settings -User "SYSTEM" -RunLevel Highest -Force
