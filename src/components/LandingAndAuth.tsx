import React, { useState } from "react";
import { motion } from "motion/react";
import { ShieldAlert, LogIn, Cpu, BarChart3, HelpCircle, Activity, Sparkles, AlertCircle } from "lucide-react";

interface LandingAndAuthProps {
  onLoginSuccess: () => void;
}

export default function LandingAndAuth({ onLoginSuccess }: LandingAndAuthProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Simulate slight network delay for a real premium app feel
    setTimeout(() => {
      if (username === "masterclass" && password === "agentic26") {
        localStorage.setItem("sentinel_logged_in", "true");
        onLoginSuccess();
      } else {
        setError("Invalid username or password. Please use correct masterclass credentials.");
        setIsLoading(false);
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white overflow-x-hidden" id="landing-auth-page">
      {/* Decorative top ambient blur blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header Navbar */}
      <nav className="h-20 max-w-7xl w-full mx-auto px-6 flex items-center justify-between border-b border-slate-900 shrink-0 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-lg flex items-center justify-center font-black text-sm text-white shadow-lg shadow-indigo-500/20">
            OS
          </div>
          <span className="text-base font-black tracking-wider uppercase font-display bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            RETENTION<span className="text-indigo-400">.OS</span>
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-xs font-mono text-slate-400 bg-slate-900/60 border border-slate-800 rounded-full px-4 py-1.5">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
          <span>Engine Status: Operational</span>
        </div>
      </nav>

      {/* Landing and Auth Content Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center relative z-10">
        
        {/* Left Column: Product pitch */}
        <div className="lg:col-span-7 space-y-8 flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-300 text-xs font-mono w-fit">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Senior Fullstack Decision Platform</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black font-display tracking-tight text-white leading-[1.1]">
              Predict Employee Attrition with <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">SHAP Explainability</span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl">
              An enterprise employee attrition sentinel built on Gradient Boosting Classifiers. Simulate risks, inspect serial features, and optimize retainment workflows.
            </p>
          </div>

          {/* Key Product Features Bento Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-900 hover:border-indigo-500/20 transition group">
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg w-fit group-hover:bg-indigo-500/20 transition">
                <Cpu className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white mt-3 font-display">Double .pkl Serial Backend</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Seamless pipeline integration utilizing <code className="text-indigo-300">model.pkl</code> for classification and <code className="text-emerald-400">preprocessor.pkl</code> for features mapping.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-900 hover:border-indigo-500/20 transition group">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg w-fit group-hover:bg-emerald-500/20 transition">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white mt-3 font-display">SHAP Explanations</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Real-time horizontal SHAP values plotting the top 5 positive and negative attrition factors for pristine transparency.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-900 hover:border-indigo-500/20 transition group">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg w-fit group-hover:bg-amber-500/20 transition">
                <Activity className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white mt-3 font-display">Milestones Gauge</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Beautiful segmented needle gauge using precise color boundaries at the <span className="font-mono text-indigo-300">0.4</span> and <span className="font-mono text-indigo-300">0.7</span> risk levels.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-900 hover:border-indigo-500/20 transition group">
              <div className="p-2 bg-pink-500/10 text-pink-400 rounded-lg w-fit group-hover:bg-pink-500/20 transition">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white mt-3 font-display">Retention.OS Command Center</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Actionable pipelines allowing HR officers to transition high-risk cohort profiles directly into targeted workflow playbooks.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Premium Auth Card */}
        <div className="lg:col-span-5 flex justify-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-2xl relative backdrop-blur-md"
            id="auth-login-card"
          >
            {/* Top Auth Banner */}
            <div className="flex flex-col space-y-1.5 mb-6 text-center">
              <div className="mx-auto p-3 bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20 mb-2">
                <LogIn className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white font-display">
                Authorized Platform Ingress
              </h2>
              <p className="text-xs text-slate-400">
                Please enter your credentials to calibrate system parameters.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
                  Username
                </label>
                <input
                  type="text"
                  required
                  placeholder="masterclass"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-mono"
                  id="login-username-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-mono"
                  id="login-password-input"
                />
              </div>

              {/* Demo Credentials Indicator */}
              <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800 flex items-start gap-2 text-[11px] text-slate-400 font-mono">
                <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="text-indigo-300 font-bold">CALIBRATION ACCESS KEY:</div>
                  <div>User: <code className="text-white font-bold bg-slate-900 px-1 rounded">masterclass</code></div>
                  <div>Pass: <code className="text-white font-bold bg-slate-900 px-1 rounded">agentic26</code></div>
                </div>
              </div>

              {/* Error messages */}
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-lg flex items-start gap-2 font-mono" id="auth-error-banner">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/35 transition cursor-pointer active:scale-[0.99]"
                id="login-submit-button"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Decrypt & Unlock Command Center</span>
                    <LogIn className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>

      </div>

      {/* Footer information */}
      <footer className="h-16 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between px-6 text-xs text-slate-500 shrink-0 bg-slate-950 relative z-10 gap-2">
        <span>© 2026 Patria & Co. All Rights Reserved. Private HR Analytics Instance.</span>
        <div className="flex gap-4 font-mono text-[11px]">
          <span>Classification Model: Gradient Boosting</span>
          <span>Scalers: preprocessor.pkl ACTIVE</span>
        </div>
      </footer>
    </div>
  );
}
