"""
Punto (c) del laboratorio: batería de pruebas sobre los algoritmos de
capas/enlace.py, variando tamaño de mensaje, tasa de error y algoritmo.

No depende de pandas: correr_bateria devuelve una lista de dicts (una fila
por prueba) y la guarda en CSV con el módulo estándar `csv`.
graficar_resultados sí requiere matplotlib (instalado en el venv local
`receptor-py copy/.venv`).

Uso:
    cd "receptor-py copy"
    ./.venv/bin/python pruebas/benchmark.py
"""

import csv
import os
import random
import string
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from capas import presentacion, enlace  # noqa: E402

ALGORITMOS = ("hamming", "fletcher", "crc32")


def aplicar_ruido(trama, tasa_error, rng):
    """Invierte cada bit de `trama` con probabilidad `tasa_error`.

    No existe capas/ruido.py del lado receptor a propósito (el enunciado
    solo aplica ruido en el emisor); para poder medir el comportamiento de
    los algoritmos de forma aislada, el benchmark implementa su propio
    inyector de ruido local.
    """
    return "".join(
        (("1" if b == "0" else "0") if rng.random() < tasa_error else b)
        for b in trama
    )


def ejecutar_prueba(mensaje, algoritmo, tasa_error, bloque=8, rng=None):
    """
    Corre codificar -> calcular_integridad -> aplicar_ruido ->
    verificar_integridad (-> corregir_mensaje) para un mensaje.

    Returns:
        dict con bits_enviados, bits_redundancia, overhead_pct, algoritmo,
        tasa_error, tamano_mensaje, trama_alterada, hubo_error, se_corrigio,
        mensaje_correcto (si el texto final coincide con el original) y
        falso_negativo (el ruido alteró la trama pero el algoritmo no lo
        detectó: el peor caso, un dato corrupto se acepta como válido).
    """
    if rng is None:
        rng = random

    bits = presentacion.codificar_mensaje(mensaje)
    trama = enlace.calcular_integridad(bits, algoritmo, bloque)
    bits_enviados = len(bits)
    bits_redundancia = len(trama) - bits_enviados

    trama_con_ruido = aplicar_ruido(trama, tasa_error, rng)
    trama_alterada = trama_con_ruido != trama

    hay_error, bits_out = enlace.verificar_integridad(trama_con_ruido, algoritmo, bloque)
    se_corrigio = False
    if hay_error:
        bits_out, se_corrigio = enlace.corregir_mensaje(trama_con_ruido, algoritmo)

    mensaje_irrecuperable = hay_error and not se_corrigio
    mensaje_correcto = (not mensaje_irrecuperable) and (bits_out == bits)
    falso_negativo = trama_alterada and not hay_error and not mensaje_correcto

    overhead_pct = (bits_redundancia / bits_enviados * 100) if bits_enviados else 0.0

    return {
        "algoritmo": algoritmo,
        "tasa_error": tasa_error,
        "bloque": bloque,
        "tamano_mensaje": len(mensaje),
        "bits_enviados": bits_enviados,
        "bits_redundancia": bits_redundancia,
        "overhead_pct": overhead_pct,
        "trama_alterada": trama_alterada,
        "hubo_error": hay_error,
        "se_corrigio": se_corrigio,
        "mensaje_correcto": mensaje_correcto,
        "falso_negativo": falso_negativo,
    }


def correr_bateria(tamanos, tasas, algoritmos=ALGORITMOS, repeticiones=100,
                    bloque=8, salida_csv=None, seed=42):
    """
    Corre ejecutar_prueba variando cada combinación (tamano x tasa x
    algoritmo x repeticion) y guarda los resultados en CSV.

    Returns:
        list[dict]: una fila por prueba (ver ejecutar_prueba).
    """
    rng = random.Random(seed)
    filas = []
    for algoritmo in algoritmos:
        for tamano in tamanos:
            for tasa in tasas:
                for _ in range(repeticiones):
                    mensaje = "".join(rng.choices(string.ascii_letters + " ", k=tamano))
                    filas.append(ejecutar_prueba(mensaje, algoritmo, tasa, bloque, rng))

    if salida_csv:
        os.makedirs(os.path.dirname(salida_csv), exist_ok=True)
        with open(salida_csv, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=list(filas[0].keys()))
            writer.writeheader()
            writer.writerows(filas)

    return filas


def _agrupar(filas, claves):
    grupos = {}
    for fila in filas:
        clave = tuple(fila[k] for k in claves)
        grupos.setdefault(clave, []).append(fila)
    return grupos


