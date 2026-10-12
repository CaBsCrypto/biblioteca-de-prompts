export type Linea = { sku: string; cantidad: number; precioCentavos: number };
export type Cotizacion = {
  unidades: number; subtotalCentavos: number;
  descuentoCentavos: number; totalCentavos: number;
};

const MAX_UNIDADES = 20;

function validarLinea(linea: Linea): void {
  if (!linea.sku.trim()) throw new Error('sku requerido');
  if (!Number.isInteger(linea.cantidad) || linea.cantidad < 1)
    throw new RangeError('cantidad debe ser entero positivo');
  if (!Number.isSafeInteger(linea.precioCentavos) || linea.precioCentavos < 0)
    throw new RangeError('precio debe ser entero seguro no negativo');
}

export function cotizar(lineas: readonly Linea[], descuentoCentavos = 0): Cotizacion {
  if (lineas.length === 0) throw new Error('carrito vacío');
  if (!Number.isSafeInteger(descuentoCentavos) || descuentoCentavos < 0)
    throw new RangeError('descuento debe ser entero seguro no negativo');
  const acumulado = lineas.reduce((acc, linea) => {
    validarLinea(linea);
    const unidades = acc.unidades + linea.cantidad;
    if (unidades > MAX_UNIDADES) throw new RangeError('máximo 20 unidades');
    const subtotalCentavos = acc.subtotalCentavos + linea.cantidad * linea.precioCentavos;
    if (!Number.isSafeInteger(subtotalCentavos)) throw new RangeError('subtotal fuera de rango');
    return { unidades, subtotalCentavos };
  }, { unidades: 0, subtotalCentavos: 0 });
  if (descuentoCentavos > acumulado.subtotalCentavos)
    throw new RangeError('descuento supera subtotal');
  return { ...acumulado, descuentoCentavos, totalCentavos: acumulado.subtotalCentavos - descuentoCentavos };
}

export function formatearCentavos(centavos: number): string {
  if (!Number.isSafeInteger(centavos) || centavos < 0)
    throw new RangeError('importe debe ser entero seguro no negativo');
  return `${Math.floor(centavos / 100)}.${String(centavos % 100).padStart(2, '0')}`;
}
