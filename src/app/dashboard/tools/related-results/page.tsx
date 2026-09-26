"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://airhub-tool-server.onrender.com/api";
const token = () => localStorage.getItem("airhub_token") || "";

const SYSTEM_PROMPT = `You are a Related Results Evaluator for a maps search application. Research both the query and the result thoroughly before rating.

KEY ASSUMPTIONS:
- Geographic relevance: if location mentioned in query, assume query and result are geographically relevant. Do NOT penalize for distance.
- "open now" + result is closed = Bad.
- Vague/ambiguous query (e.g. "bears", "holiday", "willow") + result contains the exact query word = Excellent even if multiple meanings exist.
- Always research what the result's PRIMARY offerings are — not just the name.
- Foreign language: understand the meaning then apply normal rules.
- Apply common sense. No rule covers every edge case.

RATING SCALE — choose ONE:

Excellent:
- Exact match: same brand, same category, same type of service as queried
- Specialized department/service of the same brand inside the same business (e.g. query: Walmart → result: Walmart Vision Center = Excellent)
- Query is a food/service/business category and result is a perfect fit for that category
- Vague/ambiguous query where result has strong lexical match to the query word

Good:
- Competitor or close alternative offering same or very similar goods/services/atmosphere
- Ancillary/secondary offering: not the result's main focus but the queried item is available there
- NOTE: highest rating a competitor can receive = Good

Acceptable:
- Slight relation but users would not be very likely to be interested
- Close high-level category but poor relevance match
- Mall ↔ store inside it (either direction = Acceptable)
- "Used with" function that is obvious and commonly known (e.g. airport → hotel)
- Specific item/cuisine slightly different within a close category (e.g. sushi → ramen — both Japanese but different)

Bad:
- No meaningful connection. User would be surprised or frustrated.
- Research shows requested product/service is NOT available at this result
- Totally different food category (e.g. sushi → hotpot, hamburger → pizza)
- Words match but completely unrelated intent (e.g. "dog park" → "Lazy Dog Restaurant")
- Non-vegan result for a vegan restaurant query
- Fine dining steakhouse for a fast food query
- Coffee shop for a dinner query
- Query for specific brand → result is a different unrelated business

EXAMPLES:
starbucks chicago → Starbucks = Excellent (exact brand, assume geographic relevance)
food → Taco Bell = Excellent (any food result qualifies for broad category)
ev station → EVgo Charging Station = Excellent (perfect category match)
the UPS store → FedEx = Good (direct competitor, same services)
mcdonalds → Burger King = Good (same food type and atmosphere)
matcha → Boba Guys = Good (serves matcha, main business is boba)
motor oil → Target = Acceptable (sells some motor oil but not known for it)
golf store → Dick's Sporting Goods = Acceptable (sells golf equipment among many sports)
ontario mills → UNIQLO Ontario Mills = Acceptable (mall → store inside it)
sushi → Ramen Nagi = Acceptable (both Japanese, different cuisine)
chase bank → AutoZone = Bad (bank vs auto parts — no connection)
vegan restaurant → McDonald's = Bad (clear non-vegan)
fast food → Alexander's Steakhouse = Bad (fine dining ≠ fast food)
sushi → Haidilao Hotpot = Bad (completely different cuisine)
dog park → Lazy Dog Restaurant = Bad (word match, unrelated intent)

Return ONLY valid JSON:
{
  "query_research": "<what this query intent is, what users are looking for, what category>",
  "result_research": "<what this result primarily offers, main business category, key products/services>",
  "primary_connection": "<how query and result are connected or why they are not — be specific>",
  "rating": "<Excellent|Good|Acceptable|Bad>",
  "rating_reason": "<specific rule or example from guidelines that determines this rating>",
  "comment": "<exactly 20-30 words — state relationship type and key deciding factor>"
}`;

const RAT: Record<
  string,
  { bg: string; border: string; text: string; dot: string }
> = {
  Excellent: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-700",
    dot: "bg-green-500",
  },
  Good: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    dot: "bg-blue-500",
  },
  Acceptable: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    dot: "bg-amber-500",
  },
  Bad: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    dot: "bg-red-500",
  },
};

const EXAMPLES = [
  { q: "starbucks", r: "Peet's Coffee — Coffee Shop", rating: "Good" },
  { q: "ev station", r: "EVgo Charging Station", rating: "Excellent" },
  { q: "fast food", r: "Alexander's Steakhouse", rating: "Bad" },
  { q: "sushi", r: "Ramen Nagi — Ramen Restaurant", rating: "Acceptable" },
];

