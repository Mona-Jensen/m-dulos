#requires -Version 5.1
[CmdletBinding()]
param([ValidateSet('Medir','Instalar','Pausar','Estado')][string]$Modo = 'Medir')
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$taskName = 'PC-Centinela-SinBorrado-v1'
$identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$base = Join-Path $env:LOCALAPPDATA 'PC-Centinela-v1'

if ($Modo -eq 'Instalar') {
    if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
        throw 'La tarea ya existe. No se reemplazo. Use -Modo Estado.'
    }
    $engine = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    $arguments = '-NoProfile -NonInteractive -File "{0}" -Modo Medir' -f $PSCommandPath
    $action = New-ScheduledTaskAction -Execute $engine -Argument $arguments
    $trigger = New-ScheduledTaskTrigger -Daily -At '10:00'
    $principal = New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 3) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'Diagnostico local. No borra archivos ni cierra aplicaciones.' | Out-Null
    Get-ScheduledTask -TaskName $taskName | Select-Object TaskName, State
    Write-Host 'Programado diariamente a las 10:00, con su sesion iniciada. No mueva el script.'
    exit
}
if ($Modo -eq 'Pausar') {
    Disable-ScheduledTask -TaskName $taskName | Select-Object TaskName, State
    exit
}
if ($Modo -eq 'Estado') {
    Get-ScheduledTask -TaskName $taskName | Select-Object TaskName, State
    Get-ScheduledTaskInfo -TaskName $taskName | Select-Object LastRunTime, LastTaskResult, NextRunTime
    exit
}

# No inspecciona contenido de documentos. No modifica configuraciones del sistema.
[IO.Directory]::CreateDirectory($base) | Out-Null
$reports = @(Get-ChildItem -LiteralPath $base -Filter 'Informe-*.json' -File)
if ($reports.Count -ge 1000) { throw 'Limite de 1000 informes alcanzado. No se borrara ninguno.' }
$os = Get-CimInstance Win32_OperatingSystem
$cpuSamples = @()
for ($i = 0; $i -lt 5; $i++) {
    $cpuSamples += [double](Get-CimInstance Win32_Processor | Measure-Object LoadPercentage -Average).Average
    if ($i -lt 4) { Start-Sleep -Seconds 2 }
}
$processes = @(Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 10 Name, Id, @{n='RAM_MiB';e={[math]::Round($_.WorkingSet64 / 1MB, 1)}})
$disks = @(Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | Select-Object DeviceID, @{n='Total_GiB';e={[math]::Round($_.Size / 1GB, 2)}}, @{n='Libre_GiB';e={[math]::Round($_.FreeSpace / 1GB, 2)}})
$memoryPercent = [math]::Round(100 * (1 - $os.FreePhysicalMemory / $os.TotalVisibleMemorySize), 1)
$report = [ordered]@{
    Fecha = (Get-Date).ToString('o')
    Version = '1.0'
    RAM_Total_GiB = [math]::Round($os.TotalVisibleMemorySize / 1MB, 2)
    RAM_Usada_Porcentaje = $memoryPercent
    CPU_Promedio_Porcentaje = [math]::Round(($cpuSamples | Measure-Object -Average).Average, 1)
    CPU_Muestras = $cpuSamples
    Discos = $disks
    Procesos_Mayor_RAM = $processes
    Nota = 'Diagnostico puntual. No libera RAM ni limpia archivos. No suma memorias de procesos: pueden compartir paginas.'
}
$json = $report | ConvertTo-Json -Depth 6
$path = Join-Path $base ('Informe-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [guid]::NewGuid().ToString('N') + '.json')
# CreateNew impide sobrescribir cualquier informe existente.
$stream = [IO.File]::Open($path, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
try {
    $bytes = [Text.Encoding]::UTF8.GetBytes($json)
    $stream.Write($bytes, 0, $bytes.Length)
} finally { $stream.Dispose() }
Write-Host ('RAM usada: {0}%. CPU promedio: {1}%.' -f $memoryPercent, $report.CPU_Promedio_Porcentaje)
Write-Host ('Informe: ' + $path)
if ($memoryPercent -ge 85) { Write-Warning 'RAM elevada en esta medicion. Revise procesos del informe; no se cerrara ninguno.' }
