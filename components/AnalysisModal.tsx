import React from "react";
import { NewsItem, VerificationResult } from "../types";
import { playSound } from "../services/audioService";

interface Props {
  item: NewsItem;
  userGuess: "REAL" | "FAKE" | "TIMEOUT";
  verification?: VerificationResult | string | any;
  onClose?: () => void;
  onNext: () => void;
}

const AnalysisModal: React.FC<Props> = ({
  item,
  userGuess,
  verification,
  onNext,
}) => {
  // Default verification object
  let v: VerificationResult = {
    authenticityScore: 50,
    verdict: "UNCERTAIN",
    reasoning: "No verification available.",
    sources: [],
    usedSearch: false,
    visualArtifacts: [],
  };

  // Try to normalize whatever was passed in (string / object)
  try {
    if (typeof verification === "string") {
      const maybe = JSON.parse(verification);
      v = {
        authenticityScore: Number(maybe.authenticityScore ?? 50),
        verdict: (maybe.verdict ?? "UNCERTAIN").toUpperCase(),
        reasoning: maybe.reasoning ?? "No explanation provided.",
        sources: maybe.sources ?? [],
        usedSearch: !!maybe.usedSearch,
        visualArtifacts: maybe.visualArtifacts ?? [],
      };
    } else if (verification) {
      v = {
        authenticityScore: Number(verification.authenticityScore ?? 50),
        verdict: (verification.verdict ?? "UNCERTAIN").toUpperCase(),
        reasoning: verification.reasoning ?? "No explanation provided.",
        sources: verification.sources ?? [],
        usedSearch: !!verification.usedSearch,
        visualArtifacts: verification.visualArtifacts ?? [],
      };
    }
  } catch (e) {
    console.warn("Error parsing verification:", e, verification);
  }

  // Normalize & clamp score to 0..100
  let score = Math.round(Number(v.authenticityScore) || 0);
  if (score <= 1) score = Math.round(score * 100); // convert 0..1 -> 0..100
  score = Math.max(0, Math.min(100, score));

  const correct = userGuess === item.type;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 z-50">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-lg p-6 rounded-xl border-4 border-black dark:border-white shadow-xl relative">
        <h1 className="text-3xl font-black text-center mb-4">
          {correct ? "NAILED IT!" : "OOPS!"}
        </h1>

        <p className="text-center text-sm text-gray-600 dark:text-gray-300 mb-3">
          You: <b>{userGuess}</b> &nbsp; vs &nbsp; Truth: <b>{item.type}</b>
        </p>

        {/* Score Bar */}
        <div className="mt-4 mb-4">
          <div className="w-full h-4 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden border-2 border-black dark:border-white">
            <div
              className={`h-full transition-all ${score > 60 ? "bg-g-green" : score > 30 ? "bg-g-yellow" : "bg-g-red"}`}
              style={{ width: `${score}%` }}
            />
          </div>

          <p className="text-right text-xs font-bold mt-1 text-black dark:text-white">
            {score}% AUTH
          </p>
        </div>

        {/* Reasoning */}
        <div className="bg-gray-100 dark:bg-zinc-800 p-4 rounded-lg border-2 border-black dark:border-white mt-4">
          <h3 className="text-sm font-black mb-2">AI VERIFICATION</h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
            {v.reasoning}
          </p>

          {v.sources && v.sources.length > 0 && (
            <div className="mt-3 text-xs">
              <div className="font-black mb-1">Sources:</div>
              <ul className="list-disc list-inside text-xs">
                {v.sources.map((s, i) => (
                  <li key={i} className="truncate">{String(s)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => {
              playSound("CLICK");
              onNext();
            }}
            className="flex-1 py-3 bg-black dark:bg-white text-white dark:text-black font-black uppercase border-4 border-black dark:border-white rounded-lg"
          >
            Next Round →
          </button>

          <button
            onClick={() => {
              playSound("CLICK");
              // just close modal if parent provided onClose (keeps API flexible)
              if (typeof (window as any).closeModal === "function") (window as any).closeModal();
            }}
            className="py-3 px-4 bg-white dark:bg-zinc-800 text-black dark:text-white font-black uppercase border-4 border-black dark:border-white rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisModal;