export default function RelatedResultsPage() {
  const [query, setQuery] = useState("");
  const [resultName, setResultName] = useState("");
  const [mapsLink, setMapsLink] = useState("");
  const [websiteLink, setWebsiteLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState<any>(null);
  const [error, setError] = useState("");

  async function handleRate() {
    if (!query.trim() || !resultName.trim()) return;
    setLoading(true);
    setError("");
    setRating(null);
    try {
      const userMessage = `QUERY: ${query}
RESULT: ${resultName}
${mapsLink ? `Maps Result Link: ${mapsLink}` : ""}
${websiteLink ? `Website Link: ${websiteLink}` : ""}

Research both the query intent and the result's primary offerings thoroughly, then rate the relationship.`;

      const res = await fetch(`${API}/tools/annotate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({
          system_prompt: SYSTEM_PROMPT,
          user_message: userMessage,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRating(JSON.parse(data.text || "{}"));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const style = rating ? RAT[rating.rating] : null;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Related Results Evaluator
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Rate map search query-result relevance · Excellent / Good / Acceptable
          / Bad
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
            Query &amp; Result
          </span>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                QUERY
              </label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. starbucks"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                RESULT NAME &amp; CATEGORY
              </label>
              <input
                type="text"
                value={resultName}
                onChange={(e) => setResultName(e.target.value)}
                placeholder="e.g. Peet's Coffee — Coffee Shop"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Maps Link{" "}
                <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                type="url"
                value={mapsLink}
                onChange={(e) => setMapsLink(e.target.value)}
                placeholder="https://maps.google.com/…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Website Link{" "}
                <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                type="url"
                value={websiteLink}
                onChange={(e) => setWebsiteLink(e.target.value)}
                placeholder="https://…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>

          {/* Quick examples */}
          <div className="grid grid-cols-2 gap-2">
            {EXAMPLES.map((ex, i) => (
              <button
                key={i}
                onClick={() => {
                  setQuery(ex.q);
                  setResultName(ex.r);
                  setRating(null);
                }}
                className="flex items-center justify-between text-left border border-gray-100 rounded-lg px-3 py-2 hover:border-gray-300 hover:bg-gray-50 transition-all group"
              >
                <div className="min-w-0">
                  <p className="text-xs text-gray-600 font-mono truncate">
                    {ex.q} → {ex.r}
                  </p>
                </div>
                <span
                  className={`text-xs font-bold ml-2 flex-shrink-0 ${ex.rating === "Excellent" ? "text-green-600" : ex.rating === "Good" ? "text-blue-600" : ex.rating === "Acceptable" ? "text-amber-600" : "text-red-600"}`}
                >
                  {ex.rating}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={handleRate}
            disabled={!query.trim() || !resultName.trim() || loading}
            className="btn btn-primary flex items-center gap-2 w-full justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Researching & rating…
              </>
            ) : (
              "🗺 Rate Result"
            )}
          </button>
        </div>
      </div>

      {/* Result */}
      {rating && style && (
        <div className={`border ${style.border} rounded-xl overflow-hidden`}>
          <div
            className={`${style.bg} px-5 py-4 flex items-center justify-between`}
          >
            <div className="min-w-0 mr-4">
              <p className="text-xs text-gray-500 font-mono">
                [{query}] → {resultName}
              </p>
              {rating.primary_connection && (
                <p className="text-sm text-gray-700 mt-1 leading-snug">
                  {rating.primary_connection}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className={`w-3 h-3 rounded-full ${style.dot}`} />
              <span className={`text-xl font-black ${style.text}`}>
                {rating.rating}
              </span>
            </div>
          </div>
          <div className="bg-white p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {rating.query_research && (
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-500 mb-1">
                    Query intent
                  </p>
                  <p className="text-xs text-gray-700 leading-relaxed">
                    {rating.query_research}
                  </p>
                </div>
              )}
              {rating.result_research && (
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-500 mb-1">
                    Result offerings
                  </p>
                  <p className="text-xs text-gray-700 leading-relaxed">
                    {rating.result_research}
                  </p>
                </div>
              )}
            </div>
            {rating.rating_reason && (
              <div className={`border-l-4 ${style.border} pl-3`}>
                <p className="text-xs text-gray-500">Why {rating.rating}</p>
                <p className="text-sm text-gray-800 mt-0.5 leading-relaxed">
                  {rating.rating_reason}
                </p>
              </div>
            )}
            {rating.comment && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <p className="text-xs font-semibold text-primary/70 mb-1">
                  📝 Comment for submission (20–30 words)
                </p>
                <p className="text-sm text-gray-800 font-medium leading-relaxed">
                  {rating.comment}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
