
import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  TrendingUp, 
  PieChart as PieIcon, 
  Wallet, 
  RefreshCw,
  Sparkles,
  Calendar,
  ArrowUpRight
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Investment, PortfolioSummary } from './types';
import { GoogleGenAI } from "@google/genai";

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

const App: React.FC = () => {
  const [investments, setInvestments] = useState<Investment[]>([
    { id: '1', name: 'Open Bank', amount: 2230450.09, annualYield: 11.76 },
    { id: '2', name: 'Didi', amount: 160.16, annualYield: 0.00 },
    { id: '3', name: 'Efectivo', amount: 0.08, annualYield: 0.00 },
    { id: '4', name: 'ML (Mercado Libre)', amount: 249820.13, annualYield: 9.16 },
    { id: '5', name: 'Nu', amount: 247800.13, annualYield: 9.08 }
  ]);

  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [projectionDays, setProjectionDays] = useState<number>(30);

  const summary = useMemo<PortfolioSummary>(() => {
    const totalAmount = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const weightedSum = investments.reduce((sum, inv) => sum + (inv.amount * inv.annualYield), 0);
    const weightedAverageYield = totalAmount > 0 ? weightedSum / totalAmount : 0;
    const monthlyIncome = (totalAmount * (weightedAverageYield / 100)) / 12;

    return { totalAmount, weightedAverageYield, monthlyIncome };
  }, [investments]);

  // Formateador de fechas en español
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }), []);

  // Daily Projection Data Generation with Dates
  const dailyProjection = useMemo(() => {
    const data = [];
    let currentCapital = summary.totalAmount;
    // Tasa diaria equivalente a la tasa anual compuesta
    const dailyRate = Math.pow(1 + summary.weightedAverageYield / 100, 1 / 365) - 1;
    
    const startDate = new Date();

    for (let i = 0; i < projectionDays; i++) {
      const dailyEarned = currentCapital * dailyRate;
      currentCapital += dailyEarned;
      
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i + 1);

      data.push({
        day: i + 1,
        date: dateFormatter.format(currentDate),
        earned: dailyEarned,
        total: currentCapital
      });
    }
    return data;
  }, [summary.totalAmount, summary.weightedAverageYield, projectionDays, dateFormatter]);

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
        
        Por favor, ofrece 3 puntos clave sobre la diversificación y una sugerencia de optimización en español.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });

      setAiAnalysis(response.text || "No se pudo generar el análisis.");
    } catch (error) {
      console.error("Error calling Gemini:", error);
      setAiAnalysis("Hubo un error al conectar con la IA.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-indigo-100 shadow-lg">
              <Wallet className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">InverTrack</h1>
          </div>
          <button 
            onClick={addInvestment}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nueva Inversión</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        
        {/* Summary Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-sm font-medium text-slate-500 mb-1">Capital Total</p>
            <h2 className="text-3xl font-bold text-slate-900">{formatCurrency(summary.totalAmount)}</h2>
            <div className="mt-4 text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full w-fit text-xs font-semibold">
              Patrimonio Líquido
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-sm font-medium text-slate-500 mb-1">Rendimiento Promedio</p>
            <h2 className="text-3xl font-bold text-emerald-600">{summary.weightedAverageYield.toFixed(2)}% <span className="text-sm text-slate-400 font-normal">anual</span></h2>
            <div className="mt-4 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full w-fit text-xs font-semibold">
              Ponderado por monto
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-sm font-medium text-slate-500 mb-1">Ganancia Estimada Mes</p>
            <h2 className="text-3xl font-bold text-slate-900">{formatCurrency(summary.monthlyIncome)}</h2>
            <div className="mt-4 text-amber-600 bg-amber-50 px-3 py-1 rounded-full w-fit text-xs font-semibold">
              Basado en tasa actual
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main List & Projections */}
          <section className="lg:col-span-2 space-y-8">
            {/* Accounts Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                  Cuentas de Inversión
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Entidad</th>
                      <th className="px-6 py-4">Monto</th>
                      <th className="px-6 py-4">Tasa Anual</th>
                      <th className="px-6 py-4 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {investments.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <input type="text" value={inv.name} onChange={(e) => updateInvestment(inv.id, 'name', e.target.value)} className="bg-transparent border-none focus:ring-0 font-medium text-slate-700 w-full" placeholder="Ej. Nu Bank" />
                        </td>
                        <td className="px-6 py-4">
                          <input type="number" value={inv.amount || ''} onChange={(e) => updateInvestment(inv.id, 'amount', parseFloat(e.target.value) || 0)} className="bg-transparent border-none focus:ring-0 font-semibold text-slate-900 w-full" />
                        </td>
                        <td className="px-6 py-4 flex items-center gap-1">
                          <input type="number" value={inv.annualYield || ''} step="0.01" onChange={(e) => updateInvestment(inv.id, 'annualYield', parseFloat(e.target.value) || 0)} className="bg-transparent border-none focus:ring-0 text-emerald-600 font-bold w-16" />
                          <span className="text-slate-400">%</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => deleteInvestment(inv.id)} className="text-slate-300 hover:text-red-500 p-2 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* DAILY PROJECTION TABLE */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  Proyección Día a Día
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 font-medium">Periodo:</span>
                  <select 
                    value={projectionDays} 
                    onChange={(e) => setProjectionDays(Number(e.target.value))}
                    className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
                  >
                    <option value={7}>Próximos 7 días</option>
                    <option value={30}>Próximos 30 días</option>
                    <option value={90}>Próximos 90 días</option>
                    <option value={365}>Próximo año</option>
                  </select>
                </div>
              </div>
              <div className="p-4 bg-emerald-50/40 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-700">
                  <ArrowUpRight className="w-4 h-4" />
                  <span className="text-sm font-semibold">Ganancia neta proyectada:</span>
                </div>
                <span className="text-lg font-bold text-emerald-700">
                  {formatCurrency(dailyProjection[dailyProjection.length - 1]?.total - summary.totalAmount || 0)}
                </span>
              </div>
              <div className="overflow-y-auto max-h-[600px]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/80 sticky top-0 backdrop-blur-sm text-slate-500 font-bold uppercase text-[10px] tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3">Fecha</th>
                      <th className="px-6 py-3">Interés Generado</th>
                      <th className="px-6 py-3">Capital Acumulado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {dailyProjection.map((day) => (
                      <tr key={day.day} className="hover:bg-indigo-50/20 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-slate-900 font-semibold">{day.date}</span>
                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Día {day.day}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold">
                            <ArrowUpRight className="w-3 h-3" />
                            {formatCurrency(day.earned)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-900 font-bold font-mono tracking-tight">{formatCurrency(day.total)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Side Panels */}
          <section className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-6">
                <PieIcon className="w-4 h-4 text-indigo-500" />
                Distribución
              </h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={investments.filter(i => i.amount > 0)} 
                      innerRadius={60} 
                      outerRadius={80} 
                      paddingAngle={5} 
                      dataKey="amount" 
                      nameKey="name"
                      stroke="none"
                    >
                      {investments.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip 
                      formatter={(val: number) => formatCurrency(val)}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {investments.filter(i => i.amount > 0).map((inv, idx) => (
                  <div key={inv.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-600">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                      {inv.name}
                    </div>
                    <span className="font-bold text-slate-900">{((inv.amount / summary.totalAmount) * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  IA Financial Insights
                </h3>
                <button 
                  onClick={analyzeWithAI} 
                  disabled={isAnalyzing} 
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-indigo-600 transition-colors disabled:opacity-30"
                  title="Generar análisis inteligente"
                >
                  <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                </button>
              </div>
              {aiAnalysis ? (
                <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-wrap">
                  {aiAnalysis}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                  <Sparkles className="w-8 h-8 mb-2 opacity-10" />
                  <p className="text-xs text-center px-4 italic">Presiona el icono de recargar para obtener consejos de inversión personalizados.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 p-4 md:hidden z-20">
        <div className="flex justify-between items-center max-w-7xl mx-auto px-4">
           <div>
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Capital</p>
             <p className="text-lg font-bold text-slate-900">{formatCurrency(summary.totalAmount)}</p>
           </div>
           <button onClick={addInvestment} className="bg-indigo-600 p-3 rounded-full text-white shadow-xl shadow-indigo-200 active:scale-90 transition-transform"><Plus className="w-6 h-6" /></button>
        </div>
      </footer>
    </div>
  );
};

export default App;
