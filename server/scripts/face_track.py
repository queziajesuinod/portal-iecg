"""Rastreia o rosto do orador num trecho de video para reenquadrar em 9:16.

Usa deteccao facial por IA (modelo ONNX gratuito "UltraFace", licenca MIT) rodando
em onnxruntime. Os frames sao extraidos com ffmpeg, entao NAO depende de opencv nem
mediapipe (que ainda nao tem wheels para Python 3.14).

Uso:
  python face_track.py <video_path> <start_seconds> <end_seconds> <out_json> [sample_fps]

Saida (JSON):
  {
    "width": 1280, "height": 720,
    "samples": [{"t": 0.0, "cx": 0.51}, {"t": 0.25, "cx": 0.52}, ...]
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
CONF_THRESHOLD = 0.6  # confianca minima para aceitar um rosto (0..1)


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


def extract_frames(video_path, start, duration, sample_fps):
    """Extrai frames amostrados via ffmpeg como rawvideo rgb24 (320x240).

    Retorna lista de bytes (um por frame), na ordem temporal.
    """
    ffmpeg = resolve_ffmpeg()
    args = [
        ffmpeg, "-v", "error",
        "-ss", str(start), "-i", video_path, "-t", str(duration),
        "-vf", f"fps={sample_fps},scale={NET_W}:{NET_H}",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-",
    ]
    proc = subprocess.run(args, capture_output=True)
    if proc.returncode != 0:
        raise RuntimeError((proc.stderr or b"").decode("utf-8", "replace")[-300:])
    frame_size = NET_W * NET_H * 3
    data = proc.stdout
    frames = [data[i:i + frame_size] for i in range(0, len(data) - frame_size + 1, frame_size)]
    return frames


def main():
    if len(sys.argv) < 5:
        eprint("Uso: face_track.py <video> <start> <end> <out_json> [sample_fps]")
        sys.exit(2)

    video_path = sys.argv[1]
    start = float(sys.argv[2])
    end = float(sys.argv[3])
    out_path = sys.argv[4]
    sample_fps = float(sys.argv[5]) if len(sys.argv) > 5 else 4.0
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

    try:
        frames = extract_frames(video_path, start, duration, sample_fps)
    except Exception as exc:
        eprint(f"ERRO: falha ao extrair frames: {exc}")
        sys.exit(4)

    so = ort.SessionOptions()
    so.log_severity_level = 4  # silencia os warnings de initializer do modelo
    session = ort.InferenceSession(model_path, sess_options=so, providers=["CPUExecutionProvider"])
    input_name = "input"

    samples = []
    step = 1.0 / sample_fps if sample_fps > 0 else 0.25
    for idx, raw in enumerate(frames):
        t = idx * step
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
        b = boxes[0][keep]          # [x1,y1,x2,y2] normalizado 0..1
        c = conf[keep]
        # Maior rosto (mais provavel de ser o orador em primeiro plano), com desempate por confianca.
        areas = (b[:, 2] - b[:, 0]) * (b[:, 3] - b[:, 1])
        best = int(np.argmax(areas + c * 1e-3))
        x1, x2 = float(b[best, 0]), float(b[best, 2])
        cx = min(1.0, max(0.0, (x1 + x2) / 2.0))
        samples.append({"t": round(t, 3), "cx": round(cx, 4)})

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"width": width, "height": height, "samples": samples}, f)

    eprint(f"[face_track] {len(samples)}/{len(frames)} frames com rosto em {duration:.1f}s")


if __name__ == "__main__":
    main()
