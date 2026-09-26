"use client";
import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://airhub-tool-server.onrender.com/api";
const token = () => localStorage.getItem("airhub_token") || "";

const SYSTEM_PROMPT = `You are an expert Search Quality Analyst trained on verified real-world rating cases. Apply every step in full. Never skip. Never guess. Triple-check every answer.

RESULT TYPES AND CLICK RULES:
Website/Suggested Website → click and rate landing page only. Card preview is irrelevant.
Maps → NEVER click. Rate title + address + distance only.
Knowledge/Info/Answer Card → NEVER click. Rate visible card content only. Verify facts via Google/Bing research.
Wikipedia card → NEVER click. Authoritative — can reach HS for correct dominant entity.
Movies/TV/Books/Music card → NEVER click. Max rating = S, NEVER HS.
App Store → click and rate.
News → click and check article date vs query date.

SATISFACTION SCALE:
HS (Highly Satisfying): Directly and completely satisfies dominant intent. Most direct destination. Accurate. Authoritative.
S (Satisfying): Addresses dominant intent but one step removed. Functional and relevant but not the ideal destination.
SS (Slightly Satisfying): Partially relevant. Real but uncommon interpretation. Too specific or too general. Older version when newer exists. Non-dominant same-name person for person queries (all 3 SS criteria must pass).
NS (Not Satisfying): Fails the user. Flagged. Inaccurate. Outdated. Wrong location. Coincidental match.

FLAGS (any flag = automatic NS):
Wrong Language: landing page not in English and not in user's locale language. Always click — never judge from URL or card title.
Inappropriate: piracy/illegal streaming/pornography/adult ads/malware/spam/phishing/gore.
Content Unavailable: 404 error/page fails to load/times out/login required.

KEY RULES:
- Movies/TV/Books/Music card = S maximum, NEVER HS
- Knowledge/Wikipedia for correct dominant entity = HS eligible
- Blog or secondary page instead of homepage = S not HS
- Non-dominant same-name person for celebrity query = SS
- Non-dominant same-name entity for local business query = NS (not SS)
- Factually inaccurate = NS regardless of source authority
- Significantly outdated for time-sensitive query = NS
- Local query (no location named) → result must be near user
- Location named in query → distance from user is irrelevant
- Movies/TV card showing older installment when newer version exists = SS
- Never penalize for typos in the query — interpret intended spelling

SS requires ALL 3 criteria:
1. Real, known entity that genuinely shares the query term
2. A real minority of users could plausibly want this interpretation
3. Connection is genuine and non-coincidental
If any fails → NS not SS.

OPR RULES — apply in strict priority order:
1. Satisfaction quality — higher grades win
2. Ranking — best result at position 1 wins (position 1 carries most weight)
3. Diversity — more varied result types wins
4. Quantity — NOT a factor
5. True tie → About the Same
6. One side empty → NEVER About the Same. Empty side winning = Slightly Better ONLY, never Better or Much Better.

OPR SCALE: Much Better / Better / Slightly Better / About the Same

OPR COMMENT: exactly 20–30 words. Formula: "[Side] is better. [Side] has [result type + quality]. [Other side] has [result type or no results]. [One reason]."

Return ONLY valid JSON:
{
  "dominantIntent": "<what most users searching this query want>",
  "queryType": "<local|navigational|informational|time-sensitive|website-search>",
  "leftRatings": [
    {"position": 1, "url": "", "type": "<result type>", "flag": null, "rating": "<HS|S|SS|NS>", "reason": "<specific reason citing rule or trap>"}
  ],
  "rightRatings": [
    {"position": 1, "url": "", "type": "<result type>", "flag": null, "rating": "<HS|S|SS|NS>", "reason": "<specific reason citing rule or trap>"}
  ],
  "oprPreference": "<Much Better Left|Better Left|Slightly Better Left|About the Same|Slightly Better Right|Better Right|Much Better Right>",
  "decisiveFactor": "<quality|ranking|diversity|empty-side rule>",
  "stepUsed": "<step1_quality|step2_ranking|step3_diversity|empty_side>",
  "comment": "<exactly 20-30 words>",
  "leftSummary": "<e.g. L1:HS L2:S>",
  "rightSummary": "<e.g. R1:SS R2:NS or No results>"
}`;

const PREF_BG: Record<string, string> = {
  "Much Better Left": "bg-green-600",
  "Better Left": "bg-green-500",
  "Slightly Better Left": "bg-green-400",
  "About the Same": "bg-gray-500",
  "Slightly Better Right": "bg-blue-400",
  "Better Right": "bg-blue-500",
  "Much Better Right": "bg-blue-600",
};
const RAT_STYLE: Record<string, string> = {
  HS: "bg-green-100 text-green-700 border-green-300",
  S: "bg-blue-100 text-blue-700 border-blue-300",
  SS: "bg-amber-100 text-amber-700 border-amber-300",
  NS: "bg-red-100 text-red-700 border-red-300",
};

