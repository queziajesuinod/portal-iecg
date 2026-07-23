"""Rastreia o rosto do orador num trecho de video para reenquadrar em 9:16.

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

Exit codes: 0 ok | 2 args | 3 opencv ausente | 4 falha ao abrir video
"""
import json
import sys


def main():
    if len(sys.argv) < 5:
        print("Uso: face_track.py <video> <start> <end> <out_json> [sample_fps]", file=sys.stderr)
        sys.exit(2)

    video_path = sys.argv[1]
    start = float(sys.argv[2])
    end = float(sys.argv[3])
    out_path = sys.argv[4]
    sample_fps = float(sys.argv[5]) if len(sys.argv) > 5 else 4.0

    try:
        import cv2
    except ImportError:
        print("ERRO: opencv nao instalado. Rode: pip install opencv-python-headless", file=sys.stderr)
        sys.exit(3)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"ERRO: nao consegui abrir {video_path}", file=sys.stderr)
        sys.exit(4)

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 0
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 0

    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    face_cascade = cv2.CascadeClassifier(cascade_path)
    min_face = max(24, int(width * 0.05)) if width else 24

    samples = []
    duration = max(0.0, end - start)
    step = 1.0 / sample_fps if sample_fps > 0 else 0.25
    t = 0.0
    while t <= duration:
        cap.set(cv2.CAP_PROP_POS_MSEC, (start + t) * 1000.0)
        ok, frame = cap.read()
        if not ok or frame is None:
            break
        fh, fw = frame.shape[:2]
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5, minSize=(min_face, min_face)
        )
        if len(faces) > 0:
            # Maior rosto (mais provavel de ser o orador em primeiro plano).
            x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
            cx = (x + w / 2.0) / float(fw)
            samples.append({"t": round(t, 3), "cx": round(float(cx), 4)})
        t += step

    cap.release()

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"width": width, "height": height, "samples": samples}, f)

    print(f"[face_track] {len(samples)} amostras com rosto em {duration:.1f}s", file=sys.stderr)


if __name__ == "__main__":
    main()
