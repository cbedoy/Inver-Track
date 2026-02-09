
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  TrendingUp, 
  PieChart as PieIcon, 
  Wallet, 
  RefreshCw,
  Sparkles,
  Info
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Investment, PortfolioSummary } from './types';
import { GoogleGenAI } from "@google/genai";

// Predefined colors for charts
const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

const App: React.FC = () => {
  // Initial state with user-provided sample data
  const [investments, setInvestments] = useState<Investment[]>([
    { id: '1', name: 'Open Bank', amount: 2230450.09, annualYield: 11.76 },
    { id: '2', name: 'Didi', amount: 160.16, annualYield: 0.00 },
    { id: '3', name: 'Efectivo', amount: 0.08, annualYield: 0.00 },
    { id: '4', name: 'ML (Mercado Libre)', amount: 249820.13, annualYield: 9.16 },
    { id: '5', name: 'Nu', amount: 247800.13, annualYield: 9.08 }
  ]);

  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Calculations
  const summary = useMemo<PortfolioSummary>(() => {
    const totalAmount = investments.reduce((sum, inv) => sum + inv.amount, 0);
    
    // Weighted Average: Sum (Amount * Yield) / Total Amount
    const weightedSum = investments.reduce((sum, inv) => sum + (inv.amount * inv.annualYield), 0);
    const weightedAverageYield = totalAmount > 0 ? weightedSum / totalAmount : 0;
    
    // Monthly income estimate
    const monthlyIncome = (totalAmount * (weightedAverageYield / 100)) / 12;

    return { totalAmount, weightedAverageYield, monthlyIncome };
  }, [investments]);

  const addInvestment = () => {
    const newInv: Investment = {
      id: crypto.randomUUID(),
      name: '',
      amount: 0,
      annualYield: 0
    };
    setInvestments([...investments, newInv]);
  };

  const updateInvestment = (id: string, field: keyof Investment, value: string | number) => {
    setInvestments(investments.map(inv => 
      inv.id === id ? { ...inv, [field]: value } : inv
    ));
  };

  const deleteInvestment = (id: string) => {
    setInvestments(investments.filter(inv => inv.id !== id));
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);
  };

  const analyzeWithAI = async () => {
    if (investments.length === 0) return;
    setIsAnalyzing(true);
    setAiAnalysis(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        Analiza el siguiente portafolio de inversiones:
        ${investments.map(i => `- ${i.name}: ${formatCurrency(i.amount)} con ${i.annualYield}% anual`).join('\n')}
        
        Datos generales:
        Total: ${formatCurrency(summary.totalAmount)}
        Rendimiento Promedio Ponderado: ${summary.weightedAverageYield.toFixed(2)}%
        Ingreso Mensual Estimado: ${formatCurrency(summary.monthlyIncome)}

        Por favor, ofrece 3 puntos clave sobre la diversificación, el rendimiento y una sugerencia de optimización basada en estos datos en español. Sé conciso y profesional.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });

      setAiAnalysis(response.text || "No se pudo generar el análisis.");
    } catch (error) {
      console.error("Error calling Gemini:", error);
      setAiAnalysis("Hubo un error al conectar con la IA. Por favor, intenta de nuevo.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Wallet className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">InverTrack</h1>
          </div>
          <button 
            onClick={addInvestment}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nueva Inversión</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        
        {/* Summary Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Capital Total</p>
              <h2 className="text-3xl font-bold text-slate-900">{formatCurrency(summary.totalAmount)}</h2>
            </div>
            <div className="mt-4 flex items-center text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full w-fit text-xs font-semibold">
              Patrimonio Líquido
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Rendimiento Promedio (Ponderado)</p>
              <h2 className="text-3xl font-bold text-emerald-600">{summary.weightedAverageYield.toFixed(2)}% <span className="text-sm text-slate-400 font-normal">anual</span></h2>
            </div>
            <div className="mt-4 flex items-center text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full w-fit text-xs font-semibold">
              Eficiencia del Capital
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Ingreso Mensual Proyectado</p>
              <h2 className="text-3xl font-bold text-slate-900">{formatCurrency(summary.monthlyIncome)}</h2>
            </div>
            <div className="mt-4 flex items-center text-amber-600 bg-amber-50 px-3 py-1 rounded-full w-fit text-xs font-semibold">
              Estimación de Cashflow
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main List */}
          <section className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                  Desglose de Cuentas
                </h3>
                <span className="text-xs text-slate-400">{investments.length} cuentas registradas</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <th className="px-6 py-4">Nombre / Entidad</th>
                      <th className="px-6 py-4">Monto ($)</th>
                      <th className="px-6 py-4">Rendimiento (%)</th>
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {investments.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <input 
                            type="text" 
                            value={inv.name}
                            placeholder="Nombre de la cuenta..."
                            onChange={(e) => updateInvestment(inv.id, 'name', e.target.value)}
                            className="w-full bg-transparent border-none focus:ring-0 font-medium text-slate-700 placeholder:text-slate-300 placeholder:font-normal"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input 
                            type="number" 
                            value={inv.amount || ''}
                            onChange={(e) => updateInvestment(inv.id, 'amount', parseFloat(e.target.value) || 0)}
                            className="w-full bg-transparent border-none focus:ring-0 font-semibold text-slate-900"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              value={inv.annualYield || ''}
                              step="0.01"
                              onChange={(e) => updateInvestment(inv.id, 'annualYield', parseFloat(e.target.value) || 0)}
                              className="w-20 bg-transparent border-none focus:ring-0 text-emerald-600 font-bold"
                            />
                            <span className="text-slate-400">%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => deleteInvestment(inv.id)}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {investments.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                          No hay inversiones registradas. Haz clic en "Nueva Inversión" para empezar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {investments.length > 0 && (
                    <tfoot className="bg-slate-50 font-bold">
                      <tr>
                        <td className="px-6 py-4 text-slate-600">Total Portafolio</td>
                        <td className="px-6 py-4 text-slate-900">{formatCurrency(summary.totalAmount)}</td>
                        <td className="px-6 py-4 text-emerald-600 text-sm">Avg: {summary.weightedAverageYield.toFixed(2)}%</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* AI Insights Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Análisis Inteligente (AI)
                </h3>
                <button 
                  onClick={analyzeWithAI}
                  disabled={isAnalyzing || investments.length === 0}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  Actualizar Análisis
                </button>
              </div>
              
              {aiAnalysis ? (
                <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {aiAnalysis}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Info className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-sm">Haz clic en actualizar para obtener insights sobre tu portafolio.</p>
                </div>
              )}
            </div>
          </section>

          {/* Side Visualization */}
          <section className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-fit">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-6">
                <PieIcon className="w-4 h-4 text-indigo-500" />
                Distribución de Capital
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={investments.filter(i => i.amount > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="amount"
                      nameKey="name"
                    >
                      {investments.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200">
              <h4 className="font-bold mb-2">Tip de Inversión</h4>
              <p className="text-indigo-100 text-sm leading-relaxed">
                Recuerda que el rendimiento promedio ponderado es más preciso que el simple, ya que considera cuánto dinero tienes trabajando en cada tasa.
              </p>
            </div>
          </section>

        </div>
      </main>

      {/* Floating Info for Mobile (optional visibility) */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 p-4 md:hidden">
        <div className="flex justify-between items-center max-w-7xl mx-auto px-4">
           <div>
             <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Total Capital</p>
             <p className="text-lg font-bold text-slate-900">{formatCurrency(summary.totalAmount)}</p>
           </div>
           <button 
             onClick={addInvestment}
             className="bg-indigo-600 p-3 rounded-full text-white shadow-lg shadow-indigo-200"
            >
              <Plus className="w-6 h-6" />
           </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
