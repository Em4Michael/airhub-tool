"use client";
import { useState, useRef } from "react";
import { Loader2, Plus, Trash2, Upload, X } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const token = () => localStorage.getItem("airhub_token") || "";

const SYSTEM_PROMPT = `You are an expert Image Search Quality Analyst. Rate image search results using the Image SBS framework.

SCALE — Image tasks use 4 ratings (different from web SBS):
Not Satisfying / Slightly Satisfying / Moderately Satisfying / Highly Satisfying
"Moderately Satisfying" = equivalent to "Satisfying" in web SBS. Never mix the two scales.

IMAGE SATISFACTION (based ONLY on each image itself, not the host page):
Highly Satisfying: Correct subject, excellent quality, visually impressive, beautiful, inspiring. Professional/studio quality.
Moderately Satisfying: Correct subject, decent quality, ordinary. Clearly correct but nothing special.
Slightly Satisfying: Connected to query but major issues — unlikely intent, partially addresses query, blurry/poor quality/badly cropped.
Not Satisfying: No connection to query. Helpful to virtually no users.

Decision rule: "Is this image merely correct, or is it also excellent?"

FLAGS per image:
Did Not Load: image not loading.
Unsafe: Pornography/Nudity, Violence/Gore, Hate/Discrimination, Medically Explicit, Substance/Drugs, Profane Text, Local Customs, Other Upsetting.
Near Duplicate: compare ONLY to higher-ranked images on the SAME side (NEVER cross-side).
Flag if: identical, cropped/full version, mirrored/rotated/resized, same except minor color/filter, same except minor objects (logos, watermarks, borders).
NOT near duplicate if: same subject but different photo, different angle, different setting.
Highest-ranked image in a cluster = NOT flagged. All lower-ranked = flagged Near Duplicate.

HOST PAGE (rate separately from image):
Did Not Load: page unavailable.
Unsafe: content inappropriate for children or harmful to some adults.
Satisfaction (if loads and safe): rate based on Relevance, Authenticity, Website Credibility.
Credible: well-known org, official website, .gov, university, has positive Wikipedia entry.
Not credible: no Wikipedia entry, fake news site, personal unknown site.

OPR: image quality > host page quality. Prefer side with more satisfying images at higher positions. Diversity and fewer near-duplicates matter.

NEAR DUPLICATE RULE: For images at position 2 or below, explicitly compare to EVERY higher image on the SAME side only. Never compare across sides.

Return ONLY valid JSON:
{
  "queryIntent": "<dominant intent and what users want to see>",
  "leftResults": [
    {
      "position": 1,
      "nearDuplicate": {"isNearDuplicate": false, "duplicateOf": null, "reason": "first image on left — nothing higher to compare"},
      "imageFlag": {"didNotLoad": false, "unsafe": null},
      "imageSatisfaction": "<Highly Satisfying|Moderately Satisfying|Slightly Satisfying|Not Satisfying>",
      "imageReason": "<why — cite specific visual qualities>",
      "hostFlag": {"didNotLoad": false, "unsafe": false},
      "hostSatisfaction": "<Highly Satisfying|Moderately Satisfying|Slightly Satisfying|Not Satisfying>",
      "hostCredible": true,
      "hostReason": "<why credible or not>"
    }
  ],
  "rightResults": [],
  "oprPreference": "<Much Better Left|Better Left|Slightly Better Left|About the Same|Slightly Better Right|Better Right|Much Better Right>",
  "decisiveFactor": "<image quality|ranking|diversity|fewer near-duplicates>",
  "leftSummary": "<e.g. L1:HS L2:MS>",
  "rightSummary": "<e.g. R1:MS R2:SS>",
  "comment": "<20-30 words>"
}`;

const SAT_STYLE: Record<string, string> = {
  "Highly Satisfying": "bg-green-100 text-green-700 border-green-300",
  "Moderately Satisfying": "bg-blue-100 text-blue-700 border-blue-300",
  "Slightly Satisfying": "bg-amber-100 text-amber-700 border-amber-300",
  "Not Satisfying": "bg-red-100 text-red-700 border-red-300",
};

const PREF_BG: Record<string, string> = {
  "Much Better Left": "bg-green-600", "Better Left": "bg-green-500", "Slightly Better Left": "bg-green-400",
  "About the Same": "bg-gray-500",
  "Slightly Better Right": "bg-blue-400", "Better Right": "bg-blue-500", "Much Better Right": "bg-blue-600",
};

interface ImgEntry { file: File | null; preview: string; hostUrl: string; }

