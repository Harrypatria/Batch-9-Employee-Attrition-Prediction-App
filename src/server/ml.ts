/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Machine Learning Engine for Employee Attrition Prediction
// Implements a real, server-side Gradient Boosted Decision Tree (GBDT) with Saabas local path feature attribution.

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
  actualAttrition?: number; // 0 or 1 (historical label)
  riskProbability?: number; // model prediction
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

// Simple Regression Tree for GBDT
export interface TreeNode {
  feature?: keyof EmployeeFeatures;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
  value: number; // Leaf prediction or node expectation
  count: number; // Number of samples reaching this node
}

export class RegressionTree {
  root!: TreeNode;

  constructor(
    private maxDepth: number = 3,
    private minSamplesSplit: number = 2
  ) {}

  fit(X: EmployeeFeatures[], y: number[]) {
    this.root = this.buildTree(X, y, 0);
  }

  private buildTree(X: EmployeeFeatures[], y: number[], depth: number): TreeNode {
    const numSamples = X.length;
    const meanValue = numSamples > 0 ? y.reduce((a, b) => a + b, 0) / numSamples : 0;

    // Base cases
    if (depth >= this.maxDepth || numSamples < this.minSamplesSplit || this.isPure(y)) {
      return { value: meanValue, count: numSamples };
    }

    let bestFeature: keyof EmployeeFeatures | undefined;
    let bestThreshold: number | undefined;
    let bestVarianceReduction = -1;
    let bestLeftIndices: number[] = [];
    let bestRightIndices: number[] = [];

    const totalVariance = this.calculateVariance(y);

    // Scan features
    const features: (keyof EmployeeFeatures)[] = [
      "age",
      "distanceFromHome",
      "monthlyIncome",
      "overTime",
      "jobSatisfaction",
      "environmentSatisfaction",
      "workLifeBalance",
      "yearsAtCompany",
      "yearsInCurrentRole",
      "yearsSinceLastPromotion",
      "stockOptionLevel",
    ];

    for (const feature of features) {
      const values = X.map((x) => x[feature]);
      const uniqueValues = Array.from(new Set(values)).sort((a, b) => a - b);

      // Try splits at midpoints
      for (let i = 0; i < uniqueValues.length - 1; i++) {
        const threshold = (uniqueValues[i] + uniqueValues[i + 1]) / 2;
        const leftIdx: number[] = [];
        const rightIdx: number[] = [];

        for (let j = 0; j < numSamples; j++) {
          if (X[j][feature] <= threshold) {
            leftIdx.push(j);
          } else {
            rightIdx.push(j);
          }
        }

        if (leftIdx.length < this.minSamplesSplit || rightIdx.length < this.minSamplesSplit) {
          continue;
        }

        const leftY = leftIdx.map((idx) => y[idx]);
        const rightY = rightIdx.map((idx) => y[idx]);

        const leftVar = this.calculateVariance(leftY);
        const rightVar = this.calculateVariance(rightY);

        const varianceReduction =
          totalVariance - (leftY.length / numSamples) * leftVar - (rightY.length / numSamples) * rightVar;

        if (varianceReduction > bestVarianceReduction) {
          bestVarianceReduction = varianceReduction;
          bestFeature = feature;
          bestThreshold = threshold;
          bestLeftIndices = leftIdx;
          bestRightIndices = rightIdx;
        }
      }
    }

    // Split if gain is positive
    if (bestFeature && bestVarianceReduction > 0) {
      const leftX = bestLeftIndices.map((idx) => X[idx]);
      const leftY = bestLeftIndices.map((idx) => y[idx]);
      const rightX = bestRightIndices.map((idx) => X[idx]);
      const rightY = bestRightIndices.map((idx) => y[idx]);

      return {
        feature: bestFeature,
        threshold: bestThreshold,
        left: this.buildTree(leftX, leftY, depth + 1),
        right: this.buildTree(rightX, rightY, depth + 1),
        value: meanValue,
        count: numSamples,
      };
    }

    return { value: meanValue, count: numSamples };
  }

  private isPure(y: number[]): boolean {
    if (y.length === 0) return true;
    const first = y[0];
    return y.every((val) => val === first);
  }