def graficar_resultados(filas, salida_dir):
    """Genera y guarda PNGs con matplotlib a partir de las filas de correr_bateria."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    os.makedirs(salida_dir, exist_ok=True)

    # 1) % de mensajes correctos (detectados/corregidos bien) vs. tasa de error, por algoritmo
    fig, ax = plt.subplots()
    grupos = _agrupar(filas, ("algoritmo", "tasa_error"))
    algoritmos = sorted({f["algoritmo"] for f in filas})
    for algoritmo in algoritmos:
        tasas = sorted({f["tasa_error"] for f in filas if f["algoritmo"] == algoritmo})
        pcts = []
        for tasa in tasas:
            g = grupos[(algoritmo, tasa)]
            pcts.append(100 * sum(f["mensaje_correcto"] for f in g) / len(g))
        ax.plot(tasas, pcts, marker="o", label=algoritmo)
    ax.set_xlabel("Tasa de error (prob. de flip por bit)")
    ax.set_ylabel("% mensajes recibidos correctamente")
    ax.set_title("Corrección/detección efectiva vs. tasa de error")
    ax.legend()
    fig.savefig(os.path.join(salida_dir, "1_exito_vs_tasa_error.png"), dpi=150, bbox_inches="tight")
    plt.close(fig)

    # 2) Overhead (%) vs. tamaño del mensaje, por algoritmo
    fig, ax = plt.subplots()
    grupos = _agrupar(filas, ("algoritmo", "tamano_mensaje"))
    for algoritmo in algoritmos:
        tamanos = sorted({f["tamano_mensaje"] for f in filas if f["algoritmo"] == algoritmo})
        overheads = []
        for tamano in tamanos:
            g = grupos[(algoritmo, tamano)]
            overheads.append(sum(f["overhead_pct"] for f in g) / len(g))
        ax.plot(tamanos, overheads, marker="o", label=algoritmo)
    ax.set_xlabel("Tamaño del mensaje (caracteres)")
    ax.set_ylabel("Overhead (%) = bits_redundancia / bits_enviados")
    ax.set_title("Overhead vs. tamaño del mensaje")
    ax.legend()
    fig.savefig(os.path.join(salida_dir, "2_overhead_vs_tamano.png"), dpi=150, bbox_inches="tight")
    plt.close(fig)

    # 3) Falsos negativos (%) vs. tasa de error, por algoritmo
    #    (la trama se alteró pero el algoritmo no lo detectó: el peor caso)
    fig, ax = plt.subplots()
    grupos = _agrupar(filas, ("algoritmo", "tasa_error"))
    for algoritmo in algoritmos:
        tasas = sorted({f["tasa_error"] for f in filas if f["algoritmo"] == algoritmo})
        pcts = []
        for tasa in tasas:
            g = grupos[(algoritmo, tasa)]
            alteradas = [f for f in g if f["trama_alterada"]]
            pct = (100 * sum(f["falso_negativo"] for f in alteradas) / len(alteradas)) if alteradas else 0.0
            pcts.append(pct)
        ax.plot(tasas, pcts, marker="o", label=algoritmo)
    ax.set_xlabel("Tasa de error (prob. de flip por bit)")
    ax.set_ylabel("% de tramas alteradas que NO se detectaron")
    ax.set_title("Falsos negativos vs. tasa de error")
    ax.legend()
    fig.savefig(os.path.join(salida_dir, "3_falsos_negativos_vs_tasa_error.png"), dpi=150, bbox_inches="tight")
    plt.close(fig)

    # 4) Corrección vs. detección: % irrecuperable (error detectado pero NO corregido)
    fig, ax = plt.subplots()
    for algoritmo in algoritmos:
        tasas = sorted({f["tasa_error"] for f in filas if f["algoritmo"] == algoritmo})
        pcts = []
        for tasa in tasas:
            g = grupos[(algoritmo, tasa)]
            irrecuperables = [f for f in g if f["hubo_error"] and not f["se_corrigio"]]
            pcts.append(100 * len(irrecuperables) / len(g))
        ax.plot(tasas, pcts, marker="o", label=algoritmo)
    ax.set_xlabel("Tasa de error (prob. de flip por bit)")
    ax.set_ylabel("% mensajes con error detectado pero no corregido")
    ax.set_title("Corrección vs. detección (requiere retransmisión)")
    ax.legend()
    fig.savefig(os.path.join(salida_dir, "4_irrecuperables_vs_tasa_error.png"), dpi=150, bbox_inches="tight")
    plt.close(fig)


if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    filas = correr_bateria(
        tamanos=[4, 16, 64, 256],
        tasas=[0.0, 0.001, 0.005, 0.01, 0.02, 0.05, 0.1],
        algoritmos=ALGORITMOS,
        repeticiones=200,
        bloque=8,
        salida_csv=os.path.join(base_dir, "resultados", "resultados.csv"),
    )
    graficar_resultados(filas, os.path.join(base_dir, "resultados"))
    print(f"{len(filas)} pruebas ejecutadas. CSV y gráficas en {os.path.join(base_dir, 'resultados')}")
