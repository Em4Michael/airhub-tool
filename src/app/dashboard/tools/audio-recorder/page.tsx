"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, Mic, Square, Volume2, Download, Trash2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const token = () => localStorage.getItem("airhub_token") || "";

const EVAL_PROMPT = `You are a Speech & Audio Quality Expert with 50+ years of combined experience in linguistics, voice acting, TTS evaluation, and conversational AI. Evaluate Virtual Assistant audio delivery against the provided transcription text.

MODE DETECTION: Transcription text is provided → FULL MODE. Run all Gates 1–6 plus Additional Questions A1–A6. Comment must be 20–30 words exactly.

CORE LAWS:
L1 — Zero-Skip: Every gate and sub-step must be completed.
L2 — Never Assume: Base ratings on audibly confirmed content only.
L3 — Three-Confirmation Rule: Direct audio observation + text comparison + rating scale application.
L4 — Evidence-First: Every rating must cite a specific audible reason.
L5 — Scale Anchor Rule: Name the chosen scale option and state why adjacent options were rejected.
L6 — Text Is Ground Truth: Transcription is the reference. Audio is judged against it.

GATE 1 — TEXT ANALYSIS:
- Word count, text style (Instructional/Conversational/Informational/Narrative/Q&A)
- Expected tone, pacing, key emphasis words, expected pauses
- Mismatch watch-list: flag any unusual names, technical terms, or tricky pronunciations

GATE 2 — AUDIO QUALITY (Excellent/Good/OK/Slightly Off/Poor/Very Poor):
- Background noise? Fuzziness or distortion? Glitches, clicks, pops? Volume consistency? Overall clarity?
- Scale anchor check: why chosen rating, why adjacent options rejected.

GATE 3 — NATURALNESS / STYLE MATCH (Excellent/Good/OK/Slightly Off/Poor/Very Poor):
- Does tone match text style? Key words emphasised correctly? Pacing appropriate? Fluency?
- Rhythm, pauses at punctuation, unnatural word groupings?

GATE 4 — CONVERSATIONAL NATURALNESS (Excellent/Good/OK/Slightly Off/Poor/Very Poor):
- Intonation varies naturally? Sounds like thinking or reading? Emotional expressiveness? Pitch variation?
- Natural pacing and breaths? Robotic segments?

GATE 5 — WORD MISMATCH (No/One/Two or More/Unsure):
- Word-by-word alignment. List every mismatch: position, expected word, heard word, type (Omission/Addition/Mispronunciation/Substitution).
- 0 confirmed 0 uncertain = No. 1 confirmed = One. 2+ confirmed = Two or More. Genuine uncertainty = Unsure.

GATE 6 — OPEN ISSUES:
- Long silences >1.5 sec? Offensive content? Irritating voice qualities? Repetition artifacts? Volume inconsistency? Clipping/cutoff? Other?
- Write "None" if nothing found.

ADDITIONAL QUESTIONS:
A1 Pronunciation: Most words / Several words / Maybe one / Pronunciation seems fine / Pronunciation is perfect
A2 Emotional connection: Very Disconnected / Disconnected / Neutral / Connected / Very Connected
A3 Speaker delivery: Very unnatural / Unnatural / Neutral / Natural / Very natural
A4 Audio quality (form): Very poor / Poor / Ok / Good / Excellent
A5 Overall opinion: Very negative / Negative / Neutral / Positive / Very Positive
A6 Motivation: 1–2 concise sentences covering what drove the choices above.

Comment rule: EXACTLY 20–30 words. Cover dominant quality, key deduction, mismatch detail if any. Count words before writing.

Return ONLY valid JSON:
{
  "gate1": {"wordCount": 0, "style": "", "expectedTone": "", "expectedPacing": "", "keyEmphasis": "", "mismatchWatchList": ""},
  "gate2": {"observation": "", "rating": "", "anchorCheck": "", "textBox": ""},
  "gate3": {"toneMatch": "", "emphasisCorrect": "", "pacing": "", "fluency": "", "rating": "", "textBox": ""},
  "gate4": {"intonation": "", "soundsLike": "", "expressiveness": "", "pitchVariation": "", "roboticSegments": "", "rating": "", "textBox": ""},
  "gate5": {"mismatches": [{"position": "", "expected": "", "heard": "", "type": ""}], "rating": ""},
  "gate6": {"issues": [""]},
  "a1Pronunciation": "",
  "a2EmotionalConnection": "",
  "a3SpeakerDelivery": "",
  "a4AudioQuality": "",
  "a5OverallOpinion": "",
  "a6Motivation": "",
  "comment": ""
}`;

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  return [Math.floor(s/3600), Math.floor((s%3600)/60), s%60].map(n => String(n).padStart(2,"0")).join(":");
}

