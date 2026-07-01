"""
Microserviço de embeddings semânticos para busca bíblica.
Modelo: paraphrase-multilingual-MiniLM-L12-v2 (leve, multilingue, preciso em PT-BR)

Expõe uma única rota POST /similarity que recebe contextos e textos de versículos
e retorna o score máximo de similaridade de cada versículo contra qualquer contexto.
Usar o máximo (em vez de média) garante que um versículo seja incluído se for
genuinamente relevante para pelo menos um dos contextos.
"""

import sys
import numpy as np
from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer

MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 7432

app = Flask(__name__)

print(f"[embedding_server] Carregando modelo {MODEL_NAME}...", flush=True)
model = SentenceTransformer(MODEL_NAME)
print(f"[embedding_server] Modelo carregado. Ouvindo na porta {PORT}.", flush=True)


@app.route("/similarity", methods=["POST"])
def similarity():
    data = request.get_json(force=True, silent=True) or {}
    contexts = data.get("contexts", [])
    texts = data.get("texts", [])

    if not contexts or not texts:
        return jsonify({"error": "contexts e texts sao obrigatorios"}), 400

    # Encoda tudo numa chamada só (batch mais eficiente)
    all_inputs = contexts + texts
    all_embeddings = model.encode(
        all_inputs,
        normalize_embeddings=True,
        show_progress_bar=False,
        batch_size=64,
    )

    ctx_emb = np.array(all_embeddings[: len(contexts)])   # (C, D)
    txt_emb = np.array(all_embeddings[len(contexts):])    # (T, D)

    # Matriz de similaridade: (T, C) — similaridade de cada texto vs cada contexto
    sim_matrix = txt_emb @ ctx_emb.T  # embeddings já normalizados, produto interno = cosseno

    # Score final de cada texto: máximo entre todos os contextos
    # Um versículo é relevante se encaixar em pelo menos um contexto
    scores = sim_matrix.max(axis=1).tolist()

    return jsonify({"scores": scores})


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": MODEL_NAME})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=PORT, debug=False)
