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
  let r = 1;
  while (m + r + 1 > Math.pow(2, r)) {
    r++;
  }
  return r;
}

/**
 * Inserta bits de paridad en las posiciones potencia de 2.
 * @param {string} bits - mensaje de m bits
 * @returns {string} palabra código completa (codeword)
 */
export function hammingCodificar(bits) {
  const m = bits.length;
  const r = hammingCalcularR(m);
  let codeword = "";
  let i = 0;
  let j = 0;
  for (let k = 1; k <= m + r; k++) {
    if (Math.log2(k) % 1 === 0) {
      codeword += "0";
    } else {
      codeword += bits[i];
      i++;
    }
  }
  return codeword;
}

/**
 * @param {string} codeword - bits recibidos (con posible error)
 * @returns {[string, boolean, number]} [mensajeSinParidad, hayError, posicionError]
 *          posicionError = 0 si no hubo error; el mensaje ya viene corregido.
 */
export function hammingDecodificar(codeword) {
  const m = codeword.length;
  const r = hammingCalcularR(m);
  let mensajeSinParidad = "";
  let hayError = false;
  let posicionError = 0;
  for (let k = 1; k <= m; k++) {
    if (Math.log2(k) % 1 === 0) {
      // Es una posición de paridad
    } else {
      mensajeSinParidad += codeword[k - 1];
    }
  }
  return [mensajeSinParidad, hayError, posicionError];
}
