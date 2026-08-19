"""Transcreve audio usando faster-whisper.

Uso:
  python whisper_transcribe.py <audio_path> <model_name> <output_json_path> [language_hint]

Ajustes via variaveis de ambiente (todos opcionais):
  WHISPER_DEVICE          cpu | cuda            (default: cpu)
  WHISPER_COMPUTE_TYPE    int8 | float16 | ...  (default: int8 no cpu)
  WHISPER_CPU_THREADS     nº de threads         (default: 0 = auto)
  WHISPER_BEAM_SIZE       1 = greedy (rapido)   (default: 1)
  WHISPER_BATCHED         true | false          (default: true)
  WHISPER_BATCH_SIZE      lote do modo batched  (default: 8)
  WHISPER_VAD             true | false          (default: true)
                          Desligue se a legenda derivar (fica adiantada e piora ao longo do audio).
  WHISPER_WORD_TIMESTAMPS true | false          (default: false)
                          Liga o timestamp POR PALAVRA (para legenda palavra-por-palavra
                          sincronizada). Custa um pouco mais de CPU. Cada segmento passa a
                          incluir "words": [{"start","end","word"}, ...].

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
import os
import sys


def _env(name, default):
    val = os.environ.get(name)
    return val if val not in (None, "") else default


def main():
    if len(sys.argv) < 4:
        print("Uso: whisper_transcribe.py <audio> <model> <output_json> [lang]", file=sys.stderr)
        sys.exit(2)

    audio_path = sys.argv[1]
    model_name = sys.argv[2]
    output_path = sys.argv[3]
    language_hint = sys.argv[4] if len(sys.argv) > 4 else None

    device = _env("WHISPER_DEVICE", "cpu")
    compute_type = _env("WHISPER_COMPUTE_TYPE", "int8" if device == "cpu" else "float16")
    cpu_threads = int(_env("WHISPER_CPU_THREADS", "0"))
    beam_size = int(_env("WHISPER_BEAM_SIZE", "1"))
    use_batched = _env("WHISPER_BATCHED", "true").lower() in ("1", "true", "yes")
    batch_size = int(_env("WHISPER_BATCH_SIZE", "8"))
    # VAD remove silencios e reposiciona os timestamps depois. No modo batched isso pode
    # DERIVAR (timestamps cada vez mais adiantados ao longo do audio). Se a legenda dos
    # recortes vier adiantada e piorando, desligue: WHISPER_VAD=false (e/ou WHISPER_BATCHED=false).
    use_vad = _env("WHISPER_VAD", "true").lower() in ("1", "true", "yes")
    use_word_ts = _env("WHISPER_WORD_TIMESTAMPS", "false").lower() in ("1", "true", "yes")

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print("ERRO: faster-whisper nao instalado. Rode: pip install faster-whisper", file=sys.stderr)
        sys.exit(3)

    print(
        f"[whisper] carregando {model_name} em {device}/{compute_type} "
        f"(threads={cpu_threads or 'auto'}, beam={beam_size}, batched={use_batched}, vad={use_vad})...",
        file=sys.stderr,
    )
    model = WhisperModel(
        model_name,
        device=device,
        compute_type=compute_type,
        cpu_threads=cpu_threads,
    )

    transcribe_kwargs = dict(
        language=language_hint,
        beam_size=beam_size,
        vad_filter=use_vad,
        word_timestamps=use_word_ts,
    )
    if use_vad:
        transcribe_kwargs["vad_parameters"] = dict(min_silence_duration_ms=500)

    runner = model
    if use_batched:
        try:
            from faster_whisper import BatchedInferencePipeline
            runner = BatchedInferencePipeline(model=model)
            transcribe_kwargs["batch_size"] = batch_size
        except (ImportError, Exception) as err:  # noqa: BLE001 - fallback seguro
            print(
                f"[whisper] modo batched indisponivel ({err}); usando modo padrao",
                file=sys.stderr,
            )
            runner = model

    print(f"[whisper] transcrevendo {audio_path}...", file=sys.stderr)
    segments_iter, info = runner.transcribe(audio_path, **transcribe_kwargs)

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
        seg_obj = {
            "start": round(float(segment.start), 3),
            "end": round(float(segment.end), 3),
            "text": seg_text,
        }
        # Timestamp por palavra (quando ligado) -> legenda palavra-por-palavra sincronizada.
        if use_word_ts and getattr(segment, "words", None):
            seg_obj["words"] = [
                {
                    "start": round(float(w.start), 3),
                    "end": round(float(w.end), 3),
                    "word": w.word.strip(),
                }
                for w in segment.words
                if w.start is not None and w.end is not None
            ]
        segments.append(seg_obj)
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
