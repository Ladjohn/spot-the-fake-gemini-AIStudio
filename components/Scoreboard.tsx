import React from "react";
import { playSound } from "../services/audioService";

interface ScoreboardProps {
  finalScore: number;
  highScore: number;
  streak: number;
  totalRoundsPlayed: number;
  isNewBest: boolean;
  isDarkMode?: boolean;
  onPlayAgain: () => void;
  onBackToMenu: () => void;
}

const Scoreboard: React.FC<ScoreboardProps> = ({
  finalScore,
  highScore,
  streak,
  totalRoundsPlayed,
  isNewBest,
  isDarkMode = false,
  onPlayAgain,
  onBackToMenu,
}) => {
  const bgColor = isDarkMode ? "#1a1a1a" : "#fefcf0";
  const cardBg = isDarkMode ? "#2a2a2a" : "#fff";
  const textColor = isDarkMode ? "#fff" : "#000";
  const accentColor = isNewBest ? "#F5C518" : "#3B7FF5";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: bgColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        color: textColor,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: cardBg,
          borderRadius: 24,
          border: "4px solid #000",
          boxShadow: "8px 8px 0px 0px #000",
          overflow: "hidden",
        }}
      >
        {/* Header Banner */}
        <div
          style={{
            background: isNewBest ? "#F5C518" : "#3B7FF5",
            padding: "32px 24px",
            textAlign: "center",
            borderBottom: "4px solid #000",
          }}
        >
          <h1
            style={{
              fontSize: 48,
              fontWeight: 900,
              margin: 0,
              color: isNewBest ? "#000" : "#fff",
              letterSpacing: 2,
              fontFamily: "Space Grotesk, sans-serif",
            }}
          >
            {isNewBest ? "🎉 NEW BEST!" : "GAME OVER"}
          </h1>
          <p
            style={{
              fontSize: 14,
              fontWeight: 700,
              margin: "8px 0 0",
              color: isNewBest ? "#000" : "rgba(255,255,255,0.8)",
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            {isNewBest ? "You broke your record!" : "Better luck next time!"}
          </p>
        </div>

        {/* Score Section */}
        <div style={{ padding: "32px 24px" }}>
          {/* Final Score */}
          <div
            style={{
              textAlign: "center",
              marginBottom: 28,
              padding: "24px",
              background: isDarkMode ? "#333" : "#f5f5f5",
              borderRadius: 16,
              border: "3px solid #000",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: isDarkMode ? "#aaa" : "#666",
                letterSpacing: 2,
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              FINAL SCORE
            </div>
            <div
              style={{
                fontSize: 56,
                fontWeight: 900,
                color: accentColor,
                margin: 0,
                lineHeight: 1,
              }}
            >
              {finalScore}
            </div>
          </div>

          {/* Stats Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 28,
            }}
          >
            {/* High Score */}
            <div
              style={{
                padding: "16px",
                background: isDarkMode ? "#333" : "#f5f5f5",
                borderRadius: 12,
                border: "2px solid #000",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: isDarkMode ? "#aaa" : "#666",
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                BEST
              </div>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 900,
                  color: "#2DBD6E",
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                {highScore}
              </div>
            </div>

            {/* Streak */}
            <div
              style={{
                padding: "16px",
                background: isDarkMode ? "#333" : "#f5f5f5",
                borderRadius: 12,
                border: "2px solid #000",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: isDarkMode ? "#aaa" : "#666",
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                STREAK
              </div>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 900,
                  color: "#E97316",
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                {streak}
              </div>
            </div>
          </div>

          {/* Rounds Played */}
          <div
            style={{
              padding: "16px",
              background: isDarkMode ? "#333" : "#f5f5f5",
              borderRadius: 12,
              border: "2px solid #000",
              textAlign: "center",
              marginBottom: 28,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: isDarkMode ? "#aaa" : "#666",
                letterSpacing: 1.5,
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              QUESTIONS ANSWERED
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: textColor,
                margin: 0,
                lineHeight: 1,
              }}
            >
              {totalRoundsPlayed}
            </div>
          </div>

          {/* Performance Message */}
          <div
            style={{
              padding: "16px",
              background: isNewBest
                ? "rgba(245, 197, 24, 0.1)"
                : "rgba(59, 127, 245, 0.1)",
              borderRadius: 12,
              border: `2px solid ${isNewBest ? "#F5C518" : "#3B7FF5"}`,
              textAlign: "center",
              marginBottom: 28,
            }}
          >
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: isNewBest ? "#F5C518" : "#3B7FF5",
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              {isNewBest
                ? "Incredible work! You've set a new personal record. Keep it up! 🚀"
                : finalScore > highScore * 0.8
                ? "Great effort! You're getting closer to your best. Try again! 💪"
                : "Don't give up! Every game makes you better at spotting fakes. 🎯"}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            padding: "24px",
            background: isDarkMode ? "#111" : "#f9f9f9",
            borderTop: "4px solid #000",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
          }}
        >
          <button
            onClick={() => {
              playSound("CLICK");
              onPlayAgain();
            }}
            style={{
              padding: "16px 0",
              background: "#2DBD6E",
              color: "#fff",
              fontWeight: 900,
              fontSize: 14,
              letterSpacing: 1.5,
              border: "3px solid #000",
              borderRadius: 12,
              cursor: "pointer",
              transition: "all 0.15s ease",
              textTransform: "uppercase",
              boxShadow: "4px 4px 0px 0px #000",
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "scale(0.96)";
              e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "4px 4px 0px 0px #000";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "4px 4px 0px 0px #000";
            }}
          >
            PLAY AGAIN
          </button>

          <button
            onClick={() => {
              playSound("CLICK");
              onBackToMenu();
            }}
            style={{
              padding: "16px 0",
              background: "#111",
              color: "#fff",
              fontWeight: 900,
              fontSize: 14,
              letterSpacing: 1.5,
              border: "3px solid #000",
              borderRadius: 12,
              cursor: "pointer",
              transition: "all 0.15s ease",
              textTransform: "uppercase",
              boxShadow: "4px 4px 0px 0px #000",
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "scale(0.96)";
              e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "4px 4px 0px 0px #000";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "4px 4px 0px 0px #000";
            }}
          >
            BACK TO MENU
          </button>
        </div>
      </div>
    </div>
  );
};

export default Scoreboard;
