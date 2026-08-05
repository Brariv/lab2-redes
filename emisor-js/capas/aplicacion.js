import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";

const rl = readline.createInterface({ input, output });

/**
 * Pide un texto al usuario.
 * @param {string} prompt
 * @returns {Promise<string>}
 */
export async function solicitarMensaje(prompt) {
  return rl.question(prompt);
}

// Se exporta la misma instancia para que otras capas (ej. ruido.js) pidan
// datos por el MISMO readline en vez de crear una interfaz nueva sobre el
// mismo stdin: tener dos interfaces sobre el mismo stream cuelga la lectura.
export function obtenerInterfazEntrada() {
  return rl;
}

/**
 * Pide el algoritmo de integridad a usar.
 * @returns {Promise<string>} "hamming" | "fletcher" | "crc32"
 */
export async function solicitarAlgoritmo() {
  const resp = await rl.question("Algoritmo de integridad (hamming/fletcher/crc32): ");
  return resp.trim().toLowerCase();
}

/**
 * Muestra un mensaje al usuario. Si error es true, se indica que no fue
 * posible corregir/verificar el mensaje.
 * @param {string} mensaje
 * @param {boolean} error
 */
export function mostrarMensaje(mensaje, error = false) {
  if (error) {
    console.log(">> ERROR: mensaje recibido con errores no corregibles");
  } else {
    console.log(">> " + mensaje);
  }
}

export function cerrarEntrada() {
  rl.close();
}
