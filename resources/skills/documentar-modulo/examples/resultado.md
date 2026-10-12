# Módulo ficticio de cotizaciones

Calcula una cotización en centavos para un conjunto de líneas y permite representar un importe con dos decimales. La audiencia conoce TypeScript.

## Alcance y fuente

Fuente: [input.ts](input.ts), ejemplo propio de CaBsCrypto incluido en la candidata `documentar-modulo` 0.1.0. Se documentan las exportaciones de este archivo; no se aportó configuración de paquete ni de distribución.

Esta muestra editorial procede de lectura estática y cálculos manuales. No demuestra ejecución del código, de un agente ni compatibilidad con todos los modelos.

## Uso mínimo

La ruta siguiente es ilustrativa: supone que guardaste el archivo como `cotizacion.ts` junto al código consumidor. El proyecto debe resolver esa importación conforme a su configuración TypeScript; el ejemplo no proporciona un paquete instalable.

```ts
import { cotizar, formatearCentavos } from './cotizacion';

const resultado = cotizar([
  { sku: 'LIBRO', cantidad: 2, precioCentavos: 2500 },
  { sku: 'CUADERNO', cantidad: 1, precioCentavos: 1500 },
], 500);

// Resultado esperado por lectura estática:
// { unidades: 3, subtotalCentavos: 6500,
//   descuentoCentavos: 500, totalCentavos: 6000 }
const importe = formatearCentavos(resultado.totalCentavos);
// Resultado esperado: '60.00'
```

El subtotal se calcula como `2 × 2500 + 1 × 1500 = 6500` (líneas 25–28); el total descuenta `500`, por lo que queda `6000` (línea 31). El formato separa parte entera y resto en centavos (línea 37).

## API pública

| Símbolo | Contrato visible | Evidencia |
| --- | --- | --- |
| `Linea` | Campos `sku: string`, `cantidad: number` y `precioCentavos: number`. Es un tipo; no realiza validación en ejecución. | Líneas 1, 9–15 |
| `Cotizacion` | `unidades`, `subtotalCentavos`, `descuentoCentavos` y `totalCentavos`, todos numéricos. | Líneas 2–5, 31 |
| `cotizar(lineas, descuentoCentavos = 0)` | Array tipado de solo lectura; exige al menos una línea. Cada cantidad es un entero positivo; precio y descuento son enteros seguros no negativos. Devuelve `Cotizacion` o lanza uno de los errores descritos. | Líneas 9–31 |
| `formatearCentavos(centavos)` | Entero seguro no negativo. Devuelve una cadena con punto y dos dígitos decimales, sin símbolo de moneda. | Líneas 34–38 |

`MAX_UNIDADES` y `validarLinea` son auxiliares internos sin `export` (líneas 7 y 9). La cantidad de cada línea pasa por `Number.isInteger`; el límite de 20 unidades acumuladas impide que una cotización aceptada supere ese total (líneas 11–12 y 23–24).

El `sku` se considera vacío cuando `trim()` produce cadena vacía (línea 10). La implementación no convierte el SKU ni lo normaliza en el resultado: la cotización no devuelve los SKU.

## Errores y efectos

Errores explícitos presentes en la fuente:

| Condición | Error y mensaje | Evidencia |
| --- | --- | --- |
| Array sin líneas | `Error('carrito vacío')` | Línea 18 |
| Descuento no entero seguro o negativo | `RangeError('descuento debe ser entero seguro no negativo')` | Líneas 19–20 |
| SKU que queda vacío tras `trim()` | `Error('sku requerido')` | Línea 10 |
| Cantidad no entera o inferior a 1 | `RangeError('cantidad debe ser entero positivo')` | Líneas 11–12 |
| Precio no entero seguro o negativo | `RangeError('precio debe ser entero seguro no negativo')` | Líneas 13–14 |
| Unidades acumuladas superiores a 20 | `RangeError('máximo 20 unidades')` | Líneas 23–24 |
| Subtotal fuera de enteros seguros | `RangeError('subtotal fuera de rango')` | Líneas 25–26 |
| Descuento superior al subtotal | `RangeError('descuento supera subtotal')` | Líneas 29–30 |
| Importe de formato no entero seguro o negativo | `RangeError('importe debe ser entero seguro no negativo')` | Líneas 35–36 |

`cotizar` comprueba array vacío y descuento antes de recorrer las líneas. Dentro del recorrido valida SKU, cantidad y precio antes de acumular unidades y subtotal. El descuento superior al subtotal se comprueba al final. Cuando hay varias entradas inválidas, ese orden determina cuál de los errores explícitos se encuentra primero.

No se observan escrituras, red, archivos ni mutaciones del array o sus objetos en este módulo; los acumuladores y el objeto devuelto se crean localmente (líneas 21–31). No hay dependencias importadas. La lista anterior no garantiza tratamiento de objetos arbitrarios: por ejemplo, un SKU que no sea cadena no cumple el contrato tipado y puede provocar un error implícito en `trim()`.

## Límites y datos pendientes

- El código no indica moneda, impuestos, conversión de divisas ni redondeo comercial. Centavos y descuento se proporcionan ya como enteros.
- Un precio igual a cero y un descuento igual al subtotal se admiten por sus condiciones. El total puede ser cero.
- Las cantidades pueden repetirse entre líneas y los SKU pueden repetirse: no existe un control de unicidad visible.
- Los números seguros se comprueban para precio, descuento, subtotal y formato. No se promete aceptar todos los objetos JavaScript que contengan campos parecidos a `Linea`.
- Por lectura del recorrido, `cotizar` procesa una vez cada línea hasta terminar o fallar. Su coste visible es proporcional al número de líneas más el texto procesado por `trim()`; no se midió rendimiento.
- No se aportaron versión de TypeScript, configuración de módulos ni ruta pública de paquete. La guía no prescribe comandos de instalación.

## Ejemplo de fallo

```ts
cotizar([
  { sku: 'LIBRO', cantidad: 2, precioCentavos: 2500 },
  { sku: 'CUADERNO', cantidad: 1, precioCentavos: 1500 },
], 7000);
// Error esperado por lectura estática:
// RangeError: descuento supera subtotal
```

El descuento `7000` supera el subtotal `6500`, por lo que la rama de las líneas 29–30 lanza el error. Ninguna ejecución se afirma para este ejemplo.

## Atribución

Código ficticio y muestra de documentación de CaBsCrypto, preparados para `documentar-modulo` 0.1.0 bajo [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). El enfoque amplía `documentar-codigo` con API de módulo, evidencia y límites de integración. Al adaptarlo, conserva la atribución e indica cambios; la licencia del código de otros proyectos debe comprobarse por separado.
