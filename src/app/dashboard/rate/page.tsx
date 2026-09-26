"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ratingsApi } from "@/lib/api";
import { getErrorMessage, RATING_COLORS, TASK_TYPE_LABELS } from "@/lib/utils";
import { Loader2, ExternalLink, CheckCircle2, Clock } from "lucide-react";

const TASK_TYPES = [
  {
    value: "page_quality",
    label: "Page Quality",
    description: "7-step page evaluation",
  },
  {
    value: "needs_met",
    label: "Needs Met",
    description: "Search result relevance",
  },
  { value: "youtube", label: "YouTube", description: "Video quality rating" },
  { value: "image", label: "Image", description: "Image satisfaction" },
];

function RateTasksInner() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") || "page_quality";

  const [taskType, setTaskType] = useState(initialType);
  const [url, setUrl] = useState("");
  const [urlB, setUrlB] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
    const [timeSpentMinutes, setTimeSpentMinutes] = useState<string>("");

  // Needs Met multi-URL state
  const [nmUrls, setNmUrls] = useState([
    {
      id: 1,
      url: "",
      side: "left",
      type: "url",
      imageFile: null as File | null,
      imagePreview: "",
      resultImageFile: null as File | null,
      resultImagePreview: "",
    },
  ]);
  const nmUrlCounter = useRef(2);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const resultImageRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // Query image state (for image task)
  const [queryImageFile, setQueryImageFile] = useState<File | null>(null);
  const [queryImagePreview, setQueryImagePreview] = useState<string>("");
  const queryImageRef = useRef<HTMLInputElement | null>(null);

  const handleQueryImageFile = (file: File | null) => {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setQueryImageFile(file);
    setQueryImagePreview(preview);
  };

  const handleResultImageFile = (id: number, file: File | null) => {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setNmUrls((prev) =>
      prev.map((u) =>
        u.id === id
          ? { ...u, resultImageFile: file, resultImagePreview: preview }
          : u,
      ),
    );
  };

  const addNmUrl = (side: "left" | "right") => {
    setNmUrls((prev) => [
      ...prev,
      {
        id: nmUrlCounter.current++,
        url: "",
        side,
        type: "url",
        imageFile: null,
        imagePreview: "",
        resultImageFile: null,
        resultImagePreview: "",
      },
    ]);
  };
  const removeNmUrl = (id: number) => {
    setNmUrls((prev) => prev.filter((u) => u.id !== id));
  };
  const updateNmUrl = (id: number, field: string, value: string) => {
    setNmUrls((prev) =>
      prev.map((u) => (u.id === id ? { ...u, [field]: value } : u)),
    );
  };

  const handleImageFile = (id: number, file: File | null) => {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setNmUrls((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, imageFile: file, imagePreview: preview } : u,
      ),
    );
  };

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const needsQuery = ["needs_met", "youtube", "image"].includes(taskType);
  const needsUrlB = taskType === "side_by_side";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResults([]);
    setLoading(true);
    try {
      if (taskType === "needs_met") {
        // First analyse the query once independently before evaluating any result
        const allResults = await Promise.all(
          nmUrls
            .filter((u) => u.url.trim() || u.imageFile)
            .map(async (u) => {
              if (u.type === "image" && u.imageFile) {
                const base64 = await toBase64(u.imageFile);
                const res = await ratingsApi.evaluateNeedsMetImage(
                  query,
                  u.url,
                  base64,
                  u.imageFile.type,
                );
                return {
                  ...res.data.data,
                  _side: u.side,
                  _type: u.type,
                  _url: u.url,
                  _imagePreview: u.imagePreview,
                };
              }
              const res = await ratingsApi.evaluateNeedsMet(query, u.url);
              return {
                ...res.data.data,
                _side: u.side,
                _type: u.type,
                _url: u.url,
              };
            }),
        );
        setResults(allResults);
      } else {
        let res;
        switch (taskType) {
          case "page_quality":
            res = await ratingsApi.evaluatePageQuality(url);
            break;
          case "youtube": {
            const ytResults = await Promise.all(
              nmUrls
                .filter((u) => u.url.trim() || u.imageFile)
                .map(async (u) => {
                  if (u.type === "image" && u.imageFile) {
                    const base64 = await toBase64(u.imageFile);
                    const ytRes = await ratingsApi.evaluateYoutubeImage(
                      query,
                      u.url,
                      base64,
                      u.imageFile.type,
                    );
                    return {
                      ...ytRes.data.data,
                      _side: u.side,
                      _type: u.type,
                      _url: u.url,
                      _imagePreview: u.imagePreview,
                    };
                  }
                  // ALL YouTube URLs — both left and right — go through evaluateYoutube
                  const ytRes = await ratingsApi.evaluateYoutube(query, u.url);
                  return {
                    ...ytRes.data.data,
                    _side: u.side,
                    _type: u.type,
                    _url: u.url,
                  };
                }),
            );
            setResults(ytResults);
            setLoading(false);
            return;
          }
          case "image": {
            // Convert query image to base64 if present
            let queryImageBase64 = "";
            let queryImageMimeType = "";
            if (queryImageFile) {
              queryImageBase64 = await toBase64(queryImageFile);
              queryImageMimeType = queryImageFile.type;
            }

            const imgResults = await Promise.all(
              nmUrls
                .filter((u) => u.url.trim() || u.resultImageFile)
                .map(async (u) => {
                  let resultImageBase64 = "";
                  let resultImageMimeType = "";
                  if (u.resultImageFile) {
                    resultImageBase64 = await toBase64(u.resultImageFile);
                    resultImageMimeType = u.resultImageFile.type;
                  }
                  const res = await ratingsApi.evaluateImageFull(
                    query,
                    u.url,
                    queryImageBase64,
                    queryImageMimeType,
                    resultImageBase64,
                    resultImageMimeType,
                  );
                  return {
                    ...res.data.data,
                    _side: u.side,
                    _type: u.type,
                    _url: u.url,
                    _resultImagePreview: u.resultImagePreview,
                    _queryImagePreview: queryImagePreview,
                  };
                }),
            );
            setResults(imgResults);
            setLoading(false);
            return;
          }
          default:
            throw new Error("Unknown task type");
        }
        setResults([res.data.data]);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rate a Task</h1>
        <p className="text-gray-500 mt-1">
          Submit a URL for AI-powered quality evaluation
        </p>
      </div>

      {/* Task type selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {TASK_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => {
              setTaskType(t.value);
              setResults([]);
              setError("");
            }}
            className={`p-3 rounded-xl border-2 text-left transition-all ${
              taskType === t.value
                ? "border-primary bg-green-50 text-primary"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
            }`}
          >
            <p className="font-semibold text-sm">{t.label}</p>
            <p className="text-xs opacity-70 mt-0.5">{t.description}</p>
          </button>
        ))}
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
      >
        {needsQuery && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Search Query{" "}
              {taskType === "image" && (
                <span className="text-gray-400 font-normal">
                  (optional for image task)
                </span>
              )}
            </label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                taskType === "image"
                  ? "Optional text query (e.g. red velvet cake recipe)"
                  : "e.g. best coffee makers 2024"
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
            {taskType === "image" && (
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600">
                  Query Image{" "}
                  <span className="text-gray-400">
                    (optional — upload the image the user searched with)
                  </span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  ref={(el) => {
                    queryImageRef.current = el;
                  }}
                  onChange={(e) =>
                    handleQueryImageFile(e.target.files?.[0] || null)
                  }
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => queryImageRef.current?.click()}
                  className="w-full border-2 border-dashed border-indigo-300 hover:border-indigo-400 text-indigo-600 text-xs py-2 rounded-lg transition-colors"
                >
                  {queryImageFile
                    ? `✓ Query image: ${queryImageFile.name}`
                    : "Upload Query Image (optional)"}
                </button>
                {queryImagePreview && (
                  <div className="relative">
                    <img
                      src={queryImagePreview}
                      alt="query"
                      className="w-full h-28 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setQueryImageFile(null);
                        setQueryImagePreview("");
                      }}
                      className="absolute top-1 right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {taskType === "needs_met" ||
        taskType === "youtube" ||
        taskType === "image" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Left Side */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-blue-700">
                    Left Side Results
                  </label>
                  <button
                    type="button"
                    onClick={() => addNmUrl("left")}
                    className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded-lg"
                  >
                    + Add URL
                  </button>
                </div>
                {nmUrls
                  .filter((u) => u.side === "left")
                  .map((u) => (
                    <div
                      key={u.id}
                      className="space-y-1 border border-gray-100 rounded-lg p-2"
                    >
                      <div className="flex gap-2 items-center">
                        <select
                          value={u.type}
                          onChange={(e) =>
                            updateNmUrl(u.id, "type", e.target.value)
                          }
                          className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="url">Web Result</option>
                          <option value="image">Image SCRB</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeNmUrl(u.id)}
                          className="text-red-400 hover:text-red-600 text-xs px-1 ml-auto"
                        >
                          ✕
                        </button>
                      </div>
                      <input
                        type="url"
                        value={u.url}
                        onChange={(e) =>
                          updateNmUrl(u.id, "url", e.target.value)
                        }
                        placeholder={
                          u.type === "image"
                            ? "Landing page URL (optional)"
                            : "https://example.com/result"
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      {u.type === "image" && (
                        <div className="space-y-1">
                          <input
                            type="file"
                            accept="image/*"
                            ref={(el) => {
                              fileInputRefs.current[u.id] = el;
                            }}
                            onChange={(e) =>
                              handleImageFile(u.id, e.target.files?.[0] || null)
                            }
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRefs.current[u.id]?.click()}
                            className="w-full border-2 border-dashed border-purple-300 hover:border-purple-400 text-purple-600 text-xs py-2 rounded-lg transition-colors"
                          >
                            {u.imageFile
                              ? `✓ ${u.imageFile.name}`
                              : "Upload Image SCRB"}
                          </button>
                          {u.imagePreview && (
                            <img
                              src={u.imagePreview}
                              alt="preview"
                              className="w-full h-20 object-cover rounded-lg"
                            />
                          )}
                        </div>
                      )}
                      {taskType === "image" && (
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500">
                            Result Image{" "}
                            <span className="text-gray-400">(optional)</span>
                          </p>
                          <input
                            type="file"
                            accept="image/*"
                            ref={(el) => {
                              resultImageRefs.current[u.id] = el;
                            }}
                            onChange={(e) =>
                              handleResultImageFile(
                                u.id,
                                e.target.files?.[0] || null,
                              )
                            }
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              resultImageRefs.current[u.id]?.click()
                            }
                            className="w-full border-2 border-dashed border-teal-300 hover:border-teal-400 text-teal-600 text-xs py-2 rounded-lg transition-colors"
                          >
                            {u.resultImageFile
                              ? `✓ ${u.resultImageFile.name}`
                              : "Upload Result Image"}
                          </button>
                          {u.resultImagePreview && (
                            <img
                              src={u.resultImagePreview}
                              alt="result"
                              className="w-full h-20 object-cover rounded-lg"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
              </div>

              {/* Right Side */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-green-700">
                    Right Side Results
                  </label>
                  <button
                    type="button"
                    onClick={() => addNmUrl("right")}
                    className="text-xs bg-green-50 hover:bg-green-100 text-green-700 px-2 py-1 rounded-lg"
                  >
                    + Add URL
                  </button>
                </div>
                {nmUrls
                  .filter((u) => u.side === "right")
                  .map((u) => (
                    <div
                      key={u.id}
                      className="space-y-1 border border-gray-100 rounded-lg p-2"
                    >
                      <div className="flex gap-2 items-center">
                        <select
                          value={u.type}
                          onChange={(e) =>
                            updateNmUrl(u.id, "type", e.target.value)
                          }
                          className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="url">Web Result</option>
                          <option value="image">Image SCRB</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeNmUrl(u.id)}
                          className="text-red-400 hover:text-red-600 text-xs px-1 ml-auto"
                        >
                          ✕
                        </button>
                      </div>
                      <input
                        type="url"
                        value={u.url}
                        onChange={(e) =>
                          updateNmUrl(u.id, "url", e.target.value)
                        }
                        placeholder={
                          u.type === "image"
                            ? "Landing page URL (optional)"
                            : "https://example.com/result"
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      {u.type === "image" && (
                        <div className="space-y-1">
                          <input
                            type="file"
                            accept="image/*"
                            ref={(el) => {
                              fileInputRefs.current[u.id] = el;
                            }}
                            onChange={(e) =>
                              handleImageFile(u.id, e.target.files?.[0] || null)
                            }
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRefs.current[u.id]?.click()}
                            className="w-full border-2 border-dashed border-purple-300 hover:border-purple-400 text-purple-600 text-xs py-2 rounded-lg transition-colors"
                          >
                            {u.imageFile
                              ? `✓ ${u.imageFile.name}`
                              : "Upload Image SCRB"}
                          </button>
                          {u.imagePreview && (
                            <img
                              src={u.imagePreview}
                              alt="preview"
                              className="w-full h-20 object-cover rounded-lg"
                            />
                          )}
                        </div>
                      )}
                      {taskType === "image" && (
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500">
                            Result Image{" "}
                            <span className="text-gray-400">(optional)</span>
                          </p>
                          <input
                            type="file"
                            accept="image/*"
                            ref={(el) => {
                              resultImageRefs.current[u.id] = el;
                            }}
                            onChange={(e) =>
                              handleResultImageFile(
                                u.id,
                                e.target.files?.[0] || null,
                              )
                            }
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              resultImageRefs.current[u.id]?.click()
                            }
                            className="w-full border-2 border-dashed border-teal-300 hover:border-teal-400 text-teal-600 text-xs py-2 rounded-lg transition-colors"
                          >
                            {u.resultImageFile
                              ? `✓ ${u.resultImageFile.name}`
                              : "Upload Result Image"}
                          </button>
                          {u.resultImagePreview && (
                            <img
                              src={u.resultImagePreview}
                              alt="result"
                              className="w-full h-20 object-cover rounded-lg"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                {nmUrls.filter((u) => u.side === "right").length === 0 && (
                  <p className="text-xs text-gray-400 mt-2">
                    No right side URLs added yet
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {needsUrlB ? "Left Result URL (A)" : "Page URL"}
              </label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/page"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>

            {needsUrlB && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Right Result URL (B)
                </label>
                <input
                  type="url"
                  required
                  value={urlB}
                  onChange={(e) => setUrlB(e.target.value)}
                  placeholder="https://example.com/other-page"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
              </div>
            )}
          </>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        {/* Time spent — user inputs this manually */}
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
          <Clock size={15} className="text-gray-400 flex-shrink-0" />
          <label className="text-sm text-gray-600 flex-shrink-0">Time spent on this task:</label>
          <input
            type="number"
            min="1"
            max="999"
            value={timeSpentMinutes}
            onChange={e => setTimeSpentMinutes(e.target.value)}
            placeholder="—"
            className="w-16 border border-gray-200 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <span className="text-sm text-gray-400">minutes</span>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              AI is evaluating... (this may take 30-60 seconds)
            </>
          ) : (
            "Evaluate Now"
          )}
        </button>

        {(taskType === "needs_met" ||
          taskType === "youtube" ||
          taskType === "image") &&
          nmUrls.some((u) => u.side === "left") &&
          nmUrls.some((u) => u.side === "right") && (
            <p className="text-xs text-gray-400 text-center">
              Side-by-Side comparison will be generated automatically when both
              sides have results
            </p>
          )}
      </form>

      {/* Result */}
      {results.length > 0 &&
        (taskType === "needs_met" ||
          taskType === "youtube" ||
          taskType === "image") && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="text-green-500" size={22} />
              <h2 className="font-semibold text-gray-900">
                Needs Met Results ({results.length} URLs evaluated)
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Left Side */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-blue-700 border-b border-blue-100 pb-2">
                  Left Side —{" "}
                  {results
                    .filter((r) => r._side === "left")
                    .reduce((sum, r) => {
                      const raw = r.evaluation?.rawResponse
                        ? JSON.parse(r.evaluation.rawResponse)
                        : null;
                      return sum + (raw?.points || 0);
                    }, 0)}{" "}
                  pts
                </h3>
                {results
                  .filter((r) => r._side === "left")
                  .map((r, i) => (
                    <NeedsMetCard key={i} result={r} index={i} />
                  ))}
                {results.filter((r) => r._side === "left").length === 0 && (
                  <p className="text-xs text-gray-400">No left side results</p>
                )}
              </div>
              {/* Right Side */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-green-700 border-b border-green-100 pb-2">
                  Right Side —{" "}
                  {results
                    .filter((r) => r._side === "right")
                    .reduce((sum, r) => {
                      const raw = r.evaluation?.rawResponse
                        ? JSON.parse(r.evaluation.rawResponse)
                        : null;
                      return sum + (raw?.points || 0);
                    }, 0)}{" "}
                  pts
                </h3>
                {results
                  .filter((r) => r._side === "right")
                  .map((r, i) => (
                    <NeedsMetCard key={i} result={r} index={i} />
                  ))}
                {results.filter((r) => r._side === "right").length === 0 && (
                  <p className="text-xs text-gray-400">No right side results</p>
                )}
              </div>
            </div>

            {/* SxS Summary */}
            {results.some((r) => r._side === "left") &&
              results.some((r) => r._side === "right") && (
                <SxSSummary
                  results={results}
                  query={query}
                  taskType={taskType}
                />
              )}
          </div>
        )}

      {results.length > 0 && taskType !== "needs_met" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center gap-3">
            <CheckCircle2 className="text-green-500" size={22} />
            <h2 className="font-semibold text-gray-900">Evaluation Complete</h2>
            {results[0].evaluation?.finalRating && (
              <span
                className={`ml-auto px-3 py-1 rounded-full text-sm font-bold border ${RATING_COLORS[results[0].evaluation.finalRating]}`}
              >
                {results[0].evaluation.finalRating}
              </span>
            )}
          </div>
          <div className="p-5 space-y-5">
            {taskType === "page_quality" &&
              results[0].evaluation?.step1_scamDetector && (
                <PageQualityResult evaluation={results[0].evaluation} />
              )}
            {taskType !== "page_quality" && results[0].evaluation && (
              <GenericResult
                evaluation={results[0].evaluation}
                taskType={taskType}
              />
            )}
            {results[0].evaluation?.finalComment && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Final Comment
                </p>
                <p className="text-sm text-gray-600">
                  {results[0].evaluation.finalComment}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PageQualityResult({ evaluation }: { evaluation: any }) {
  const steps = [
    {
      key: "step1_scamDetector",
      label: "Step 1: Scam Detector",
      data: evaluation.step1_scamDetector,
    },
    {
      key: "step2_wikipedia",
      label: "Step 2: Wikipedia Check",
      data: evaluation.step2_wikipedia,
    },
    {
      key: "step3_pagePurpose",
      label: "Step 3: Page Purpose",
      data: evaluation.step3_pagePurpose,
    },
    {
      key: "step4_ads",
      label: "Step 4: Distracting Ads",
      data: evaluation.step4_ads,
    },
    {
      key: "step5_ymyl",
      label: "Step 5: YMYL Assessment",
      data: evaluation.step5_ymyl,
    },
    {
      key: "step6_harmScam",
      label: "Step 6: Harm/Scam Check",
      data: evaluation.step6_harmScam,
    },
    {
      key: "step7_uniqueAuthority",
      label: "Step 7: Unique Authority",
      data: evaluation.step7_uniqueAuthority,
    },
  ];

  const QUESTION_LABELS: Record<string, string> = {
    q1: "Page Purpose",
    q2: "Wikipedia Finding",
    q3: "Site Age",
    q4: "Purpose Achieved?",
    q5: "Scam Reports",
    q6: "Unique Authority",
    q7: "Harmful/Deceptive/Spammy?",
    q8: "Money Without Value?",
    q9: "YMYL?",
    q10: "MC Quality Rank",
    q11: "Title vs MC Match",
    q12: "Rich Media MC?",
    q13: "Domain URL",
    q14: "Government Site?",
    q15: "Final Comment",
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">7-Step Evaluation</h3>
      {steps.map(
        ({ label, data }) =>
          data && (
            <div key={label} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-sm text-gray-800">{label}</p>
                {(data.updatedRating ||
                  data.finalRating ||
                  data.startingRating) && (
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold border ${RATING_COLORS[data.updatedRating || data.finalRating || data.startingRating] || "bg-gray-100 text-gray-700 border-gray-200"}`}
                  >
                    {data.updatedRating ||
                      data.finalRating ||
                      data.startingRating}
                  </span>
                )}
              </div>
              <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          ),
      )}

      {evaluation.questions && (
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-sm text-gray-800 mb-3">
            15 Questions
          </h4>
          <div className="space-y-2">
            {Object.entries(evaluation.questions).map(([key, val]) => (
              <div key={key} className="text-sm">
                <span className="font-medium text-gray-700">
                  Q{key.replace("q", "")}:{" "}
                </span>
                <span className="text-gray-600">{String(val)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SxSComment({
  results,
  query,
  leftTotal,
  rightTotal,
  preference,
}: {
  results: any[];
  query: string;
  leftTotal: number;
  rightTotal: number;
  preference: string;
}) {
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const generate = async () => {
      setLoading(true);
      try {
        const leftResults = results
          .filter((r) => r._side === "left")
          .map((r, i) => {
            const raw = r.evaluation?.rawResponse
              ? JSON.parse(r.evaluation.rawResponse)
              : null;
            return `L${i + 1}: ${raw?.rating || "?"} (${raw?.points || 0}pts) — ${raw?.comment || ""}`;
          })
          .join("; ");

        const rightResults = results
          .filter((r) => r._side === "right")
          .map((r, i) => {
            const raw = r.evaluation?.rawResponse
              ? JSON.parse(r.evaluation.rawResponse)
              : null;
            return `R${i + 1}: ${raw?.rating || "?"} (${raw?.points || 0}pts) — ${raw?.comment || ""}`;
          })
          .join("; ");

        const firstRaw = results[0]?.evaluation?.rawResponse
          ? JSON.parse(results[0].evaluation.rawResponse)
          : null;
        const dominantIntent = firstRaw?.dominantIntent || query;

        const res = await ratingsApi.generateSxSComment({
          query,
          dominantIntent,
          leftResults,
          rightResults,
          leftTotal,
          rightTotal,
          preference,
        });
        setComment(res.data.comment);
      } catch {
        setComment("");
      }
      setLoading(false);
    };
    generate();
  }, []);

  if (loading)
    return (
      <div className="text-xs text-gray-400 animate-pulse">
        Generating summary...
      </div>
    );
  if (!comment) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <p className="text-xs font-semibold text-gray-700 mb-1">SxS Summary</p>
      <p className="text-xs text-gray-600 leading-relaxed">{comment}</p>
    </div>
  );
}

function SxSSummary({
  results,
  query,
  taskType,
}: {
  results: any[];
  query: string;
  taskType?: string;
}) {
  const leftResults = results.filter((r) => r._side === "left");
  const rightResults = results.filter((r) => r._side === "right");

  const getPoints = (r: any) => {
    const raw = r.evaluation?.rawResponse
      ? JSON.parse(r.evaluation.rawResponse)
      : null;
    return raw?.points || raw?.needsMetPoints || 0;
  };

  const getRating = (r: any) => {
    const raw = r.evaluation?.rawResponse
      ? JSON.parse(r.evaluation.rawResponse)
      : null;
    return (
      raw?.rating || raw?.needsMetRating || r.evaluation?.needsMetRating || ""
    );
  };

  const leftTotal = leftResults.reduce((sum, r) => sum + getPoints(r), 0);
  const rightTotal = rightResults.reduce((sum, r) => sum + getPoints(r), 0);
  const diff = Math.abs(leftTotal - rightTotal);

  let preference = "About the Same";
  let preferenceColor = "text-gray-700";

  if (diff === 0) {
    preference = "About the Same";
    preferenceColor = "text-gray-700";
  } else {
    const winner = leftTotal > rightTotal ? "Left" : "Right";
    const winnerColor = winner === "Left" ? "text-blue-700" : "text-green-700";
    if (diff >= 3) {
      preference = `Much Better — ${winner}`;
      preferenceColor = winnerColor;
    } else if (diff >= 2) {
      preference = `Better — ${winner}`;
      preferenceColor = winnerColor;
    } else {
      preference = `Slightly Better — ${winner}`;
      preferenceColor = winnerColor;
    }
  }

  const POINT_LABELS: Record<number, string> = {
    5: "FullyM",
    4.5: "HM+",
    4: "HM",
    3.5: "MM+",
    3: "MM",
    2: "SM",
    1: "FailsM",
  };

  const RATING_BADGE: Record<string, string> = {
    FullyM: "bg-emerald-100 text-emerald-800 border-emerald-300",
    "HM+": "bg-blue-100 text-blue-800 border-blue-300",
    HM: "bg-blue-50 text-blue-700 border-blue-200",
    "MM+": "bg-yellow-100 text-yellow-800 border-yellow-300",
    MM: "bg-yellow-50 text-yellow-700 border-yellow-200",
    SM: "bg-orange-100 text-orange-800 border-orange-300",
    FailsM: "bg-red-100 text-red-800 border-red-300",
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-gray-200 rounded-xl p-5 space-y-4">
      <h3 className="font-bold text-gray-900">Side-by-Side Summary</h3>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-600 font-medium mb-1">Left Total</p>
          <p className="text-2xl font-bold text-blue-800">{leftTotal}</p>
          <p className="text-xs text-blue-500">
            {leftResults.length} result(s)
          </p>
        </div>
        <div className="bg-white border-2 border-gray-300 rounded-lg p-3 flex flex-col items-center justify-center">
          <p className="text-xs text-gray-500 font-medium mb-1">Preference</p>
          <p className={`text-sm font-bold ${preferenceColor}`}>{preference}</p>
          <p className="text-xs text-gray-400 mt-1">Diff: {diff} pts</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-xs text-green-600 font-medium mb-1">Right Total</p>
          <p className="text-2xl font-bold text-green-800">{rightTotal}</p>
          <p className="text-xs text-green-500">
            {rightResults.length} result(s)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-semibold text-blue-700 mb-1">
            Left Breakdown
          </p>
          <div className="space-y-1">
            {leftResults.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-gray-500 truncate flex-1 mr-2">
                  L{i + 1}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded border font-semibold ${RATING_BADGE[getRating(r)] || "bg-gray-100 text-gray-700 border-gray-300"}`}
                >
                  {getRating(r)}
                </span>
                <span className="text-gray-600 ml-1 font-medium w-6 text-right">
                  {getPoints(r)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-green-700 mb-1">
            Right Breakdown
          </p>
          <div className="space-y-1">
            {rightResults.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-gray-500 truncate flex-1 mr-2">
                  R{i + 1}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded border font-semibold ${RATING_BADGE[getRating(r)] || "bg-gray-100 text-gray-700 border-gray-300"}`}
                >
                  {getRating(r)}
                </span>
                <span className="text-gray-600 ml-1 font-medium w-6 text-right">
                  {getPoints(r)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <SxSComment
        results={results}
        query={query}
        leftTotal={leftTotal}
        rightTotal={rightTotal}
        preference={preference}
      />
    </div>
  );
}

function NeedsMetCard({ result, index }: { result: any; index: number }) {
  const raw = result.evaluation?.rawResponse
    ? JSON.parse(result.evaluation.rawResponse)
    : null;
  const rating =
    raw?.rating || raw?.needsMetRating || result.evaluation?.needsMetRating;
  const pq =
    raw?.pageQuality ||
    raw?.pageQualityRating ||
    result.evaluation?.youtubePQRating;

  const RATING_BADGE: Record<string, string> = {
    FullyM: "bg-emerald-100 text-emerald-800 border-emerald-300",
    "HM+": "bg-blue-100 text-blue-800 border-blue-300",
    HM: "bg-blue-50 text-blue-700 border-blue-200",
    "MM+": "bg-yellow-100 text-yellow-800 border-yellow-300",
    MM: "bg-yellow-50 text-yellow-700 border-yellow-200",
    SM: "bg-orange-100 text-orange-800 border-orange-300",
    FailsM: "bg-red-100 text-red-800 border-red-300",
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-gray-500 truncate flex-1">{result._url}</p>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-bold border whitespace-nowrap ${RATING_BADGE[rating] || "bg-gray-100 text-gray-700 border-gray-300"}`}
        >
          {rating}
        </span>
      </div>
      {result._type === "image" && (
        <div className="space-y-1">
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
            Image SCRB
          </span>
          {result._imagePreview && (
            <img
              src={result._imagePreview}
              alt="rated image"
              className="w-full h-24 object-cover rounded-lg mt-1"
            />
          )}
        </div>
      )}
      {result._resultImagePreview && (
        <div className="space-y-1">
          <p className="text-xs text-teal-600 font-medium">Result Image</p>
          <img
            src={result._resultImagePreview}
            alt="result image"
            className="w-full h-28 object-cover rounded-lg"
          />
        </div>
      )}
      {result._queryImagePreview && (
        <div className="space-y-1">
          <p className="text-xs text-indigo-600 font-medium">Query Image</p>
          <img
            src={result._queryImagePreview}
            alt="query image"
            className="w-full h-20 object-cover rounded-lg opacity-70"
          />
        </div>
      )}
      {raw && (
        <div className="space-y-1.5 text-xs text-gray-600">
          <p>
            <span className="font-medium">Query Type:</span>{" "}
            {raw.queryType || (raw.needsMetRating && "youtube")}
          </p>
          <p>
            <span className="font-medium">Intent:</span> {raw.dominantIntent}
          </p>
          {pq && (
            <p>
              <span className="font-medium">Page Quality:</span> {pq}
            </p>
          )}
          {raw.pageQualityRating && (
            <p>
              <span className="font-medium">Page Quality:</span>{" "}
              {raw.pageQualityRating}
            </p>
          )}
          <p>
            <span className="font-medium">Points:</span>{" "}
            {raw.points || raw.needsMetPoints}
          </p>
          {raw.needsMetRating && (
            <p>
              <span className="font-medium">NM Rating:</span>{" "}
              {raw.needsMetRating}
            </p>
          )}
          {raw.eeat && (
            <p>
              <span className="font-medium">E-E-A-T:</span> {raw.eeat}
            </p>
          )}
          {raw.primaryIntent && (
            <p>
              <span className="font-medium">Intent Type:</span>{" "}
              {raw.primaryIntent}
            </p>
          )}
          {raw.titleMatchesContent !== undefined && (
            <p>
              <span className="font-medium">Title Matches:</span>{" "}
              {raw.titleMatchesContent ? "✓ Yes" : "✗ No"}
            </p>
          )}

          {/* Content Flags */}
          {raw.contentFlags && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {raw.contentFlags.isHarmful && (
                <span className="bg-red-100 text-red-700 border border-red-300 px-1.5 py-0.5 rounded text-xs font-semibold">
                  ⚠ Harmful
                </span>
              )}
              {raw.contentFlags.isDeceptive && (
                <span className="bg-orange-100 text-orange-700 border border-orange-300 px-1.5 py-0.5 rounded text-xs font-semibold">
                  ⚠ Deceptive
                </span>
              )}
              {raw.contentFlags.isPorn && (
                <span className="bg-pink-100 text-pink-700 border border-pink-300 px-1.5 py-0.5 rounded text-xs font-semibold">
                  ⚠ Adult
                </span>
              )}
              {raw.contentFlags.isHateSpeech && (
                <span className="bg-purple-100 text-purple-700 border border-purple-300 px-1.5 py-0.5 rounded text-xs font-semibold">
                  ⚠ Hate Speech
                </span>
              )}
              {raw.contentFlags.isGraphicViolent && (
                <span className="bg-gray-100 text-gray-700 border border-gray-300 px-1.5 py-0.5 rounded text-xs font-semibold">
                  ⚠ Graphic
                </span>
              )}
              {raw.contentFlags.flagReasons?.length > 0 && (
                <div className="w-full mt-1">
                  {raw.contentFlags.flagReasons.map((r: string, i: number) => (
                    <p key={i} className="text-red-600 text-xs">
                      • {r}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Flags summary line */}
          {(() => {
            const flags = raw.contentFlags || result.evaluation?.contentFlags;
            const hasFlag =
              flags &&
              (flags.isHarmful ||
                flags.isDeceptive ||
                flags.isPorn ||
                flags.isHateSpeech ||
                flags.isGraphicViolent);
            return (
              <div className="mt-1.5 pt-1.5 border-t border-gray-100">
                {hasFlag ? (
                  <div>
                    <p className="text-red-600 text-xs font-medium">
                      🚩 Flags:{" "}
                      {[
                        flags.isHarmful && "Harmful",
                        flags.isDeceptive && "Deceptive",
                        flags.isPorn && "Adult/Porn",
                        flags.isHateSpeech && "Hate Speech",
                        flags.isGraphicViolent && "Graphic Violence",
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    {flags.flagReasons?.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {flags.flagReasons.map((r: string, i: number) => (
                          <p key={i} className="text-red-500 text-xs">
                            • {r}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-green-600 text-xs font-medium">
                    ✓ No flags
                  </p>
                )}
              </div>
            );
          })()}

          {/* Content checklist, topics, reputation, degree ratings, malicious flag */}
          {(raw.topics?.length > 0 ||
            raw.creatorReputation ||
            raw.isSatireOrHumor ||
            raw.deceptiveDegree ||
            raw.harmfulDegree ||
            raw.isMalicious !== undefined) && (
            <div className="mt-1.5 pt-1.5 border-t border-gray-100 space-y-1.5">
              {raw.contentChecklist &&
                (raw.contentChecklist.isPornMainContent ||
                  raw.contentChecklist.isForeignLanguage ||
                  raw.contentChecklist.didntLoad) && (
                  <div className="flex flex-wrap gap-1">
                    {raw.contentChecklist.isPornMainContent && (
                      <span className="bg-pink-100 text-pink-700 border border-pink-300 px-1.5 py-0.5 rounded text-xs font-semibold">
                        Porn in Main Content
                      </span>
                    )}
                    {raw.contentChecklist.isForeignLanguage && (
                      <span className="bg-gray-100 text-gray-700 border border-gray-300 px-1.5 py-0.5 rounded text-xs font-semibold">
                        Foreign Language
                      </span>
                    )}
                    {raw.contentChecklist.didntLoad && (
                      <span className="bg-gray-100 text-gray-700 border border-gray-300 px-1.5 py-0.5 rounded text-xs font-semibold">
                        Didn't Load
                      </span>
                    )}
                  </div>
                )}

              {raw.topics?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {raw.topics.map((t: string, i: number) => (
                    <span
                      key={i}
                      className="bg-slate-100 text-slate-700 border border-slate-300 px-1.5 py-0.5 rounded-full text-xs"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {raw.creatorReputation && (
                <p>
                  <span className="font-medium">Creator Reputation:</span>{" "}
                  {raw.creatorReputation}
                </p>
              )}

              {raw.isSatireOrHumor && (
                <p>
                  <span className="font-medium">Satire/Humor:</span>{" "}
                  {raw.isSatireOrHumor}
                </p>
              )}

              {raw.publicInterestOutweighsRisk && (
                <p>
                  <span className="font-medium">Public Interest Override:</span>{" "}
                  {raw.publicInterestOutweighsRisk}
                </p>
              )}

              {raw.deceptiveDegree && (
                <div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      raw.deceptiveDegree === "Not at all"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : raw.deceptiveDegree === "Low"
                          ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                          : raw.deceptiveDegree === "Medium"
                            ? "bg-orange-100 text-orange-800 border-orange-300"
                            : "bg-red-100 text-red-800 border-red-300"
                    }`}
                  >
                    Deceptive: {raw.deceptiveDegree}
                  </span>
                  {raw.deceptiveReasons?.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {raw.deceptiveReasons.map((r: string, i: number) => (
                        <p key={i} className="text-orange-600 text-xs">
                          • {r}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {raw.harmfulDegree && (
                <div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      raw.harmfulDegree === "Not at all"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : raw.harmfulDegree === "Low"
                          ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                          : raw.harmfulDegree === "Medium"
                            ? "bg-orange-100 text-orange-800 border-orange-300"
                            : "bg-red-100 text-red-800 border-red-300"
                    }`}
                  >
                    Harmful: {raw.harmfulDegree}
                  </span>
                  {raw.harmfulReasons?.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {raw.harmfulReasons.map((r: string, i: number) => (
                        <p key={i} className="text-red-600 text-xs">
                          • {r}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {raw.insensitiveIntolerantDegree && (
                <div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      raw.insensitiveIntolerantDegree === "Not at all"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : raw.insensitiveIntolerantDegree === "Low"
                          ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                          : raw.insensitiveIntolerantDegree === "Medium"
                            ? "bg-orange-100 text-orange-800 border-orange-300"
                            : "bg-red-100 text-red-800 border-red-300"
                    }`}
                  >
                    Insensitive/Intolerant: {raw.insensitiveIntolerantDegree}
                  </span>
                </div>
              )}

              {raw.isMalicious && (
                <div>
                  <span className="bg-red-600 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                    ⚠ Malicious Intent
                  </span>
                  {raw.maliciousReason && (
                    <p className="text-red-600 text-xs mt-1">
                      {raw.maliciousReason}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Image-specific fields */}
          {raw.imageSatisfaction && (
            <div className="mt-1.5 pt-1.5 border-t border-gray-100 space-y-1">
              <p className="text-xs font-semibold text-gray-700">
                Image Evaluation
              </p>
              <div className="flex flex-wrap gap-1.5">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                    raw.imageSatisfaction === "FullyS"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : raw.imageSatisfaction === "HS"
                        ? "bg-blue-100 text-blue-800 border-blue-300"
                        : raw.imageSatisfaction === "MS"
                          ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                          : raw.imageSatisfaction === "SS"
                            ? "bg-orange-100 text-orange-800 border-orange-300"
                            : "bg-red-100 text-red-800 border-red-300"
                  }`}
                >
                  Satisfaction: {raw.imageSatisfaction}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                    raw.imageProminence === "Main Feature"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : raw.imageProminence === "Easy to Find"
                        ? "bg-blue-100 text-blue-800 border-blue-300"
                        : raw.imageProminence === "Hard to Find"
                          ? "bg-orange-100 text-orange-800 border-orange-300"
                          : "bg-red-100 text-red-800 border-red-300"
                  }`}
                >
                  Prominence: {raw.imageProminence}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                    raw.lpHelpfulness === "VH"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : raw.lpHelpfulness === "MH"
                        ? "bg-blue-100 text-blue-800 border-blue-300"
                        : raw.lpHelpfulness === "SH"
                          ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                          : "bg-red-100 text-red-800 border-red-300"
                  }`}
                >
                  LP Help: {raw.lpHelpfulness}
                </span>
              </div>
              {raw.imageSatisfactionReason && (
                <p className="text-xs text-gray-500">
                  {raw.imageSatisfactionReason}
                </p>
              )}
              {raw.imageFlags &&
                (raw.imageFlags.isPorn ||
                  raw.imageFlags.isUpsetingOffensive ||
                  raw.imageFlags.isNotForEveryone) && (
                  <p className="text-xs text-orange-600 font-medium">
                    🖼 Image Flags:{" "}
                    {[
                      raw.imageFlags.isPorn && "Porn (P)",
                      raw.imageFlags.isUpsetingOffensive &&
                        "Upsetting-Offensive (U-O)",
                      raw.imageFlags.isNotForEveryone &&
                        "Not-for-Everyone (N-E)",
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
            </div>
          )}

          <p className="text-gray-500 mt-1 italic">{raw.comment}</p>
        </div>
      )}
    </div>
  );
}

function GenericResult({
  evaluation,
  taskType,
}: {
  evaluation: any;
  taskType: string;
}) {
  const raw = evaluation.rawResponse
    ? JSON.parse(evaluation.rawResponse)
    : null;
  if (!raw) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {evaluation.needsMetRating && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            <p className="text-xs text-blue-600 font-medium">
              Needs Met Rating
            </p>
            <p className="text-lg font-bold text-blue-800">
              {evaluation.needsMetRating}
            </p>
          </div>
        )}
        {evaluation.youtubePQRating && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
            <p className="text-xs text-purple-600 font-medium">Page Quality</p>
            <p className="text-lg font-bold text-purple-800">
              {evaluation.youtubePQRating}
            </p>
          </div>
        )}
        {evaluation.imageSatisfaction && (
          <div className="bg-pink-50 border border-pink-200 rounded-lg px-3 py-2">
            <p className="text-xs text-pink-600 font-medium">
              Image Satisfaction
            </p>
            <p className="text-lg font-bold text-pink-800">
              {evaluation.imageSatisfaction}
            </p>
          </div>
        )}
        {evaluation.sxsPreference && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <p className="text-xs text-amber-600 font-medium">SxS Preference</p>
            <p className="text-sm font-bold text-amber-800">
              {evaluation.sxsPreference}
            </p>
          </div>
        )}
      </div>

      <details className="border border-gray-200 rounded-lg">
        <summary className="p-4 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50">
          Full AI Analysis (click to expand)
        </summary>
        <div className="px-4 pb-4">
          <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans overflow-x-auto">
            {JSON.stringify(raw, null, 2)}
          </pre>
        </div>
      </details>
    </div>
  );
}

export default function RateTasksPage() {
  return (
    <Suspense
      fallback={<div className="animate-pulse h-96 bg-gray-100 rounded-xl" />}
    >
      <RateTasksInner />
    </Suspense>
  );
}
