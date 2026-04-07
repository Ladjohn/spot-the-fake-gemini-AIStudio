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

  let score = Math.round(Number(v.authenticityScore) || 0);
  if (score <= 1) score = Math.round(score * 100);
  score = Math.max(0, Math.min(100, score));

  const correct = userGuess === item.type;
  const truthText = item.summary || item.explanation || v.reasoning || "No additional information available.";
  const additionalFact = item.explanation || "Learn more about this topic by researching credible sources.";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "#fffdf7",
          width: "100%",
          maxWidth: 440,
          overflow: "hidden",
          border: "4px solid #000",
          boxShadow: "12px 12px 0 #000",
        }}
      >
        <div
          style={{
            background: correct ? "#2DBD6E" : "#FF5E5B",
            padding: "24px",
            textAlign: "center",
            transition: "background 0.3s ease",
            borderBottom: "4px solid #000",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 16,
              background: "#000",
              color: "#fff",
              padding: "6px 10px",
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: 1.4,
              textTransform: "uppercase",
            }}
          >
            Verdict
          </div>
          <h1
            style={{
              fontSize: 40,
              fontWeight: 900,
              color: "#fff",
              margin: "18px 0 0",
              letterSpacing: 1.6,
              textTransform: "uppercase",
              fontFamily: "'Arial Black', 'Space Grotesk', sans-serif",
            }}
          >
            {correct ? "NAILED IT!" : "NOPE!"}
          </h1>
          <p
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: "rgba(255,255,255,0.95)",
              margin: "8px 0 0",
              letterSpacing: 0.8,
              textTransform: "uppercase",
            }}
          >
            You: <b>{userGuess}</b>  vs  Truth: <b>{item.type}</b>
          </p>
        </div>

        <div style={{ padding: "24px" }}>
          <div
            style={{
              border: "3px solid #111",
              padding: "16px",
              marginBottom: 20,
              background: "#F7D748",
              boxShadow: "6px 6px 0 #000",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  background: "#3B7FF5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: 14,
                  flexShrink: 0,
                }}
              >
                i
              </div>
              <h3
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                  color: "#000",
                  margin: 0,
                  letterSpacing: 1.3,
                  textTransform: "uppercase",
                }}
              >
                The Truth
              </h3>
            </div>
            <p
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#111",
                margin: 0,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                wordWrap: "break-word",
              }}
            >
              {truthText}
            </p>
          </div>

          <div
            style={{
              border: "3px solid #000",
              padding: "16px",
              marginBottom: 20,
              background: "#00E0B8",
              boxShadow: "6px 6px 0 #000",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  background: "#000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: 14,
                  flexShrink: 0,
                }}
              >
                +
              </div>
              <h3
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                  color: "#000",
                  margin: 0,
                  letterSpacing: 1.3,
                  textTransform: "uppercase",
                }}
              >
                Did You Know?
              </h3>
            </div>
            <p
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#111",
                margin: 0,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                wordWrap: "break-word",
              }}
            >
              {additionalFact}
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                border: "3px solid #000",
                background: "#fff",
                padding: "12px 10px",
                boxShadow: "4px 4px 0 #000",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1.3, textTransform: "uppercase" }}>Confidence</div>
              <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{score}%</div>
            </div>
            <div
              style={{
                border: "3px solid #000",
                background: "#FF7A00",
                padding: "12px 10px",
                boxShadow: "4px 4px 0 #000",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1.3, textTransform: "uppercase" }}>Scanner</div>
              <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>ON</div>
            </div>
          </div>
        </div>

        <div style={{ padding: "0 24px 24px" }}>
          <button
            onClick={() => {
              playSound("CLICK");
              onNext();
            }}
            className="neo-analysis-button"
            style={{
              width: "100%",
              padding: "16px 0",
              background: "#000",
              color: "#fff",
              fontWeight: 900,
              fontSize: 16,
              letterSpacing: 1.5,
              border: "3px solid #000",
              cursor: "pointer",
              transition: "all 0.15s ease",
              textTransform: "uppercase",
              boxShadow: "4px 4px 0 #000",
            }}
          >
            Next Round -&gt;
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisModal;
