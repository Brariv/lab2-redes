import { crearSocketCliente, crearLectorTramas, enviarInformacion } from "./capas/transmision.js";
import { solicitarMensaje, solicitarAlgoritmo, mostrarMensaje, cerrarEntrada } from "./capas/aplicacion.js";
import { codificarMensaje, decodificarMensaje } from "./capas/presentacion.js";
import { calcularIntegridad, verificarIntegridad, corregirMensaje } from "./capas/enlace.js";
import { solicitarTasaError, aplicarRuido } from "./capas/ruido.js";

const HOST = "127.0.0.1";
const PUERTO = 9001;

/**
 * Empaqueta un objeto de aplicación (action/data) y lo manda por todas las
 * capas: presentación -> enlace -> ruido -> transmisión.
 */
function enviarMensaje(socket, obj, algoritmo, tasaError, bloque = 8) {
  const texto = JSON.stringify(obj);
  const bits = codificarMensaje(texto);
  const trama = calcularIntegridad(bits, algoritmo, bloque);
  const tramaConRuido = aplicarRuido(trama, tasaError);
  enviarInformacion(socket, tramaConRuido, algoritmo, bloque);
}

/**
 * Recibe un frame y lo pasa por enlace -> presentación.
 * @returns {Promise<{obj: object|null, error: boolean}>}
 */
async function recibirMensaje(lector) {
  const frame = await lector.recibirInformacion();
  if (!frame) return { obj: null, error: true };

  const { algoritmo, bloque, trama } = frame;
  let [hayError, bits] = verificarIntegridad(trama, algoritmo, bloque);
  let corregido = false;
  if (hayError) {
    [bits, corregido] = corregirMensaje(trama, algoritmo);
  }
  const texto = decodificarMensaje(bits, hayError && !corregido);
  if (texto === null) return { obj: null, error: true };
  return { obj: JSON.parse(texto), error: false };
}

async function login(socket, lector, algoritmo, tasaError) {
  while (true) {
    const card = await solicitarMensaje("Enter card number: ");
    const pin = await solicitarMensaje("Enter PIN: ");

    enviarMensaje(socket, { action: "login", data: { card, pin } }, algoritmo, tasaError);
    const { obj, error } = await recibirMensaje(lector);

    if (error) {
      mostrarMensaje("", true);
      continue;
    }
    if (obj.action === "login_ok") {
      mostrarMensaje(obj.data.message);
      return true;
    }
    mostrarMensaje(obj.data.message);
    console.log("   Please try again.\n");
  }
}

async function menu(socket, lector, algoritmo, tasaError) {
  while (true) {
    console.log("\n--- MENU ---");
    console.log("1) Withdraw money");
    console.log("2) Logout");
    const choice = (await solicitarMensaje("Choose an option: ")).trim();

    if (choice === "1") {
      const amount = parseFloat(await solicitarMensaje("Amount to withdraw: "));
      enviarMensaje(socket, { action: "withdraw", data: { amount } }, algoritmo, tasaError);
      const { obj, error } = await recibirMensaje(lector);

      if (error) {
        mostrarMensaje("", true);
      } else if (obj.action === "withdraw_ok") {
        const d = obj.data;
        console.log(`>> Please take your $${d.amount.toFixed(2)}`);
        console.log(`>> Remaining balance: $${d.balance.toFixed(2)}`);
      } else {
        mostrarMensaje(obj.data.message);
      }
    } else if (choice === "2") {
      enviarMensaje(socket, { action: "logout", data: {} }, algoritmo, tasaError);
      const { obj, error } = await recibirMensaje(lector);
      if (!error) mostrarMensaje(obj.data.message);
      break;
    } else {
      console.log(">> Invalid option.");
    }
  }
}

async function main() {
  const socket = await crearSocketCliente(HOST, PUERTO);
  console.log(`[CLIENT] Connected to ${HOST}:${PUERTO}`);
  const lector = crearLectorTramas(socket);

  // Se piden una vez por sesión (el enunciado permite pedirlos "al momento
  // de enviar un mensaje"; aquí se cachean para no interrumpir cada opción
  // del menú, pero se pueden volver a pedir antes de cada enviarMensaje si
  // se prefiere seguir la letra del enunciado al pie).
  const algoritmo = await solicitarAlgoritmo();
  const tasaError = await solicitarTasaError();

  const autenticado = await login(socket, lector, algoritmo, tasaError);
  if (autenticado) {
    await menu(socket, lector, algoritmo, tasaError);
  }

  cerrarEntrada();
  lector.cerrar();
  socket.end();
}

main();
