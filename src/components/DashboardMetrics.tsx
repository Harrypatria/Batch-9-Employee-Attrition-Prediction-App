/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Employee } from "../types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { Users, AlertTriangle, TrendingUp, DollarSign } from "lucide-react";

interface DashboardMetricsProps {
  employees: Employee[];
}

export default function DashboardMetrics({ employees }: DashboardMetricsProps) {
  const totalEmployees = employees.length;
  const criticalEmployees = employees.filter((e) => (e.riskProbability || 0) > 0.7);
  const criticalCount = criticalEmployees.length;

  // Attrition Rate
  const predictedAttritionRate = totalEmployees > 0 ? (criticalCount / totalEmployees) * 100 : 0;

  // Attrition financial exposure (average multiple of 1.75x annual salary)
  const totalFinancialRisk = criticalEmployees.reduce((sum, emp) => {
    const annualSalary = emp.features.monthlyIncome * 12;
    const attritionCost = annualSalary * 1.75; // 1.5x - 2x salary multiple
    return sum + attritionCost;
  }, 0);

  // 1. Risk Tier counts
  const riskTiers = [
    { name: "Low Risk (<30%)", value: 0, color: "#10B981" },
    { name: "Medium Risk (30-70%)", value: 0, color: "#F59E0B" },
    { name: "High Risk (>70%)", value: 0, color: "#EF4444" },
  ];

  employees.forEach((emp) => {
    const p = emp.riskProbability || 0;
    if (p <= 0.3) riskTiers[0].value++;
    else if (p <= 0.7) riskTiers[1].value++;
    else riskTiers[2].value++;
  });

  // 2. Aggregate SHAP Feature Importance (Global Drivers)
  const aggregatedImportance: Record<string, number> = {};
  employees.forEach((emp) => {
    if (emp.shapValues) {
      Object.entries(emp.shapValues).forEach(([feat, val]) => {
        // Global importance is defined as the mean absolute SHAP value
        aggregatedImportance[feat] = (aggregatedImportance[feat] || 0) + Math.abs(val);
      });
    }
  });

  // Format feature names nicely for display
  const featureLabelMap: Record<string, string> = {
    overTime: "Overtime Requirements",
    workLifeBalance: "Work-Life Balance Index",
    jobSatisfaction: "Job Satisfaction Level",
    environmentSatisfaction: "Environment Comfort",
    monthlyIncome: "Monthly Income Level",
    distanceFromHome: "Commute Distance (Miles)",
    yearsSinceLastPromotion: "Years Since Promotion",
    stockOptionLevel: "Equity/Stock Ownership",
    yearsInCurrentRole: "Role Tenure (Years)",
    yearsAtCompany: "Company Tenure (Years)",
    age: "Age Index",
  };

  const globalDrivers = Object.entries(aggregatedImportance)
    .map(([feat, sum]) => ({
      rawName: feat,
      name: featureLabelMap[feat] || feat,
      importance: sum / totalEmployees,
    }))
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 6);

  return (
    <div className="space-y-6" id="dashboard-metrics">
      {/* 4 KPI Cards in Geometric Balance Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded border border-slate-200 shadow-xs flex flex-col justify-between relative" id="kpi-total-headcount">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">Active Cohort Size</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black tracking-tighter text-slate-900">{totalEmployees}</span>
              <span className="text-slate-400 text-xs font-semibold">Active</span>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-4 uppercase border-t border-slate-100 pt-2 flex items-center justify-between">
            <span>Staff Monitored</span>
            <Users className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded border border-slate-200 shadow-xs flex flex-col justify-between relative" id="kpi-critical-risk">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">Critical Risk Flagged</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black tracking-tighter text-rose-600">{criticalCount}</span>
              <span className="text-rose-600 text-xs font-bold">
                {predictedAttritionRate.toFixed(1)}% Rate
              </span>
            </div>
          </div>
          <div className="text-[10px] text-rose-500 font-mono mt-4 uppercase border-t border-rose-100 pt-2 flex items-center justify-between">
            <span>Critical threshold &gt; 70%</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded border border-slate-200 shadow-xs flex flex-col justify-between relative" id="kpi-attrition-rate">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">Model Baseline AUC</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black tracking-tighter text-indigo-600">89.2%</span>
              <span className="text-emerald-600 text-xs font-bold">+1.2% ↑</span>
            </div>
          </div>
          <div className="text-[10px] text-indigo-500 font-mono mt-4 uppercase border-t border-slate-100 pt-2 flex items-center justify-between">
            <span>LGBM Binary Classifier</span>
            <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded border border-slate-200 shadow-xs flex flex-col justify-between relative" id="kpi-financial-exposure">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">Financial Risk Exposure</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black tracking-tighter text-slate-900">
                ${(totalFinancialRisk / 1000000).toFixed(1)}M
              </span>
              <span className="text-slate-500 text-xs">Exposure</span>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-4 uppercase border-t border-slate-100 pt-2 flex items-center justify-between">
            <span>Avg Cost: $85k/Exit</span>
            <DollarSign className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Visual Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk distribution */}
        <div className="bg-white p-6 rounded border border-slate-200 shadow-sm flex flex-col justify-between" id="chart-risk-distribution">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1 block">Cohort Composition</span>
            <h4 className="text-lg font-bold text-slate-900 font-display tracking-tight mb-1">Attrition Risk Distribution</h4>
            <p className="text-xs text-slate-400 font-sans mb-4">
              Overview of risk classification bands throughout the active cohort
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
            <div className="h-44 flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskTiers}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {riskTiers.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} staff`, "Volume"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3.5">
              {riskTiers.map((tier) => {
                const percentage = totalEmployees > 0 ? (tier.value / totalEmployees) * 100 : 0;
                return (
                  <div key={tier.name} className="flex items-start justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tier.color }} />
                      <span className="text-xs font-bold text-slate-700 font-sans">{tier.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-slate-900 font-mono">{tier.value}</span>
                      <span className="text-[10px] text-slate-400 font-mono ml-1">({percentage.toFixed(0)}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Global drivers chart */}
        <div className="bg-white p-6 rounded border border-slate-200 shadow-sm flex flex-col justify-between" id="chart-global-drivers">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1 block">Local Explanations Aggregation</span>
            <h4 className="text-lg font-bold text-slate-900 font-display tracking-tight mb-1">Organizational Attrition Drivers</h4>
            <p className="text-xs text-slate-400 font-sans mb-4">
              Mean absolute SHAP value impact across all predictions (global feature importances)
            </p>
          </div>

          <div className="h-48 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={globalDrivers}
                layout="vertical"
                margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#4B5563", fontSize: 10, fontFamily: "Inter" }}
                  width={150}
                />
                <Tooltip
                  formatter={(value: any) => [`+${(value * 100).toFixed(1)}% probability influence`, "Average Impact"]}
                  contentStyle={{ fontSize: "11px", fontFamily: "Inter", borderRadius: "4px" }}
                />
                <Bar dataKey="importance" radius={[0, 2, 2, 0]}>
                  {globalDrivers.map((entry, index) => {
                    // Beautiful Geometric indigo-dominant chart colors
                    const col = entry.rawName === "overTime" ? "#E11D48" : 
                                entry.rawName === "workLifeBalance" ? "#F59E0B" :
                                entry.rawName === "jobSatisfaction" ? "#818CF8" : "#4F46E5";
                    return <Cell key={`cell-${index}`} fill={col} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
