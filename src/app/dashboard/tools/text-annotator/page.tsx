"use client";
import { useState } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://airhub-tool-server.onrender.com/api";
const token = () => localStorage.getItem("airhub_token") || "";

const SYSTEM_PROMPT = `You are a senior conversation transcript annotator with over 30 years of professional linguistic evaluation experience. You have been trained on the evaluation manual and have personally graded 40 real transcript questions with verified answers. Evaluate with absolute precision and zero errors. Triple-check every decision. Never guess. Never skip a step.

Execute ALL 8 steps in strict order on EVERY transcript. Even after finding one rejection reason, CONTINUE all remaining steps — all applicable reasons must be selected.

STEP 1 — EMOJI SCAN: Go through EVERY message ONE BY ONE. Write "M1 — checked — [emoji found / no emoji]" for each. Any emoji anywhere = REJECT. Mark: Contains Emojis.

STEP 2 — PARTICIPANT NAME CHECK: Identify both participants first. Then check EVERY message word by word. Any personal name, relationship term, or term of endearment used to address the other participant inside the message body = REJECT. Pronouns are never violations. Speaker labels (e.g. "Mom:") are not violations. Mark: Includes Name of Participant.

STEP 3 — RHYME CHECK: Number every message M1, M2, M3... A period never ends a message — only a new speaker label does. Write the FULL text of every message, then extract the very last word of each. Check each consecutive pair (M1→M2, M2→M3 etc.) by saying both words aloud. Same ending sound = REJECT. Mark: Conversation Rhymes.
Platform-verified rhymes: crack/back=REJECT, ahead/instead=REJECT, today/away=REJECT.
Platform-verified non-rhymes: scoff/cough=PASS.

STEP 4 — SPELLING CHECK: Read each word in complete isolation. American English only. A correctly spelled word is never a spelling error even if grammatically wrong (homophones like your/you're, their/there = NOT spelling errors). Only reject when the word as written does not exist in American English. Mark: Spelling Mistake.

STEP 5 — UNNECESSARY REPETITION: Look for accidentally duplicated words within a message where repetition serves no grammatical purpose. "in in", "the the", "how how" = REJECT. "that that", "had had" (grammatically valid) = PASS. KEY TEST: remove one copy — if sentence still makes sense, it is a typo. Mark: Unnecessary Repetition.

STEP 6 — TEXT PLAUSIBILITY: Scan for: (1) brackets/asterisks with actions or stage directions, (2) time narration markers between messages, (3) proof both people are physically together RIGHT NOW as the message is sent, (4) narration/script-style writing. Future plans ("come over later", "I'll be there") = NOT co-presence. Mark: Conversation Could Not Happen by Text.

STEP 7 — COHERENCE CHECK: Does this sound like two real humans texting? Same phrase repeated multiple times regardless of replies, robotic/fantasy language, completely unrelated simultaneous topics = REJECT. Mark: Incoherent/Not Human. NOTE: physical impossibility = Step 6 reason. Robotic/repetitive = Step 7 reason. Never swap them.

STEP 8 — OFFENSIVE LANGUAGE: Any swearing or offensive slang in American English = REJECT. Mark: Offensive Language.

MANDATORY PRE-VERDICT AUDIT: Before writing verdict, list all 8 steps with Found/Not Found. VERDICT is REJECT if ANY shows Found. List EVERY Found item as a reason.

IF PASS — STEP 9 RESPONSE SELECTION: Apply 8 filters in strict order to all options:
A: Any emoji → ELIMINATE
B: Any misspelling in American English → ELIMINATE  
C: Any unnecessary word repetition → ELIMINATE
D: Verbatim repetition of anything already said in conversation → ELIMINATE
E: Wrong speaker perspective → ELIMINATE
F: Does not reply to the LAST message specifically → ELIMINATE
G: Contradicts tone, facts, or direction of conversation → ELIMINATE
H: Last word rhymes with last word of final transcript message → ELIMINATE
Remaining option = correct answer.

SUMMARY: Fewer than 30 words (max 29). Natural prose. Capture ALL topics. Both participants. No opinions.

Return ONLY valid JSON:
{
  "summary": "<max 29 words>",
  "verdict": "<PASS|REJECT>",
  "reasons": ["<ALL triggered reasons>"],
  "bestResponse": "<Option 1|Option 2|Option 3|Option 4 or null>",
  "evidence": {
    "step1_emoji": "<M1 checked — result, M2 checked — result... full scan>",
    "step2_name": "<participants identified + full message-by-message check>",
    "step3_rhyme": "<numbered messages + last words extracted + pairs checked aloud>",
    "step4_spelling": "<word-by-word check result>",
    "step5_repetition": "<found/not found + detail>",
    "step6_plausibility": "<4 scans result>",
    "step7_coherence": "<found/not found + detail>",
    "step8_offensive": "<found/not found + detail>"
  },
  "audit": "<Step 1: [Found/Not Found] | Step 2: [Found/Not Found] | ... all 8>"
}`;

