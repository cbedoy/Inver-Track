
export interface Investment {
  id: string;
  name: string;
  amount: number;
  annualYield: number; // Percentage, e.g., 11.5
}

export interface AdditionalIncome {
  id: string;
  description: string;
  amount: number;
  date: string; // ISO format YYYY-MM-DD
}

export interface PortfolioSummary {
  totalAmount: number;
  weightedAverageYield: number;
  monthlyIncome: number;
}
