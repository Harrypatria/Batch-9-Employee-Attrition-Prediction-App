/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Employee } from "../types";
import { ChevronRight, ArrowRight, ShieldAlert, Award, AlertTriangle, CheckCircle, FileText, ArrowLeft } from "lucide-react";

interface ITDOWorkflowTrackerProps {
  employees: Employee[];
  onSelectEmployee: (employee: Employee) => void;
  onUpdateStatus: (id: string, nextStatus: string) => Promise<Employee>;
}

export default function ITDOWorkflowTracker({
  employees,
  onSelectEmployee,
  onUpdateStatus,
}: ITDOWorkflowTrackerProps) {
  
  // Columns matching ITDO Framework
  const stages = [
    { id: "Insight", title: "1. Insight", description: "At-Risk Flagged", color: "border-t-blue-500 bg-blue-50/10" },
    { id: "Trigger", title: "2. Trigger Alert", description: "Critical Alarm Initiated", color: "border-t-red-500 bg-red-50/10" },
    { id: "Decision", title: "3. Decision Phase", description: "Executive Option Mapping", color: "border-t-amber-500 bg-amber-50/10" },
    { id: "Operation", title: "4. Operation Plan", description: "Tactical Checklists Active", color: "border-t-indigo-500 bg-indigo-50/10" },
    { id: "Resolved", title: "5. Resolved", description: "Mitigated / Retained", color: "border-t-emerald-500 bg-emerald-50/10" },
  ];

  // Group employees by ITDO status
  const grouped: Record<string, Employee[]> = {
    Insight: [],
    Trigger: [],
    Decision: [],
    Operation: [],
    Resolved: [],
  };

  employees.forEach((emp) => {
    const status = emp.itdoStatus || "Insight";
    if (grouped[status]) {
      grouped[status].push(emp);
    } else {
      grouped["Insight"].push(emp); // fallback
    }
  });

  const moveStage = async (empId: string, currentStatus: string, direction: "next" | "prev") => {
    const statusOrder = ["Insight", "Trigger", "Decision", "Operation", "Resolved"];
    const idx = statusOrder.indexOf(currentStatus);
    if (idx === -1) return;

    let nextIdx = idx;
    if (direction === "next" && idx < statusOrder.length - 1) {
      nextIdx = idx + 1;
    } else if (direction === "prev" && idx > 0) {
      nextIdx = idx - 1;
    }

    if (nextIdx !== idx) {
      await onUpdateStatus(empId, statusOrder[nextIdx]);
    }
  };

  return (
    <div className="space-y-4" id="itdo-kanban-board">
      <div>
        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block mb-1">Operationalization Framework</span>
        <h3 className="text-xl font-bold text-slate-900 font-display uppercase tracking-tight mb-0.5">ITDO Retention Workflow Board</h3>
        <p className="text-xs text-slate-400 font-sans">
          Track individual intervention cases from prediction alerts (Insights → Triggers) to strategic plans and task resolutions (Decisions → Operations).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const cards = grouped[stage.id] || [];
          return (
            <div
              key={stage.id}
              className={`flex-1 min-w-[220px] rounded border border-slate-200 border-t-4 p-4 flex flex-col h-[65vh] ${stage.color}`}
            >
              {/* Column Header */}
              <div className="border-b border-slate-100 pb-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-slate-800 font-display uppercase tracking-wider">{stage.title}</span>
                  <span className="text-[10px] font-black font-mono px-2 py-0.5 bg-slate-950 text-white rounded">
                    {cards.length}
                  </span>
                </div>
                <p className="text-[9px] text-slate-400 font-sans uppercase tracking-wider font-semibold mt-1">{stage.description}</p>
              </div>

              {/* Cards List container */}
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1.5 scrollbar-thin">
                {cards.length === 0 ? (
                  <div className="h-full flex flex-col justify-center items-center text-center py-10 opacity-30">
                    <CheckCircle className="w-5 h-5 text-slate-300" />
                    <span className="text-[10px] text-slate-400 font-mono mt-1.5 uppercase font-semibold">Stage Empty</span>
                  </div>
                ) : (
                  cards.map((emp) => {
                    const risk = emp.riskProbability || 0;
                    let riskColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
                    if (risk > 0.7) riskColor = "text-rose-700 bg-rose-50 border-rose-250 animate-pulse";
                    else if (risk > 0.3) riskColor = "text-amber-700 bg-amber-50 border-amber-200";

                    const pendingCount = emp.itdoDetails?.operationsPending?.length || 0;
                    const completedCount = emp.itdoDetails?.operationsCompleted?.length || 0;
                    const totalCount = pendingCount + completedCount;

                    return (
                      <div
                        key={emp.id}
                        className="bg-white p-3.5 rounded border border-slate-250 shadow-xs hover:shadow-sm hover:border-indigo-500 transition-all flex flex-col justify-between space-y-3 relative group"
                      >
                        {/* Card header */}
                        <div>
                          <div className="flex justify-between items-start">
                            <span className="text-[9px] font-black text-slate-400 font-mono">{emp.id}</span>
                            <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border ${riskColor}`}>
                              {(risk * 100).toFixed(0)}% Risk
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 mt-2 font-sans group-hover:text-indigo-600 transition">
                            {emp.name}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-sans font-medium mt-0.5">{emp.jobRole}</p>
                        </div>

                        {/* Brief pain triggers */}
                        {emp.features.overTime === 1 && risk > 0.7 && (
                          <div className="text-[9px] font-semibold font-sans bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded border border-rose-100 block">
                            Trigger: High Overtime Burnout
                          </div>
                        )}

                        {emp.itdoDetails?.decisionMade && (
                          <div className="text-[9px] text-slate-500 border-l-2 border-amber-400 pl-1.5 line-clamp-2 italic font-medium">
                            "{emp.itdoDetails.decisionMade}"
                          </div>
                        )}

                        {/* Task completed progress */}
                        {totalCount > 0 && (
                          <div className="flex items-center justify-between text-[9px] text-slate-400 font-sans border-t border-slate-50 pt-2">
                            <span className="flex items-center space-x-1 font-semibold uppercase tracking-wider text-[8px]">
                              <FileText className="w-3 h-3 text-slate-400" />
                              <span>Ops progress:</span>
                            </span>
                            <span className="font-bold text-slate-700 font-mono">
                              {completedCount}/{totalCount} tasks
                            </span>
                          </div>
                        )}

                        {/* Action triggers */}
                        <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 mt-1 text-[10px]">
                          <button
                            onClick={() => onSelectEmployee(emp)}
                            className="font-bold text-slate-500 hover:text-indigo-600 font-sans cursor-pointer uppercase tracking-wider text-[9px]"
                          >
                            Open File
                          </button>
                          
                          <div className="flex items-center space-x-1.5">
                            {stage.id !== "Insight" && (
                              <button
                                onClick={() => moveStage(emp.id, stage.id, "prev")}
                                className="p-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 border border-slate-200 cursor-pointer"
                                title="Demote case stage"
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                            )}
                            
                            {stage.id !== "Resolved" && (
                              <button
                                onClick={() => moveStage(emp.id, stage.id, "next")}
                                className="p-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                                title="Promote case stage"
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
