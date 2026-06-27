/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Employee } from "../types";
import { Search, Filter, ArrowUpDown, ShieldAlert, Award, AlertTriangle, Eye, CheckCircle2 } from "lucide-react";

interface EmployeeListProps {
  employees: Employee[];
  onSelectEmployee: (employee: Employee) => void;
}

export default function EmployeeList({ employees, onSelectEmployee }: EmployeeListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [riskFilter, setRiskFilter] = useState("All");
  const [wlbFilter, setWlbFilter] = useState("All");
  const [sortBy, setSortBy] = useState("risk-desc");

  // Filter logic
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.jobRole.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = deptFilter === "All" || emp.department === deptFilter;

    const risk = emp.riskProbability || 0;
    let matchesRisk = true;
    if (riskFilter === "High") matchesRisk = risk > 0.7;
    else if (riskFilter === "Medium") matchesRisk = risk > 0.3 && risk <= 0.7;
    else if (riskFilter === "Low") matchesRisk = risk <= 0.3;

    let matchesWlb = true;
    if (wlbFilter !== "All") {
      matchesWlb = emp.features.workLifeBalance === parseInt(wlbFilter);
    }

    return matchesSearch && matchesDept && matchesRisk && matchesWlb;
  });

  // Sort logic
  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    if (sortBy === "risk-desc") return (b.riskProbability || 0) - (a.riskProbability || 0);
    if (sortBy === "risk-asc") return (a.riskProbability || 0) - (b.riskProbability || 0);
    if (sortBy === "income-desc") return b.features.monthlyIncome - a.features.monthlyIncome;
    if (sortBy === "income-asc") return a.features.monthlyIncome - b.features.monthlyIncome;
    if (sortBy === "tenure-desc") return b.features.yearsAtCompany - a.features.yearsAtCompany;
    if (sortBy === "name-asc") return a.name.localeCompare(b.name);
    return 0;
  });

  // Status Badge styling in high-contrast Geometric Balance
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "Insight":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 font-sans border border-blue-100">Insight</span>;
      case "Trigger":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700 font-sans border border-red-100 animate-pulse">Trigger</span>;
      case "Decision":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 font-sans border border-amber-100">Decision</span>;
      case "Operation":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 font-sans border border-indigo-100">Operation</span>;
      case "Resolved":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 font-sans border border-emerald-100">Resolved</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-50 text-slate-500 font-sans border border-slate-200">Monitored</span>;
    }
  };

  return (
    <div className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden" id="employee-list-section">
      {/* Filtering Toolbar */}
      <div className="p-6 border-b border-slate-200 bg-slate-50/50 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search employee name, ID, or job role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full text-xs bg-white border border-slate-250 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-sans placeholder-slate-400 text-slate-800"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto md:justify-end">
            {/* Sorting */}
            <div className="flex items-center space-x-1.5 bg-white border border-slate-250 rounded px-3 py-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs bg-transparent border-none focus:outline-none text-slate-700 font-sans cursor-pointer font-medium"
              >
                <option value="risk-desc">Sort by: Risk (High → Low)</option>
                <option value="risk-asc">Sort by: Risk (Low → High)</option>
                <option value="income-desc">Sort by: Salary (High → Low)</option>
                <option value="income-asc">Sort by: Salary (Low → High)</option>
                <option value="tenure-desc">Sort by: Company Tenure</option>
                <option value="name-asc">Sort by: Name (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filters Grid with Custom Geometric Form Style */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-200/60">
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">Department</label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full text-xs bg-white border border-slate-250 rounded p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 font-sans font-semibold"
            >
              <option value="All">All Departments</option>
              <option value="R&D">Research & Development (R&D)</option>
              <option value="Sales">Enterprise Sales</option>
              <option value="HR">Human Resources (HR)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">Risk Category</label>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="w-full text-xs bg-white border border-slate-250 rounded p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 font-sans font-semibold"
            >
              <option value="All">All Risk Bands</option>
              <option value="High">High Attrition Risk (&gt;70%)</option>
              <option value="Medium">Medium Risk (30-70%)</option>
              <option value="Low">Low Risk (&le;30%)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">Work-Life Balance</label>
            <select
              value={wlbFilter}
              onChange={(e) => setWlbFilter(e.target.value)}
              className="w-full text-xs bg-white border border-slate-250 rounded p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 font-sans font-semibold"
            >
              <option value="All">All Balance Scores</option>
              <option value="1">1 - Poor Balance</option>
              <option value="2">2 - Fair Balance</option>
              <option value="3">3 - Good Balance</option>
              <option value="4">4 - Excellent Balance</option>
            </select>
          </div>
        </div>
      </div>

      {/* Roster Table List */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-max divide-y divide-slate-200 text-left">
          <thead className="bg-slate-50 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest font-sans">
            <tr>
              <th className="py-4 px-6 border-b border-slate-200">Employee Profile</th>
              <th className="py-4 px-4 text-center border-b border-slate-200">Attrition Risk</th>
              <th className="py-4 px-4 text-center border-b border-slate-200">Pipeline Phase</th>
              <th className="py-4 px-4 border-b border-slate-200">Core Feature Drivers</th>
              <th className="py-4 px-4 text-right border-b border-slate-200">Tenure / Salary</th>
              <th className="py-4 px-6 text-right border-b border-slate-200">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedEmployees.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-xs text-slate-400 font-sans uppercase tracking-wider font-semibold">
                  No employee records matched the active filters.
                </td>
              </tr>
            ) : (
              sortedEmployees.map((emp) => {
                const risk = emp.riskProbability || 0;
                let riskColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                if (risk > 0.7) riskColor = "bg-rose-50 text-rose-700 border-rose-250 animate-pulse";
                else if (risk > 0.3) riskColor = "bg-amber-50 text-amber-700 border-amber-200";

                // Extract core pain points for miniature tag listing
                const painTags: string[] = [];
                if (emp.features.overTime === 1) painTags.push("Overtime");
                if (emp.features.workLifeBalance <= 2) painTags.push("Burnout");
                if (emp.features.jobSatisfaction <= 2) painTags.push("Low Sat");
                if (emp.features.distanceFromHome >= 18) painTags.push("Commute");
                if (emp.features.yearsSinceLastPromotion >= 3) painTags.push("Stagnant");

                return (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Profile */}
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-sm font-sans tracking-tight">{emp.name}</span>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-[9px] font-extrabold text-slate-500 uppercase font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/50">
                            {emp.id}
                          </span>
                          <span className="text-xs text-slate-400 font-sans font-medium">
                            {emp.jobRole} • {emp.department}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Attrition Risk Score */}
                    <td className="py-4 px-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className={`inline-flex items-center px-2.5 py-1 text-xs font-black font-mono border rounded ${riskColor}`}>
                          {(risk * 100).toFixed(0)}%
                        </span>
                        {risk > 0.7 && (
                          <span className="text-[9px] font-black text-rose-500 font-sans mt-1 uppercase tracking-wider">
                            CRITICAL
                          </span>
                        )}
                      </div>
                    </td>

                    {/* ITDO Status */}
                    <td className="py-4 px-4 text-center">
                      <div className="flex justify-center">
                        {getStatusBadge(emp.itdoStatus)}
                      </div>
                    </td>

                    {/* Features Alert Indicators */}
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1.5 max-w-xs">
                        {painTags.length === 0 ? (
                          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Stable</span>
                        ) : (
                          painTags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] font-bold font-sans px-1.5 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200/70"
                            >
                              {tag}
                            </span>
                          ))
                        )}
                      </div>
                    </td>

                    {/* Income and Tenure */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-900 font-sans">
                          ${emp.features.monthlyIncome.toLocaleString()}/mo
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1 font-mono font-medium uppercase">
                          Tenure: {emp.features.yearsAtCompany}y • Age {emp.features.age}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => onSelectEmployee(emp)}
                        className="inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded transition shadow-xs font-sans cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Diagnose</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