const RESPONSE_PROMPT = `Apply ALL 8 filters in strict order to every response option. Eliminate any option that fails any filter. Show your work for each filter on each option.

FILTER A: Any emoji → ELIMINATE
FILTER B: Any misspelling in American English (parc, beleive, favourite, wiht) → ELIMINATE
FILTER C: Any accidentally duplicated word (in in, the the, how how) → ELIMINATE
FILTER D: Verbatim repetition of anything already said by either participant → ELIMINATE
FILTER E: Wrong speaker perspective (third person when first person needed) → ELIMINATE
FILTER F: Does not reply to the LAST message of the transcript specifically → ELIMINATE
FILTER G: Contradicts tone, facts, or direction established in conversation → ELIMINATE
FILTER H: Last word of option rhymes with last word of final transcript message → ELIMINATE

Return ONLY valid JSON:
{
  "bestOption": "<Option 1|Option 2|Option 3|Option 4>",
  "optionNumber": <1|2|3|4>,
  "eliminated": [{"option": "Option X", "filter": "Filter X", "reason": "<specific reason>"}],
  "survivor": "<why this option passed all 8 filters>",
  "lastWordCheck": "<last word of transcript vs last word of each option>"
}`;

const FAM_PROMPT = `Answer the familiarity question based ONLY on the conversation. Number every message M1, M2, M3... then check EVERY message explicitly before answering. Only select an answer provable with a specific message number and exact words. For questions about who asked questions: check every message for "?" and tally per participant.

Return ONLY valid JSON:
{
  "answer": "<selected option text>",
  "evidence": "<M[N]: exact words that prove this>",
  "eliminated": ["<why each other option was rejected with message reference>"]
}`;

async function callAI(system: string, user: string) {
  const res = await fetch(`${API}/tools/annotate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token()}`,
    },
    body: JSON.stringify({ system_prompt: system, user_message: user }),
  });
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  const data = await res.json();
  return JSON.parse(data.text || "{}");
}

