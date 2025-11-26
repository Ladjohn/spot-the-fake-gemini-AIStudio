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
  onNext,
}) => {
  // 1) Normalize & parse verification
  let v: VerificationResult = {
    authenticityScore: 50,
    verdict: "UNCERTAIN",
    reasoning: "No verification available.",
    sources: [],
    usedSearch: false,
    visualArtifacts: [],
  };

  try {
    if (typeof verification === "string") {
      const maybe = JSON.parse(verification);
      v = {
        authenticityScore: Number(maybe.authenticityScore ?? 50),
        verdict: (maybe.verdict ?? "UNCERTAIN").toUpperCase(),
        reasoning: maybe.reasoning ?? "No explanation provided.",
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
