/**
 * Código de Hamming. Implementar (algoritmo de corrección asignado a
 * un integrante del equipo). Debe ser válido para cualquier (n, m) que
 * cumpla m + r + 1 <= 2^r.
 */

/**
 * @param {number} m - bits de datos
 * @returns {number} menor r tal que m + r + 1 <= 2^r
 */
export function hammingCalcularR(m) {
  throw new Error("TODO: implementar hammingCalcularR");
}

/**
 * Inserta bits de paridad en las posiciones potencia de 2.
 * @param {string} bits - mensaje de m bits
 * @returns {string} palabra código completa (codeword)
 */
export function hammingCodificar(bits) {
  throw new Error("TODO: implementar hammingCodificar");
}

/**
 * @param {string} codeword - bits recibidos (con posible error)
 * @returns {[string, boolean, number]} [mensajeSinParidad, hayError, posicionError]
 *          posicionError = 0 si no hubo error; el mensaje ya viene corregido.
 */
export function hammingDecodificar(codeword) {
  throw new Error("TODO: implementar hammingDecodificar");
}
