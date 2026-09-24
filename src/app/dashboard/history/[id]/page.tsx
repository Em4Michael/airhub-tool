"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ratingsApi } from "@/lib/api";
import { formatDate, RATING_COLORS, TASK_TYPE_LABELS } from "@/lib/utils";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function RatingDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [rating, setRating] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ratingsApi.getRatingById(id as string).then((res) => {
      setRating(res.data.data);
    }).catch(() => router.push("/dashboard/history"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="animate-pulse space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
    </div>;
  }

  if (!rating) return null;

  const ev = rating.evaluation;
  const raw = ev?.rawResponse ? JSON.parse(ev.rawResponse) : null;

  const STEP_LABELS: Record<string, string> = {
    step1_scamDetector: "Step 1: Scam Detector Score",
    step2_wikipedia: "Step 2: Wikipedia Check",
    step3_pagePurpose: "Step 3: Page Purpose & Achievement",
    step4_ads: "Step 4: Distracting Ads",
    step5_ymyl: "Step 5: YMYL Assessment",
    step6_harmScam: "Step 6: Harmful or Scam Reports",
    step7_uniqueAuthority: "Step 7: Unique Authority",
  };

  const QUESTION_LABELS: Record<string, string> = {
    q1: "Page Purpose", q2: "Wikipedia Finding", q3: "Site Age",
    q4: "Purpose Achieved?", q5: "Scam Reports", q6: "Unique Authority",
    q7: "Harmful/Deceptive/Spammy?", q8: "Money Without Value?", q9: "YMYL?",
    q10: "MC Quality Rank", q11: "Title vs MC Match", q12: "Rich Media MC?",
    q13: "Domain URL", q14: "Government Site?", q15: "Final Comment",
  };

  return (
    <div className="max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-medium">
              {TASK_TYPE_LABELS[rating.taskType]}
            </span>
            {ev?.finalRating && (
              <span className={`px-3 py-0.5 rounded-full text-sm font-bold border ${RATING_COLORS[ev.finalRating]}`}>
                {ev.finalRating}
              </span>
            )}
            {ev?.needsMetRating && (
              <span className="bg-blue-100 text-blue-800 border border-blue-200 px-3 py-0.5 rounded-full text-sm font-bold">
                {ev.needsMetRating}
              </span>
            )}
            {ev?.imageSatisfaction && (
              <span className="bg-pink-100 text-pink-800 border border-pink-200 px-3 py-0.5 rounded-full text-sm font-bold">
                {ev.imageSatisfaction}
              </span>
            )}
            {ev?.sxsPreference && (
              <span className="bg-amber-100 text-amber-800 border border-amber-200 px-3 py-0.5 rounded-full text-sm font-bold">
                {ev.sxsPreference}
              </span>
            )}
            <span className="text-xs text-gray-400 ml-auto">{formatDate(rating.createdAt)} · {rating.timeTaken}s</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <a
              href={rating.inputUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline text-sm flex items-center gap-1 truncate max-w-lg"
            >
              {rating.inputUrl} <ExternalLink size={12} />
            </a>
          </div>
          {rating.query && (
            <p className="text-xs text-gray-400 mt-0.5">Query: "{rating.query}"</p>
          )}
        </div>
      </div>

      {/* Page Quality — 7 Steps */}
      {rating.taskType === "page_quality" && ev && (
        <>
          <div className="grid grid-cols-1 gap-4">
            {Object.entries(STEP_LABELS).map(([key, label]) => {
              const data = ev[key];
              if (!data) return null;
              const ratingVal = data.updatedRating || data.finalRating || data.startingRating;
              return (
                <div key={key} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 text-sm">{label}</h3>
                    {ratingVal && (
                      <span className={`px-2 py-0.5 rounded text-xs font-bold border ${RATING_COLORS[ratingVal] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
                        {ratingVal}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5 text-sm text-gray-600">
                    {Object.entries(data).map(([k, v]) => {
                      if (k === "updatedRating" || k === "finalRating" || k === "startingRating") return null;
                      return (
                        <div key={k} className="flex gap-2">
                          <span className="font-medium text-gray-500 min-w-[100px] text-xs capitalize">
                            {k.replace(/_/g, " ")}:
                          </span>
                          <span className="text-gray-700 text-xs">
                            {typeof v === "boolean" ? (v ? "Yes" : "No") : String(v)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 15 Questions */}
          {ev.questions && Object.keys(ev.questions).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">15 Required Questions</h3>
              <div className="space-y-3">
                {Object.entries(ev.questions).map(([key, value]) => (
                  <div key={key} className="border-b border-gray-50 pb-3 last:border-0">
                    <p className="text-xs font-semibold text-gray-500 mb-0.5">
                      {QUESTION_LABELS[key] || key}
                    </p>
                    <p className="text-sm text-gray-700">{String(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Other task types — show raw parsed JSON nicely */}
      {rating.taskType !== "page_quality" && raw && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Full AI Analysis</h3>
          <div className="space-y-3">
            {Object.entries(raw).map(([key, value]) => (
              <div key={key} className="border-b border-gray-50 pb-3 last:border-0">
                <p className="text-xs font-semibold text-gray-500 mb-0.5 capitalize">
                  {key.replace(/([A-Z])/g, " $1").replace(/_/g, " ")}
                </p>
                <p className="text-sm text-gray-700">
                  {typeof value === "object" ? (
                    <pre className="text-xs bg-gray-50 rounded p-2 overflow-x-auto">
                      {JSON.stringify(value, null, 2)}
                    </pre>
                  ) : (
                    String(value)
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Final Comment */}
      {ev?.finalComment && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-2">Final Comment</h3>
          <p className="text-gray-700 text-sm leading-relaxed">{ev.finalComment}</p>
        </div>
      )}
    </div>
  );
}
