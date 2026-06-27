/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Employee, EmployeeFeatures, ModelConfig } from "./types";
import DashboardMetrics from "./components/DashboardMetrics";
import EmployeeList from "./components/EmployeeList";
import EmployeeDetailModal from "./components/EmployeeDetailModal";
import ITDOWorkflowTracker from "./components/ITDOWorkflowTracker";
import InteractivePredictor from "./components/InteractivePredictor";
import { ShieldAlert, RefreshCw, Layers, Database, UserCheck, Play, Radio, Calendar } from "lucide-react";

export default function App() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [modelConfig, setModelConfig] = useState<ModelConfig | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "directory" | "pipeline" | "prediction">("dashboard");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [systemTime, setSystemTime] = useState("");

  // Keep a clean system UTC clock running
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setSystemTime(now.toISOString().replace("T", " ").substring(0, 19) + " UTC");
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch employees and model configurations on mount
  const fetchCohortData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/employees");
      if (!res.ok) {
        throw new Error(`Failed to load cohort: HTTP ${res.status}`);
      }
      const data = await res.json();
      setEmployees(data.employees || []);
      setModelConfig(data.modelConfig || null);

      // If an employee is currently selected, update their details in-place
      if (selectedEmployee) {
        const updated = data.employees.find((e: Employee) => e.id === selectedEmployee.id);
        if (updated) setSelectedEmployee(updated);
      }
    } catch (err: any) {
      console.error("Fetch cohort failed:", err);
      setError(err.message || "Unknown communication error with full-stack analytics endpoints.");
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCohortData();
  }, []);

  // Trigger Sandbox simulation updates on the server
  const handleUpdateFeatures = async (id: string, features: EmployeeFeatures): Promise<Employee> => {
    try {
      const res = await fetch(`/api/employees/${id}/update-features`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features }),
      });
      if (!res.ok) throw new Error("Recalculation failed.");
      const data = await res.json();
      if (data.success) {
        // Update local roster cache in-place
        setEmployees(prev => prev.map(e => e.id === id ? data.employee : e));
        return data.employee;
      }
      throw new Error("Update unsuccessful");
    } catch (err) {
      console.error("Failed to simulate parameters:", err);
      throw err;
    }
  };

  // Trigger ITDO pipeline status changes on the server
  const handleUpdateItdo = async (id: string, itdoState: Partial<Employee>): Promise<Employee> => {
    try {
      const res = await fetch(`/api/employees/${id}/itdo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itdoState),
      });
      if (!res.ok) throw new Error("Workflow synchronization failed.");
      const data = await res.json();
      if (data.success) {
        setEmployees(prev => prev.map(e => e.id === id ? data.employee : e));
        return data.employee;
      }
      throw new Error("Workflow update unsuccessful");
    } catch (err) {
      console.error("ITDO workflow save error:", err);
      throw err;
    }
  };

  // Promoting status directly from Kanban tracker cards
  const handleUpdateStatusOnly = async (id: string, nextStatus: string): Promise<Employee> => {
    return handleUpdateItdo(id, {
      itdoStatus: nextStatus as any,
    });
  };

  // Reset cohort back to original state
  const handleResetCohort = async () => {
    if (!window.confirm("This will restore all employee features and ITDO stages back to defaults. Proceed?")) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/employees/reset", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setEmployees(data.employees || []);
        if (selectedEmployee) {
          const updated = data.employees.find((e: Employee) => e.id === selectedEmployee.id);
          setSelectedEmployee(updated || null);
        }
      }
    } catch (err) {
      console.error("Failed to reset cohort:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans" id="root-app-container">
      
      {/* Platform Branding Header bar matching Geometric Balance */}
      <nav className="h-16 bg-slate-900 text-white flex items-center justify-between px-8 shrink-0 sticky top-0 z-40 border-b border-slate-950" id="app-header">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center font-bold text-xs text-white">OS</div>
          <h1 className="text-sm font-bold tracking-tight uppercase font-display">
            RETENTION<span className="text-indigo-400">.OS</span> 
            <span className="ml-2 px-2 py-0.5 bg-slate-800 text-[10px] rounded border border-slate-700 font-mono font-semibold text-slate-300">
              v2.4.0-PROD
            </span>
          </h1>
        </div>

        {/* Dynamic Nav Tabs integrated in header */}
        <div className="hidden md:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider h-full">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`h-full px-1 border-b-2 transition-all cursor-pointer ${
              activeTab === "dashboard"
                ? "border-indigo-500 text-white font-black"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Command Center
          </button>
          <button
            onClick={() => setActiveTab("directory")}
            className={`h-full px-1 border-b-2 transition-all cursor-pointer ${
              activeTab === "directory"
                ? "border-indigo-500 text-white font-black"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Roster Directory
          </button>
          <button
            onClick={() => setActiveTab("pipeline")}
            className={`h-full px-1 border-b-2 transition-all cursor-pointer ${
              activeTab === "pipeline"
                ? "border-indigo-500 text-white font-black"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Workflow Board
          </button>
          <button
            onClick={() => setActiveTab("prediction")}
            className={`h-full px-1 border-b-2 transition-all cursor-pointer ${
              activeTab === "prediction"
                ? "border-indigo-500 text-white font-black"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Risk Sandbox
          </button>
        </div>

        {/* Header telemetry and controls */}
        <div className="flex items-center gap-3">
          {modelConfig && (
            <div className="hidden lg:flex items-center space-x-2 bg-slate-800 border border-slate-700 rounded px-2.5 py-1 font-mono text-[10px] text-slate-300">
              <Database className="w-3 h-3 text-indigo-400" />
              <span>AUC: {(modelConfig.aucRoc * 100).toFixed(1)}%</span>
              <span className="text-slate-600">|</span>
              <span>Trees: {modelConfig.treesCount}</span>
            </div>
          )}

          <button
            onClick={handleResetCohort}
            className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 transition cursor-pointer"
            title="Reset active database back to default state"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset DB</span>
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col space-y-6">
        
        {/* Navigation Tabs for Mobile View only */}
        <div className="md:hidden flex items-center justify-between border-b border-slate-200 bg-white rounded p-1.5 shadow-xs">
          <div className="flex space-x-1 w-full">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex-1 py-2 text-xs font-bold rounded transition-all cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab("directory")}
              className={`flex-1 py-2 text-xs font-bold rounded transition-all cursor-pointer ${
                activeTab === "directory"
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              Roster
            </button>
            <button
              onClick={() => setActiveTab("pipeline")}
              className={`flex-1 py-2 text-xs font-bold rounded transition-all cursor-pointer ${
                activeTab === "pipeline"
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              Workflow
            </button>
            <button
              onClick={() => setActiveTab("prediction")}
              className={`flex-1 py-2 text-xs font-bold rounded transition-all cursor-pointer ${
                activeTab === "prediction"
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              Sandbox
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-4 flex items-start space-x-3 text-red-700 animate-in fade-in" id="error-boundary-banner">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm font-sans">Core Connection Error</h4>
              <p className="text-xs font-sans mt-0.5">{error}</p>
              <button
                onClick={() => fetchCohortData()}
                className="mt-2 text-xs font-bold font-sans underline cursor-pointer hover:text-red-900 block"
              >
                Retry connection
              </button>
            </div>
          </div>
        )}

        {/* View Section Display */}
        {isLoading ? (
          <div className="flex-1 flex flex-col justify-center items-center py-24 space-y-3" id="app-loading-spinner">
            <RefreshCw className="w-8 h-8 text-slate-800 animate-spin" />
            <p className="text-xs text-slate-400 font-sans font-semibold uppercase tracking-wider">Loading Analytical Engine...</p>
          </div>
        ) : (
          <div className="flex-1" id="active-viewport-card">
            {activeTab === "dashboard" && (
              <DashboardMetrics employees={employees} />
            )}

            {activeTab === "directory" && (
              <EmployeeList
                employees={employees}
                onSelectEmployee={(emp) => setSelectedEmployee(emp)}
              />
            )}

            {activeTab === "pipeline" && (
              <ITDOWorkflowTracker
                employees={employees}
                onSelectEmployee={(emp) => setSelectedEmployee(emp)}
                onUpdateStatus={handleUpdateStatusOnly}
              />
            )}

            {activeTab === "prediction" && (
              <InteractivePredictor />
            )}
          </div>
        )}
      </main>

      {/* Persistent Diagnostics Modal overlay */}
      {selectedEmployee && (
        <EmployeeDetailModal
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          onUpdateFeatures={handleUpdateFeatures}
          onUpdateItdo={handleUpdateItdo}
        />
      )}

      {/* Bottom Status Bar matching Geometric Balance */}
      <footer className="h-10 bg-slate-900 text-slate-400 px-8 flex items-center justify-between text-[10px] font-mono shrink-0 border-t border-slate-950" id="app-footer">
        <div className="flex gap-6">
          <span>SYSTEM STATUS: <span className="text-emerald-500 font-bold">● OPERATIONAL</span></span>
          <span className="hidden sm:inline">DB: FIRESTORE-ACTIVE</span>
          <span className="hidden md:inline">CLASSIFIER: LGBM_ENSEMBLE_PROD</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
          <span>DECISION STREAM LOGGED</span>
        </div>
      </footer>
    </div>
  );
}
