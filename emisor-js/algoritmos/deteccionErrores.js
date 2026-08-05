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
  throw new Error("TODO: implementar fletcherCalcular");
}

/**
 * @param {string} datosConChecksum
 * @param {number} bloque
 * @returns {boolean} true si no hay error detectado
 */
export function fletcherVerificar(datosConChecksum, bloque) {
  throw new Error("TODO: implementar fletcherVerificar");
}

// --- Alternativa: CRC-32 ---

/**
 * @param {string} datos - bits del mensaje (n > 32, o padding si es menor)
 * @param {number} polinomio - estándar CRC-32 (32 bits)
 * @returns {string} 32 bits de residuo (CRC) a concatenar
 */
export function crc32Calcular(datos, polinomio = 0x04c11db7) {
  throw new Error("TODO: implementar crc32Calcular");
}

/**
 * @param {string} datosConCrc
 * @param {number} polinomio
 * @returns {boolean} true si el residuo calculado da 0 (sin error)
 */
export function crc32Verificar(datosConCrc, polinomio = 0x04c11db7) {
  throw new Error("TODO: implementar crc32Verificar");
}