  private calculateVariance(y: number[]): number {
    if (y.length === 0) return 0;
    const mean = y.reduce((a, b) => a + b, 0) / y.length;
    return y.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / y.length;
  }

  predictSample(x: EmployeeFeatures): number {
    return this.traverse(this.root, x);
  }

  private traverse(node: TreeNode, x: EmployeeFeatures): number {
    if (!node.feature) {
      return node.value;
    }
    if (x[node.feature] <= node.threshold!) {
      return this.traverse(node.left!, x);
    } else {
      return this.traverse(node.right!, x);
    }
  }

  // Returns feature attributions (Saabas) for a single sample along its tree decision path
  explainSample(x: EmployeeFeatures, attributions: Record<string, number>) {
    this.explainTraverse(this.root, x, attributions);
  }

  private explainTraverse(node: TreeNode, x: EmployeeFeatures, attributions: Record<string, number>) {
    if (!node.feature) {
      return;
    }

    const feature = node.feature as string;
    const currentValue = node.value; // Expected value at this parent node

    if (x[node.feature] <= node.threshold!) {
      const nextValue = node.left!.value;
      attributions[feature] = (attributions[feature] || 0) + (nextValue - currentValue);
      this.explainTraverse(node.left!, x, attributions);
    } else {
      const nextValue = node.right!.value;
      attributions[feature] = (attributions[feature] || 0) + (nextValue - currentValue);
      this.explainTraverse(node.right!, x, attributions);
    }
  }
}

// Gradient Boosting Binary Classifier
export class GradientBoostingClassifier {
  private trees: RegressionTree[] = [];
  private baseRate: number = 0; // log-odds of the base rate

  constructor(
    private numTrees: number = 15,
    private learningRate: number = 0.1,
    private maxDepth: number = 3
  ) {}

  fit(X: EmployeeFeatures[], y: number[]) {
    this.trees = [];
    const numSamples = X.length;

    // 1. Initialize log-odds baseline prediction
    const pBase = y.reduce((a, b) => a + b, 0) / numSamples;
    this.baseRate = Math.log(pBase / (1 - pBase || 1e-15));

    // Working predictions in log-odds
    const F = new Array(numSamples).fill(this.baseRate);

    for (let round = 0; round < this.numTrees; round++) {
      // a. Compute probabilities and pseudo-residuals
      const p = F.map((f) => 1 / (1 + Math.exp(-f)));
      const residuals = y.map((yi, idx) => yi - p[idx]);

      // b. Fit a regression tree to the residuals
      const tree = new RegressionTree(this.maxDepth, 2);
      tree.fit(X, residuals);

      // c. In standard GBDT, adjust leaf values to minimize log-loss
      this.optimizeLeafValues(tree.root, X, y, F, this.learningRate);

      // d. Update model predictions F
      for (let i = 0; i < numSamples; i++) {
        F[i] += this.learningRate * tree.predictSample(X[i]);
      }

      this.trees.push(tree);
    }
  }

  private optimizeLeafValues(
    node: TreeNode,
    X: EmployeeFeatures[],
    y: number[],
    F: number[],
    lr: number
  ) {
    // Collect samples belonging to each leaf, adjust values
    const leafNodes: TreeNode[] = [];
    this.findLeaves(node, leafNodes);

    for (const leaf of leafNodes) {
      // Find indices of training samples that end up in this leaf
      const samplesInLeafIdx: number[] = [];
      for (let i = 0; i < X.length; i++) {
        if (this.reachesLeaf(node, X[i], leaf)) {
          samplesInLeafIdx.push(i);
        }
      }

      if (samplesInLeafIdx.length === 0) continue;

      // Newton-Raphson update for binomial deviance leaf value
      let numerator = 0;
      let denominator = 0;
      for (const idx of samplesInLeafIdx) {
        const p = 1 / (1 + Math.exp(-F[idx]));
        numerator += y[idx] - p;
        denominator += p * (1 - p);
      }

      // Safeguard denominator
      if (denominator < 1e-10) {
        denominator = 1e-10;
      }

      leaf.value = numerator / denominator;
    }

    // Re-propagate expected values to parent nodes for Saabas attribution
    this.propagateNodeValues(node, X, F);
  }

