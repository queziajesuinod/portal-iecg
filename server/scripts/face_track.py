"""Rastreia o rosto do orador num trecho de video para reenquadrar em 9:16.

Usa deteccao facial por IA (modelo ONNX gratuito "UltraFace", licenca MIT) rodando
em onnxruntime. Os frames sao extraidos com ffmpeg, entao NAO depende de opencv nem
mediapipe (que ainda nao tem wheels para Python 3.14).

Estabilidade (evita tremor de alta frequencia na origem):
  - O UltraFace emite milhares de caixas candidatas por frame, sem supressao. Sem
    NMS, um unico rosto real gera um cacho de caixas sobrepostas e o argmax "pula"
    entre elas a cada frame. Fazemos NMS + box voting (media ponderada do cacho)
    para um centro estavel sub-pixel.
  - A imagem entra no modelo por LETTERBOX (mantendo aspecto), nao esticada em 4:3,
    para nao deformar os rostos e derrubar a confianca.
  - Os pesos do seletor (area/confianca/continuidade) sao normalizados a 0..1.

Uso:
  python face_track.py <video_path> <start_seconds> <end_seconds> <out_json> [sample_fps]

Saida (JSON):
  {
    "width": 1280, "height": 720,
    "samples": [{"t": 0.0, "cx": 0.51}, {"t": 0.1, "cx": 0.52}, ...]
  }
  onde "t" e o tempo RELATIVO ao inicio do trecho e "cx" e o centro horizontal
  do rosto normalizado (0..1). Amostras sem rosto detectado sao omitidas
  (o consumidor preenche as lacunas com o centro).

Exit codes: 0 ok | 2 args | 3 dependencia/modelo ausente | 4 falha ao ler frames
"""
import json
import os
import subprocess
import sys

# Entrada fixa do modelo UltraFace (RFB-320): NCHW, 320x240 RGB.
NET_W = 320
NET_H = 240
CONF_THRESHOLD = 0.6   # confianca minima para aceitar um rosto (0..1)
MIN_FACE_FRAC = 0.05   # largura minima do rosto (fracao da largura) -> rejeita falsos positivos pequenos
NMS_IOU = 0.4          # IoU acima da qual duas caixas sao consideradas o mesmo rosto (supressao)
NMS_TOP_K = 8          # maximo de rostos distintos mantidos por frame
VOTE_IOU = 0.55        # IoU para agrupar caixas do mesmo cacho no box voting
CONTINUITY_WEIGHT = 0.8  # penaliza rostos longe do anterior (evita "pular" entre pessoas/deteccoes)


def eprint(*a):
    print(*a, file=sys.stderr)


def resolve_model_path():
    override = os.environ.get("FACE_TRACK_MODEL_PATH")
    if override:
        return override
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "version-RFB-320.onnx")


def resolve_ffmpeg():
    return os.environ.get("FFMPEG_PATH") or "ffmpeg"


def probe_dimensions(video_path):
    """Le largura/altura da fonte via ffprobe; retorna (0, 0) se indisponivel."""
    ffprobe = os.environ.get("FFPROBE_PATH") or "ffprobe"
    try:
        out = subprocess.run(
            [ffprobe, "-v", "error", "-select_streams", "v:0",
             "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x", video_path],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
        w, h = out.split("x")[:2]
        return int(w), int(h)
    except Exception:
        return 0, 0


def open_frame_stream(video_path, start, duration, sample_fps):
    """Abre um ffmpeg que emite frames amostrados como rawvideo rgb24 (320x240),
    com LETTERBOX (mantem aspecto; nao estica). Retorna o processo Popen; os frames
    sao lidos do stdout em streaming para nao acumular tudo em RAM."""
    ffmpeg = resolve_ffmpeg()
    vf = (
        f"fps={sample_fps},"
        f"scale={NET_W}:{NET_H}:force_original_aspect_ratio=decrease,"
        f"pad={NET_W}:{NET_H}:(ow-iw)/2:(oh-ih)/2:color=black"
    )
    args = [
        ffmpeg, "-v", "error",
        "-ss", str(start), "-i", video_path, "-t", str(duration),
        "-vf", vf,
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-",
    ]
    return subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)


def read_exact(stream, n):
    """Le exatamente n bytes de um pipe (pode chegar em pedacos); '' no fim do stream."""
    buf = bytearray()
    while len(buf) < n:
        chunk = stream.read(n - len(buf))
        if not chunk:
            break
        buf.extend(chunk)
    return bytes(buf)


def iou_vec(box, boxes):
    """IoU de uma caixa contra um array de caixas [x1,y1,x2,y2]."""
    import numpy as np
    x1 = np.maximum(box[0], boxes[:, 0])
    y1 = np.maximum(box[1], boxes[:, 1])
    x2 = np.minimum(box[2], boxes[:, 2])
    y2 = np.minimum(box[3], boxes[:, 3])
    inter = np.clip(x2 - x1, 0, None) * np.clip(y2 - y1, 0, None)
    a1 = (box[2] - box[0]) * (box[3] - box[1])
    a2 = (boxes[:, 2] - boxes[:, 0]) * (boxes[:, 3] - boxes[:, 1])
    return inter / np.maximum(a1 + a2 - inter, 1e-9)


