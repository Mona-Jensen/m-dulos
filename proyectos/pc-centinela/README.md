# PC Centinela

Herramienta de diagnóstico local para observar consumo de recursos en Windows.

**Autoría:** Gianina Jensen Guzmán.

## Qué incluye

- Medición puntual de memoria, CPU, discos y procesos.
- Generación de informes JSON.
- Opciones para instalar, consultar o pausar una tarea programada.

## Tecnologías

PowerShell y Programador de tareas de Windows.

## Estado de la muestra

Script revisado estáticamente; ejecución Windows pendiente.

## Ejecución

```text
powershell -NoProfile -File .\Centinela.ps1 -Modo Medir
```

## Alcance y pendientes

No libera RAM ni borra archivos. El modo Instalar crea una tarea local. No se ejecutó ni instaló en esta revisión; los informes de procesos no forman parte del portafolio.

[Volver al portafolio](../../README.md)
