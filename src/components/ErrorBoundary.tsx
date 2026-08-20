import React, { Component, ErrorInfo, ReactNode } from "react";
import { ShieldAlert, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught React Error:", error, errorInfo);
  }

  private handleResetCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn("Could not clear storage:", e);
    }
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 text-red-400 rounded-full flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8 animate-pulse" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white mb-2">
                Application Recovery Shield
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Sistem mendeteksi adanya pembaruan sesi atau cache peramban yang perlu disegarkan.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg text-left text-[11px] font-mono text-red-300 overflow-x-auto max-h-24">
                {this.state.error.message || "Unknown error"}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={this.handleResetCache}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reset Cache & Muat Ulang Aplikasi
              </Button>
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/")}
                className="w-full border-slate-700 text-slate-300 hover:bg-slate-700 gap-2 text-xs"
              >
                <Home className="w-4 h-4" />
                Kembali ke Beranda
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
