/**
 * Fletcher checksum (o CRC-32 como alternativa). Implementar (algoritmo
 * de detección asignado a otro integrante del equipo).
 */

/**
 * @param {string} datos - bits del mensaje
 * @param {number} bloque - 8, 16 o 32 (configurable); aplicar padding de
 *                          ceros si datos no es múltiplo del bloque
 * @returns {string} bits del checksum (2 * bloque bits: suma A + suma B)
 */
export function fletcherCalcular(datos, bloque) {
  // Implementación del algoritmo Fletcher
  let sumaA = 0;
  let sumaB = 0;
  for (let i = 0; i < datos.length; i += bloque) {
    const bloqueDatos = datos.slice(i, i + bloque);
    sumaA += parseInt(bloqueDatos, 2);
    sumaB += sumaA;
  }
  return (sumaA.toString(2).padStart(bloque, '0') + sumaB.toString(2).padStart(bloque, '0'));
}

/**
 * @param {string} datosConChecksum
 * @param {number} bloque
 * @returns {boolean} true si no hay error detectado
 */
export function fletcherVerificar(datosConChecksum, bloque) {
  const datos = datosConChecksum.slice(0, -2 * bloque);
  const checksumRecibido = datosConChecksum.slice(-2 * bloque);
  const checksumCalculado = fletcherCalcular(datos, bloque);
  return checksumRecibido === checksumCalculado;
}

// --- Alternativa: CRC-32 ---
/**
 * @param {string} datos - bits del mensaje (n > 32, o padding si es menor)
 * @param {number} polinomio - estándar CRC-32 (32 bits)
 * @returns {string} 32 bits de residuo (CRC) a concatenar
 */
export function crc32Calcular(datos, polinomio = 0x04c11db7) {
  // Implementación del algoritmo CRC-32
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < datos.length; i++) {
    const bit = parseInt(datos[i], 2);
    crc ^= (bit << 31);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x80000000) !== 0) {
        crc = (crc << 1) ^ polinomio;
      } else {
        crc <<= 1;
      }
    }
  }
  return (crc >>> 0).toString(2).padStart(32, '0');
}

/**
 * @param {string} datosConCrc
 * @param {number} polinomio
 * @returns {boolean} true si el residuo calculado da 0 (sin error)
 */
export function crc32Verificar(datosConCrc, polinomio = 0x04c11db7) {
  const datos = datosConCrc.slice(0, -32);
  const crcRecibido = datosConCrc.slice(-32);
  const crcCalculado = crc32Calcular(datos, polinomio);
  return crcRecibido === crcCalculado;
}
