# Contratos y evidencia de un módulo

Material propio de CaBsCrypto, CC BY 4.0. Consulta esta referencia al documentar varias exportaciones, validaciones distintas de los tipos o dependencias incompletas.

## Qué evidencia respalda cada afirmación

| Fuente | Permite afirmar | No permite afirmar por sí sola |
| --- | --- | --- |
| Declaración de tipo | Contrato estático y nombres de campos | Validación de entradas reales |
| Condición seguida de `throw` | Error explícito, condición y mensaje | Todos los errores posibles de ejecución |
| Expresión de retorno | Forma y cálculo del resultado visible | Garantías de una dependencia desconocida |
| Llamada externa | Dependencia y datos que se le pasan | Persistencia, seguridad, coste o disponibilidad de su implementación |
| Ausencia de operaciones I/O en una función sin dependencias externas | No se observan operaciones I/O en esa función | Ausencia de efectos de código que no se ha leído |
| Prueba existente | Comportamiento esperado para ese caso | Prueba ejecutada o cobertura exhaustiva |
| Comentario o nombre de símbolo | Intención declarada | Implementación conforme a esa intención |

## Inventario de API

Para cada símbolo de la API elegida, identifica:

- Entradas: tipo declarado, requisitos que el código comprueba, valores por defecto y casos límite.
- Salida: tipo o forma observada, significado de los campos y condiciones que impiden producirla.
- Errores: distingue los `throw` visibles de errores propagados o implícitos. No conviertas una lista de errores explícitos en una lista exhaustiva.
- Efectos: mutación del argumento, del estado interno, acceso a archivos, red o dependencia externa, si están presentes.
- Evidencia: archivo y rango de líneas leído; si no hay líneas estables, símbolo y rama relevante.

No anuncies un paquete instalable por encontrar un `export`. El nombre de paquete y su punto de entrada necesitan evidencia de empaquetado o contexto del usuario.

## Nivel de certeza

**Observado:** «La rama `cantidad < 1` lanza `RangeError`» con su referencia.

**Deducido:** «Recorre las líneas una vez, por lo que el trabajo visible es lineal en su número» cuando las operaciones interiores son constantes para el modelo de entrada descrito. Declara ese modelo si la longitud de cadenas u otra dimensión importa.

**Desconocido:** «Se llama a `persist`, pero no se aportó su implementación; no se puede afirmar dónde guarda datos». Evita rellenarlo con una tecnología habitual.

## Tipos y ejecución

Una anotación TypeScript no rechaza objetos inválidos en ejecución. Documenta el contrato tipado por separado de los `if`/validadores visibles. Si una propiedad se usa sin comprobación y puede fallar con entradas ajenas al contrato, delimita el caso; no prometas validación completa.

## Ejemplos y límites

Prefiere valores pequeños cuyo resultado pueda justificarse. Comprueba redondeo, orden de validación, entrada vacía y errores que afecten a esos valores. Usa el mensaje literal de error si está en la fuente; no lo inventes para errores propagados.

Si el ejemplo no se ejecutó, escribe «resultado esperado por lectura estática». Un comentario `// resultado esperado: ...` explica un cálculo; no certifica un test.

La ausencia de validación, de configuración de paquete o de una dependencia merece una nota concreta. No añadas auditorías generales ni recomendaciones de cambios de lógica a una tarea de documentación.
