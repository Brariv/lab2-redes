import { obtenerInterfazEntrada } from "./aplicacion.js";

/**
 * Pide la tasa de error al usuario (ej. "1/100" o "0.01").
 * Se pide al momento de enviar un mensaje.
 * Reutiliza la MISMA interfaz de readline que capas/aplicacion.js: crear una
 * segunda interfaz sobre el mismo stdin es lo que causaba que el siguiente
 * solicitarMensaje() se quedara colgado.
 * @returns {Promise<number>} probabilidad de flip por bit, entre 0 y 1
 */
export async function solicitarTasaError() {
  const rl = obtenerInterfazEntrada();
  const resp = await rl.question("Tasa de error (ej. 1/100): ");
  if (resp.includes("/")) {
    const [a, b] = resp.split("/").map(Number);
    return a / b;
  }
  return parseFloat(resp);
}

/**
 * Aplica ruido a la trama completa (incluye bits de redundancia).
 * @param {string} trama - bits ('0'/'1')
 * @param {number} tasaError - probabilidad de flip por bit
 * @returns {string} trama con bits invertidos según la probabilidad
 */
export function aplicarRuido(trama, tasaError) {
  let resultado = "";
  for (const bit of trama) {
    if (Math.random() < tasaError) {
      resultado += bit === "0" ? "1" : "0";
    } else {
      resultado += bit;
    }
  }
  return resultado;
}
