"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://airhub-tool-server.onrender.com/api";
const token = () => localStorage.getItem("airhub_token") || "";

const SYSTEM_PROMPT = `You are a Phrase Match Keyword Evaluator with deep expertise in search advertising. Research both terms thoroughly using web search before rating.

PRIMARY QUESTION: Does this user query clearly and completely contain the intent that the advertiser expressed in the phrase-match keyword?

STEP 1 — RESEARCH: Search for both the KEYWORD and the QUERY to understand:
- What the keyword means, what businesses or products it refers to, primary intent
- What the query means, what the user is likely looking for, primary intent
- Any important differences in intent between the two

STEP 2 — RATE using these rules:

Good — query clearly and completely includes the phrase intent:
- Keyword appears as exact substring inside the query (AUTOMATIC Good — no further analysis needed)
- Semantic equivalent with minimal ambiguity (e.g. "auto repair" → "car repair")
- Query enhances keyword with added specificity (e.g. "restaurant" → "sushi restaurant in Chicago")
- Token reordering with same meaning (e.g. "auto repair" → "repair auto")

Acceptable — query potentially contains the full intent but variations create uncertainty:
- Query likely preserves intent but advertiser might be surprised by the match
- Close variants or typos with same probable intent
- Semantically related but minor interpretive differences
- Keyword contained in query but context creates ambiguity (e.g. "apple" → "apple bee's restaurant")

Bad — query does not contain the phrase intent clearly or completely:
- Query loses essential specificity from keyword (e.g. "sushi restaurant" → "restaurant") — broader query always = Bad
- Fundamentally different intent (e.g. "pizza delivery" → "pizza recipes")
- Competing brands (e.g. "McDonald's" → "Burger King")
- No clear semantic relationship
- Transliterations into another language or script
- Different specific items within the same category (e.g. "chicken fingers" → "chicken salad")

KEY RULES:
- Direction matters: keyword intent must be INSIDE the query's intent, never the reverse. A broader query loses specificity → Bad.
- Substring rule: if the exact keyword text appears literally inside the query → automatically Good.
- Asymmetric brand: full brand keyword can match abbreviation query (Good), but abbreviated keyword should NOT match full brand name query (Bad).
- Geographic or attribute enhancement: adding location or attributes = Good. Removing specificity = Bad.
- When in doubt: lean Good only when containment is clear; Acceptable when uncertain; default Bad otherwise.

EXAMPLES:
coffee shop → coffee house = Good (synonym, same intent)
pizza delivery → pizza delivery near me = Good (enhancement with location)
24-hour pharmacy → pharmacy = Bad (loses essential specificity)
sushi restaurant → japanese restaurant = Bad (different cuisine type — sushi is more specific)
starbucks → starbux = Good (typo, same intent)
church → churchs chicken = Acceptable (word contained but different entity — ambiguous)
luxury hotel → 5 star hotel = Acceptable (semantic variant, could match)
pizza delivery → pizza recipes = Bad (completely different intent)
dentist → dental school = Bad (different entity type)
McDonald's → Burger King = Bad (competing brand)

Return ONLY valid JSON:
{
  "keyword_research": "<1-2 sentences: what searches reveal about keyword intent, what businesses/products it refers to>",
  "query_research": "<1-2 sentences: what searches reveal about query intent, what users are looking for>",
  "rating": "<Good|Acceptable|Bad>",
  "relationship_type": "<exact substring|synonym|enhancement|token reorder|close variant|intent loss|intent change|brand conflict|semantic mismatch|ambiguous context>",
  "key_deciding_factor": "<the single most important reason for this specific rating>",
  "comment": "<exactly 20-30 words — state relationship type, key deciding factor, specific not generic>"
}`;

const RAT_STYLE: Record<
  string,
  { bg: string; text: string; border: string; label: string }
