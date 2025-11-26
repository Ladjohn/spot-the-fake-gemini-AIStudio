import React from "react";

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error?: any };

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    console.error("🔥 ErrorBoundary caught:", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleCopyError = () => {
    const text =
      typeof this.state.error === "string"
        ? this.state.error
        : JSON.stringify(this.state.error, null, 2);

    navigator.clipboard.writeText(text);
    alert("Error copied to clipboard.");
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-g-yellow flex items-center justify-center p-6">
          <div className="
            bg-white dark:bg-zinc-900 
            border-4 border-black dark:border-white 
            max-w-md w-full p-8 rounded-xl shadow-[6px_6px_0px_0px_black]
            text-center
          ">
            <div className="text-6xl mb-4">⚠️</div>

            <h2 className="text-2xl font-black mb-2">
              Something broke!
            </h2>

            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Don’t worry — this usually happens when the API sends bad JSON.
              You can reload the game or copy the error for debugging.
            </p>

            <div className="space-y-3">
              <button
                onClick={this.handleReload}
                className="
                  w-full py-3 bg-g-blue text-white 
                  font-black uppercase border-4 border-black 
                  rounded-lg shadow hover:brightness-110 transition-all
                "
              >
                Reload Game
              </button>

              <button
                onClick={this.handleCopyError}
                className="
                  w-full py-3 bg-white dark:bg-zinc-800 
                  text-black dark:text-white font-black 
                  uppercase border-4 border-black dark:border-white
                  rounded-lg shadow hover:brightness-110 transition-all
                "
              >
                Copy Error Details
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
