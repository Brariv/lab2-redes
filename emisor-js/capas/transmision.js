import net from "net";
import readline from "readline";

/**
 * Protocolo de trama compartido con el receptor (Python):
 * cada envío manda dos líneas de texto terminadas en "\n":
 *   1) header JSON:  {"algoritmo": "hamming", "bloque": 8, "bits": <n>}
 *   2) trama de bits: string de '0'/'1' (mensaje + redundancia, + ruido si es el emisor)
 * El header va limpio (sin ruido); solo la línea de bits pasa por capas/ruido.js.
 */

/**
 * Conecta al receptor.
 * @param {string} host
 * @param {number} puerto
 * @returns {Promise<net.Socket>}
 */
export function crearSocketCliente(host, puerto) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port: puerto }, () => resolve(socket));
    socket.once("error", reject);
  });
}

/**
 * Crea un lector de líneas reutilizable sobre el socket.
 * Debe crearse UNA vez por conexión y reutilizarse en cada recibirInformacion().
 * @param {net.Socket} socket
 */
export function crearLectorTramas(socket) {
  const rl = readline.createInterface({ input: socket, crlfDelay: Infinity });
  const iterador = rl[Symbol.asyncIterator]();

  return {
    /**
     * Bloqueante (async). Lee un frame completo (header + trama).
     * @returns {Promise<{algoritmo: string, bloque: number, trama: string} | null>}
     */
    async recibirInformacion() {
      const { value: lineaHeader, done: d1 } = await iterador.next();
      if (d1 || lineaHeader === undefined) return null;

      const { value: lineaTrama, done: d2 } = await iterador.next();
      if (d2 || lineaTrama === undefined) return null;

      const header = JSON.parse(lineaHeader);
      return { algoritmo: header.algoritmo, bloque: header.bloque, trama: lineaTrama };
    },
    cerrar() {
      rl.close();
    },
  };
}

/**
 * @param {net.Socket} socket
 * @param {string} trama - bits ('0'/'1'), con redundancia (y ruido si aplica)
 * @param {string} algoritmo - "hamming" | "fletcher" | "crc32"
 * @param {number} bloque - tamaño de bloque de fletcher (8/16/32), ignorado si no aplica
 */
export function enviarInformacion(socket, trama, algoritmo, bloque = 8) {
  const header = JSON.stringify({ algoritmo, bloque, bits: trama.length });
  socket.write(header + "\n" + trama + "\n");
}