def nms(boxes, scores, iou_thr=NMS_IOU, top_k=NMS_TOP_K):
    """Non-Maximum Suppression: retorna indices dos rostos distintos (sem cachos)."""
    import numpy as np
    order = np.argsort(-scores)
    keep = []
    while order.size > 0 and len(keep) < top_k:
        i = order[0]
        keep.append(i)
        if order.size == 1:
            break
        ious = iou_vec(boxes[i], boxes[order[1:]])
        order = order[1:][ious < iou_thr]
    return np.array(keep, dtype=int)


def vote_box(box, boxes, scores, iou_thr=VOTE_IOU):
    """Media ponderada das caixas do mesmo cacho -> centro estavel sub-pixel."""
    m = iou_vec(box, boxes) >= iou_thr
    w = scores[m][:, None]
    return (boxes[m] * w).sum(axis=0) / max(float(w.sum()), 1e-9)


def main():
    if len(sys.argv) < 5:
        eprint("Uso: face_track.py <video> <start> <end> <out_json> [sample_fps]")
        sys.exit(2)

    video_path = sys.argv[1]
    start = float(sys.argv[2])
    end = float(sys.argv[3])
    out_path = sys.argv[4]
    sample_fps = float(sys.argv[5]) if len(sys.argv) > 5 else 10.0
    duration = max(0.0, end - start)

    try:
        import numpy as np
        import onnxruntime as ort
    except ImportError as exc:
        eprint(f"ERRO: dependencia ausente ({exc}). Rode: pip install onnxruntime numpy")
        sys.exit(3)

    model_path = resolve_model_path()
    if not os.path.isfile(model_path):
        eprint(f"ERRO: modelo nao encontrado em {model_path}")
        sys.exit(3)

    width, height = probe_dimensions(video_path)

    # Geometria do letterbox: para 16:9 o padding e so vertical (pad_x=0); fontes mais
    # estreitas ganham barras laterais e o cx precisa descontar essa borda.
    src_ar = (width / height) if (width and height) else (NET_W / NET_H)
    net_ar = NET_W / NET_H
    content_w = NET_W if src_ar >= net_ar else (NET_H * src_ar)
    pad_x = (NET_W - content_w) / 2.0

    so = ort.SessionOptions()
    so.log_severity_level = 4  # silencia os warnings de initializer do modelo
    session = ort.InferenceSession(model_path, sess_options=so, providers=["CPUExecutionProvider"])
    input_name = "input"

    proc = open_frame_stream(video_path, start, duration, sample_fps)
    frame_size = NET_W * NET_H * 3
    step = 1.0 / sample_fps if sample_fps > 0 else 0.1

    samples = []
    total = 0
    prev_cx = None  # centro escolhido no frame anterior, em coords normalizadas do letterbox (0..1)
    try:
        idx = 0
        while True:
            raw = read_exact(proc.stdout, frame_size)
            if len(raw) < frame_size:
                break  # fim do stream
            total += 1
            t = idx * step
            idx += 1
            if t > duration:
                break

            img = np.frombuffer(raw, dtype=np.uint8).reshape(NET_H, NET_W, 3).astype(np.float32)
            img = (img - 127.0) / 128.0
            tensor = np.transpose(img, (2, 0, 1))[np.newaxis, :, :, :]  # NCHW
            scores, boxes = session.run(None, {input_name: tensor})
            conf = scores[0, :, 1]  # probabilidade de "rosto"
            keep = conf > CONF_THRESHOLD
            if not np.any(keep):
                continue
            b = boxes[0][keep]          # [x1,y1,x2,y2] normalizado 0..1 (no frame letterboxed)
            c = conf[keep]

            # NMS + box voting: colapsa o cacho de caixas de cada rosto num centro estavel.
            sel = nms(b, c)
            cand = np.stack([vote_box(b[i], b, c) for i in sel])
            cand_conf = c[sel]

            widths = cand[:, 2] - cand[:, 0]
            # Descarta deteccoes minusculas (ruido / rostos ao fundo).
            big = widths >= MIN_FACE_FRAC
            if not np.any(big):
                continue
            cand, cand_conf, widths = cand[big], cand_conf[big], widths[big]

            cxs = (cand[:, 0] + cand[:, 2]) / 2.0
            areas = widths * (cand[:, 3] - cand[:, 1])
            a_norm = areas / max(float(areas.max()), 1e-9)

            # Seletor com termos comparaveis (0..1): area + confianca, penalizando saltos.
            score = 0.45 * a_norm + 0.55 * cand_conf
            if prev_cx is not None:
                score = score - CONTINUITY_WEIGHT * np.abs(cxs - prev_cx)
            best = int(np.argmax(score))

            cx_lb = float(cxs[best])           # centro no frame letterboxed (0..1)
            prev_cx = cx_lb                    # continuidade comparada no MESMO espaco
            # Remove o padding lateral e renormaliza para o conteudo real (0..1).
            cx_content = (cx_lb * NET_W - pad_x) / max(content_w, 1e-9)
            cx = float(min(1.0, max(0.0, cx_content)))
            samples.append({"t": round(t, 3), "cx": round(cx, 4)})
    finally:
        try:
            proc.stdout.close()
        except Exception:
            pass
        ret = proc.wait()
        stderr = (proc.stderr.read() or b"").decode("utf-8", "replace")

    if total == 0 and ret not in (0, None):
        eprint(f"ERRO: falha ao ler frames: {stderr[-300:]}")
        sys.exit(4)

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"width": width, "height": height, "samples": samples}, f)

    eprint(f"[face_track] {len(samples)}/{total} frames com rosto em {duration:.1f}s")


if __name__ == "__main__":
    main()
