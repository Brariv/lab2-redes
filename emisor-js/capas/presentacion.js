/**
 * Codifica cada carácter a su ASCII binario de 8 bits.
 * @param {string} texto
 * @returns {string} string de bits, ej. "A" -> "01000001"
 */
export function codificarMensaje(texto) {
  return [...texto].map((c) => c.charCodeAt(0).toString(2).padStart(8, "0")).join("");
}

/**
 * Decodifica un string de bits (múltiplo de 8) a texto.
 * @param {string} binario - bits del mensaje, sin bits de redundancia
 * @param {boolean} hayError - si true, no se pudo garantizar integridad
 * @returns {string | null} texto decodificado, o null si hayError es true
 */
export function decodificarMensaje(binario, hayError) {
  if (hayError) return null;
  const bytes = binario.match(/.{1,8}/g) || [];
  return bytes.map((b) => String.fromCharCode(parseInt(b, 2))).join("");
}
