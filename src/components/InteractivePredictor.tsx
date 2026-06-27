/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  User, 
  Briefcase, 
  Calendar, 
  ShieldAlert, 
  CheckCircle2, 
  HelpCircle, 
  AlertTriangle,
  FileText,
  Activity,
  Award,
  Clock,
  MapPin,
  TrendingUp,
  HeartHandshake,
  Cpu,
  Settings,
  Database
} from "lucide-react";

interface PredictResponse {
  success: boolean;
  riskProbability: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  topRiskFactors: { feature: string; impact: number; text: string }[];
  protectiveFactors: { feature: string; impact: number; text: string }[];
  suggestedInterventions: string[];
}

interface ModelMetadata {
  author: string;
  organisation: string;
  algorithm: string;
  n_estimators: number;
  max_depth: number;
  learning_rate: number;
  cv_roc_auc_mean: number;
  cv_roc_auc_std: number;
  cv_f1_mean: number;
  test_roc_auc: number;
  test_f1: number;
  n_features: number;
  feature_names: string[];
  train_samples: number;
  test_samples: number;
  dataset: string;
}

export default function InteractivePredictor() {
  // Model metadata state
  const [modelMetadata, setModelMetadata] = useState<ModelMetadata | null>(null);

  // Personal & Job Profile state
  const [age, setAge] = useState<number>(32);
  const [monthlyIncome, setMonthlyIncome] = useState<number>(5009);
  const [jobSatisfaction, setJobSatisfaction] = useState<number>(3);
  const [workLifeBalance, setWorkLifeBalance] = useState<number>(3);
  const [environmentSatisfaction, setEnvironmentSatisfaction] = useState<number>(3);
  const [distanceFromHome, setDistanceFromHome] = useState<number>(7);
  const [yearsAtCompany, setYearsAtCompany] = useState<number>(5);
  const [yearsSinceLastPromotion, setYearsSinceLastPromotion] = useState<number>(1);
  const [stockOptionLevel, setStockOptionLevel] = useState<number>(1);

  // Work Context state
  const [maritalStatus, setMaritalStatus] = useState<string>("Single");
  const [businessTravel, setBusinessTravel] = useState<string>("Travel_Rarely");
  const [department, setDepartment] = useState<string>("R&D");
  const [jobRole, setJobRole] = useState<string>("Research Scientist");
  const [worksOvertime, setWorksOvertime] = useState<boolean>(false);
  const [jobInvolvement, setJobInvolvement] = useState<number>(3);
  const [numCompaniesWorked, setNumCompaniesWorked] = useState<number>(2);
  const [trainingTimesLastYear, setTrainingTimesLastYear] = useState<number>(3);
  const [relationshipSatisfaction, setRelationshipSatisfaction] = useState<number>(3);

  // Prediction output state
  const [prediction, setPrediction] = useState<PredictResponse | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  // Trigger recalculation on any change
  useEffect(() => {
    const triggerCalculation = async () => {
      setIsCalculating(true);
      try {
        const payload = {
          features: {
            age,
            distanceFromHome,
            monthlyIncome,
            overTime: worksOvertime ? 1 : 0,
            jobSatisfaction,
            environmentSatisfaction,
            workLifeBalance,
            yearsAtCompany,
            yearsInCurrentRole: Math.max(0, Math.floor(yearsAtCompany * 0.6)),
            yearsSinceLastPromotion,
            stockOptionLevel,
          },
          context: {
            maritalStatus,
            businessTravel,
            department,
            jobRole,
            jobInvolvement,
            numCompaniesWorked,
            trainingTimesLastYear,
            relationshipSatisfaction,
          }
        };

        const res = await fetch("/api/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setPrediction(data);
          }
        }
      } catch (err) {
        console.error("Failed to run sandbox prediction:", err);
      } finally {
        setIsCalculating(false);
      }
    };

    // Minor debounce to prevent aggressive server spamming on continuous slider dragging
    const timeoutId = setTimeout(triggerCalculation, 150);
    return () => clearTimeout(timeoutId);
  }, [
    age,
    monthlyIncome,
    jobSatisfaction,
    workLifeBalance,
    environmentSatisfaction,
    distanceFromHome,
    yearsAtCompany,
    yearsSinceLastPromotion,
    stockOptionLevel,
    maritalStatus,
    businessTravel,
    department,
    jobRole,
    worksOvertime,
    jobInvolvement,
    numCompaniesWorked,
    trainingTimesLastYear,
    relationshipSatisfaction,
  ]);

  // Load model metadata on mount
  useEffect(() => {
    fetch("/api/model/metadata")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setModelMetadata(data.metadata);
        }
      })
      .catch((err) => console.error("Error fetching model metadata:", err));
  }, []);

  // Determine colors based on risk probability
  const getRiskColorClass = (prob: number) => {
    if (prob > 0.70) return "text-rose-600";
    if (prob > 0.40) return "text-amber-500";
    return "text-emerald-600";
  };

  const getRiskBgClass = (prob: number) => {
    if (prob > 0.70) return "bg-rose-50 text-rose-700 border-rose-200";
    if (prob > 0.40) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  };

  const riskPercent = prediction ? Math.round(prediction.riskProbability * 100) : 25;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-6"
      id="interactive-predictor-container"
    >
      {/* Intro Header */}
      <div className="flex flex-col space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 font-display flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-500 animate-pulse" />
          INTERACTIVE RISK SANDBOX
        </h2>
        <p className="text-xs text-slate-500 max-w-3xl">
          Simulate a hypothetical employee profile to observe how professional, personal, and workplace attributes dynamically modulate departure probability. Supported by the live fitted Gradient Boosting Classifier.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: PERSONAL & JOB PROFILE */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col space-y-6" id="personal-profile-card">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <User className="w-4 h-4 text-indigo-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-display">
              Personal & Job Profile
            </h3>
          </div>

          <div className="space-y-5">
            {/* Age Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-600">Age</span>
                <span className="font-mono text-slate-900 font-bold">{age} <span className="text-[10px] text-slate-400 font-normal">years</span></span>
              </div>
              <input 
                type="range" 
                min="18" 
                max="60" 
                value={age} 
                onChange={(e) => setAge(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* Monthly Income Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-600">Monthly Income</span>
                <span className="font-mono text-slate-900 font-bold">${monthlyIncome.toLocaleString()}</span>
              </div>
              <input 
                type="range" 
                min="1000" 
                max="20000" 
                step="100"
                value={monthlyIncome} 
                onChange={(e) => setMonthlyIncome(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* Job Satisfaction Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-600 flex items-center gap-1">
                  Job Satisfaction
                </span>
                <span className="font-mono text-slate-900 font-bold">{jobSatisfaction} <span className="text-slate-400 font-normal">/ 4</span></span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="4" 
                value={jobSatisfaction} 
                onChange={(e) => setJobSatisfaction(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* Work-Life Balance Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-600">Work-Life Balance</span>
                <span className="font-mono text-slate-900 font-bold">{workLifeBalance} <span className="text-slate-400 font-normal">/ 4</span></span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="4" 
                value={workLifeBalance} 
                onChange={(e) => setWorkLifeBalance(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* Environment Satisfaction Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-600">Environment Satisfaction</span>
                <span className="font-mono text-slate-900 font-bold">{environmentSatisfaction} <span className="text-slate-400 font-normal">/ 4</span></span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="4" 
                value={environmentSatisfaction} 
                onChange={(e) => setEnvironmentSatisfaction(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* Distance from Home Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-600">Distance from Home</span>
                <span className="font-mono text-slate-900 font-bold">{distanceFromHome} <span className="text-[10px] text-slate-400 font-normal font-sans">km</span></span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="30" 
                value={distanceFromHome} 
                onChange={(e) => setDistanceFromHome(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* Years at Company Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-600">Years at Company</span>
                <span className="font-mono text-slate-900 font-bold">{yearsAtCompany} <span className="text-[10px] text-slate-400 font-normal font-sans">years</span></span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="40" 
                value={yearsAtCompany} 
                onChange={(e) => setYearsAtCompany(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* Years Since Last Promotion Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-600">Years Since Last Promotion</span>
                <span className="font-mono text-slate-900 font-bold">{yearsSinceLastPromotion} <span className="text-[10px] text-slate-400 font-normal font-sans">years</span></span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="15" 
                value={yearsSinceLastPromotion} 
                onChange={(e) => setYearsSinceLastPromotion(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* Stock Option Level Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-600">Stock Option Level</span>
                <span className="font-mono text-slate-900 font-bold">{stockOptionLevel} <span className="text-[10px] text-slate-400 font-normal font-sans">level</span></span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="3" 
                value={stockOptionLevel} 
                onChange={(e) => setStockOptionLevel(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* Right Column: WORK CONTEXT */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col space-y-6" id="work-context-card">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-display">
              Work Context
            </h3>
          </div>

          <div className="space-y-5">
            {/* Dropdowns row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500">Marital Status</label>
                <select 
                  value={maritalStatus} 
                  onChange={(e) => setMaritalStatus(e.target.value)}
                  className="w-full border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500">Business Travel</label>
                <select 
                  value={businessTravel} 
                  onChange={(e) => setBusinessTravel(e.target.value)}
                  className="w-full border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Non-Travel">Non-Travel</option>
                  <option value="Travel_Rarely">Travel Rarely</option>
                  <option value="Travel_Frequently">Travel Frequently</option>
                </select>
              </div>
            </div>

            {/* Dropdowns row 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500">Department</label>
                <select 
                  value={department} 
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="R&D">R&D</option>
                  <option value="Sales">Sales</option>
                  <option value="HR">HR</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500">Job Role</label>
                <select 
                  value={jobRole} 
                  onChange={(e) => setJobRole(e.target.value)}
                  className="w-full border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Research Scientist">Research Scientist</option>
                  <option value="Software Engineer">Software Engineer</option>
                  <option value="Healthcare Representative">Healthcare Representative</option>
                  <option value="Laboratory Technician">Laboratory Technician</option>
                  <option value="Manager">Manager</option>
                  <option value="Manufacturing Director">Manufacturing Director</option>
                  <option value="Research Director">Research Director</option>
                  <option value="Sales Executive">Sales Executive</option>
                  <option value="Sales Representative">Sales Representative</option>
                  <option value="Human Resources">Human Resources</option>
                </select>
              </div>
            </div>

            {/* Works Overtime Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-700">Works Overtime?</span>
                  <span className="text-[10px] text-slate-400">Adds significant structural strain</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWorksOvertime(!worksOvertime)}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  worksOvertime ? "bg-indigo-600" : "bg-slate-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    worksOvertime ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Job Involvement Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-600">Job Involvement</span>
                <span className="font-mono text-slate-900 font-bold">{jobInvolvement} <span className="text-slate-400 font-normal">/ 4</span></span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="4" 
                value={jobInvolvement} 
                onChange={(e) => setJobInvolvement(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* Number of Companies Worked Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-600">Number of Companies Worked</span>
                <span className="font-mono text-slate-900 font-bold">{numCompaniesWorked}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="9" 
                value={numCompaniesWorked} 
                onChange={(e) => setNumCompaniesWorked(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* Training Times Last Year Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-600">Training Times Last Year</span>
                <span className="font-mono text-slate-900 font-bold">{trainingTimesLastYear}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="6" 
                value={trainingTimesLastYear} 
                onChange={(e) => setTrainingTimesLastYear(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* Relationship Satisfaction Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-600">Relationship Satisfaction</span>
                <span className="font-mono text-slate-900 font-bold">{relationshipSatisfaction} <span className="text-slate-400 font-normal">/ 4</span></span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="4" 
                value={relationshipSatisfaction} 
                onChange={(e) => setRelationshipSatisfaction(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* Bottom Panel: PREDICTION OUTPUT RESULTS */}
        <div className="col-span-1 lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col" id="predictor-output-card">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-0 border-b border-slate-100">
            
            {/* Left Result Block: Large Meter */}
            <div className="col-span-1 md:col-span-4 p-6 flex flex-col items-center justify-center text-center bg-slate-50 border-r border-slate-100">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 font-mono">
                Estimated Attrition Risk
              </span>
              
              <div className="my-3 flex items-baseline justify-center">
                <span className={`text-6xl font-black tracking-tighter transition-all duration-300 ${getRiskColorClass(prediction?.riskProbability || 0.25)}`}>
                  {riskPercent}%
                </span>
              </div>

              {/* Slider Gauge Bar */}
              <div className="w-full max-w-xs space-y-1.5 mt-2">
                <div className="h-2 w-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-600 rounded-full relative">
                  {/* Sliding cursor marker */}
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-1.5 h-4 bg-slate-950 border border-white rounded shadow-sm transition-all duration-300"
                    style={{ left: `${riskPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] font-mono text-slate-400 px-0.5">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Risk Level Badge */}
              <div className="mt-4">
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getRiskBgClass(prediction?.riskProbability || 0.25)}`}>
                  {prediction ? `${prediction.riskLevel} RISK` : "LOW RISK"}
                </span>
              </div>
            </div>

            {/* Middle/Right: RISK and PROTECTIVE FACTORS panels */}
            <div className="col-span-1 md:col-span-8 p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white">
              
              {/* Risk Factors */}
              <div className="space-y-4">
                <div className="flex items-center gap-1.5 text-rose-600 font-bold text-xs uppercase tracking-wider">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>▲ Risk Factors</span>
                </div>
                
                <div className="space-y-2.5 min-h-[140px]">
                  {prediction && prediction.topRiskFactors.length > 0 ? (
                    prediction.topRiskFactors.map((factor, idx) => (
                      <div key={idx} className="flex items-start space-x-2 text-xs text-slate-700">
                        <span className="text-rose-500 shrink-0 font-bold select-none">•</span>
                        <span>{factor.text}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 italic">No significant active risk triggers detected.</div>
                  )}
                </div>
              </div>

              {/* Protective Factors */}
              <div className="space-y-4 border-t sm:border-t-0 sm:border-l border-slate-100 pt-4 sm:pt-0 sm:pl-6">
                <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs uppercase tracking-wider">
                  <HeartHandshake className="w-3.5 h-3.5" />
                  <span>▼ Protective Factors</span>
                </div>
                
                <div className="space-y-2.5 min-h-[140px]">
                  {prediction && prediction.protectiveFactors.length > 0 ? (
                    prediction.protectiveFactors.map((factor, idx) => (
                      <div key={idx} className="flex items-start space-x-2 text-xs text-slate-700">
                        <span className="text-emerald-500 shrink-0 font-bold select-none">•</span>
                        <span>{factor.text}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 italic">No distinct protective factors found.</div>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Bottom Banner: Recommended HR Actions */}
          <div className="bg-indigo-50/70 p-5 border-t border-slate-100 flex flex-col md:flex-row md:items-start gap-4" id="recommended-actions-container">
            <div className="p-1.5 bg-indigo-100 rounded text-indigo-600 shrink-0 self-start">
              <FileText className="w-4 h-4" />
            </div>
            <div className="space-y-1.5 flex-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 font-display">
                Recommended HR Actions
              </h4>
              <div className="space-y-1.5">
                {prediction && prediction.suggestedInterventions.map((action, idx) => (
                  <div key={idx} className="flex items-start space-x-2 text-xs text-slate-700">
                    <span className="text-indigo-500 shrink-0 font-semibold">•</span>
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Backend Model Metadata Section */}
      {modelMetadata && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="bg-slate-900 text-slate-200 rounded-xl border border-slate-800 p-6 shadow-lg space-y-6"
          id="fitted-model-metadata-section"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-slate-800 rounded-lg text-indigo-400 border border-slate-700">
                <Cpu className="w-5 h-5 animate-pulse" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-sm font-bold text-white tracking-wide uppercase font-display">
                  Fitted ML Model Metadata (.pkl Backend)
                </h3>
                <span className="text-[10px] text-slate-500">
                  Serialized via pickle / joblib in <code className="text-indigo-300 font-mono">/models/model.pkl</code>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-400">
              <Settings className="w-3.5 h-3.5 text-slate-500 animate-spin" style={{ animationDuration: '6s' }} />
              <span>Active Model Path: <code className="text-emerald-400">/models/model.pkl</code></span>
            </div>
          </div>

          {/* Metrics & Parameters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 text-xs">
            {/* Box 1: Core Algorithm */}
            <div className="bg-slate-950/60 rounded-lg p-4 border border-slate-800/80 space-y-2">
              <div className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Algorithm Detail</div>
              <div className="text-white font-bold text-sm truncate" title={modelMetadata.algorithm}>{modelMetadata.algorithm}</div>
              <div className="space-y-1 text-[11px] text-slate-400 font-mono">
                <div>• Dataset: {modelMetadata.dataset}</div>
                <div>• Train: {modelMetadata.train_samples} rows</div>
                <div>• Test: {modelMetadata.test_samples} rows</div>
              </div>
            </div>

            {/* Box 2: Hyperparameters */}
            <div className="bg-slate-950/60 rounded-lg p-4 border border-slate-800/80 space-y-2">
              <div className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Hyperparameters</div>
              <div className="text-white font-bold text-sm">Gradient Boosting</div>
              <div className="space-y-1 text-[11px] text-slate-400 font-mono">
                <div className="flex justify-between"><span>• Estimators:</span> <span className="text-white font-bold">{modelMetadata.n_estimators}</span></div>
                <div className="flex justify-between"><span>• Max Depth:</span> <span className="text-white font-bold">{modelMetadata.max_depth}</span></div>
                <div className="flex justify-between"><span>• Learning Rate:</span> <span className="text-white font-bold">{modelMetadata.learning_rate}</span></div>
              </div>
            </div>

            {/* Box 3: Cross Validation */}
            <div className="bg-slate-950/60 rounded-lg p-4 border border-slate-800/80 space-y-2">
              <div className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Cross-Validation (k=5)</div>
              <div className="text-indigo-400 font-bold text-sm">{(modelMetadata.cv_roc_auc_mean * 100).toFixed(2)}% <span className="text-[10px] text-slate-500 font-normal">AUC Mean</span></div>
              <div className="space-y-1 text-[11px] text-slate-400 font-mono">
                <div className="flex justify-between"><span>• CV AUC Std:</span> <span className="text-slate-300">±{(modelMetadata.cv_roc_auc_std * 100).toFixed(2)}%</span></div>
                <div className="flex justify-between"><span>• CV F1-Score:</span> <span className="text-slate-300">{(modelMetadata.cv_f1_mean * 100).toFixed(2)}%</span></div>
              </div>
            </div>

            {/* Box 4: Holdout Test Set */}
            <div className="bg-slate-950/60 rounded-lg p-4 border border-slate-800/80 space-y-2">
              <div className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Holdout Test Evaluation</div>
              <div className="text-emerald-400 font-bold text-sm">{(modelMetadata.test_roc_auc * 100).toFixed(2)}% <span className="text-[10px] text-slate-500 font-normal font-sans">ROC-AUC</span></div>
              <div className="space-y-1 text-[11px] text-slate-400 font-mono">
                <div className="flex justify-between"><span>• Test F1-Score:</span> <span className="text-emerald-300">{(modelMetadata.test_f1 * 100).toFixed(2)}%</span></div>
                <div className="flex justify-between"><span>• Total Features:</span> <span className="text-slate-300">{modelMetadata.n_features} variables</span></div>
              </div>
            </div>
          </div>

          {/* 30 Features Badges Cloud */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Trained Feature Vector ({modelMetadata.n_features} features)
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1.5 bg-slate-950/40 rounded-lg border border-slate-800 scrollbar-thin">
              {modelMetadata.feature_names.map((name, idx) => (
                <span 
                  key={idx} 
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded text-[10px] font-mono text-slate-300 transition duration-150 cursor-default"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>

          {/* Author footer banner */}
          <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 bg-slate-950/30 p-4 rounded-lg border border-slate-800/50 gap-2">
            <div>
              Developed & Serialized by: <strong className="text-slate-300">{modelMetadata.author}</strong> at <strong className="text-indigo-400">{modelMetadata.organisation}</strong>
            </div>
            <div>
              Dataset Domain: <span className="text-slate-400 italic">{modelMetadata.dataset}</span>
            </div>
          </div>

        </motion.div>
      )}

    </motion.div>
  );
}
