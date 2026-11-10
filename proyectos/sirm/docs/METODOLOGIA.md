# Metodología, incertidumbre y restricciones

**Este repositorio es un simulador demostrativo, no un producto geotécnico certificado.**

## Qué se calcula

Sobre un DEM regular, el modelo calcula un estado de profundidad promediada `h` con flujos intercambiados entre celdas a partir del gradiente de elevación de la superficie libre. Introduce un aporte especificado en m³/s durante un intervalo y, opcionalmente, precipitación uniforme en mm/h. Los contornos son cerrados. La conservación se verifica por test (`Volumen final = aportes acumulados`).

La fórmula local-inercial actualiza el flujo por unidad de ancho (m²/s):

`q_new = (q_old - g*h_face*dt*(eta_B-eta_A)/dx) / (1 + g*n*n*dt*abs(q_old)/h_face^(7/3))`

Se limitan las transferencias salientes al volumen disponible para mantener `h ≥ 0`. Esto es un esquema de demostración, no un solver completo de Saint-Venant 2D; no existe comprobación CFL adaptativa ni términos de régimen turbulento calibrados. Para remociones y relaves **no** representa tensión de fluencia, densidad variable, deposición real, erosión ni estabilidad de presas o taludes. El uso del mismo solver de agua en esos dos escenarios es solamente visual.

## Geometría

La cuenca generada incorpora un valle sinuoso, pendientes y viviendas sintéticas. No existe ninguna ubicación real. Para importar un DEM se exige una matriz regular, unidades métricas y elevaciones finitas. La interfaz aplica una escala vertical visual exagerada para facilitar la lectura.

## Indicadores de viviendas

Los umbrales iniciales (1,15 m de profundidad y 2 m/s de velocidad aproximada) sirven *únicamente* para activar colores/animación. No son estándares de colapso ni fragilidad; las casas que se mueven son una ilustración narrativa.

## Incertidumbre y uso prohibido

No se puede utilizar para dimensionar obras, crear mapas oficiales de amenaza, ordenar evacuaciones, declarar áreas seguras, evaluar estabilidad de relaves ni estimar pérdidas patrimoniales. Para ello faltan topografía calibrada, condiciones iniciales, granulometría, límites, reología, validación histórica y revisión profesional.

## Verificación ejecutable

`npm run check` comprueba sintaxis Node, imports, modelo y servidor HTTP. `python -m unittest discover -s scratch/tests -p "test_*.py" -v` valida la conversión ASCII. Las pruebas numéricas cubren conservación, profundidad no negativa y escenarios. La validación funcional de WebGL2 depende de navegador y GPU y debe hacerse en Windows/macOS/Linux con aceleración gráfica activa. Los benchmarks no prometen rendimiento: ejecutar `npm run benchmark` para medir en tu máquina.