export default function SBSRaterPage() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [leftUrls, setLeftUrls] = useState([{ url: "" }, { url: "" }]);
  const [rightUrls, setRightUrls] = useState([{ url: "" }, { url: "" }]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const addUrl = (s: "left" | "right") =>
    s === "left"
      ? setLeftUrls((p) => [...p, { url: "" }])
      : setRightUrls((p) => [...p, { url: "" }]);
  const removeUrl = (s: "left" | "right", i: number) =>
    s === "left"
      ? setLeftUrls((p) => p.filter((_, idx) => idx !== i))
      : setRightUrls((p) => p.filter((_, idx) => idx !== i));
  const updateUrl = (s: "left" | "right", i: number, v: string) => {
    if (s === "left")
      setLeftUrls((p) => p.map((u, idx) => (idx === i ? { url: v } : u)));
    else setRightUrls((p) => p.map((u, idx) => (idx === i ? { url: v } : u)));
  };

  async function handleRate() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const lList =
        leftUrls
          .filter((u) => u.url.trim())
          .map((u, i) => `L${i + 1}: ${u.url}`)
          .join("\n") || "No results";
      const rList =
        rightUrls
          .filter((u) => u.url.trim())
          .map((u, i) => `R${i + 1}: ${u.url}`)
          .join("\n") || "No results";
      const res = await fetch(`${API}/tools/annotate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({
          system_prompt: SYSTEM_PROMPT,
          user_message: `QUERY: ${query}\nUSER LOCATION: ${location || "Not specified"}\nQUERY DATE: ${date || "Not specified"}\n\nLEFT SIDE:\n${lList}\n\nRIGHT SIDE:\n${rList}\n\nResearch the query intent, check each result URL for content/language/flags, rate each result applying all rules, then determine OPR preference.`,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResult(JSON.parse(data.text || "{}"));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">SBS Rater</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Rate web search side-by-side results · HS / S / SS / NS · OPR
          preference
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <span className="text-sm font-semibold text-gray-700">
            Task Details
          </span>
        </div>
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                SEARCH QUERY
              </label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. best pizza near me"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                USER LOCATION
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. New York, USA"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                QUERY DATE
              </label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="e.g. 2026-09-22"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Left */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 bg-green-100 text-green-700 rounded font-bold text-xs flex items-center justify-center">
                  L
                </span>
                <span className="text-xs font-semibold text-gray-600">
                  Left Side Results
                </span>
              </div>
              {leftUrls.map((u, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-xs text-gray-400 font-mono font-bold w-5">
                    L{i + 1}
                  </span>
                  <input
                    type="url"
                    value={u.url}
                    onChange={(e) => updateUrl("left", i, e.target.value)}
                    placeholder="https://..."
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                  {leftUrls.length > 1 && (
                    <button
                      onClick={() => removeUrl("left", i)}
                      className="text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => addUrl("left")}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary transition-colors mt-1"
              >
                <Plus className="h-3.5 w-3.5" /> Add result
              </button>
            </div>

            {/* Right */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded font-bold text-xs flex items-center justify-center">
                  R
                </span>
                <span className="text-xs font-semibold text-gray-600">
                  Right Side Results
                </span>
              </div>
              {rightUrls.map((u, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-xs text-gray-400 font-mono font-bold w-5">
                    R{i + 1}
                  </span>
                  <input
                    type="url"
                    value={u.url}
                    onChange={(e) => updateUrl("right", i, e.target.value)}
                    placeholder="https://..."
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                  {rightUrls.length > 1 && (
                    <button
                      onClick={() => removeUrl("right", i)}
                      className="text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => addUrl("right")}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary transition-colors mt-1"
              >
                <Plus className="h-3.5 w-3.5" /> Add result
              </button>
            </div>
          </div>

          <button
            onClick={handleRate}
            disabled={!query.trim() || loading}
            className="btn btn-primary flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Researching & rating…
              </>
            ) : (
              "⚖ Rate SBS"
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {result.dominantIntent && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
              <span className="text-xs font-semibold text-gray-500">
                Dominant intent:{" "}
              </span>
              <span className="text-sm text-gray-800">
                {result.dominantIntent}
              </span>
              {result.queryType && (
                <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                  {result.queryType}
                </span>
              )}
            </div>
          )}

          <div
            className={`${PREF_BG[result.oprPreference] || "bg-gray-500"} text-white rounded-xl p-5 text-center`}
          >
            <p className="text-sm opacity-80 mb-1">OPR Preference</p>
            <p className="text-2xl font-bold">{result.oprPreference}</p>
            <p className="text-sm opacity-75 mt-1">
              {result.decisiveFactor} · {result.stepUsed}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Left ratings */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                <span className="text-xs font-semibold text-gray-600">
                  Left Side — {result.leftSummary}
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {result.leftRatings?.map((r: any) => (
                  <div key={r.position} className="p-3 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-400 font-mono font-bold">
                        L{r.position}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border font-bold ${RAT_STYLE[r.rating] || ""}`}
                      >
                        {r.rating}
                      </span>
                      {r.flag && (
                        <span className="text-xs bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full">
                          {r.flag}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">{r.type}</span>
                    </div>
                    {r.url && (
                      <p className="text-xs text-gray-400 font-mono truncate">
                        {r.url}
                      </p>
                    )}
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {r.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right ratings */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                <span className="text-xs font-semibold text-gray-600">
                  Right Side — {result.rightSummary}
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {result.rightRatings?.map((r: any) => (
                  <div key={r.position} className="p-3 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-400 font-mono font-bold">
                        R{r.position}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border font-bold ${RAT_STYLE[r.rating] || ""}`}
                      >
                        {r.rating}
                      </span>
                      {r.flag && (
                        <span className="text-xs bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full">
                          {r.flag}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">{r.type}</span>
                    </div>
                    {r.url && (
                      <p className="text-xs text-gray-400 font-mono truncate">
                        {r.url}
                      </p>
                    )}
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {r.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {result.comment && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <p className="text-xs font-semibold text-primary/70 mb-1">
                📝 Comment for submission (20–30 words)
              </p>
              <p className="text-sm text-gray-800 font-medium leading-relaxed">
                {result.comment}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
