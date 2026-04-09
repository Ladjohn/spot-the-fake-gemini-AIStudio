// ONLY showing modified parts — rest remains SAME

// 🔥 Add this CSS in your global CSS (IMPORTANT)
/*
@keyframes logoPop {
  0% {
    opacity: 0;
    transform: scale(0.8) translateY(10px);
  }
  60% {
    opacity: 1;
    transform: scale(1.05) translateY(0);
  }
  100% {
    transform: scale(1);
  }
}
*/

// ✅ LoadingScreen FIXED
const LoadingScreen = () => {
  const [line] = useState(getRandomLoadingLine);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F5C518',
        color: '#000',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div
        className="neo-card loading-card"
        style={{
          background: '#fff',
          padding: '28px 22px',
          maxWidth: 430,
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          willChange: 'transform',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
          <div style={{ transform: 'translateZ(0)' }}>
            <LogoMark size={62} fontSize={20} />
          </div>
        </div>

        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
          Loading
        </div>

        <div style={{ fontSize: 'clamp(22px, 7vw, 34px)', lineHeight: 1.05, fontWeight: 900, fontFamily: 'Space Grotesk, sans-serif', textTransform: 'uppercase' }}>
          {line}
        </div>
      </div>
    </div>
  );
};

// ✅ LogoMark UPDATED (with animation)
const LogoMark: React.FC<{ size?: number; fontSize?: number; borderColor?: string; shadowColor?: string; rounded?: number }> = ({
  size = 72,
  fontSize = 24,
  borderColor = '#000',
  shadowColor = '#000',
  rounded = 0,
}) => (
  <div
    className="for-logo-build"
    style={{
      width: size,
      height: size,
      background: '#3B7FF5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: `6px 6px 0 ${shadowColor}`,
      border: `3px solid ${borderColor}`,
      borderRadius: rounded,
      flexShrink: 0,
      fontSize,
      animation: 'logoPop 0.6s ease-out',
    }}
  >
    <span className="for-logo-letter for-logo-letter-f">F</span>
    <span className="for-logo-dot">.</span>
    <span className="for-logo-letter for-logo-letter-o">O</span>
    <span className="for-logo-dot for-logo-dot-late">.</span>
    <span className="for-logo-letter for-logo-letter-r">R</span>
  </div>
);

// ✅ ScoreBoard FIX (removed tilt)
<div
  style={{
    background: '#050505',
    color: '#fff',
    padding: '22px 16px',
    margin: '0 auto 24px',
    borderRadius: 8,
    transform: 'none', // FIXED
    border: '3px solid #000',
  }}
>
