# Especificación técnica — Laboratorio protocolo por capas

Basado en tu esqueleto actual (`main.py`, `client.py`, `server.py`, `capas/*.py`, `algoritmos/*.py`). Asume Hamming como algoritmo de corrección y Fletcher/CRC-32 como algoritmo de detección (coincide con los nombres `correccionErrores.py` y `deteccionErrores.py`); ajusta si tu equipo eligió otros.

**Nota de idioma:** el enunciado exige que emisor y receptor estén en lenguajes distintos. Como `client.py`/`server.py` ya están en Python, uno de los dos (por ejemplo el cajero/emisor) debe reescribirse en otro lenguaje (Java, C, Go, JS, etc.), replicando las mismas funciones y el mismo formato de trama.

## División de lenguajes: emisor en JavaScript, receptor en Python

Ya implementado en este repo:

- `emisor-js/` — cajero (emisor), en Node.js.
- `receptor-py/` (`capas/`, `algoritmos/`, `server.py`) — banco (receptor), en Python, actualizado para hablar el mismo protocolo. Se corre con `cd receptor-py && python3 server.py`.
- `extras/` — archivos que ya no se usan: `client_legacy_python.py` (el cliente Python original, reemplazado por `emisor-js/client.js`), `ruido_no_usado_receptor.py` (la capa de ruido nunca se implementa del lado receptor, solo existe en el emisor) y `main.py` (vacío, sin uso).

Los dos lados no comparten código; solo comparten el **formato de trama** que viaja por el socket TCP (puerto 9000). Cada envío manda dos líneas de texto terminadas en `\n`:

```
{"algoritmo": "hamming", "bloque": 8, "bits": 88}\n
0100000101101001...\n
```

- Línea 1: header JSON con el algoritmo usado, el tamaño de bloque (solo relevante para Fletcher) y la cantidad de bits. Este header viaja limpio, sin ruido.
- Línea 2: la trama de bits (mensaje + redundancia, y con ruido aplicado si viene del emisor).

Esto evita el problema de que TCP no respeta límites de mensaje: ambos lados leen línea por línea (Node: `readline` sobre el socket; Python: `socket.makefile()` + `readline()`), sin necesidad de un protocolo binario más complejo.

El objeto de aplicación (`{"action": "login", "data": {...}}`) se serializa a JSON, se convierte a texto plano, y ese texto es lo que pasa por `presentacion.codificar_mensaje` antes de llegar a enlace/ruido/transmisión. Es decir, la capa de aplicación sigue siendo JSON por dentro, pero termina viajando como bits ASCII + redundancia, igual que pide el enunciado.

**Nota sobre el algoritmo:** solo el emisor le pregunta al usuario (`solicitar_algoritmo`) qué algoritmo y qué tasa de error usar. El receptor no vuelve a preguntar: lee el algoritmo del header de cada frame y lo reutiliza para sus propias respuestas. La capa de ruido (`ruido.py` no existe del lado receptor a propósito) solo aplica en el emisor, tal como muestra el diagrama del enunciado.

Archivos nuevos/actualizados en `emisor-js/`:

```
emisor-js/
  package.json
  client.js                    # equivalente a client.py (login + menú)
  capas/
    aplicacion.js               # solicitarMensaje, solicitarAlgoritmo, mostrarMensaje
    presentacion.js             # codificarMensaje, decodificarMensaje
    enlace.js                   # calcularIntegridad, verificarIntegridad, corregirMensaje
    ruido.js                    # solicitarTasaError, aplicarRuido
    transmision.js              # crearSocketCliente, crearLectorTramas, enviarInformacion
  algoritmos/
    correccionErrores.js        # TODO: implementar Hamming
    deteccionErrores.js         # TODO: implementar Fletcher o CRC-32
```

Para correrlo: `cd emisor-js && node client.js` (Node ≥ 18, no requiere dependencias externas).

Los archivos `algoritmos/correccionErrores.{py,js}` y `algoritmos/deteccionErrores.{py,js}` quedan con `throw`/`raise NotImplementedError` a propósito: esa es la parte que cada integrante debe implementar (punto b del enunciado). El resto de las capas (aplicación, presentación, enlace-dispatcher, ruido, transmisión) ya está implementado y funcional en ambos lados.

---

## a. Arquitectura de capas

### `receptor-py/capas/aplicacion.py`

Ya tiene `solicitar_mensaje` y `mostrar_mensaje`. Falta ampliarlos para cubrir lo que pide el enunciado (texto + algoritmo, y manejo de error no corregible):

```
solicitar_mensaje(prompt: str) -> str
    # ya implementado: pide el texto a enviar

solicitar_algoritmo() -> str
    # pide al usuario el algoritmo de integridad: "hamming" | "fletcher" | "crc32"
    # return: nombre del algoritmo, usado luego por capas/enlace.py

mostrar_mensaje(mensaje: str, error: bool = False) -> None
    # ya implementado; agregar parámetro error para imprimir
    # "Error: mensaje no pudo ser corregido" cuando corresponda
```

