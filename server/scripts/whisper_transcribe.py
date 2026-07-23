"""Transcreve audio usando faster-whisper.

Uso:
  python whisper_transcribe.py <audio_path> <model_name> <output_json_path> [language_hint]

Saida (JSON):
  {
    "text": "...",
    "language": "pt",
    "language_probability": 0.99,
    "duration": 3600.5,
    "segments": [{"start": 0.0, "end": 4.2, "text": "..."}, ...]
  }

Os segmentos (com timestamps start/end) alimentam a geracao de recortes/Shorts.
"""
import json
import sys


def main():
    if len(sys.argv) < 4:
        print("Uso: whisper_transcribe.py <audio> <model> <output_json> [lang]", file=sys.stderr)
        sys.exit(2)

    audio_path = sys.argv[1]
    model_name = sys.argv[2]
    output_path = sys.argv[3]
    language_hint = sys.argv[4] if len(sys.argv) > 4 else None

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print("ERRO: faster-whisper nao instalado. Rode: pip install faster-whisper", file=sys.stderr)
        sys.exit(3)

    print(f"[whisper] carregando modelo {model_name} em CPU/int8...", file=sys.stderr)
    model = WhisperModel(model_name, device="cpu", compute_type="int8")

    print(f"[whisper] transcrevendo {audio_path}...", file=sys.stderr)
    segments_iter, info = model.transcribe(
        audio_path,
        language=language_hint,
        beam_size=5,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=500),
    )

    total_duration = float(info.duration) if info.duration else 0.0
    print(
        json.dumps({"event": "info", "duration": total_duration, "language": info.language}),
        file=sys.stderr,
        flush=True,
    )

    text_parts = []
    segments = []
    last_emit_pct = -1.0
    for segment in segments_iter:
        seg_text = segment.text.strip()
        text_parts.append(seg_text)
        segments.append({
            "start": round(float(segment.start), 3),
            "end": round(float(segment.end), 3),
            "text": seg_text,
        })
        if total_duration > 0:
            pct = (float(segment.end) / total_duration) * 100.0
            if pct - last_emit_pct >= 1.0 or pct >= 99.5:
                print(
                    json.dumps({
                        "event": "progress",
                        "current": float(segment.end),
                        "total": total_duration,
                        "percent": round(pct, 2),
                    }),
                    file=sys.stderr,
                    flush=True,
                )
                last_emit_pct = pct

    result = {
        "text": " ".join(text_parts).strip(),
        "language": info.language,
        "language_probability": float(info.language_probability),
        "duration": float(info.duration),
        "segments": segments,
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False)

    print(f"[whisper] concluido em {info.duration:.1f}s de audio, idioma={info.language}", file=sys.stderr)


if __name__ == "__main__":
    main()
