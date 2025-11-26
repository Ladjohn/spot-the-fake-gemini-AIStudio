// src/components/AnalysisModal.tsx
import React from "react";
import { NewsItem, VerificationResult } from "../types";
import { playSound } from "../services/audioService";

interface Props {
  item: NewsItem;
  userGuess: "REAL" | "FAKE" | "TIMEOUT";
  verification?: VerificationResult | string | any;
  onClose: () => void;
  onNext: () => void;
}

const AnalysisModal: React.FC<Props> = ({
  item,
  userGuess,
  verification,
  onClose,
  onNext,
}) => {
  // default verification
  let v: VerificationResult = {
    authenticityScore: 50,
    verdict: "UNCERTAIN",
    reasoning: "No verification available.",
    sources: [],
    usedSearch: false,
    visualArtifacts: [],
  };

  // Normalize & parse verification defensively
  try {
    if (typeof verification === "string") {
      try {
        const maybe = JSON.parse(verification);
        v = {
          authenticityScore: Number(maybe.authenticityScore ?? 50),
          verdict: (maybe.verdict ?? "UNCERTAIN").toString().toUpperCase(),
          reasoning: maybe.reasoning ?? String(maybe).slice(0, 1000),
          sources: maybe.sources ?? [],
          usedSearch: !!maybe.usedSearch,
          visualArtifacts: maybe.visualArtifacts ?? [],
        };
      } catch {
        // not JSON — keep the string as reasoning
        v.reasoning = String(verification).slice(0, 2000);
      }
    } else if (verification && typeof verification === "object") {
      v = {
        authenticityScore: Number(verification.authenticityScore ?? 50),
        verdict: (verification.verdict ?? "UNCERTAIN").toString().toUpperCase(),
        reasoning: verification.reasoning ?? "No explanation provided.",
        sources: verification.sources ?? [],
        usedSearch: !!verification.usedSearch,
        visualArtifacts: verification.visualArtifacts ?? [],
      };
    }
  } catch (e) {
    console.warn("Error parsing verification:", e, verification);
  }

  // Clamp & normalize score properly (handle 0..1 floats)
  let rawScore = Number(v.authenticityScore ?? 50);
  if (!isFinite(rawScore)) rawScore = 50;
  if (rawScore > 0 && rawScore <= 1) rawScore = rawScore * 100; // convert fraction -> percent
  let score = Math.round(rawScore);
  score = Math.max(0, Math.min(100, score));

  // Determine correctness (case-insensitive)
  const truth = (item.type ?? "").toString().toUpperCase();
  const guess = (userGuess ?? "").toString().toUpperCase();
  const correct = guess === truth;

  // Color for progress bar
  const barClass =
    score >= 60 ? "bg-green-500" : score >= 30 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 z-50">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-lg p-6 rounded-xl border-4 border-black dark:border-white shadow-xl relative">
        {/* Close X */}
        <button
          onClick={() => {
            playSound("CLICK");
            onClose();
          }}
          className="absolute right-4 top-4 p-2 rounded-full border-2 border-black dark:border-white bg-white dark:bg-zinc-900"
          aria-label="Close"
        >
          ✕
        </button>

        <h1 className="text-3xl font-black text-center mb-4">
          {correct ? "NAILED IT!" : "OOPS!"}
        </h1>

        <p className="text-center text-sm text-gray-600 dark:text-gray-300 mb-3">
          You: <b>{guess}</b> vs Truth: <b>{truth || "UNKNOWN"}</b>
        </p>

        {/* Score Bar */}
        <div className="mt-4 mb-4">
          <div className="w-full h-4 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden border-2 border-black dark:border-white">
            <div className={`h-full transition-all ${barClass}`} style={{ width: `${score}%` }} />
          </div>

          <p className="text-right text-xs font-bold mt-1 text-black dark:text-white">
            {score}% AUTH
          </p>
        </div>

        {/* Verdict row */}
        <div className="flex items-center justify-between mt-2 mb-4">
          <div>
            <div className="text-xs font-black uppercase text-gray-500">AI Verdict</div>
            <div className="font-bold">{v.verdict ?? "UNCERTAIN"}</div>
          </div>
          <div className="text-right text-xs text-gray-500">
            {v.usedSearch ? "Used web search" : "No web search"}
          </div>
        </div>

        {/* Reasoning */}
        <div className="bg-gray-100 dark:bg-zinc-800 p-4 rounded-lg border-2 border-black dark:border-white mt-4">
          <h3 className="text-sm font-black mb-2">AI VERIFICATION</h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
            {v.reasoning}
          </p>
        </div>

        <button
          onClick={() => {
            playSound("CLICK");
            onNext();
          }}
          className="mt-6 w-full py-3 bg-black dark:bg-white text-white dark:text-black font-black uppercase border-4 border-black dark:border-white rounded-lg"
        >
          Next Round →
        </button>
      </div>
    </div>
  );
};

export default AnalysisModal;        reasoning: maybe.reasoning ?? "No explanation provided.",
        sources: [],
        usedSearch: false,
        visualArtifacts: [],
      };
    } else if (verification) {
      v = {
        authenticityScore: Number(verification.authenticityScore ?? 50),
        verdict: (verification.verdict ?? "UNCERTAIN").toUpperCase(),
        reasoning: verification.reasoning ?? "No explanation provided.",
        sources: [],
        usedSearch: false,
        visualArtifacts: [],
      };
    }
  } catch (e) {
    console.warn("Error parsing verification:", e, verification);
  }

  // 2) Clamp the score 0–100
  let score = Math.round(Number(v.authenticityScore) || 0);

  // If model returned 0–1, convert to 0–100
  if (score <= 1) score = score * 100;

  // Force final bounds
  score = Math.max(0, Math.min(100, score));

  // 3) Render modal UI
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 z-50">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-lg p-6 rounded-xl border-4 border-black dark:border-white shadow-xl relative">
        <h1 className="text-3xl font-black text-center mb-4">
          {userGuess === item.type ? "NAILED IT!" : "OOPS!"}
        </h1>

        <p className="text-center text-sm text-gray-600 dark:text-gray-300 mb-3">
          You: <b>{userGuess}</b> vs Truth: <b>{item.type}</b>
        </p>

        {/* Score Bar */}
        <div className="mt-4 mb-4">
          <div className="w-full h-4 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden border-2 border-black dark:border-white">
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${score}%` }}
            ></div>
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
        </div>

        <button
          onClick={() => {
            playSound("CLICK");
            onNext();
          }}
          className="mt-6 w-full py-3 bg-black dark:bg-white text-white dark:text-black font-black uppercase border-4 border-black dark:border-white rounded-lg"
        >
          Next Round →
        </button>
      </div>
    </div>
  );
};

export default AnalysisModal;