> = {
  Good: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
    label: "✓ Good",
  },
  Acceptable: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    label: "~ Acceptable",
  },
  Bad: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    label: "✗ Bad",
  },
};

const EXAMPLES = [
  {
    kw: "coffee shop",
    q: "best coffee shop open now",
    rating: "Good",
    note: "enhancement",
  },
  {
    kw: "luxury hotel",
    q: "5 star hotel",
    rating: "Acceptable",
    note: "semantic variant",
  },
  {
    kw: "sushi restaurant",
    q: "restaurant",
    rating: "Bad",
    note: "loses specificity",
  },
  {
    kw: "pizza delivery",
    q: "pizza recipes",
    rating: "Bad",
    note: "different intent",
  },
];

export default function PhraseMatchPage() {
  const [keyword, setKeyword] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  async function handleRate() {
    if (!keyword.trim() || !query.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`${API}/tools/annotate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({
          system_prompt: SYSTEM_PROMPT,
          user_message: `KEYWORD: ${keyword}\nQUERY: ${query}\n\nResearch both terms thoroughly, then rate the phrase match relationship.`,
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

  const style = result ? RAT_STYLE[result.rating] : null;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Phrase Match Evaluator
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Research keyword and query intent · rate Good / Acceptable / Bad
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
            Enter Keyword &amp; Query
          </span>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                KEYWORD
              </label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. coffee shop"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                QUERY
              </label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. best coffee shop near me"
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
                  setKeyword(ex.kw);
                  setQuery(ex.q);
                  setResult(null);
                }}
                className="flex items-center justify-between text-left border border-gray-100 rounded-lg px-3 py-2 hover:border-gray-300 hover:bg-gray-50 transition-all group"
              >
                <span className="text-xs text-gray-600 group-hover:text-gray-800 font-mono">
                  {ex.kw} → {ex.q}
                </span>
                <span
                  className={`text-xs font-bold ml-2 flex-shrink-0 ${ex.rating === "Good" ? "text-green-600" : ex.rating === "Acceptable" ? "text-amber-600" : "text-red-600"}`}
                >
                  {ex.rating}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={handleRate}
            disabled={!keyword.trim() || !query.trim() || loading}
            className="btn btn-primary flex items-center gap-2 w-full justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Researching & rating…
              </>
            ) : (
              "🔍 Rate Phrase Match"
            )}
          </button>
        </div>
      </div>

      {/* Result */}
      {result && style && (
        <div className={`border ${style.border} rounded-xl overflow-hidden`}>
          <div
            className={`${style.bg} px-5 py-4 flex items-center justify-between`}
          >
            <div>
              <p className="text-xs text-gray-500 font-mono">
                {keyword} → {query}
              </p>
              {result.relationship_type && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Type: <strong>{result.relationship_type}</strong>
                </p>
              )}
            </div>
            <span className={`text-2xl font-black ${style.text}`}>
              {style.label}
            </span>
          </div>
          <div className="bg-white p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {result.keyword_research && (
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-500 mb-1">
                    Keyword research
                  </p>
                  <p className="text-xs text-gray-700 leading-relaxed">
                    {result.keyword_research}
                  </p>
                </div>
              )}
              {result.query_research && (
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-500 mb-1">
                    Query research
                  </p>
                  <p className="text-xs text-gray-700 leading-relaxed">
                    {result.query_research}
                  </p>
                </div>
              )}
            </div>
            {result.key_deciding_factor && (
              <div className={`border-l-4 ${style.border} pl-3`}>
                <p className="text-xs text-gray-500">Key deciding factor</p>
                <p className="text-sm text-gray-800 mt-0.5 leading-relaxed">
                  {result.key_deciding_factor}
                </p>
              </div>
            )}
            {result.comment && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <p className="text-xs font-semibold text-primary/70 mb-1">
                  📝 Comment for submission (20–30 words)
                </p>
                <p className="text-sm text-gray-800 font-medium leading-relaxed">
                  {result.comment}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
