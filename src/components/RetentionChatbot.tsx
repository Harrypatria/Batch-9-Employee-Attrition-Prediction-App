import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageSquare, X, Send, User, Bot, Brain,
  Loader2, ChevronDown, HelpCircle, TrendingUp, Sliders, LifeBuoy
} from "lucide-react";

// ── Interfaces ────────────────────────────────────────────────────────────────

interface Employee {
  id: string;
  name: string;
  department: string;
  jobRole: string;
  riskProbability?: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: Date;
}

interface RetentionChatbotProps {
  employees: Employee[];
  activeEmployeeId?: string | null;
  onSelectEmployee?: (empId: string) => void;
}

interface EmpFeatures {
  age: number; distanceFromHome: number; monthlyIncome: number; overTime: number;
  jobSatisfaction: number; environmentSatisfaction: number; workLifeBalance: number;
  yearsAtCompany: number; yearsInCurrentRole: number; yearsSinceLastPromotion: number;
  stockOptionLevel: number;
}

interface EmpContext { department: string; jobRole: string; }

interface EmpPrediction {
  name: string; jobRole: string; department: string;
  probability: number; prediction: "Yes" | "No";
  shapValues: { feature: string; value: number }[];
  baseValue: number;
  features: EmpFeatures;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SHAP_LABELS: Record<string, string> = {
  age: "Age", distanceFromHome: "Distance from Home", monthlyIncome: "Monthly Income",
  overTime: "Overtime", jobSatisfaction: "Job Satisfaction",
  environmentSatisfaction: "Environment Satisfaction", workLifeBalance: "Work-Life Balance",
  yearsAtCompany: "Years at Company", yearsInCurrentRole: "Years in Current Role",
  yearsSinceLastPromotion: "Years Since Last Promotion", stockOptionLevel: "Stock Option Level",
  maritalStatus: "Marital Status", businessTravel: "Business Travel",
  jobInvolvement: "Job Involvement", numCompaniesWorked: "Companies Worked",
  relationshipSatisfaction: "Relationship Satisfaction", department: "Department",
  jobRole: "Job Role", educationField: "Education Field", gender: "Gender",
  dailyRate: "Daily Rate", hourlyRate: "Hourly Rate", monthlyRate: "Monthly Rate",
  education: "Education Level", jobLevel: "Job Level",
  totalWorkingYears: "Total Working Years", yearsWithCurrManager: "Years with Manager",
  trainingTimesLastYear: "Training Times/Year", percentSalaryHike: "Salary Hike %",
  performanceRating: "Performance Rating",
};

const INTERVENTION_MAP: Record<string, string> = {
  overTime: "Cap overtime hours and enforce work-hour limits. Consider on-call rotation rebalancing.",
  monthlyIncome: "Conduct a market salary benchmarking analysis. Arrange an equity refresh or spot bonus.",
  workLifeBalance: "Offer hybrid/remote work arrangements. Reduce after-hours communications expectations.",
  jobSatisfaction: "Schedule a formal career alignment 1-on-1. Explore role enrichment or lateral move opportunities.",
  environmentSatisfaction: "Investigate team culture or physical environment pain points. Facilitate manager coaching.",
  distanceFromHome: "Evaluate remote work eligibility. Offer commute assistance or flexible start times.",
  yearsSinceLastPromotion: "Initiate a promotion track review. Set clear 6-month milestones for advancement.",
  stockOptionLevel: "Review stock option eligibility. Offer a retention grant or vesting acceleration.",
  yearsAtCompany: "Strengthen loyalty recognition. Assign a mentor from senior leadership.",
  businessTravel: "Reduce required travel frequency. Implement virtual-first meeting policies.",
  maritalStatus: "Enhance work-life support programs. Increase schedule flexibility.",
  numCompaniesWorked: "Assign structured onboarding buddies. Build a long-term career pathway map.",
  jobInvolvement: "Increase project ownership and decision-making authority.",
  relationshipSatisfaction: "Facilitate team-building and cross-functional collaboration opportunities.",
};

// ── Markdown formatter (unchanged) ───────────────────────────────────────────

function formatMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  return lines.map((line, lineIdx) => {
    if (line.startsWith("### ")) {
      return (
        <h4 key={lineIdx} className="text-sm font-black text-slate-900 mt-3 mb-1 font-display tracking-tight flex items-center gap-1.5 border-b border-slate-100 pb-1">
          {parseInlineFormatting(line.replace("### ", ""))}
        </h4>
      );
    }
    if (line.startsWith("## ") || line.startsWith("# ")) {
      return (
        <h3 key={lineIdx} className="text-base font-black text-indigo-950 mt-4 mb-2 font-display tracking-tight">
          {parseInlineFormatting(line.replace(/^#+\s+/, ""))}
        </h3>
      );
    }
    if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
      return (
        <li key={lineIdx} className="text-xs text-slate-700 ml-4 list-disc pl-1 py-0.5 leading-relaxed">
          {parseInlineFormatting(line.trim().replace(/^[\*\-]\s+/, ""))}
        </li>
      );
    }
    if (/^\d+\.\s+/.test(line.trim())) {
      return (
        <li key={lineIdx} className="text-xs text-slate-700 ml-5 list-decimal pl-1 py-0.5 leading-relaxed">
          {parseInlineFormatting(line.trim().replace(/^\d+\.\s+/, ""))}
        </li>
      );
    }
    if (line.trim() === "") return <div key={lineIdx} className="h-2" />;
    return (
      <p key={lineIdx} className="text-xs text-slate-700 leading-relaxed mb-1.5">
        {parseInlineFormatting(line)}
      </p>
    );
  });
}

function parseInlineFormatting(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let currentIdx = 0;
  const tokenRegex = /(\*\*|`)(.*?)\1/g;
  let match;
  while ((match = tokenRegex.exec(text)) !== null) {
    const matchStart = match.index;
    const matchEnd = tokenRegex.lastIndex;
    if (matchStart > currentIdx) parts.push(text.slice(currentIdx, matchStart));
    if (match[1] === "**") {
      parts.push(<strong key={matchStart} className="font-extrabold text-slate-950">{match[2]}</strong>);
    } else {
      parts.push(
        <code key={matchStart} className="px-1 py-0.5 bg-slate-100 border border-slate-200 text-indigo-700 rounded font-mono text-[10px] font-semibold">
          {match[2]}
        </code>
      );
    }
    currentIdx = matchEnd;
  }
  if (currentIdx < text.length) parts.push(text.slice(currentIdx));
  return parts.length > 0 ? <>{parts}</> : text;
}

// ── Response generators ───────────────────────────────────────────────────────

function genRiskBreakdown(p: EmpPrediction): string {
  const pct = Math.round(p.probability * 100);
  const riskLabel = p.probability > 0.7 ? "HIGH RISK" : p.probability > 0.4 ? "MEDIUM RISK" : "LOW RISK";

  const positive = p.shapValues.filter(s => s.value > 0.01).slice(0, 5);
  const negative = p.shapValues.filter(s => s.value < -0.01).slice(0, 5);

  const posLines = positive.map(s => {
    const label = SHAP_LABELS[s.feature] ?? s.feature;
    return `- **${label}**: \`+${s.value.toFixed(4)}\` (pushes toward attrition)`;
  }).join("\n");

  const negLines = negative.map(s => {
    const label = SHAP_LABELS[s.feature] ?? s.feature;
    return `- **${label}**: \`${s.value.toFixed(4)}\` (reduces attrition risk)`;
  }).join("\n");

  return `### SHAP Risk Breakdown — ${p.name}

**Prediction:** ${p.prediction === "Yes" ? "Likely to leave" : "Likely to stay"} | **Probability:** **${pct}%** (${riskLabel})
**Model Base Rate:** \`${p.baseValue.toFixed(4)}\` log-odds intercept

### Risk Drivers (SHAP ↑)
${posLines || "- No significant upward drivers detected."}

### Retention Anchors (SHAP ↓)
${negLines || "- No significant downward anchors detected."}

*SHAP values are additive log-odds contributions from \`shap.TreeExplainer\` applied to the real \`model.pkl\`. Base value + sum of all SHAP values = model raw output.*`;
}

function genRetentionPlaybook(p: EmpPrediction): string {
  const pct = Math.round(p.probability * 100);
  const topRisk = p.shapValues.filter(s => s.value > 0.01).slice(0, 4);

  if (topRisk.length === 0) {
    return `### Retention Playbook — ${p.name}\n\n**${pct}% risk** — No critical SHAP drivers found. Continue standard check-ins and engagement programs.`;
  }

  const interventions = topRisk.map((s, i) => {
    const label = SHAP_LABELS[s.feature] ?? s.feature;
    const action = INTERVENTION_MAP[s.feature] ?? `Review and optimise ${label} conditions.`;
    return `${i + 1}. **${label}** (\`+${s.value.toFixed(3)}\`): ${action}`;
  }).join("\n");

  const feats = p.features;
  const specific: string[] = [];
  if (feats.overTime === 1) specific.push("- Currently working overtime — **immediate workload audit recommended**");
  if (feats.monthlyIncome < 5000) specific.push(`- Monthly income **$${feats.monthlyIncome.toLocaleString()}** is below market threshold of $5,000`);
  if (feats.workLifeBalance <= 2) specific.push(`- Work-life balance score **${feats.workLifeBalance}/4** — critical burnout zone`);
  if (feats.jobSatisfaction <= 2) specific.push(`- Job satisfaction **${feats.jobSatisfaction}/4** — engagement crisis signal`);
  if (feats.yearsSinceLastPromotion >= 3) specific.push(`- No promotion in **${feats.yearsSinceLastPromotion} years** — stagnation risk`);

  return `### Retention Playbook — ${p.name}

**Attrition Risk: ${pct}%** | Role: ${p.jobRole} | Dept: ${p.department}

### Profile Observations
${specific.length > 0 ? specific.join("\n") : "- Profile is within acceptable risk thresholds."}

### Prioritised Interventions (by SHAP Impact)
${interventions}

*Re-run the Interactive Sandbox after implementing changes to track predicted risk reduction.*`;
}

function genModelInfo(meta: any): string {
  if (!meta) return "### Model Metadata\n\nUnable to fetch model metadata. Ensure the FastAPI server is running at port 8000.";
  return `### GBDT Model Specification

**Algorithm:** ${meta.algorithm}
**Dataset:** ${meta.dataset}
**Author:** ${meta.author} — ${meta.organisation}

### Hyperparameters
- **Estimators (Trees):** \`${meta.n_estimators}\`
- **Max Tree Depth:** \`${meta.max_depth}\`
- **Learning Rate:** \`${meta.learning_rate}\`

### Performance Metrics
- **Cross-Validated ROC-AUC:** \`${meta.cv_roc_auc_mean?.toFixed(4)}\` ± \`${meta.cv_roc_auc_std?.toFixed(4)}\`
- **Cross-Validated F1:** \`${meta.cv_f1_mean?.toFixed(4)}\`
- **Holdout Test ROC-AUC:** \`${meta.test_roc_auc?.toFixed(4)}\`
- **Holdout Test F1:** \`${meta.test_f1?.toFixed(4)}\`

### Data Split
- **Training samples:** ${meta.train_samples}
- **Test samples:** ${meta.test_samples}
- **Total features:** ${meta.n_features}

*Model serialised with joblib and served via FastAPI PredictorService.*`;
}

function genShapExplanation(): string {
  return `### How SHAP Works in This Model

**SHAP** (SHapley Additive exPlanations) decomposes each prediction into individual feature contributions with mathematical guarantees.

### Core Concepts
- **Base value:** The model's expected output across all training data (log-odds intercept)
- **SHAP value > 0:** Feature pushes this employee **toward** attrition (increases log-odds)
- **SHAP value < 0:** Feature pushes this employee **away from** attrition (reduces log-odds)
- **Sum property:** \`base_value + Σ SHAP_i = model raw output\`

### Implementation
This app uses \`shap.TreeExplainer\` which computes **exact** SHAP values by traversing each decision tree path — no kernel approximations. The output is in log-odds space, which we convert to probability via:
\`P = sigmoid(raw_output) = 1 / (1 + e^{-output})\`

### Why SHAP Over Feature Importance?
Global feature importance averages across all employees — it cannot explain *why this specific person* is at risk. SHAP gives a **local, additive explanation** unique to each employee's feature vector.

*Select an employee and ask "Why is [name] at risk?" to see their specific SHAP breakdown.*`;
}

function genFeatureList(meta: any): string {
  if (!meta?.feature_names) return "### Features\n\nModel metadata not available.";
  const numeric = meta.feature_names.filter((f: string) =>
    !["BusinessTravel","Department","EducationField","Gender","JobRole","MaritalStatus","OverTime"].includes(f)
  );
  const categorical = ["BusinessTravel","Department","EducationField","Gender","JobRole","MaritalStatus"];
  const featureList = numeric.map((f: string) => `- \`${f}\``).join("\n");
  const catList = categorical.map(f => `- \`${f}\``).join("\n");
  return `### Model Feature Vector (${meta.n_features} Variables)

### Numeric Features (${numeric.length})
${featureList}

### Categorical Features (${categorical.length})
${catList}

### Binary Feature
- \`OverTime\` — encoded as \`0\` (No) or \`1\` (Yes) via FunctionTransformer

The preprocessor applies **StandardScaler** to numeric features and **OneHotEncoder** to categorical features before passing to the GBDT classifier.`;
}

function genPredictionSummary(p: EmpPrediction): string {
  const pct = Math.round(p.probability * 100);
  const f = p.features;
  return `### Prediction Summary — ${p.name}

**Model Output:** ${p.prediction} (attrition) | **Probability:** **${pct}%**
**Base Rate (log-odds):** \`${p.baseValue.toFixed(4)}\`

### Key Profile Values
- Age: **${f.age}** | Monthly Income: **$${f.monthlyIncome.toLocaleString()}**
- Overtime: **${f.overTime === 1 ? "Yes" : "No"}** | Distance from Home: **${f.distanceFromHome} km**
- Job Satisfaction: **${f.jobSatisfaction}/4** | Work-Life Balance: **${f.workLifeBalance}/4**
- Years at Company: **${f.yearsAtCompany}** | Years Since Promotion: **${f.yearsSinceLastPromotion}**
- Stock Option Level: **${f.stockOptionLevel}/3** | Env. Satisfaction: **${f.environmentSatisfaction}/4**

Ask **"Why is ${p.name} at risk?"** to see the SHAP feature attributions, or **"How to retain ${p.name}?"** for intervention recommendations.`;
}

function genDefaultHelp(selectedEmp: EmpPrediction | null): string {
  if (selectedEmp) {
    return `### What Can I Help You With?

I have **${selectedEmp.name}**'s prediction loaded (\`${Math.round(selectedEmp.probability * 100)}%\` risk). Try asking:

- **"Why is ${selectedEmp.name} at risk?"** — SHAP feature attribution breakdown
- **"How can we retain ${selectedEmp.name}?"** — Prioritised intervention playbook
- **"Show prediction summary"** — Full prediction details and profile values
- **"Explain SHAP"** — How explainability works in this model
- **"What are the model parameters?"** — GBDT hyperparameters and metrics`;
  }
  return `### Retention Co-Pilot — Help

I can explain the **model.pkl** predictions and SHAP attributions. Try:

- **"Explain the GBDT model"** — Algorithm, hyperparameters, and performance metrics
- **"How does SHAP work?"** — TreeExplainer explainability concepts
- **"What features does the model use?"** — Full 30-feature variable list
- **Select an employee** from the dropdown to get their personal SHAP breakdown and retention playbook`;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RetentionChatbot({ employees, activeEmployeeId, onSelectEmployee }: RetentionChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: "welcome-msg",
    role: "model",
    text: "### Retention Co-Pilot — Ready\nI explain predictions from `model.pkl` using real SHAP values via `shap.TreeExplainer`.\n\nSelect an employee from the dropdown to load their prediction, or ask about the GBDT model and SHAP methodology.",
    timestamp: new Date()
  }]);
  const [inputMessage, setInputMessage] = useState("");
  const [selectedEmpId, setSelectedEmpId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [empPrediction, setEmpPrediction] = useState<EmpPrediction | null>(null);
  const [modelMeta, setModelMeta] = useState<any>(null);
  const [isFetchingPrediction, setIsFetchingPrediction] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load model metadata once
  useEffect(() => {
    fetch("http://127.0.0.1:8000/metadata")
      .then(r => r.json())
      .then(d => { if (d.success) setModelMeta(d.metadata); })
      .catch(() => {});
  }, []);

  // Sync active employee from parent
  useEffect(() => {
    if (activeEmployeeId && activeEmployeeId !== selectedEmpId) {
      setSelectedEmpId(activeEmployeeId);
      setIsOpen(true);
    }
  }, [activeEmployeeId]);

  // Fetch prediction from FastAPI when employee changes
  useEffect(() => {
    if (!selectedEmpId) {
      setEmpPrediction(null);
      return;
    }

    setIsFetchingPrediction(true);

    fetch("/api/employees")
      .then(r => r.json())
      .then(async (data) => {
        const fullEmp = data.employees?.find((e: any) => e.id === selectedEmpId);
        if (!fullEmp) return;

        const res = await fetch("http://127.0.0.1:8000/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            features: fullEmp.features,
            context: {
              department: fullEmp.department,
              jobRole: fullEmp.jobRole,
              maritalStatus: "Single",
              businessTravel: "Travel_Rarely",
              jobInvolvement: 3,
              numCompaniesWorked: 2,
              trainingTimesLastYear: 3,
              relationshipSatisfaction: 3,
            }
          })
        });

        const pred = await res.json();
        const ep: EmpPrediction = {
          ...pred,
          name: fullEmp.name,
          jobRole: fullEmp.jobRole,
          department: fullEmp.department,
          features: fullEmp.features,
        };
        setEmpPrediction(ep);

        const pct = Math.round(pred.probability * 100);
        const riskLabel = pred.probability > 0.7 ? "HIGH" : pred.probability > 0.4 ? "MEDIUM" : "LOW";
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.text.includes(`Loaded prediction for **${fullEmp.name}**`)) return prev;
          return [...prev, {
            id: `focus-${Date.now()}`,
            role: "model" as const,
            text: `### Context Loaded\nLoaded prediction for **${fullEmp.name}** (${fullEmp.jobRole}).\n\n**Probability:** ${pct}% | **Risk Level:** ${riskLabel}\n\nAsk *"Why is ${fullEmp.name} at risk?"* or *"How can we retain them?"*`,
            timestamp: new Date()
          }];
        });
      })
      .catch(() => setEmpPrediction(null))
      .finally(() => setIsFetchingPrediction(false));
  }, [selectedEmpId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Click outside dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setIsDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Local response generator ──────────────────────────────────────────────

  const generateResponse = (message: string): string => {
    const q = message.toLowerCase();

    // Employee-specific
    if (empPrediction) {
      if (/why|risk|factor|shap|driver|attribut|contribut|explain predict/.test(q))
        return genRiskBreakdown(empPrediction);
      if (/retain|action|recommend|playbook|help|intervention|strateg|how.*keep|how.*stop/.test(q))
        return genRetentionPlaybook(empPrediction);
      if (/predict|probabilit|score|percentag|chance|result|output/.test(q))
        return genPredictionSummary(empPrediction);
    }

    // Model & methodology
    if (/model|gbdt|gradient|boost|algorithm|hyperpar|accura|auc|roc|perform|train|estimator|depth|learning rate/.test(q))
      return genModelInfo(modelMeta);
    if (/shap|explain|interpret|attribut|base.?value|shapley/.test(q))
      return genShapExplanation();
    if (/feature|variable|predictor|important|column|input|30/.test(q))
      return genFeatureList(modelMeta);

    return genDefaultHelp(empPrediction);
  };

  // ── Message handler ───────────────────────────────────────────────────────

  const handleSendMessage = async (textToSend?: string) => {
    const messageText = (textToSend || inputMessage).trim();
    if (!messageText || isLoading) return;

    setInputMessage("");
    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`, role: "user", text: messageText, timestamp: new Date()
    }]);
    setIsLoading(true);

    // Slight delay for natural feel
    await new Promise(r => setTimeout(r, 350));

    const reply = generateResponse(messageText);
    setMessages(prev => [...prev, {
      id: `reply-${Date.now()}`, role: "model", text: reply, timestamp: new Date()
    }]);
    setIsLoading(false);
  };

  const handleEmployeeSelect = (empId: string) => {
    setSelectedEmpId(empId);
    setIsDropdownOpen(false);
    if (onSelectEmployee && empId !== "") onSelectEmployee(empId);
  };

  const selectedEmp = employees.find(e => e.id === selectedEmpId);

  const quickQuestions = selectedEmp
    ? [
        { text: `Why is ${selectedEmp.name} at risk?`, icon: <TrendingUp className="w-3.5 h-3.5" /> },
        { text: `How can we retain ${selectedEmp.name}?`, icon: <Brain className="w-3.5 h-3.5" /> },
        { text: "What are the model parameters?", icon: <Sliders className="w-3.5 h-3.5" /> },
      ]
    : [
        { text: "Explain the GBDT model", icon: <Sliders className="w-3.5 h-3.5" /> },
        { text: "How does SHAP work?", icon: <HelpCircle className="w-3.5 h-3.5" /> },
        { text: "What features does the model use?", icon: <TrendingUp className="w-3.5 h-3.5" /> },
      ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans" id="retention-copilot-container">
      <AnimatePresence>
        {!isOpen ? (
          <motion.button
            key="launcher-button"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white rounded-full flex items-center justify-center shadow-xl hover:shadow-indigo-500/35 transition cursor-pointer group border border-indigo-500/30 relative"
            title="Open Retention Co-Pilot"
          >
            <span className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping pointer-events-none" />
            <MessageSquare className="w-6 h-6 group-hover:scale-110 transition duration-300" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 text-[9px] text-white font-extrabold items-center justify-center">AI</span>
            </span>
          </motion.button>
        ) : (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-96 sm:w-[410px] h-[590px] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-indigo-500/20 border border-indigo-500/35 text-indigo-400 rounded-lg">
                  <Brain className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider font-display flex items-center gap-1.5">
                    Retention Co-Pilot
                    <span className="text-[9px] bg-emerald-500 text-slate-950 font-extrabold px-1.5 rounded font-mono">ONLINE</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">model.pkl · SHAP TreeExplainer · Local</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Employee selector */}
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0 relative z-20">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider shrink-0">
                Context:
              </span>
              <div className="relative flex-1" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-left text-xs text-slate-800 font-semibold flex items-center justify-between cursor-pointer hover:border-indigo-400 transition"
                >
                  <span className="truncate flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-500" />
                    {isFetchingPrediction
                      ? "Loading prediction..."
                      : selectedEmp
                        ? `${selectedEmp.name} (${selectedEmp.jobRole})`
                        : "General — No profile selected"}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition ${isDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="absolute left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl z-30 py-1"
                    >
                      <button
                        onClick={() => handleEmployeeSelect("")}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 ${selectedEmpId === "" ? "bg-indigo-50/50 text-indigo-700 font-bold" : "text-slate-600"}`}
                      >
                        <Sliders className="w-3.5 h-3.5 text-slate-400" />
                        General Model & SHAP Explanations
                      </button>
                      {employees.map(emp => {
                        const riskVal = emp.riskProbability ? Math.round(emp.riskProbability * 100) : null;
                        return (
                          <button
                            key={emp.id}
                            onClick={() => handleEmployeeSelect(emp.id)}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between ${selectedEmpId === emp.id ? "bg-indigo-50/50 text-indigo-700 font-bold" : "text-slate-600"}`}
                          >
                            <span className="truncate flex items-center gap-2">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span className="truncate">{emp.name} ({emp.jobRole})</span>
                            </span>
                            {riskVal !== null && (
                              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-sm shrink-0 font-extrabold ${
                                riskVal >= 70 ? "bg-rose-50 text-rose-600" : riskVal >= 40 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                              }`}>
                                {riskVal}%
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Chat history */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/40 relative z-10">
              {messages.map(msg => {
                const isModel = msg.role === "model";
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 max-w-[88%] ${isModel ? "mr-auto" : "ml-auto flex-row-reverse"}`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border shadow-xs ${
                      isModel ? "bg-indigo-50 text-indigo-600 border-indigo-100" : "bg-slate-900 text-white border-slate-950"
                    }`}>
                      {isModel ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>
                    <div className={`p-3 rounded-2xl text-xs shadow-xs ${
                      isModel ? "bg-white text-slate-800 border border-slate-200/60 rounded-tl-none" : "bg-indigo-600 text-white rounded-tr-none"
                    }`}>
                      {isModel
                        ? <div className="space-y-1 font-sans">{formatMarkdown(msg.text)}</div>
                        : <p className="leading-relaxed break-words">{msg.text}</p>}
                      <span className={`text-[9px] block mt-1.5 font-mono ${isModel ? "text-slate-400" : "text-indigo-200"}`}>
                        {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex gap-2.5 max-w-[80%] mr-auto">
                  <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="p-3 bg-white border border-slate-200/60 rounded-2xl rounded-tl-none text-xs text-slate-500 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick questions */}
            <div className="px-4 py-2 bg-slate-50 border-t border-b border-slate-100 flex flex-wrap gap-1.5 shrink-0">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(q.text)}
                  disabled={isLoading || isFetchingPrediction}
                  className="flex items-center gap-1.5 px-2 py-1 bg-white hover:bg-indigo-50/50 border border-slate-200 text-[10px] text-slate-600 hover:text-indigo-700 rounded-md font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  {q.icon}
                  <span>{q.text}</span>
                </button>
              ))}
            </div>

            {/* Input */}
            <form
              onSubmit={e => { e.preventDefault(); handleSendMessage(); }}
              className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                placeholder={selectedEmp ? `Ask about ${selectedEmp.name}...` : "Ask about model, SHAP, features..."}
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                disabled={isLoading || isFetchingPrediction}
                className="flex-1 bg-slate-50/70 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading || isFetchingPrediction}
                className="w-8 h-8 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
