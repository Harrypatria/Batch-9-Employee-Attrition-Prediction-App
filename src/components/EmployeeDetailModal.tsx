/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Employee, EmployeeFeatures } from "../types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { X, Sparkles, Sliders, LineChart, FileText, CheckSquare, Plus, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";

interface EmployeeDetailModalProps {
  employee: Employee;
  onClose: () => void;
  onUpdateFeatures: (id: string, updated: EmployeeFeatures) => Promise<Employee>;
  onUpdateItdo: (id: string, itdoState: Partial<Employee>) => Promise<Employee>;
}

export default function EmployeeDetailModal({
  employee,
  onClose,
  onUpdateFeatures,
  onUpdateItdo,
}: EmployeeDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"diagnostic" | "sandbox" | "ai-consult">("diagnostic");
  const [currentEmp, setCurrentEmp] = useState<Employee>(employee);

  // Sandbox state
  const [sandboxFeatures, setSandboxFeatures] = useState<EmployeeFeatures>({ ...employee.features });
  const [isSimulating, setIsSimulating] = useState(false);

  // AI Advice state
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);

  // ITDO workflow execution state
  const [newOperation, setNewOperation] = useState("");
  const [itdoStatus, setItdoStatus] = useState(employee.itdoStatus || "Insight");
  const [decisionMade, setDecisionMade] = useState(employee.itdoDetails?.decisionMade || "");
  const [pendingOps, setPendingOps] = useState<string[]>(employee.itdoDetails?.operationsPending || []);
  const [completedOps, setCompletedOps] = useState<string[]>(employee.itdoDetails?.operationsCompleted || []);

  useEffect(() => {
    setCurrentEmp(employee);
    setSandboxFeatures({ ...employee.features });
    setItdoStatus(employee.itdoStatus || "Insight");
    setDecisionMade(employee.itdoDetails?.decisionMade || "");
    setPendingOps(employee.itdoDetails?.operationsPending || []);
    setCompletedOps(employee.itdoDetails?.operationsCompleted || []);
    setAiAnalysis("");
  }, [employee]);

  // Recalculate simulation state
  const handleSandboxChange = async (key: keyof EmployeeFeatures, value: number) => {
    const updatedFeatures = {
      ...sandboxFeatures,
      [key]: value,
    };
    setSandboxFeatures(updatedFeatures);
    
    // Auto-trigger simulation recalculation
    setIsSimulating(true);
    try {
      const response = await onUpdateFeatures(currentEmp.id, updatedFeatures);
      setCurrentEmp(response);
    } catch (err) {
      console.error("Simulation failed:", err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Fetch AI Retention advice
  const fetchAiAdvice = async () => {
    setIsLoadingAdvice(true);
    setAiAnalysis("");
    try {
      const response = await fetch(`/api/employees/${currentEmp.id}/gemini-consult`, {
        method: "POST",
      });
      const data = await response.json();
      if (data.success) {
        setAiAnalysis(data.analysis || data.fallback);
      } else {
        setAiAnalysis("Error generating consulting advice. Please verify your internet connection or API keys.");
      }
    } catch (err) {
      console.error("Failed to fetch advice:", err);
      setAiAnalysis("Error communicating with AI services.");
    } finally {
      setIsLoadingAdvice(false);
    }
  };

  // Update ITDO pipeline fields on the server
  const handleSaveItdo = async (newStatus = itdoStatus) => {
    try {
      const updated = await onUpdateItdo(currentEmp.id, {
        itdoStatus: newStatus as any,
        itdoDetails: {
          triggerAlert: currentEmp.itdoDetails?.triggerAlert || "",
          decisionMade: decisionMade,
          operationsPending: pendingOps,
          operationsCompleted: completedOps,
          lastUpdated: new Date().toISOString()
        }
      });
      setCurrentEmp(updated);
    } catch (err) {
      console.error("Failed to update ITDO workflow:", err);
    }
  };

  // Move individual tasks in ITDO
  const toggleOperationTask = (task: string, isComplete: boolean) => {
    if (isComplete) {
      // Move from Completed to Pending
      const updatedCompleted = completedOps.filter(t => t !== task);
      const updatedPending = [...pendingOps, task];
      setCompletedOps(updatedCompleted);
      setPendingOps(updatedPending);
      
      // Auto-save
      setTimeout(() => {
        onUpdateItdo(currentEmp.id, {
          itdoStatus: itdoStatus as any,
          itdoDetails: {
            triggerAlert: currentEmp.itdoDetails?.triggerAlert || "",
            decisionMade: decisionMade,
            operationsPending: updatedPending,
            operationsCompleted: updatedCompleted,
            lastUpdated: new Date().toISOString()
          }
        }).then(res => setCurrentEmp(res));
      }, 50);
    } else {
      // Move from Pending to Completed
      const updatedPending = pendingOps.filter(t => t !== task);
      const updatedCompleted = [...completedOps, task];
      setPendingOps(updatedPending);
      setCompletedOps(updatedCompleted);
      
      // Auto-save
      setTimeout(() => {
        onUpdateItdo(currentEmp.id, {
          itdoStatus: itdoStatus as any,
          itdoDetails: {
            triggerAlert: currentEmp.itdoDetails?.triggerAlert || "",
            decisionMade: decisionMade,
            operationsPending: updatedPending,
            operationsCompleted: updatedCompleted,
            lastUpdated: new Date().toISOString()
          }
        }).then(res => setCurrentEmp(res));
      }, 50);
    }
  };

  const handleAddOperationTask = () => {
    if (!newOperation.trim()) return;
    const updatedPending = [...pendingOps, newOperation.trim()];
    setPendingOps(updatedPending);
    setNewOperation("");

    onUpdateItdo(currentEmp.id, {
      itdoStatus: itdoStatus as any,
      itdoDetails: {
        triggerAlert: currentEmp.itdoDetails?.triggerAlert || "",
        decisionMade: decisionMade,
        operationsPending: updatedPending,
        operationsCompleted: completedOps,
        lastUpdated: new Date().toISOString()
      }
    }).then(res => setCurrentEmp(res));
  };

  // Convert raw SHAP attributions into a standard horizontal waterfall chart dataset
  const prepareWaterfallData = () => {
    const rawShap = currentEmp.shapValues || {};
    // Sort drivers by absolute impact
    const sortedFeatures = Object.entries(rawShap)
      .map(([feat, val]) => ({ feat, val: val as number }))
      .sort((a, b) => Math.abs(b.val) - Math.abs(a.val));

    // Base rate is approximately the model baseline (e.g. 23.5% based on overall cohort metrics)
    // For visual precision, we start from a standardized 24% baseline rate
    const baseProb = 0.24; 
    const finalProb = currentEmp.riskProbability || 0.1;
    
    // We scale the individual attributions slightly so they sum up perfectly from baseline to final
    const rawSum = sortedFeatures.reduce((acc, curr) => acc + curr.val, 0);
    const probDiff = finalProb - baseProb;
    const scalingFactor = Math.abs(rawSum) > 0 ? probDiff / rawSum : 1;

    let currentLevel = baseProb;
    const chartData = [
      {
        name: "Base Model Rate",
        start: 0,
        end: baseProb,
        val: baseProb,
        displayVal: `${(baseProb * 100).toFixed(0)}%`,
        type: "base"
      }
    ];

    const featureLabelMap: Record<string, string> = {
      overTime: "Overtime Req.",
      workLifeBalance: "Work-Life Balance",
      jobSatisfaction: "Job Satisfaction",
      environmentSatisfaction: "Env. Satisfaction",
      monthlyIncome: "Monthly Income",
      distanceFromHome: "Commute Distance",
      yearsSinceLastPromotion: "Promotion Stagnation",
      stockOptionLevel: "Equity/Stock level",
      yearsInCurrentRole: "Role Tenure",
      yearsAtCompany: "Company Tenure",
      age: "Age Index"
    };

    sortedFeatures.forEach((item) => {
      const scaledVal = item.val * scalingFactor;
      const start = currentLevel;
      const end = currentLevel + scaledVal;
      
      chartData.push({
        name: featureLabelMap[item.feat] || item.feat,
        start: Math.min(start, end),
        end: Math.max(start, end),
        val: scaledVal,
        displayVal: `${scaledVal >= 0 ? "+" : ""}${(scaledVal * 100).toFixed(1)}%`,
        type: scaledVal >= 0 ? "positive" : "negative"
      });
      
      currentLevel = end;
    });

    chartData.push({
      name: "Final Prediction",
      start: 0,
      end: finalProb,
      val: finalProb,
      displayVal: `${(finalProb * 100).toFixed(0)}%`,
      type: "final"
    });

    return chartData;
  };

  const waterfallData = prepareWaterfallData();
  const currentRisk = currentEmp.riskProbability || 0;

  // Render markdown text to JSX simply and elegantly
  const renderMarkdownText = (text: string) => {
    if (!text) return null;
    return text.split("\n").map((line, idx) => {
      if (line.startsWith("###")) {
        return <h4 key={idx} className="text-sm font-bold text-gray-900 font-display mt-5 mb-2 uppercase tracking-wide border-b border-gray-100 pb-1">{line.replace("###", "").trim()}</h4>;
      }
      if (line.startsWith("##")) {
        return <h3 key={idx} className="text-base font-bold text-gray-900 font-display mt-6 mb-3 border-b border-gray-200 pb-1.5">{line.replace("##", "").trim()}</h3>;
      }
      if (line.startsWith("- [ ]") || line.startsWith("- [x]") || line.startsWith("- [X]")) {
        const checked = line.includes("[x]") || line.includes("[X]");
        return (
          <div key={idx} className="flex items-center space-x-2 my-1.5 font-sans text-xs text-gray-600">
            <input type="checkbox" checked={checked} readOnly className="rounded border-gray-300 text-blue-600" />
            <span>{line.replace(/^- \[[xX ]\]/, "").trim()}</span>
          </div>
        );
      }
      if (line.startsWith("-") || line.startsWith("*")) {
        return <li key={idx} className="ml-4 list-disc font-sans text-xs text-gray-600 my-1">{line.replace(/^[-*]\s*/, "").trim()}</li>;
      }
      if (line.trim().match(/^\d+\./)) {
        return <li key={idx} className="ml-4 list-decimal font-sans text-xs text-gray-600 my-1">{line.replace(/^\d+\.\s*/, "").trim()}</li>;
      }
      if (line.trim() === "") return <div key={idx} className="h-2" />;
      return <p key={idx} className="text-xs text-gray-600 leading-relaxed my-1 font-sans">{line}</p>;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4" id="employee-detail-modal">
      <div className="bg-white rounded border border-slate-350 shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 flex items-start justify-between bg-slate-50/45">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black text-slate-500 font-mono uppercase bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                {currentEmp.id}
              </span>
              <span className="text-xs text-slate-400 font-sans uppercase tracking-wider font-semibold">{currentEmp.department} Department</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 font-display mt-1">{currentEmp.name}</h2>
            <p className="text-xs text-slate-500 font-sans font-medium mt-0.5">{currentEmp.jobRole} • {currentEmp.email}</p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">ATTRITION RISK PROBABILITY</span>
              <span className={`text-3xl font-black font-mono ${currentRisk > 0.7 ? "text-rose-600 animate-pulse" : currentRisk > 0.3 ? "text-amber-500" : "text-emerald-600"}`}>
                {(currentRisk * 100).toFixed(0)}%
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded border border-slate-200 bg-white text-slate-400 hover:text-slate-900 hover:shadow-xs transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-6">
          <button
            onClick={() => setActiveTab("diagnostic")}
            className={`py-3.5 px-1 mr-6 text-xs font-bold uppercase tracking-wider flex items-center space-x-2 border-b-2 transition cursor-pointer ${
              activeTab === "diagnostic"
                ? "border-indigo-600 text-slate-900 font-extrabold"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <LineChart className="w-4 h-4" />
            <span>Diagnostic & SHAP Waterfall</span>
          </button>
          
          <button
            onClick={() => setActiveTab("sandbox")}
            className={`py-3.5 px-1 mr-6 text-xs font-bold uppercase tracking-wider flex items-center space-x-2 border-b-2 transition cursor-pointer ${
              activeTab === "sandbox"
                ? "border-indigo-600 text-slate-900 font-extrabold"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Intervention Sandbox</span>
          </button>

          <button
            onClick={() => setActiveTab("ai-consult")}
            className={`py-3.5 px-1 text-xs font-bold uppercase tracking-wider flex items-center space-x-2 border-b-2 transition cursor-pointer ${
              activeTab === "ai-consult"
                ? "border-indigo-600 text-slate-900 font-extrabold"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Advisor (ITDO Framework)</span>
          </button>
        </div>

        {/* Modal Content Panels */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/15">
          
          {/* TAB 1: DIAGNOSTIC WORKSPACE */}
          {activeTab === "diagnostic" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-150">
              
              {/* Waterfall Plot Column */}
              <div className="lg:col-span-2 bg-white p-5 rounded border border-slate-200 shadow-xs flex flex-col justify-between" id="shap-waterfall-card">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-indigo-600 font-bold block mb-1">Local SHAP Waterfall Explanation</span>
                  <h3 className="text-base font-black text-slate-900 font-display uppercase tracking-tight mb-1">Impact Deconstruction Breakdown</h3>
                  <p className="text-xs text-slate-400 font-sans mb-4">
                    Deconstruction of local feature impact pulling probability above/below baseline
                  </p>
                </div>

                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={waterfallData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 15, bottom: 5 }}
                    >
                      <XAxis type="number" domain={[0, 1]} tickFormatter={(val) => `${(val * 100).toFixed(0)}%`} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#334155", fontSize: 9, fontFamily: "Inter" }}
                        width={120}
                      />
                      <Tooltip
                        formatter={(value: any, name: any, props: any) => {
                          return [props.payload.displayVal, "Prediction Impact"];
                        }}
                        contentStyle={{ fontSize: "11px", fontFamily: "Inter" }}
                      />
                      <ReferenceLine x={0.24} stroke="#cbd5e1" strokeDasharray="3 3" />
                      <Bar dataKey="end" radius={2}>
                        {waterfallData.map((entry, index) => {
                          const isPositive = entry.type === "positive";
                          const isBase = entry.type === "base";
                          const isFinal = entry.type === "final";
                          
                          let fill = "#10b981"; // Negative pulls risk down
                          if (isPositive) fill = "#f43f5e"; // Positive pushes risk up
                          if (isBase) fill = "#94a3b8"; // Grey baseline
                          if (isFinal) fill = currentRisk > 0.7 ? "#f43f5e" : currentRisk > 0.3 ? "#f59e0b" : "#10b981";

                          return (
                            <Cell
                              key={`cell-${index}`}
                              fill={fill}
                              // Creating floating range effect by passing [start, end]
                              x={entry.start}
                              width={entry.end - entry.start}
                            />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-sans mt-4 border-t border-slate-100 pt-3 font-semibold uppercase tracking-wider text-[9px]">
                  <div className="flex items-center space-x-1">
                    <div className="w-2.5 h-2.5 rounded bg-[#f43f5e]" />
                    <span>Pushes Risk UP (Friction)</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2.5 h-2.5 rounded bg-[#10b981]" />
                    <span>Pulls Risk DOWN (Anchor)</span>
                  </div>
                  <span className="font-mono">Baseline Rate: 24%</span>
                </div>
              </div>

              {/* Roster Profile and Stats Block */}
              <div className="space-y-6">
                <div className="bg-white p-5 rounded border border-slate-200 shadow-xs">
                  <h4 className="text-xs font-black text-slate-800 font-display uppercase tracking-wider mb-4">Key Predictive Factors</h4>
                  <div className="space-y-3.5">
                    <div className="flex justify-between items-center text-xs font-sans">
                      <span className="text-slate-400 font-semibold">Monthly Compensation</span>
                      <span className="font-bold text-slate-800 font-mono">${currentEmp.features.monthlyIncome.toLocaleString()}/mo</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-sans">
                      <span className="text-slate-400 font-semibold">Overtime Requirement</span>
                      <span className={`px-2 py-0.5 rounded border font-bold text-[10px] ${currentEmp.features.overTime === 1 ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
                        {currentEmp.features.overTime === 1 ? "YES" : "NO"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-sans">
                      <span className="text-slate-400 font-semibold">Work-Life Balance</span>
                      <span className="font-bold text-slate-800">{currentEmp.features.workLifeBalance}/4</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-sans">
                      <span className="text-slate-400 font-semibold">Job Satisfaction</span>
                      <span className="font-bold text-slate-800">{currentEmp.features.jobSatisfaction}/4</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-sans">
                      <span className="text-slate-400 font-semibold">Commute Distance</span>
                      <span className="font-bold text-slate-800">{currentEmp.features.distanceFromHome} miles</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-sans">
                      <span className="text-slate-400 font-semibold">Years in Current Role</span>
                      <span className="font-bold text-slate-800">{currentEmp.features.yearsInCurrentRole} yrs</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded border border-slate-200 shadow-xs">
                  <h4 className="text-xs font-black text-slate-800 font-display uppercase tracking-wider mb-2">Model Health Profile</h4>
                  <p className="text-[11px] text-slate-400 font-sans leading-relaxed mb-3">
                    This local prediction path is generated dynamically using a server-side ensemble of Decision Trees.
                  </p>
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200 font-mono text-[10px] text-slate-600 space-y-1">
                    <div>Ensemble Size: 18 Trees</div>
                    <div>Prediction Engine: Binomial GBDT</div>
                    <div>Explainability: Path-based Saabas</div>
                    <div>Local Margin: +{(currentRisk - 0.24).toFixed(2)} vs. Cohort Mean</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INTERVENTION SANDBOX */}
          {activeTab === "sandbox" && (
            <div className="bg-white p-6 rounded border border-slate-200 shadow-xs space-y-6 animate-in fade-in duration-150" id="sandbox-simulator">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-indigo-600 font-bold block mb-1">Interactive Sandbox Simulator</span>
                  <h3 className="text-lg font-black text-slate-900 font-display uppercase tracking-tight mb-1">Real-time What-If Projection</h3>
                  <p className="text-xs text-slate-400 font-sans">
                    Adjust features in real-time to observe the impact on prediction probability and the local SHAP waterfall.
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded border border-slate-200 flex items-center space-x-3.5 w-full md:w-auto">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recalculated Risk:</div>
                  <div className="flex items-baseline space-x-1.5">
                    <span className={`text-2xl font-black font-mono ${currentRisk > 0.7 ? "text-rose-600 animate-pulse" : currentRisk > 0.3 ? "text-amber-500" : "text-emerald-600"}`}>
                      {(currentRisk * 100).toFixed(0)}%
                    </span>
                    {isSimulating && <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />}
                  </div>
                </div>
              </div>

              {/* Sliders Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                
                {/* Monthly Income */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-sans">
                    <span className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Monthly Compensation Level</span>
                    <span className="font-black text-slate-950 font-mono">${sandboxFeatures.monthlyIncome.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="2500"
                    max="20000"
                    step="250"
                    value={sandboxFeatures.monthlyIncome}
                    onChange={(e) => handleSandboxChange("monthlyIncome", parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-100 rounded appearance-none cursor-pointer accent-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 font-sans">Simulate salary reviews or market parity index adjustments</span>
                </div>

                {/* Overtime */}
                <div className="space-y-1.5 flex flex-col justify-between">
                  <div className="flex justify-between items-center text-xs font-sans">
                    <span className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Overtime Requirements</span>
                    <span className="font-bold text-slate-900 font-sans">
                      {sandboxFeatures.overTime === 1 ? "Active Requirement" : "No Overtime"}
                    </span>
                  </div>
                  <div className="flex space-x-2 mt-1">
                    <button
                      type="button"
                      onClick={() => handleSandboxChange("overTime", 0)}
                      className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded border cursor-pointer transition ${
                        sandboxFeatures.overTime === 0
                          ? "bg-slate-950 border-slate-950 text-white shadow-xs"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Disable Overtime
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSandboxChange("overTime", 1)}
                      className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded border cursor-pointer transition ${
                        sandboxFeatures.overTime === 1
                          ? "bg-rose-600 border-rose-600 text-white shadow-xs"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Require Overtime
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 font-sans block mt-1">Simulate capacity caps or on-call adjustments</span>
                </div>

                {/* Work Life Balance */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-sans">
                    <span className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Work-Life Balance Score</span>
                    <span className="font-black text-slate-900 font-sans">{sandboxFeatures.workLifeBalance}/4</span>
                  </div>
                  <div className="flex space-x-2 mt-1">
                    {[1, 2, 3, 4].map((score) => (
                      <button
                        key={score}
                        type="button"
                        onClick={() => handleSandboxChange("workLifeBalance", score)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded border cursor-pointer transition ${
                          sandboxFeatures.workLifeBalance === score
                            ? "bg-slate-950 border-slate-950 text-white shadow-xs"
                            : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400 font-sans">1: Poor, 2: Fair, 3: Good, 4: Excellent</span>
                </div>

                {/* Job Satisfaction */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-sans">
                    <span className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Job Satisfaction Score</span>
                    <span className="font-black text-slate-900 font-sans">{sandboxFeatures.jobSatisfaction}/4</span>
                  </div>
                  <div className="flex space-x-2 mt-1">
                    {[1, 2, 3, 4].map((score) => (
                      <button
                        key={score}
                        type="button"
                        onClick={() => handleSandboxChange("jobSatisfaction", score)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded border cursor-pointer transition ${
                          sandboxFeatures.jobSatisfaction === score
                            ? "bg-slate-950 border-slate-950 text-white shadow-xs"
                            : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400 font-sans">1: Disgruntled, 2: Indifferent, 3: Satisfied, 4: Passionate</span>
                </div>

                {/* Commute Distance */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-sans">
                    <span className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Commute Distance (Miles)</span>
                    <span className="font-black text-slate-950 font-mono">{sandboxFeatures.distanceFromHome} mi</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    value={sandboxFeatures.distanceFromHome}
                    onChange={(e) => handleSandboxChange("distanceFromHome", parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-100 rounded appearance-none cursor-pointer accent-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 font-sans">Simulate shifting to remote or hybrid office programs</span>
                </div>

                {/* Stock Option Level */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-sans">
                    <span className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Equity & Stock Options Level</span>
                    <span className="font-black text-slate-950 font-sans">{sandboxFeatures.stockOptionLevel}/3</span>
                  </div>
                  <div className="flex space-x-2 mt-1">
                    {[0, 1, 2, 3].map((score) => (
                      <button
                        key={score}
                        type="button"
                        onClick={() => handleSandboxChange("stockOptionLevel", score)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded border cursor-pointer transition ${
                          sandboxFeatures.stockOptionLevel === score
                            ? "bg-slate-950 border-slate-950 text-white shadow-xs"
                            : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        L{score}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400 font-sans">Simulate stock grant grants or equity retention hooks</span>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: AI ADVISOR (ITDO FRAMEWORK) */}
          {activeTab === "ai-consult" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-150">
              
              {/* Left Column: Gemini Advisor */}
              <div className="bg-white p-5 rounded border border-slate-200 shadow-xs flex flex-col justify-between" id="ai-advisor-panel">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-black text-slate-900 font-display uppercase tracking-wider">AI Executive Advisor</h3>
                  </div>
                  <button
                    onClick={fetchAiAdvice}
                    disabled={isLoadingAdvice}
                    className="inline-flex items-center space-x-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold uppercase tracking-wider text-[10px] px-3 py-1.5 rounded border border-indigo-200 shadow-xs transition disabled:opacity-50 cursor-pointer"
                  >
                    {isLoadingAdvice ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Reviewing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Generate Advisory</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex-1 mt-4 space-y-3 min-h-[300px]">
                  {isLoadingAdvice ? (
                    <div className="h-full flex flex-col justify-center items-center py-20 text-center space-y-3">
                      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                      <p className="text-xs text-slate-400 font-sans max-w-xs leading-relaxed font-semibold">
                        Gemini is reviewing this profile, evaluating split paths, and drafting a bespoke ITDO retention strategy...
                      </p>
                    </div>
                  ) : aiAnalysis ? (
                    <div className="prose prose-sm max-w-none text-slate-800">
                      {renderMarkdownText(aiAnalysis)}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col justify-center items-center py-20 text-center border border-dashed border-slate-200 rounded bg-slate-50/20">
                      <FileText className="w-8 h-8 text-slate-300" />
                      <p className="text-xs font-black text-slate-500 font-sans mt-3 uppercase tracking-wider">Retention Report Draft Ready</p>
                      <p className="text-[11px] text-slate-400 font-sans mt-1 max-w-xs leading-relaxed">
                        Click 'Generate Advisory' above to query Gemini or run local path diagnostics and compile structured ITDO recommendations.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: ITDO Workflow Execution */}
              <div className="bg-white p-5 rounded border border-slate-200 shadow-xs flex flex-col justify-between" id="itdo-pipeline-panel">
                <div>
                  <h3 className="text-sm font-black text-slate-900 font-display uppercase tracking-wider mb-1">Pipeline Workflow Execution</h3>
                  <p className="text-xs text-slate-400 font-sans mb-4">
                    Coordinate and execute organizational decision tasks for retention
                  </p>

                  {/* Status Stages Row */}
                  <div className="grid grid-cols-5 gap-1 text-center bg-slate-50 p-1 rounded border border-slate-200 mb-5">
                    {["Insight", "Trigger", "Decision", "Operation", "Resolved"].map((stage, idx) => {
                      const isActive = itdoStatus === stage;
                      const activeColors = stage === "Resolved" ? "bg-emerald-600 text-white font-extrabold" : "bg-slate-950 text-white font-extrabold";
                      return (
                        <button
                          key={stage}
                          type="button"
                          onClick={() => {
                            setItdoStatus(stage);
                            handleSaveItdo(stage);
                          }}
                          className={`py-1.5 rounded text-[9px] uppercase tracking-wider font-bold font-sans transition cursor-pointer ${
                            isActive
                              ? `${activeColors} shadow-xs`
                              : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          }`}
                        >
                          {stage}
                        </button>
                      );
                    })}
                  </div>

                  {/* Decision Form Block */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest font-sans">
                        Strategic Decision Made
                      </label>
                      <textarea
                        value={decisionMade}
                        onChange={(e) => setDecisionMade(e.target.value)}
                        placeholder="Write down the strategic retention decision (e.g., approved a 12% compensation bump, moved to hybrid schedule, capped weekly hours to 40h)..."
                        className="w-full text-xs border border-slate-250 rounded p-2.5 bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-sans h-20 resize-none font-medium text-slate-800"
                      />
                      <button
                        onClick={() => handleSaveItdo()}
                        className="mt-1 bg-slate-950 hover:bg-slate-800 text-white font-bold uppercase tracking-wider text-[9px] px-3 py-1.5 rounded transition cursor-pointer font-sans"
                      >
                        Save Decision
                      </button>
                    </div>

                    {/* Operational Task Coordinator */}
                    <div className="space-y-2 pt-3 border-t border-slate-100">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest font-sans">
                        Tactical Operations Checklist ({completedOps.length}/{pendingOps.length + completedOps.length})
                      </label>
                      
                      {/* Active Pending Tasks */}
                      <div className="space-y-1.5 max-h-44 overflow-y-auto">
                        {pendingOps.map((task) => (
                          <div
                            key={task}
                            onClick={() => toggleOperationTask(task, false)}
                            className="flex items-center space-x-2.5 bg-slate-50 hover:bg-slate-100/60 p-2 rounded border border-slate-200 text-xs text-slate-700 cursor-pointer font-sans transition font-semibold"
                          >
                            <div className="w-4 h-4 rounded border border-slate-300 bg-white" />
                            <span>{task}</span>
                          </div>
                        ))}

                        {/* Completed Tasks */}
                        {completedOps.map((task) => (
                          <div
                            key={task}
                            onClick={() => toggleOperationTask(task, true)}
                            className="flex items-center space-x-2.5 bg-emerald-50/40 p-2 rounded border border-emerald-100 text-xs text-emerald-800 cursor-pointer font-sans transition font-semibold"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="line-through">{task}</span>
                          </div>
                        ))}

                        {pendingOps.length === 0 && completedOps.length === 0 && (
                          <p className="text-[11px] text-slate-400 italic">No operational steps defined for this level.</p>
                        )}
                      </div>

                      {/* Add Task Input */}
                      <div className="flex space-x-2 pt-1.5">
                        <input
                          type="text"
                          value={newOperation}
                          onChange={(e) => setNewOperation(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddOperationTask();
                          }}
                          placeholder="Define next operational task step..."
                          className="flex-1 text-xs border border-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans bg-white text-slate-800 font-medium"
                        />
                        <button
                          type="button"
                          onClick={handleAddOperationTask}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded p-1.5 transition cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 mt-4 border-t border-slate-100 pt-3 text-right font-mono font-bold uppercase tracking-wider">
                  Last updated: {currentEmp.itdoDetails?.lastUpdated ? new Date(currentEmp.itdoDetails.lastUpdated).toLocaleString() : "Never"}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <p className="text-[10px] text-slate-400 font-sans font-semibold uppercase tracking-wider">
            Employee diagnostic portal • Confidentially secured for HR and executive leadership
          </p>
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-250 font-bold uppercase tracking-wider text-[10px] px-4 py-2 rounded transition shadow-xs cursor-pointer font-sans"
            >
              Close Diagnostic
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