  private findLeaves(node: TreeNode, leaves: TreeNode[]) {
    if (!node.feature) {
      leaves.push(node);
      return;
    }
    this.findLeaves(node.left!, leaves);
    this.findLeaves(node.right!, leaves);
  }

  private reachesLeaf(root: TreeNode, x: EmployeeFeatures, targetLeaf: TreeNode): boolean {
    let curr = root;
    while (curr.feature) {
      if (x[curr.feature] <= curr.threshold!) {
        curr = curr.left!;
      } else {
        curr = curr.right!;
      }
    }
    return curr === targetLeaf;
  }

  private propagateNodeValues(node: TreeNode, X: EmployeeFeatures[], F: number[]) {
    if (!node.feature) {
      return; // Leaf values are already set
    }

    this.propagateNodeValues(node.left!, X, F);
    this.propagateNodeValues(node.right!, X, F);

    // Parent node value is the average of child values weighted by sample count
    const leftCount = node.left!.count;
    const rightCount = node.right!.count;
    const totalCount = leftCount + rightCount;

    if (totalCount > 0) {
      node.value = (node.left!.value * leftCount + node.right!.value * rightCount) / totalCount;
    }
  }

  predict(x: EmployeeFeatures): number {
    let logOdds = this.baseRate;
    for (const tree of this.trees) {
      logOdds += this.learningRate * tree.predictSample(x);
    }
    return 1 / (1 + Math.exp(-logOdds)); // Probability of attrition (0.0 - 1.0)
  }

  explain(x: EmployeeFeatures): { baseRateProb: number; finalProb: number; attributions: Record<string, number> } {
    const attributionsLogOdds: Record<string, number> = {};

    for (const tree of this.trees) {
      tree.explainSample(x, attributionsLogOdds);
    }

    // Convert attributions from log-odds to approximate probability impact
    // For local visual display, we can scale log-odds contributions to match the probability delta
    const logOddsBase = this.baseRate;
    let logOddsFinal = logOddsBase;
    for (const feat in attributionsLogOdds) {
      logOddsFinal += this.learningRate * attributionsLogOdds[feat];
    }

    const probBase = 1 / (1 + Math.exp(-logOddsBase));
    const probFinal = 1 / (1 + Math.exp(-logOddsFinal));
    const totalDelta = probFinal - probBase;

    // Approximate breakdown proportional to log-odds contributions
    const attributionsProb: Record<string, number> = {};
    let sumAbsoluteLogOdds = 0;
    for (const feat in attributionsLogOdds) {
      sumAbsoluteLogOdds += Math.abs(attributionsLogOdds[feat]);
    }

    if (sumAbsoluteLogOdds > 0) {
      for (const feat in attributionsLogOdds) {
        const fraction = attributionsLogOdds[feat] / sumAbsoluteLogOdds;
        // Keep the sign and scale appropriately
        attributionsProb[feat] = totalDelta * Math.abs(fraction) * (attributionsLogOdds[feat] >= 0 ? 1 : -1);
      }
    } else {
      // Edge case: no attributions
      attributionsProb["base"] = 0;
    }

    return {
      baseRateProb: probBase,
      finalProb: probFinal,
      attributions: attributionsProb,
    };
  }
}

// Global model instance
export const mlModel = new GradientBoostingClassifier(18, 0.12, 3);

