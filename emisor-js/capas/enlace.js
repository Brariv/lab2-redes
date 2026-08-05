import * as correccion from "../algoritmos/correccionErrores.js";
import * as deteccion from "../algoritmos/deteccionErrores.js";

/**
 * @param {string} trama - bits del mensaje (salida de codificarMensaje)
 * @param {string} algoritmo - "hamming" | "fletcher" | "crc32"
 * @param {number} bloque - solo aplica a fletcher (8, 16 o 32)
 * @returns {string} trama original + bits de redundancia concatenados
 */
export function calcularIntegridad(trama, algoritmo, bloque = 8) {
  if (algoritmo === "hamming") return correccion.hammingCodificar(trama);
  if (algoritmo === "fletcher") return trama + deteccion.fletcherCalcular(trama, bloque);
  if (algoritmo === "crc32") return trama + deteccion.crc32Calcular(trama);
  throw new Error(`Algoritmo desconocido: ${algoritmo}`);
}

/**
 * @param {string} tramaRecibida - bits + redundancia, tal como llegó
 * @param {string} algoritmo
 * @param {number} bloque
 * @returns {[boolean, string]} [hayError, tramaSinRedundancia]
 */
export function verificarIntegridad(tramaRecibida, algoritmo, bloque = 8) {
  if (algoritmo === "hamming") {
    const [, hayError] = correccion.hammingDecodificar(tramaRecibida);
    return [hayError, tramaRecibida];
  }
  if (algoritmo === "fletcher") {
    const ok = deteccion.fletcherVerificar(tramaRecibida, bloque);
    return [!ok, tramaRecibida.slice(0, tramaRecibida.length - 2 * bloque)];
  }
  if (algoritmo === "crc32") {
    const ok = deteccion.crc32Verificar(tramaRecibida);
    return [!ok, tramaRecibida.slice(0, tramaRecibida.length - 32)];
  }
  throw new Error(`Algoritmo desconocido: ${algoritmo}`);
}

/**
 * Solo tiene efecto real con "hamming" (fletcher/crc32 solo detectan).
 * @param {string} tramaRecibida
 * @param {string} algoritmo
 * @returns {[string, boolean]} [tramaCorregida, sePudoCorregir]
 */
export function corregirMensaje(tramaRecibida, algoritmo) {
  if (algoritmo === "hamming") {
    // Hamming de un solo bit de error siempre puede corregir lo que detecta.
    const [mensaje, hayError] = correccion.hammingDecodificar(tramaRecibida);
    return [mensaje, hayError];
  }
  return [tramaRecibida, false];
}
