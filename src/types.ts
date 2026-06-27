/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface EmployeeFeatures {
  age: number;
  distanceFromHome: number;
  monthlyIncome: number;
  overTime: number; // 0 or 1
  jobSatisfaction: number; // 1 to 4
  environmentSatisfaction: number; // 1 to 4
  workLifeBalance: number; // 1 to 4
  yearsAtCompany: number;
  yearsInCurrentRole: number;
  yearsSinceLastPromotion: number;
  stockOptionLevel: number; // 0 to 3
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  department: "R&D" | "Sales" | "HR";
  jobRole: string;
  gender: "Male" | "Female";
  features: EmployeeFeatures;
  actualAttrition?: number; // 0 or 1
  riskProbability?: number; // model prediction probability (0.0 - 1.0)
  shapValues?: Record<string, number>; // local feature attributions
  itdoStatus?: "Insight" | "Trigger" | "Decision" | "Operation" | "Resolved";
  itdoDetails?: {
    triggerAlert?: string;
    decisionMade?: string;
    operationsCompleted?: string[];
    operationsPending?: string[];
    lastUpdated?: string;
  };
}

export interface ModelConfig {
  treesCount: number;
  learningRate: number;
  maxDepth: number;
  aucRoc: number;
}