// Generate high-fidelity synthetic employees
export function generateInitialEmployees(): Employee[] {
  const departments: ("R&D" | "Sales" | "HR")[] = ["R&D", "Sales", "HR"];
  
  // Hand-crafted diverse employee pool
  const rawPool = [
    {
      id: "EMP-0128",
      name: "Marcus Vance",
      email: "m.vance@enterprise.io",
      department: "R&D" as const,
      jobRole: "Lead Cloud Architect",
      gender: "Male" as const,
      features: {
        age: 34,
        distanceFromHome: 22, // far
        monthlyIncome: 14200, // high salary
        overTime: 1, // overtime
        jobSatisfaction: 2, // low satisfaction
        environmentSatisfaction: 1, // poor environment (commute/culture)
        workLifeBalance: 1, // severe burnout
        yearsAtCompany: 3,
        yearsInCurrentRole: 3,
        yearsSinceLastPromotion: 3,
        stockOptionLevel: 0, // no equity
      },
      actualAttrition: 1,
    },
    {
      id: "EMP-0419",
      name: "Sarah Lin",
      email: "s.lin@enterprise.io",
      department: "R&D" as const,
      jobRole: "Senior Software Engineer",
      gender: "Female" as const,
      features: {
        age: 28,
        distanceFromHome: 4,
        monthlyIncome: 8900,
        overTime: 0,
        jobSatisfaction: 4,
        environmentSatisfaction: 4,
        workLifeBalance: 3,
        yearsAtCompany: 4,
        yearsInCurrentRole: 2,
        yearsSinceLastPromotion: 1,
        stockOptionLevel: 1,
      },
      actualAttrition: 0,
    },
    {
      id: "EMP-0072",
      name: "Derrick Jenkins",
      email: "d.jenkins@enterprise.io",
      department: "Sales" as const,
      jobRole: "Enterprise Sales Director",
      gender: "Male" as const,
      features: {
        age: 41,
        distanceFromHome: 28, // long commute
        monthlyIncome: 16500,
        overTime: 1, // constant travel and work
        jobSatisfaction: 1, // hates quota stress
        environmentSatisfaction: 2,
        workLifeBalance: 1, // terrible
        yearsAtCompany: 6,
        yearsInCurrentRole: 4,
        yearsSinceLastPromotion: 5, // stagnant promotion
        stockOptionLevel: 0, // no options
      },
      actualAttrition: 1,
    },
    {
      id: "EMP-0922",
      name: "Elena Rostova",
      email: "e.rostova@enterprise.io",
      department: "Sales" as const,
      jobRole: "Senior Account Executive",
      gender: "Female" as const,
      features: {
        age: 31,
        distanceFromHome: 12,
        monthlyIncome: 7500,
        overTime: 1, // overtime quota hunting
        jobSatisfaction: 2, // stress
        environmentSatisfaction: 3,
        workLifeBalance: 2,
        yearsAtCompany: 2,
        yearsInCurrentRole: 1,
        yearsSinceLastPromotion: 2,
        stockOptionLevel: 0,
      },
      actualAttrition: 1,
    },
    {
      id: "EMP-0144",
      name: "Aisha Taylor",
      email: "a.taylor@enterprise.io",
      department: "HR" as const,
      jobRole: "HR Business Partner",
      gender: "Female" as const,
      features: {
        age: 38,
        distanceFromHome: 2,
        monthlyIncome: 9200,
        overTime: 0,
        jobSatisfaction: 4,
        environmentSatisfaction: 4,
        workLifeBalance: 4,
        yearsAtCompany: 8,
        yearsInCurrentRole: 5,
        yearsSinceLastPromotion: 2,
        stockOptionLevel: 2,
      },
      actualAttrition: 0,
    },
    {
      id: "EMP-0310",
      name: "Carlos Gomez",
      email: "c.gomez@enterprise.io",
      department: "R&D" as const,
      jobRole: "QA Automation Engineer",
      gender: "Male" as const,
      features: {
        age: 25,
        distanceFromHome: 18,
        monthlyIncome: 4200, // low income
        overTime: 1, // high overtime
        jobSatisfaction: 2,
        environmentSatisfaction: 2,
        workLifeBalance: 2,
        yearsAtCompany: 1,
        yearsInCurrentRole: 1,
        yearsSinceLastPromotion: 1,
        stockOptionLevel: 0,
      },
      actualAttrition: 1,
    },
    {
      id: "EMP-0881",
      name: "Naomi Takahashi",
      email: "n.takahashi@enterprise.io",
      department: "R&D" as const,
      jobRole: "Staff AI Researcher",
      gender: "Female" as const,
      features: {
        age: 36,
        distanceFromHome: 6,
        monthlyIncome: 18500, // very high income
        overTime: 0,
        jobSatisfaction: 4,
        environmentSatisfaction: 4,
        workLifeBalance: 3,
        yearsAtCompany: 5,
        yearsInCurrentRole: 3,
        yearsSinceLastPromotion: 1,
        stockOptionLevel: 3, // substantial equity
      },
      actualAttrition: 0,
    },
    {
      id: "EMP-0511",
      name: "Liam O'Connor",
      email: "l.oconnor@enterprise.io",
      department: "Sales" as const,
      jobRole: "Sales Executive",
      gender: "Male" as const,
      features: {
        age: 29,
        distanceFromHome: 15,
        monthlyIncome: 6100,
        overTime: 1,
        jobSatisfaction: 3,
        environmentSatisfaction: 2,
        workLifeBalance: 2,
        yearsAtCompany: 3,
        yearsInCurrentRole: 2,
        yearsSinceLastPromotion: 3,
        stockOptionLevel: 0,
      },
      actualAttrition: 0,
    },
    {
      id: "EMP-0294",
      name: "Dr. Chloe Mehta",
      email: "c.mehta@enterprise.io",
      department: "R&D" as const,
      jobRole: "Principal Data Scientist",
      gender: "Female" as const,
      features: {
        age: 45,
        distanceFromHome: 5,
        monthlyIncome: 17200,
        overTime: 0,
        jobSatisfaction: 3,
        environmentSatisfaction: 3,
        workLifeBalance: 3,
        yearsAtCompany: 10,
        yearsInCurrentRole: 6,
        yearsSinceLastPromotion: 4,
        stockOptionLevel: 2,
      },
      actualAttrition: 0,
    },
    {
      id: "EMP-0331",
      name: "Michael Chang",
      email: "m.chang@enterprise.io",
      department: "R&D" as const,
      jobRole: "DevOps Engineer",
      gender: "Male" as const,
      features: {
        age: 30,
        distanceFromHome: 25, // far commute
        monthlyIncome: 8100,
        overTime: 1, // heavy on-call rotation
        jobSatisfaction: 2,
        environmentSatisfaction: 2,
        workLifeBalance: 1, // severe impact
        yearsAtCompany: 2,
        yearsInCurrentRole: 2,
        yearsSinceLastPromotion: 2,
        stockOptionLevel: 0,
      },
      actualAttrition: 1,
    },
    {
      id: "EMP-0604",
      name: "Hannah Abbot",
      email: "h.abbot@enterprise.io",
      department: "HR" as const,
      jobRole: "Talent Acquisition Specialist",
      gender: "Female" as const,
      features: {
        age: 27,
        distanceFromHome: 8,
        monthlyIncome: 4900,
        overTime: 0,
        jobSatisfaction: 3,
        environmentSatisfaction: 3,
        workLifeBalance: 3,
        yearsAtCompany: 2,
        yearsInCurrentRole: 1,
        yearsSinceLastPromotion: 1,
        stockOptionLevel: 1,
      },
      actualAttrition: 0,
    },
    {
      id: "EMP-0715",
      name: "James Wilson",
      email: "j.wilson@enterprise.io",
      department: "Sales" as const,
      jobRole: "Sales Associate",
      gender: "Male" as const,
      features: {
        age: 24,
        distanceFromHome: 30, // maximum distance
        monthlyIncome: 3500, // low salary
        overTime: 1, // lots of pressure
        jobSatisfaction: 1, // miserable
        environmentSatisfaction: 1,
        workLifeBalance: 2,
        yearsAtCompany: 1,
        yearsInCurrentRole: 1,
        yearsSinceLastPromotion: 1,
        stockOptionLevel: 0,
      },
      actualAttrition: 1,
    },
  ];

  // Procedurally generate more realistic cases to populate exactly 50 employees for reliable analytical reporting
  const employeeNames = [
    "Grace Hopper", "Alan Turing", "Ada Lovelace", "Donald Knuth", "Linus Torvalds",
    "Ken Thompson", "Dennis Ritchie", "Margaret Hamilton", "Barbara Liskov", "Guido van Rossum",
    "Bjarne Stroustrup", "Tim Berners-Lee", "Richard Stallman", "James Gosling", "Yukihiro Matsumoto",
    "John McCarthy", "Vint Cerf", "Katherine Johnson", "Dorothy Vaughan", "Mary Jackson",
    "Robert Kahn", "Thomas Watson", "Grace Murray", "Seymour Cray", "Edger Dijkstra",
    "Claude Shannon", "Stephen Hawking", "Albert Einstein", "Marie Curie", "Nikola Tesla",
    "Isaac Newton", "Charles Darwin", "Galileo Galilei", "Louis Pasteur", "Richard Feynman",
    "Jane Goodall", "Rachel Carson", "Stephen Jay Gould", "Carl Sagan"
  ];

  const pool: Employee[] = [...rawPool];

  for (let i = 0; i < employeeNames.length; i++) {
    const dept = departments[i % departments.length];
    const isHighRiskRule = (i % 4 === 0); // Inject a standard structural latent rule

    let overTime = isHighRiskRule ? 1 : (i % 3 === 0 ? 1 : 0);
    let jobSatisfaction = isHighRiskRule ? (1 + (i % 2)) : (3 + (i % 2));
    let environmentSatisfaction = isHighRiskRule ? 1 : 3;
    let workLifeBalance = isHighRiskRule ? 1 : 3;
    let monthlyIncome = isHighRiskRule ? 3500 + (i * 100) : 6500 + (i * 250);
    let age = 22 + (i % 25);
    let distanceFromHome = isHighRiskRule ? 18 + (i % 12) : 2 + (i % 12);
    let stockOptionLevel = isHighRiskRule ? 0 : 1 + (i % 3);
    let yearsAtCompany = isHighRiskRule ? 1 + (i % 4) : 4 + (i % 10);
    let yearsInCurrentRole = Math.floor(yearsAtCompany * 0.7);
    let yearsSinceLastPromotion = isHighRiskRule ? 2 + (i % 3) : i % 3;

    let role = "";
    if (dept === "R&D") {
      role = i % 2 === 0 ? "Software Engineer" : "Systems Researcher";
    } else if (dept === "Sales") {
      role = i % 2 === 0 ? "Account Executive" : "Sales Development Rep";
    } else {
      role = i % 2 === 0 ? "HR Generalist" : "L&D Coordinator";
    }

    pool.push({
      id: `EMP-09${50 + i}`,
      name: employeeNames[i],
      email: `${employeeNames[i].toLowerCase().replace(" ", ".")}@enterprise.io`,
      department: dept,
      jobRole: role,
      gender: i % 2 === 0 ? "Female" : "Male",
      features: {
        age,
        distanceFromHome,
        monthlyIncome,
        overTime,
        jobSatisfaction,
        environmentSatisfaction,
        workLifeBalance,
        yearsAtCompany,
        yearsInCurrentRole,
        yearsSinceLastPromotion,
        stockOptionLevel,
      },
      actualAttrition: isHighRiskRule ? 1 : 0,
    });
  }

  return pool;
}