Ambos lados (cajero y servidor) llaman `solicitar_mensaje`/`mostrar_mensaje` para el intercambio real de mensajes de la aplicación bancaria (login, monto a retirar, respuesta del servidor, etc.), tal como ya hace `client.py`/`server.py`.

### `receptor-py/capas/presentacion.py`

```
codificar_mensaje(texto: str) -> str
    # texto: string plano, ej. "A"
    # return: string binario ASCII de 8 bits por carácter, ej. "01000001"

decodificar_mensaje(binario: str, hay_error: bool) -> str | None
    # binario: string de bits (múltiplo de 8) ya sin bits de redundancia
    # hay_error: bandera que llega desde capas/enlace.py (verificar_integridad)
    # return: texto decodificado si hay_error es False; None si hay_error es True
    #         (capas/aplicacion.py usa este None para mostrar el mensaje de error)
```

### `receptor-py/capas/enlace.py`

Aquí se integran los algoritmos de `algoritmos/`.

```
calcular_integridad(trama: str, algoritmo: str, bloque: int = 8) -> str
    # trama: bits del mensaje (salida de codificar_mensaje)
    # algoritmo: "hamming" | "fletcher" | "crc32"
    # bloque: solo aplica a fletcher (8, 16 o 32)
    # return: trama original + bits de redundancia concatenados

verificar_integridad(trama_recibida: str, algoritmo: str, bloque: int = 8) -> tuple[bool, str]
    # trama_recibida: bits + redundancia, tal como llegó por la red
    # return: (hay_error: bool, trama_sin_redundancia: str)

corregir_mensaje(trama_recibida: str, algoritmo: str) -> tuple[str, bool]
    # solo tiene efecto real con "hamming" (fletcher/crc32 solo detectan, no corrigen)
    # return: (trama_corregida, se_pudo_corregir: bool)
```

Orden de uso en el receptor: `verificar_integridad` → si hay error y el algoritmo corrige, `corregir_mensaje` → pasar resultado a `presentacion.decodificar_mensaje`.

### Capa de ruido (solo lado emisor)

Vive únicamente en `emisor-js/capas/ruido.js` (`solicitarTasaError`, `aplicarRuido`). El receptor Python no tiene esta capa: el archivo `capas/ruido.py` original quedó vacío y se movió a `extras/ruido_no_usado_receptor.py` porque no aplica de ese lado (ver diagrama del enunciado: el ruido solo se aplica en la trama que sale del emisor).

### `receptor-py/capas/transmision.py`

```
crear_socket_servidor(host: str, puerto: int) -> socket
    # bind + listen, queda escuchando (equivalente a lo que ya hace server.py)

crear_socket_cliente(host: str, puerto: int) -> socket
    # connect (equivalente a lo que ya hace client.py)

enviar_informacion(sock: socket, trama: str) -> None
    # trama: string de bits, se envía por el socket (encode a bytes)

recibir_informacion(sock: socket) -> str
    # bloqueante; el receptor siempre está escuchando
    # return: trama de bits recibida (decode de bytes a string)
```

`server.py` ya usa este socket con framing de header + trama (ver sección "División de lenguajes" arriba).

### Flujo completo por mensaje (emisor)

```
texto = aplicacion.solicitar_mensaje(...)
algoritmo = aplicacion.solicitar_algoritmo()
bits = presentacion.codificar_mensaje(texto)
trama = enlace.calcular_integridad(bits, algoritmo)
tasa = ruido.solicitar_tasa_error()
trama_con_ruido = ruido.aplicar_ruido(trama, tasa)
transmision.enviar_informacion(sock, trama_con_ruido)
```

### Flujo completo por mensaje (receptor)

```
trama = transmision.recibir_informacion(sock)
hay_error, bits = enlace.verificar_integridad(trama, algoritmo)
if hay_error:
    bits, corregido = enlace.corregir_mensaje(trama, algoritmo)
texto = presentacion.decodificar_mensaje(bits, hay_error and not corregido)
aplicacion.mostrar_mensaje(texto, error=(hay_error and not corregido))
```

---

## b. Algoritmos (`algoritmos/correccionErrores.py`, `algoritmos/deteccionErrores.py`)

### `receptor-py/algoritmos/correccionErrores.py` — Código de Hamming

```
hamming_calcular_r(m: int) -> int
    # m: bits de datos; return: menor r que cumple m + r + 1 <= 2^r

hamming_codificar(bits: str) -> str
    # bits: mensaje de m bits
    # return: palabra código con bits de paridad insertados en posiciones potencia de 2

hamming_decodificar(codeword: str) -> tuple[str, bool, int]
    # codeword: bits recibidos (con posible error)
    # return: (mensaje_sin_paridad, hubo_error, posicion_error)
    #         posicion_error = 0 si no hubo error; el bit en esa posición ya viene corregido
```

