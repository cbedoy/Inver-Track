
export interface Investment {
  id: string;
  name: string;
  amount: number;
  annualYield: number; // Percentage, e.g., 11.5
}

export interface PortfolioSummary {
  totalAmount: number;
  weightedAverageYield: number;
  monthlyIncome: number;
}