// Function to train our model on startup using the generated high-fidelity database
export function initializeAndTrainML(): Employee[] {
  const employees = generateInitialEmployees();
  
  const X = employees.map(emp => emp.features);
  const y = employees.map(emp => emp.actualAttrition || 0);

  // Train Gradient Boosting Binary Classifier
  mlModel.fit(X, y);

  // Apply predictions and SHAP interpretations back to our active employees
  for (const emp of employees) {
    const risk = mlModel.predict(emp.features);
    emp.riskProbability = Math.min(Math.max(risk, 0.01), 0.99); // boundary clamping

    const explanation = mlModel.explain(emp.features);
    emp.shapValues = explanation.attributions;

    // Apply standard ITDO bootstrap status
    if (emp.riskProbability > 0.70) {
      emp.itdoStatus = "Trigger";
      emp.itdoDetails = {
        triggerAlert: emp.features.overTime === 1 && emp.features.workLifeBalance <= 2
          ? "Overwork & Burnout Alert: Continuous overtime paired with severe Work-Life imbalance."
          : emp.features.yearsSinceLastPromotion >= 3
          ? "Stagnation Risk Alert: No promotional progression in the last 3+ years."
          : "Compensation Red-Line Alert: Compensation level falls below current market parity index.",
        decisionMade: "",
        operationsCompleted: [],
        operationsPending: [
          "Establish formal 1-on-1 retention review",
          "Conduct internal market compensation salary review"
        ],
        lastUpdated: new Date().toISOString()
      };
    } else {
      emp.itdoStatus = "Insight";
      emp.itdoDetails = {
        triggerAlert: "",
        decisionMade: "",
        operationsCompleted: [],
        operationsPending: [],
        lastUpdated: new Date().toISOString()
      };
    }
  }

  return employees;
}