Si en vez de Hamming se usa el otro algoritmo sugerido:

```
# Códigos convolucionales (Viterbi), tasa m:1
convolucional_codificar(bits: str, m: int) -> str
viterbi_decodificar(bits_codificados: str, m: int) -> str
```

### `receptor-py/algoritmos/deteccionErrores.py` — Fletcher checksum o CRC-32

```
fletcher_calcular(datos: str, bloque: int) -> str
    # datos: bits del mensaje; bloque: 8, 16 o 32 (configurable)
    # aplica padding de ceros si datos no es múltiplo del bloque
    # return: bits del checksum (2 * bloque bits: suma A + suma B)

fletcher_verificar(datos_con_checksum: str, bloque: int) -> bool
    # return: True si no hay error detectado
```

```
# Alternativa: CRC-32
crc32_calcular(datos: str, polinomio: int = 0x04C11DB7) -> str
    # datos: bits del mensaje (n > 32, o padding si es menor)
    # return: 32 bits de residuo (CRC) a concatenar

crc32_verificar(datos_con_crc: str, polinomio: int = 0x04C11DB7) -> bool
    # return: True si el residuo calculado en el receptor da 0 (sin error)
```

`enlace.calcular_integridad`/`verificar_integridad` deciden a cuál de estas funciones llamar según el parámetro `algoritmo`.

---

## c. Pruebas

Archivo sugerido: `pruebas/benchmark.py` (nuevo).

```
ejecutar_prueba(mensaje: str, algoritmo: str, tasa_error: float, bloque: int = 8) -> dict
    # corre codificar -> calcular_integridad -> aplicar_ruido -> verificar_integridad (-> corregir_mensaje)
    # return: dict con {bits_enviados, bits_redundancia, hubo_error, se_corrigio,
    #                    overhead_pct, algoritmo, tasa_error, tamano_mensaje}

correr_bateria(tamanos: list[int], tasas: list[float], algoritmos: list[str], repeticiones: int = 100) -> DataFrame
    # corre ejecutar_prueba variando cada combinación, guarda resultados en CSV

graficar_resultados(df: DataFrame, salida_dir: str) -> None
    # genera y guarda PNGs con matplotlib
```

Variables a variar (según enunciado): tamaño de la cadena enviada, probabilidad de error, algoritmo usado, overhead.

Gráficas sugeridas:
- % de mensajes corregidos/detectados correctamente vs. tasa de error (una línea por algoritmo).
- Overhead (bits de redundancia / bits de datos) vs. tamaño del mensaje, por algoritmo.
- Tasa de error máxima soportada antes de fallar, por algoritmo (para responder qué algoritmo es más flexible).
- Corrección vs. detección: % de mensajes con error no recuperable en Hamming vs. Fletcher/CRC-32, mismo tamaño y tasa de error (para responder cuándo conviene cada tipo).

---

## Resumen de archivos (estado actual)

### `receptor-py/` (Python, banco/receptor)

| Archivo | Estado | Notas |
|---|---|---|
| `capas/aplicacion.py` | implementado | `solicitar_mensaje`, `solicitar_algoritmo`, `mostrar_mensaje` |
| `capas/presentacion.py` | implementado | `codificar_mensaje`, `decodificar_mensaje` |
| `capas/enlace.py` | implementado (dispatcher) | `calcular_integridad`, `verificar_integridad`, `corregir_mensaje`; llama a `algoritmos/` |
| `capas/transmision.py` | implementado | `crear_socket_servidor/cliente`, `crear_lector_tramas`, `enviar_informacion`, `recibir_informacion` |
| `algoritmos/correccionErrores.py` | **pendiente** | `hamming_calcular_r`, `hamming_codificar`, `hamming_decodificar` (`raise NotImplementedError`) |
| `algoritmos/deteccionErrores.py` | **pendiente** | `fletcher_calcular`, `fletcher_verificar` (o `crc32_*`) (`raise NotImplementedError`) |
| `server.py` | implementado | login/withdraw/logout ya integrados con las capas |

Probado: import de todas las capas, framing de trama Python↔JS, y codificación/decodificación ASCII, todo funcionando (ver verificación en el turno anterior).

### `emisor-js/` (JavaScript, cajero/emisor)

Mismo estado: capas de aplicación, presentación, enlace-dispatcher, ruido y transmisión implementadas; `algoritmos/*.js` pendientes.

### `extras/` (ya no se usan)

| Archivo | Por qué está aquí |
|---|---|
| `client_legacy_python.py` | cliente Python original, sin capas; reemplazado por `emisor-js/client.js` |
| `ruido_no_usado_receptor.py` | capa de ruido vacía; no aplica del lado receptor |
| `main.py` | vacío, sin uso; no hay punto de entrada único, cada lado se corre por separado (`server.py` / `client.js`) |

### `pruebas/benchmark.py` (no existe todavía)

Pendiente de crear para el punto c: `ejecutar_prueba`, `correr_bateria`, `graficar_resultados`.