export default function TextAnnotatorPage() {
  const [conv, setConv] = useState("");
  const [opts, setOpts] = useState("");
  const [fam, setFam] = useState("");
  const [loading, setLoading] = useState<"eval" | "best" | "fam" | null>(null);
  const [evalResult, setEvalResult] = useState<any>(null);
  const [bestResult, setBestResult] = useState<any>(null);
  const [famResult, setFamResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [showEvidence, setShowEvidence] = useState(false);

  const verdict = evalResult?.verdict as "PASS" | "REJECT" | null;

  async function doEval() {
    if (!conv.trim()) return;
    setLoading("eval");
    setError("");
    setEvalResult(null);
    setBestResult(null);
    setFamResult(null);
    try {
      setEvalResult(
        await callAI(
          SYSTEM_PROMPT,
          `Evaluate this text message conversation:\n\n${conv}`,
        ),
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  }

  async function doBest() {
    if (!opts.trim()) return;
    setLoading("best");
    setError("");
    try {
      setBestResult(
        await callAI(
          RESPONSE_PROMPT,
          `CONVERSATION:\n${conv}\n\nRESPONSE OPTIONS:\n${opts}`,
        ),
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  }

  async function doFam() {
    if (!fam.trim()) return;
    setLoading("fam");
    setError("");
    try {
      setFamResult(
        await callAI(
          FAM_PROMPT,
          `CONVERSATION:\n${conv}\n\nFAMILIARITY QUESTION:\n${fam}`,
        ),
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  }

  function reset() {
    setConv("");
    setOpts("");
    setFam("");
    setEvalResult(null);
    setBestResult(null);
    setFamResult(null);
    setError("");
    setShowEvidence(false);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Text Annotator</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            8-step transcript evaluation · response selection · familiarity
            questions
          </p>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 border border-gray-200 hover:border-gray-300 rounded-lg px-3 py-1.5 transition-all"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </button>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-0">
        {["Evaluate", "Best Response", "Familiarity"].map((label, i) => {
          const done =
            (i === 0 && !!evalResult) ||
            (i === 1 && !!bestResult) ||
            (i === 2 && !!famResult);
          const active =
            (i === 0 && !evalResult) ||
            (i === 1 && evalResult && !bestResult) ||
            (i === 2 && (bestResult || verdict === "REJECT") && !famResult);
          return (
            <div key={i} className="flex items-center">
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${done ? "bg-green-100 text-green-700" : active ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-400"}`}
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold ${done ? "bg-green-500 text-white" : active ? "bg-primary text-white" : "bg-gray-300 text-white"}`}
                >
                  {done ? "✓" : i + 1}
                </span>
                {label}
              </div>
              {i < 2 && <div className="w-6 h-px bg-gray-200 mx-1" />}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm flex items-center gap-2">
          <XCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Step 1 */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
            1
          </span>
          <span className="text-sm font-semibold text-gray-700">
            Paste Conversation Transcript
          </span>
        </div>
        <div className="p-5 space-y-4">
          <textarea
            value={conv}
            onChange={(e) => setConv(e.target.value)}
            rows={9}
            placeholder={
              "Casey: Hey, have you heard?\nRiley: Heard what?\nCasey: Kim and her boyfriend broke up.\nRiley: No way! Why did they split?\nCasey: He said she spent too much time on social media."
            }
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-y bg-gray-50 placeholder:text-gray-400"
          />
          <button
            onClick={doEval}
            disabled={!conv.trim() || !!loading}
            className="btn btn-primary flex items-center gap-2 px-5"
          >
            {loading === "eval" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Evaluating all 8 steps…
              </>
            ) : (
              "⚖ Evaluate Conversation"
            )}
          </button>
        </div>
      </div>

      {/* Step 1 Result */}
      {evalResult && (
        <div
          className={`rounded-xl border overflow-hidden ${verdict === "PASS" ? "border-green-200" : "border-red-200"}`}
        >
          <div
            className={`px-5 py-3 flex items-center gap-3 ${verdict === "PASS" ? "bg-green-50" : "bg-red-50"}`}
          >
            {verdict === "PASS" ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <span
              className={`font-bold text-lg ${verdict === "PASS" ? "text-green-700" : "text-red-700"}`}
            >
              VERDICT: {verdict}
            </span>
          </div>
          <div className="p-5 space-y-4 bg-white">
            {evalResult.summary && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  📋 Summary
                </p>
                <p className="text-sm text-gray-800 leading-relaxed">
                  {evalResult.summary}
                </p>
              </div>
            )}
            {evalResult.reasons?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">
                  🔍 Rejection Reasons
                </p>
                <div className="flex flex-wrap gap-2">
                  {evalResult.reasons.map((r: string, i: number) => (
                    <span
                      key={i}
                      className="text-xs bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full font-medium"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <button
              onClick={() => setShowEvidence(!showEvidence)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showEvidence ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              {showEvidence ? "Hide" : "Show"} step-by-step evidence
            </button>
            {showEvidence && evalResult.evidence && (
              <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 space-y-2.5">
                {Object.entries(evalResult.evidence).map(
                  ([k, v]: [string, any]) => (
                    <div
                      key={k}
                      className="grid grid-cols-[140px,1fr] gap-2 text-xs"
                    >
                      <span className="font-mono text-gray-500 font-medium">
                        {k.replace(/_/g, " ").toUpperCase()}
                      </span>
                      <span className="text-gray-700">{v}</span>
                    </div>
                  ),
                )}
                {evalResult.audit && (
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-600 mb-1">
                      Pre-verdict audit
                    </p>
                    <p className="text-xs text-gray-600 font-mono whitespace-pre-wrap">
                      {evalResult.audit}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2 — Best Response */}
      {evalResult && verdict === "PASS" && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">
              2
            </span>
            <span className="text-sm font-semibold text-gray-700">
              Paste Response Options
            </span>
          </div>
          <div className="p-5 space-y-4">
            <textarea
              value={opts}
              onChange={(e) => setOpts(e.target.value)}
              rows={5}
              placeholder={
                "Option 1: Sounds like things were getting complicated.\nOption 2: That's surprising! Did she say anything to you?\nOption 3: I can't beleive it!\nOption 4: Well, social media can be a lot to handle."
              }
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-y bg-gray-50 placeholder:text-gray-400"
            />
            <button
              onClick={doBest}
              disabled={!opts.trim() || !!loading}
              className="btn btn-primary flex items-center gap-2"
            >
              {loading === "best" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Finding best response…
                </>
              ) : (
                "✅ Find Best Response"
              )}
            </button>
            {bestResult && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                <p className="font-bold text-amber-800 text-base">
                  ✅ Best Response: {bestResult.bestOption}
                </p>
                <p className="text-sm text-amber-700 leading-relaxed">
                  {bestResult.survivor}
                </p>
                {bestResult.lastWordCheck && (
                  <p className="text-xs text-amber-600 font-mono">
                    {bestResult.lastWordCheck}
                  </p>
                )}
                {bestResult.eliminated?.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-amber-200">
                    <p className="text-xs font-semibold text-amber-700">
                      Eliminated:
                    </p>
                    {bestResult.eliminated.map((e: any, i: number) => (
                      <p key={i} className="text-xs text-amber-600">
                        • {e.option} — {e.filter}: {e.reason}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3 — Familiarity */}
      {evalResult && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
              3
            </span>
            <span className="text-sm font-semibold text-gray-700">
              Familiarity Question{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </span>
          </div>
          <div className="p-5 space-y-4">
            <textarea
              value={fam}
              onChange={(e) => setFam(e.target.value)}
              rows={4}
              placeholder={
                "Who brought up the topic of the breakup?\nA) Casey\nB) Riley\nC) Both\nD) Neither"
              }
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-y bg-gray-50 placeholder:text-gray-400"
            />
            <button
              onClick={doFam}
              disabled={!fam.trim() || !!loading}
              className="btn btn-primary flex items-center gap-2"
            >
              {loading === "fam" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Answering…
                </>
              ) : (
                "🧠 Answer Question"
              )}
            </button>
            {famResult && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <p className="font-bold text-blue-800">
                  🧠 Answer: {famResult.answer}
                </p>
                <p className="text-sm text-blue-700 leading-relaxed">
                  {famResult.evidence}
                </p>
                {famResult.eliminated?.length > 0 && (
                  <div className="pt-2 border-t border-blue-100 space-y-1">
                    {famResult.eliminated.map((e: string, i: number) => (
                      <p key={i} className="text-xs text-blue-500">
                        • {e}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