const GATE_COLOR: Record<string, string> = {
  "Excellent": "text-green-600 bg-green-50 border-green-200",
  "Good": "text-blue-600 bg-blue-50 border-blue-200",
  "OK": "text-gray-600 bg-gray-50 border-gray-200",
  "Slightly Off": "text-amber-600 bg-amber-50 border-amber-200",
  "Poor": "text-orange-600 bg-orange-50 border-orange-200",
  "Very Poor": "text-red-600 bg-red-50 border-red-200",
  "No": "text-green-600 bg-green-50 border-green-200",
  "One": "text-amber-600 bg-amber-50 border-amber-200",
  "Two or More": "text-red-600 bg-red-50 border-red-200",
  "Unsure": "text-gray-600 bg-gray-50 border-gray-200",
};

export default function AudioRecorderPage() {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recs, setRecs] = useState<any[]>([]);
  const [selected, setSelected] = useState<number|null>(null);
  const [transcript, setTranscript] = useState("");
  const [evalText, setEvalText] = useState("");
  const [evalResult, setEvalResult] = useState<any>(null);
  const [loadingTx, setLoadingTx] = useState(false);
  const [loadingEval, setLoadingEval] = useState(false);
  const [error, setError] = useState("");

  const streamRef = useRef<MediaStream|null>(null);
  const ctxRef = useRef<AudioContext|null>(null);
  const scriptRef = useRef<ScriptProcessorNode|null>(null);
  const pcmRef = useRef<number[][]>([[],[]]);
  const t0Ref = useRef(0);
  const timerRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number|null>(null);
  const analyserRef = useRef<AnalyserNode|null>(null);

  // draw flat line on mount
  useEffect(() => { drawFlat(); }, []);

  function drawFlat() {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    c.width = c.offsetWidth * (window.devicePixelRatio||1);
    c.height = c.offsetHeight * (window.devicePixelRatio||1);
    ctx.clearRect(0,0,c.width,c.height);
    ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, c.height/2); ctx.lineTo(c.width, c.height/2); ctx.stroke();
  }

  const startVisual = useCallback(() => {
    if (!analyserRef.current || !canvasRef.current) return;
    const c = canvasRef.current;
    const ctx = c.getContext("2d")!;
    const data = new Uint8Array(analyserRef.current.fftSize);
    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      analyserRef.current!.getByteTimeDomainData(data);
      c.width = c.offsetWidth * (window.devicePixelRatio||1);
      c.height = c.offsetHeight * (window.devicePixelRatio||1);
      ctx.clearRect(0,0,c.width,c.height);
      ctx.strokeStyle = "#10b981"; ctx.lineWidth = 2;
      ctx.shadowBlur = 8; ctx.shadowColor = "#10b98160";
      ctx.beginPath();
      const sw = c.width / data.length;
      data.forEach((v, i) => {
        const y = (v/128) * c.height/2;
        i===0 ? ctx.moveTo(0,y) : ctx.lineTo(i*sw, y);
      });
      ctx.stroke();
    };
    draw();
  }, []);

  async function startRec() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: 1, height: 1 },
        audio: { echoCancellation: false, noiseSuppression: false, sampleRate: 44100 } as any,
      });
      stream.getVideoTracks().forEach(t => t.stop());
      const aTracks = stream.getAudioTracks();
      if (!aTracks.length) { alert("No audio — tick 'Share audio' in the dialog"); stream.getTracks().forEach(t=>t.stop()); return; }

      streamRef.current = stream;
      const ctx = new AudioContext({ sampleRate: 44100 });
      ctxRef.current = ctx;
      const src = ctx.createMediaStreamSource(new MediaStream(aTracks));
      const analyser = ctx.createAnalyser(); analyser.fftSize = 2048;
      analyserRef.current = analyser;
      src.connect(analyser);
      const script = ctx.createScriptProcessor(4096, 2, 2);
      scriptRef.current = script;
      pcmRef.current = [[],[]];
      script.onaudioprocess = e => {
        const l = e.inputBuffer.getChannelData(0);
        const r = e.inputBuffer.getChannelData(e.inputBuffer.numberOfChannels > 1 ? 1 : 0);
        for (let i=0; i<l.length; i++) { pcmRef.current[0].push(l[i]); pcmRef.current[1].push(r[i]); }
      };
      src.connect(script); script.connect(ctx.destination);
      aTracks[0].onended = () => { if (!document.hidden) stopRec(); };
      t0Ref.current = Date.now();
      timerRef.current = setInterval(() => setElapsed(Date.now()-t0Ref.current), 200);
      setRecording(true);
      startVisual();
    } catch(e: any) { if (e.name !== "NotAllowedError") setError(e.message); }
  }

  async function stopRec() {
    clearInterval(timerRef.current);
    if (animRef.current) cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach(t=>t.stop()); streamRef.current = null;
    scriptRef.current?.disconnect(); scriptRef.current = null;
    const dur = Date.now() - t0Ref.current;
    const sr = ctxRef.current?.sampleRate || 44100;
    if (ctxRef.current) { await ctxRef.current.close(); ctxRef.current = null; analyserRef.current = null; }
    const L = Float32Array.from(pcmRef.current[0]);
    const R = Float32Array.from(pcmRef.current[1]);
    pcmRef.current = [[],[]];
    const wav = buildWAV(L, R, sr);
    const url = URL.createObjectURL(wav);
    setRecs(prev => [{ blob: wav, url, duration: dur, name: `Recording ${prev.length+1}` }, ...prev]);
    setElapsed(0); setRecording(false);
    drawFlat();
  }

  function buildWAV(L: Float32Array, R: Float32Array, sr: number): Blob {
    const t = L.length;
    const buf = new ArrayBuffer(44 + t*4);
    const v = new DataView(buf);
    const ws = (o: number, s: string) => { for(let i=0;i<s.length;i++) v.setUint8(o+i,s.charCodeAt(i)); };
    ws(0,"RIFF"); v.setUint32(4,36+t*4,true); ws(8,"WAVE"); ws(12,"fmt ");
    v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,2,true);
    v.setUint32(24,sr,true); v.setUint32(28,sr*4,true); v.setUint16(32,4,true); v.setUint16(34,16,true);
    ws(36,"data"); v.setUint32(40,t*4,true);
    let o=44;
    for(let i=0;i<t;i++){
      v.setInt16(o,Math.round(Math.max(-1,Math.min(1,L[i]))*0x7fff),true); o+=2;
      v.setInt16(o,Math.round(Math.max(-1,Math.min(1,R[i]))*0x7fff),true); o+=2;
    }
    return new Blob([buf],{type:"audio/wav"});
  }

  async function transcribe(idx: number) {
    setLoadingTx(true); setError(""); setTranscript(""); setEvalResult(null); setSelected(idx);
    try {
      const form = new FormData();
      form.append("audio", recs[idx].blob, "recording.wav");
      const res = await fetch(`${API}/tools/transcribe`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        // Show message and let user paste manually
        setError(data.message || `HTTP ${res.status}`);
        return;
      }
      setTranscript(data.transcription || "");
      setEvalText(data.transcription || "");
    } catch(e: any) { setError(e.message); }
    finally { setLoadingTx(false); }
  }

  async function evaluate() {
    if (!evalText.trim()) return;
    setLoadingEval(true); setError(""); setEvalResult(null);
    try {
      const res = await fetch(`${API}/tools/annotate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ system_prompt: EVAL_PROMPT, user_message: `Evaluate this VA audio transcription:\n\n${evalText}` }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEvalResult(JSON.parse(data.text || "{}"));
    } catch(e: any) { setError(e.message); }
    finally { setLoadingEval(false); }
  }

  function deleteRec(idx: number) {
    URL.revokeObjectURL(recs[idx].url);
    setRecs(prev => prev.filter((_,i)=>i!==idx));
    if (selected === idx) { setSelected(null); setTranscript(""); setEvalText(""); setEvalResult(null); }
  }

  const GateBadge = ({ label, val }: { label: string; val: string }) => (
    <div className="bg-white border border-gray-200 rounded-xl p-3 text-center space-y-1">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full border ${GATE_COLOR[val] || "text-gray-500 bg-gray-50 border-gray-200"}`}>{val || "—"}</span>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audio Recorder</h1>
        <p className="text-sm text-gray-500 mt-0.5">Capture tab audio · transcribe · evaluate VA audio quality (6 gates + A1–A6)</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>}

      {/* Recorder card */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">Tab / System Audio Capture</span>
          {recording && (
            <span className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Recording — {fmt(elapsed)}
            </span>
          )}
        </div>
        <div className="p-5 space-y-4">
          <canvas ref={canvasRef} className="w-full h-16 rounded-lg bg-gray-50" />
          {!recording && <div className="text-center font-mono text-3xl font-light text-gray-300">{fmt(elapsed)}</div>}
          <div className="flex gap-3">
            <button onClick={startRec} disabled={recording}
              className="btn btn-primary flex items-center gap-2">
              <Mic className="h-4 w-4" /> Start Capture
            </button>
            <button onClick={stopRec} disabled={!recording}
              className="btn btn-danger flex items-center gap-2">
              <Square className="h-4 w-4" /> Stop &amp; Save
            </button>
          </div>
          <p className="text-xs text-gray-400">Captures tab/system audio. In the browser dialog select the tab and tick <strong>Share audio</strong>.</p>
        </div>
      </div>

      {/* Recordings */}
      {recs.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <span className="text-sm font-semibold text-gray-700">Recordings ({recs.length})</span>
          </div>
          <div className="divide-y divide-gray-100">
            {recs.map((r, i) => (
              <div key={i} className={`p-4 space-y-3 transition-colors ${selected === i ? "bg-primary/3" : ""}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800">{r.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-mono">{fmt(r.duration)}</span>
                    <a href={r.url} download={`${r.name}.wav`} className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"><Download className="h-3.5 w-3.5" /></a>
                    <button onClick={() => deleteRec(i)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <audio controls src={r.url} className="w-full h-8" />
                <button onClick={() => transcribe(i)} disabled={loadingTx}
                  className="btn btn-primary btn-sm flex items-center gap-1.5 text-xs">
                  {loadingTx && selected === i ? <><Loader2 className="h-3 w-3 animate-spin" />Transcribing…</> : <><Volume2 className="h-3 w-3" />Transcribe</>}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transcription & eval */}
      {selected !== null && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <span className="text-sm font-semibold text-gray-700">Transcription &amp; VA Audio Evaluation</span>
          </div>
          <div className="p-5 space-y-4">
            {transcript && (
              <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-500 mb-1">Whisper output</p>
                <p className="text-sm text-gray-800 font-mono leading-relaxed">{transcript}</p>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Transcription for evaluation <span className="text-gray-400 font-normal">(paste manually if transcription failed, or edit)</span>
              </label>
              <textarea value={evalText} onChange={e => setEvalText(e.target.value)} rows={5}
                placeholder="Paste the VA transcription text here, then click Evaluate…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-y bg-gray-50 placeholder:text-gray-400" />
            </div>
            <button onClick={evaluate} disabled={!evalText.trim() || loadingEval}
              className="btn btn-primary flex items-center gap-2">
              {loadingEval ? <><Loader2 className="h-4 w-4 animate-spin" />Evaluating all 6 gates…</> : "🎙 Evaluate Audio Quality"}
            </button>
          </div>
        </div>
      )}

      {/* Evaluation results */}
      {evalResult && (
        <div className="space-y-4">
          {/* Gate summary grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <GateBadge label="Audio Quality" val={evalResult.gate2?.rating} />
            <GateBadge label="Naturalness" val={evalResult.gate3?.rating} />
            <GateBadge label="Conversational" val={evalResult.gate4?.rating} />
            <GateBadge label="Word Mismatches" val={evalResult.gate5?.rating} />
          </div>

          {/* Additional questions */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              ["Pronunciation", evalResult.a1Pronunciation],
              ["Emotional Connection", evalResult.a2EmotionalConnection],
              ["Speaker Delivery", evalResult.a3SpeakerDelivery],
              ["Audio Quality (form)", evalResult.a4AudioQuality],
              ["Overall Opinion", evalResult.a5OverallOpinion],
            ].map(([label, val]) => (
              <div key={label} className="space-y-0.5">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-sm font-semibold text-gray-800">{val || "—"}</p>
              </div>
            ))}
          </div>

          {/* Gate text boxes */}
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {[
              ["Audio Quality", evalResult.gate2?.textBox],
              ["Naturalness / Style Match", evalResult.gate3?.textBox],
              ["Conversational Naturalness", evalResult.gate4?.textBox],
            ].filter(([,v]) => v).map(([label, val]) => (
              <div key={label} className="px-4 py-3">
                <p className="text-xs font-semibold text-gray-500 mb-1">{label}</p>
                <p className="text-sm text-gray-700 leading-relaxed">{val}</p>
              </div>
            ))}
          </div>

          {/* Word mismatches */}
          {evalResult.gate5?.mismatches?.filter((m: any) => m.expected).length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-amber-700">Word Mismatches</p>
              {evalResult.gate5.mismatches.filter((m: any) => m.expected).map((m: any, i: number) => (
                <p key={i} className="text-xs text-amber-700 font-mono">• [{m.type}] position {m.position}: expected "{m.expected}" → heard "{m.heard}"</p>
              ))}
            </div>
          )}

          {/* Open issues */}
          {evalResult.gate6?.issues?.filter((s: string) => s && s !== "None").length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-1">
              <p className="text-xs font-semibold text-orange-700">Open Issues</p>
              {evalResult.gate6.issues.filter((s: string) => s && s !== "None").map((issue: string, i: number) => (
                <p key={i} className="text-xs text-orange-700">• {issue}</p>
              ))}
            </div>
          )}

          {/* Motivation */}
          {evalResult.a6Motivation && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 mb-1">A6 Motivation</p>
              <p className="text-sm text-gray-700 leading-relaxed">{evalResult.a6Motivation}</p>
            </div>
          )}

          {/* Comment */}
          {evalResult.comment && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <p className="text-xs font-semibold text-primary/70 mb-1">📝 Comment for submission (20–30 words)</p>
              <p className="text-sm text-gray-800 font-medium leading-relaxed">{evalResult.comment}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}