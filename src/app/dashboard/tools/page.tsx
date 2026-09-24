"use client";
import Link from "next/link";
import { Mic, MessageSquare, Images, GitCompare, Tag, MapPin } from "lucide-react";

const tools = [
  {
    href: "/dashboard/tools/text-annotator",
    icon: MessageSquare,
    label: "Text Annotator",
    desc: "Evaluate text message conversation transcripts — emoji, name, rhyme, spelling, coherence checks with response selection.",
    color: "text-violet-500",
    bg: "bg-violet-50 border-violet-200",
  },
  {
    href: "/dashboard/tools/audio-recorder",
    icon: Mic,
    label: "Audio Recorder",
    desc: "Record tab/desktop audio, transcribe with Whisper, refine with AI, and get unbiased confidence scores.",
    color: "text-emerald-500",
    bg: "bg-emerald-50 border-emerald-200",
  },
  {
    href: "/dashboard/tools/sbs-rater",
    icon: GitCompare,
    label: "SBS Rater",
    desc: "Rate web and image side-by-side search results using the full SBS framework with OPR preference.",
    color: "text-blue-500",
    bg: "bg-blue-50 border-blue-200",
  },
  {
    href: "/dashboard/tools/phrase-match",
    icon: Tag,
    label: "Phrase Match",
    desc: "Evaluate keyword vs query phrase-match relationships: Good, Acceptable, or Bad with web research.",
    color: "text-amber-500",
    bg: "bg-amber-50 border-amber-200",
  },
  {
    href: "/dashboard/tools/related-results",
    icon: MapPin,
    label: "Related Results",
    desc: "Rate map search query-result relevance: Excellent, Good, Acceptable, or Bad for local businesses.",
    color: "text-rose-500",
    bg: "bg-rose-50 border-rose-200",
  },
  {
    href: "/dashboard/tools/image-sbs",
    icon: Images,
    label: "Image SBS",
    desc: "Rate image search side-by-side with satisfaction, near-duplicate detection, host page, and OPR.",
    color: "text-cyan-500",
    bg: "bg-cyan-50 border-cyan-200",
  },
];

export default function ToolsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Assist Tools</h1>
        <p className="text-gray-500 mt-1">
          Specialist rating and annotation tools powered by Grok AI.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`border rounded-xl p-5 flex flex-col gap-3 hover:shadow-md transition-shadow ${t.bg}`}
          >
            <t.icon className={`h-6 w-6 ${t.color}`} />
            <div>
              <p className="font-semibold text-gray-900">{t.label}</p>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                {t.desc}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}