function ImageUploadSlot({ label, entry, onChange, onRemove }: {
  label: string; entry: ImgEntry;
  onChange: (f: File, preview: string) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {entry.preview ? (
        <div className="relative">
          <img src={entry.preview} alt={label} className="w-full h-36 object-cover bg-gray-100" />
          <button onClick={onRemove} className="absolute top-2 right-2 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 px-2 py-1">
            <p className="text-white text-xs font-medium truncate">{entry.file?.name}</p>
          </div>
        </div>
      ) : (
        <button onClick={() => inputRef.current?.click()}
          className="w-full h-36 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-primary hover:bg-primary/5 transition-all">
          <Upload className="h-5 w-5" />
          <span className="text-xs font-medium">Upload {label}</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]; if (!f) return;
          const url = URL.createObjectURL(f);
          onChange(f, url);
        }} />
    </div>
  );
}

export default function ImageSBSPage() {
  const [query, setQuery] = useState("");
  const [leftImgs, setLeftImgs] = useState<ImgEntry[]>([
    { file: null, preview: "", hostUrl: "" },
    { file: null, preview: "", hostUrl: "" },
  ]);
  const [rightImgs, setRightImgs] = useState<ImgEntry[]>([
    { file: null, preview: "", hostUrl: "" },
    { file: null, preview: "", hostUrl: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const addSlot = (side: "left"|"right") => {
    const blank: ImgEntry = { file: null, preview: "", hostUrl: "" };
    side === "left" ? setLeftImgs(p => [...p, blank]) : setRightImgs(p => [...p, blank]);
  };
  const removeSlot = (side: "left"|"right", i: number) => {
    if (side === "left") { URL.revokeObjectURL(leftImgs[i].preview); setLeftImgs(p => p.filter((_,idx)=>idx!==i)); }
    else { URL.revokeObjectURL(rightImgs[i].preview); setRightImgs(p => p.filter((_,idx)=>idx!==i)); }
  };
  const updateImg = (side: "left"|"right", i: number, f: File, preview: string) => {
    if (side === "left") setLeftImgs(p => p.map((e,idx)=>idx===i?{...e,file:f,preview}:e));
    else setRightImgs(p => p.map((e,idx)=>idx===i?{...e,file:f,preview}:e));
  };
  const updateHost = (side: "left"|"right", i: number, url: string) => {
    if (side === "left") setLeftImgs(p => p.map((e,idx)=>idx===i?{...e,hostUrl:url}:e));
    else setRightImgs(p => p.map((e,idx)=>idx===i?{...e,hostUrl:url}:e));
  };

  async function handleRate() {
    setLoading(true); setError(""); setResult(null);
    try {
      const hasImages = [...leftImgs, ...rightImgs].some(e => e.file);
      if (hasImages) {
        // Use multipart endpoint for actual images
        const form = new FormData();
        form.append("query", query);
        form.append("system_prompt", SYSTEM_PROMPT);
        leftImgs.forEach((e, i) => { if (e.file) form.append("leftImages", e.file, `L${i+1}.${e.file.name.split(".").pop()}`); });
        rightImgs.forEach((e, i) => { if (e.file) form.append("rightImages", e.file, `R${i+1}.${e.file.name.split(".").pop()}`); });
        const res = await fetch(`${API}/tools/analyze-image`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token()}` },
          body: form,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setResult(JSON.parse(data.text || "{}"));
      } else {
        // Fallback: text-only description
        const leftDesc = leftImgs.map((e,i) => `L${i+1}: ${e.hostUrl || "no host URL"}`).join("\n");
        const rightDesc = rightImgs.map((e,i) => `R${i+1}: ${e.hostUrl || "no host URL"}`).join("\n");
        const res = await fetch(`${API}/tools/annotate`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
          body: JSON.stringify({
            system_prompt: SYSTEM_PROMPT,
            user_message: `QUERY: ${query}\n\nLEFT SIDE:\n${leftDesc}\n\nRIGHT SIDE:\n${rightDesc}\n\nRate each result, check near duplicates, evaluate host pages, determine OPR preference.`,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setResult(JSON.parse(data.text || "{}"));
      }
    } catch(e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  function ResultCard({ results, side }: { results: any[]; side: "Left"|"Right" }) {
    if (!results?.length) return null;
    const prefix = side[0];
    return (
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
          <span className="text-xs font-semibold text-gray-600">{side} Side — {side === "Left" ? result.leftSummary : result.rightSummary}</span>
        </div>
        <div className="divide-y divide-gray-50">
          {results.map((r: any) => (
            <div key={r.position} className="p-4 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono text-gray-400 font-bold">{prefix}{r.position}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${SAT_STYLE[r.imageSatisfaction] || "bg-gray-100 text-gray-600 border-gray-200"}`}>{r.imageSatisfaction || "—"}</span>
                {r.nearDuplicate?.isNearDuplicate && <span className="text-xs bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">Near Dup of {r.nearDuplicate.duplicateOf}</span>}
                {r.imageFlag?.unsafe && <span className="text-xs bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full">⚠ {r.imageFlag.unsafe}</span>}
                {r.imageFlag?.didNotLoad && <span className="text-xs bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full">Did Not Load</span>}
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">{r.imageReason}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Host:</span>
                <span className={`text-xs px-1.5 py-0.5 rounded border ${SAT_STYLE[r.hostSatisfaction] || "bg-gray-50 text-gray-500 border-gray-200"}`}>{r.hostSatisfaction || "—"}</span>
                <span className={`text-xs ${r.hostCredible ? "text-green-600" : "text-red-500"}`}>{r.hostCredible ? "✓ credible" : "✗ not credible"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Image SBS Rater</h1>
        <p className="text-sm text-gray-500 mt-0.5">Upload images for each side · near-duplicate detection · host page evaluation · OPR preference</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <span className="text-sm font-semibold text-gray-700">Task Setup</span>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">SEARCH QUERY</label>
            <input type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="e.g. beyonce lemonade album cover"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Left side */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-green-100 text-green-700 rounded font-bold text-xs flex items-center justify-center">L</span>
                <span className="text-xs font-semibold text-gray-600">Left Side Images</span>
              </div>
              {leftImgs.map((e, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-mono font-bold">L{i+1}</span>
                    {leftImgs.length > 1 && (
                      <button onClick={() => removeSlot("left", i)} className="text-gray-300 hover:text-red-400 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                    )}
                  </div>
                  <ImageUploadSlot label={`L${i+1}`} entry={e}
                    onChange={(f,p) => updateImg("left",i,f,p)}
                                        onRemove={() => { URL.revokeObjectURL(e.preview); setLeftImgs(p => p.map((en,idx) => idx===i ? {...en, file:null, preview:""} : en)); }} />
                  <input type="url" value={e.hostUrl} onChange={ev => updateHost("left",i,ev.target.value)}
                    placeholder="Host page URL (optional)"
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary text-gray-600" />
                </div>
              ))}
              <button onClick={() => addSlot("left")} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary transition-colors">
                <Plus className="h-3.5 w-3.5" /> Add image
              </button>
            </div>

            {/* Right side */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded font-bold text-xs flex items-center justify-center">R</span>
                <span className="text-xs font-semibold text-gray-600">Right Side Images</span>
              </div>
              {rightImgs.map((e, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-mono font-bold">R{i+1}</span>
                    {rightImgs.length > 1 && (
                      <button onClick={() => removeSlot("right", i)} className="text-gray-300 hover:text-red-400 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                    )}
                  </div>
                  <ImageUploadSlot label={`R${i+1}`} entry={e}
                    onChange={(f,p) => updateImg("right",i,f,p)}
                                        onRemove={() => { URL.revokeObjectURL(e.preview); setRightImgs(p => p.map((en,idx) => idx===i ? {...en, file:null, preview:""} : en)); }} />
                  <input type="url" value={e.hostUrl} onChange={ev => updateHost("right",i,ev.target.value)}
                    placeholder="Host page URL (optional)"
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary text-gray-600" />
                </div>
              ))}
              <button onClick={() => addSlot("right")} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary transition-colors">
                <Plus className="h-3.5 w-3.5" /> Add image
              </button>
            </div>
          </div>

          <button onClick={handleRate} disabled={!query.trim() || loading} className="btn btn-primary flex items-center gap-2">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Rating images…</> : "🖼 Rate Image SBS"}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {result.queryIntent && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-blue-600">Query intent</p>
              <p className="text-sm text-blue-800 mt-0.5">{result.queryIntent}</p>
            </div>
          )}

          <div className={`${PREF_BG[result.oprPreference] || "bg-gray-500"} text-white rounded-xl p-5 text-center`}>
            <p className="text-sm opacity-80 mb-1">OPR Preference</p>
            <p className="text-2xl font-bold">{result.oprPreference}</p>
            {result.decisiveFactor && <p className="text-sm opacity-75 mt-1">Decisive: {result.decisiveFactor}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ResultCard results={result.leftResults} side="Left" />
            <ResultCard results={result.rightResults} side="Right" />
          </div>

          {result.comment && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <p className="text-xs font-semibold text-primary/70 mb-1">📝 Comment for submission (20–30 words)</p>
              <p className="text-sm text-gray-800 font-medium leading-relaxed">{result.comment}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}