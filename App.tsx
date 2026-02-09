
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  TrendingUp, 
  PieChart as PieIcon, 
  Wallet, 
  RefreshCw,
  Sparkles,
  Calendar,
  ArrowUpRight,
  Save,
  Banknote,
  PlusCircle,
  Info,
  ChevronRight
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Investment, PortfolioSummary, AdditionalIncome } from './types';
import { GoogleGenAI } from "@google/genai";

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];
const STORAGE_KEY = 'invertrack_v3_master_data';

// Función de utilidad global para formateo de moneda
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);
};

const App: React.FC = () => {
  // Estado principal con persistencia total (Inversiones + Salario + Ingresos Extra)
  const [data, setData] = useState<{
    investments: Investment[];
    salary: number;
    extraIncomes: AdditionalIncome[];
  }>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          investments: parsed.investments || [],
          salary: parsed.salary || 0,
          extraIncomes: parsed.extraIncomes || []
        };
      } catch (e) {
        console.error("Error al cargar datos:", e);
      }
    }
    // Valores iniciales por defecto
    return {
      investments: [
        { id: '1', name: 'Open Bank', amount: 223045, annualYield: 11.76 },
        { id: '2', name: 'Didi', amount: 16, annualYield: 16.00 },
        { id: '3', name: 'Efectivo', amount: 0.085, annualYield: 0.00 },
        { id: '4', name: 'ML', amount: 24982, annualYield: 9.16 },
        { id: '5', name: 'Nu', amount: 24780, annualYield: 9.08 }
      ],
      salary: 0,
      extraIncomes: []
    };
  });

  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [projectionDays, setProjectionDays] = useState<number>(30);

  // Efecto para persistencia automática
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const summary = useMemo<PortfolioSummary>(() => {
    const totalAmount = data.investments.reduce((sum, inv) => sum + inv.amount, 0);
    const weightedSum = data.investments.reduce((sum, inv) => sum + (inv.amount * inv.annualYield), 0);
    const weightedAverageYield = totalAmount > 0 ? weightedSum / totalAmount : 0;
    const monthlyIncome = (totalAmount * (weightedAverageYield / 100)) / 12;

    return { totalAmount, weightedAverageYield, monthlyIncome };
  }, [data.investments]);

  const dateFormatter = useMemo(() => new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }), []);

  // Lógica de Proyección de Crecimiento (Considera Interés Diario + Salario + Ingresos Extra)
  const dailyProjection = useMemo(() => {
    const results = [];
    let currentCapital = summary.totalAmount;
    const dailyRate = summary.weightedAverageYield > 0 
      ? Math.pow(1 + summary.weightedAverageYield / 100, 1 / 365) - 1 
      : 0;
    
    const startDate = new Date();

    for (let i = 0; i < projectionDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i + 1);
      
      const dayOfMonth = currentDate.getDate();
      const monthDays = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
      
      let events = [];
      let incomeToday = 0;

      // 1. Inyección de Salario (Días 15 y último del mes)
      if (dayOfMonth === 15 || dayOfMonth === monthDays) {
        incomeToday += data.salary;
        events.push(`Quincena: +${formatCurrency(data.salary)}`);
      }

      // 2. Inyección de Ingresos Extra (Búsqueda por fecha)
      const isoDate = currentDate.toISOString().split('T')[0];
      data.extraIncomes.forEach(extra => {
        if (extra.date === isoDate) {
          incomeToday += extra.amount;
          events.push(`${extra.description || 'Ingreso Extra'}: +${formatCurrency(extra.amount)}`);
        }
      });

      // Aplicar inyecciones antes de calcular el interés del día
      currentCapital += incomeToday;

      // 3. Cálculo de Interés Compuesto Diario
      const dailyEarned = currentCapital * dailyRate;
      currentCapital += dailyEarned;

      results.push({
        day: i + 1,
        date: dateFormatter.format(currentDate),
        earned: dailyEarned,
        income: incomeToday,
        events: events,
        total: currentCapital
      });
    }
    return results;
  }, [summary, data.salary, data.extraIncomes, projectionDays, dateFormatter]);

  // Handlers para edición
  const updateSalary = (val: number) => setData(prev => ({ ...prev, salary: val }));
  
  const addExtraIncome = () => {
    const newIncome: AdditionalIncome = {
      id: crypto.randomUUID(),
      description: 'Ingreso Extra',
      amount: 0,
      date: new Date().toISOString().split('T')[0]
    };
    setData(prev => ({ ...prev, extraIncomes: [...prev.extraIncomes, newIncome] }));
  };

  const updateExtraIncome = (id: string, field: keyof AdditionalIncome, value: any) => {
    setData(prev => ({
      ...prev,
      extraIncomes: prev.extraIncomes.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const removeExtraIncome = (id: string) => {
    setData(prev => ({ ...prev, extraIncomes: prev.extraIncomes.filter(item => item.id !== id) }));
  };

  const updateInvestment = (id: string, field: keyof Investment, value: any) => {
    setData(prev => ({
      ...prev,
      investments: prev.investments.map(inv => inv.id === id ? { ...inv, [field]: value } : inv)
    }));
  };

  const addInvestment = () => {
    setData(prev => ({
      ...prev,
      investments: [...prev.investments, { id: crypto.randomUUID(), name: '', amount: 0, annualYield: 0 }]
    }));
  };

  // Análisis con IA Gemini
  const analyzeWithAI = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const totalDays = projectionDays;
      const finalCapital = dailyProjection[dailyProjection.length - 1]?.total || 0;
      
      const prompt = `Actúa como un experto asesor financiero. Analiza mi perfil financiero:
        
        - Capital Inicial: ${formatCurrency(summary.totalAmount)}
        - Tasa Promedio Anual: ${summary.weightedAverageYield.toFixed(2)}%
        - Salario Quincenal: ${formatCurrency(data.salary)}
        - Ingresos Extra Programados: ${data.extraIncomes.length}
        
        Distribución de Inversiones:
        ${data.investments.map(inv => `- ${inv.name}: ${formatCurrency(inv.amount)} al ${inv.annualYield}%`).join('\n')}
        
        Proyección a ${totalDays} días:
        - Saldo final estimado: ${formatCurrency(finalCapital)}
        
        Proporciona un análisis en español (formato Markdown) que incluya:
        1. Resumen de la estrategia actual.
        2. Evaluación de la diversificación.
        3. Una sugerencia para maximizar el interés compuesto con mi salario actual.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setAiAnalysis(response.text || 'No se pudo generar el análisis.');
    } catch (error) {
      console.error("AI Error:", error);
      setAiAnalysis("Error al conectar con la IA.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-100">
              <Wallet className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 leading-tight">InverTrack</h1>
              <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">Master Capital</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full uppercase tracking-wider border border-emerald-100">
              <Save className="w-3 h-3" />
              Sincronizado Local
            </div>
            <button 
              onClick={addInvestment}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 text-xs"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nueva Inversión</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* LADO IZQUIERDO: CONFIGURACIÓN PERSISTENTE */}
          <aside className="lg:col-span-1 space-y-6">
            
            {/* Salario */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 text-sm">
                <Banknote className="w-4 h-4 text-emerald-500" />
                Flujo Salarial
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-400 block mb-1.5 tracking-wider">Monto Quincenal</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input 
                      type="number" 
                      value={data.salary || ''} 
                      onChange={(e) => updateSalary(parseFloat(e.target.value) || 0)}
                      className="w-full pl-7 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-black text-slate-700 transition-all text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="mt-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                    <p className="text-[10px] text-indigo-700 leading-relaxed font-medium">
                      <Info className="w-3 h-3 inline mr-1 mb-0.5" />
                      Tu capital se incrementará automáticamente en esta cantidad cada día 15 y el último día de cada mes.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Ingresos Extra con Alias */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                  <PlusCircle className="w-4 h-4 text-indigo-500" />
                  Ingresos Extras
                </h3>
                <button 
                  onClick={addExtraIncome} 
                  className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {data.extraIncomes.map(income => (
                  <div key={income.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 relative group transition-all hover:border-indigo-200">
                    <button 
                      onClick={() => removeExtraIncome(income.id)} 
                      className="absolute -top-2 -right-2 bg-white text-red-500 p-1.5 rounded-full shadow-sm border border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <input 
                      type="text" 
                      placeholder="Alias (ej. Bono)"
                      value={income.description} 
                      onChange={(e) => updateExtraIncome(income.id, 'description', e.target.value)}
                      className="bg-transparent border-none p-0 text-xs font-black text-slate-800 w-full focus:ring-0 mb-3"
                    />
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-100">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <input 
                          type="date" 
                          value={income.date} 
                          onChange={(e) => updateExtraIncome(income.id, 'date', e.target.value)}
                          className="bg-transparent border-none text-[10px] p-0 outline-none w-full font-medium"
                        />
                      </div>
                      <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-100">
                        <span className="text-[10px] font-bold text-emerald-600">$</span>
                        <input 
                          type="number" 
                          value={income.amount || ''} 
                          onChange={(e) => updateExtraIncome(income.id, 'amount', parseFloat(e.target.value) || 0)}
                          className="bg-transparent border-none text-[10px] p-0 outline-none font-black text-emerald-600 w-full"
                          placeholder="Monto"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {data.extraIncomes.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-[10px] text-slate-400 italic">No hay ingresos extra programados.</p>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* ÁREA PRINCIPAL */}
          <div className="lg:col-span-3 space-y-8">
            
            {/* Tarjetas de Resumen Superior */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Capital Actual</p>
                <h2 className="text-3xl font-black text-slate-900">{formatCurrency(summary.totalAmount)}</h2>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rendimiento Ponderado</p>
                <h2 className="text-3xl font-black text-emerald-600">
                  {summary.weightedAverageYield.toFixed(2)}% 
                  <span className="text-xs text-slate-400 font-normal ml-1">anual</span>
                </h2>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Inyección Mensual</p>
                <h2 className="text-3xl font-black text-indigo-600">{formatCurrency(data.salary * 2)}</h2>
              </div>
            </section>

            {/* Inversiones Detalladas */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-black text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                  Distribución de Capital
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="px-8 py-4">Cuenta / Entidad</th>
                      <th className="px-8 py-4">Monto ($)</th>
                      <th className="px-8 py-4">Tasa Anual (%)</th>
                      <th className="px-8 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.investments.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5">
                          <input 
                            type="text" 
                            value={inv.name} 
                            onChange={(e) => updateInvestment(inv.id, 'name', e.target.value)} 
                            className="bg-transparent border-none focus:ring-0 font-black text-slate-700 w-full text-sm" 
                            placeholder="Nombre de cuenta" 
                          />
                        </td>
                        <td className="px-8 py-5">
                          <input 
                            type="number" 
                            value={inv.amount || ''} 
                            onChange={(e) => updateInvestment(inv.id, 'amount', parseFloat(e.target.value) || 0)} 
                            className="bg-transparent border-none focus:ring-0 font-black text-slate-900 w-full text-sm" 
                          />
                        </td>
                        <td className="px-8 py-5 flex items-center gap-1">
                          <input 
                            type="number" 
                            value={inv.annualYield || ''} 
                            step="0.01" 
                            onChange={(e) => updateInvestment(inv.id, 'annualYield', parseFloat(e.target.value) || 0)} 
                            className="bg-transparent border-none focus:ring-0 text-emerald-600 font-black w-20 text-sm text-right" 
                          />
                          <span className="text-slate-400 font-bold text-xs">%</span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <button 
                            onClick={() => setData(prev => ({ ...prev, investments: prev.investments.filter(i => i.id !== inv.id)}))} 
                            className="text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TABLA DE CRECIMIENTO DIARIO (PROYECCIÓN HASTA 1 AÑO) */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-8 py-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-indigo-50/30">
                <h3 className="font-black text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  Crecimiento Diario de Capital
                </h3>
                <div className="flex items-center gap-2 bg-white px-4 py-1.5 rounded-2xl border border-indigo-100 shadow-sm">
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Periodo:</span>
                  <select 
                    value={projectionDays} 
                    onChange={(e) => setProjectionDays(Number(e.target.value))}
                    className="text-xs font-black text-slate-700 bg-transparent border-none focus:ring-0 outline-none cursor-pointer"
                  >
                    <option value={15}>15 Días</option>
                    <option value={30}>1 Mes</option>
                    <option value={90}>3 Meses</option>
                    <option value={180}>6 Meses</option>
                    <option value={365}>1 Año (365 días)</option>
                  </select>
                </div>
              </div>

              {/* Header de Resumen de Proyección */}
              <div className="grid grid-cols-1 md:grid-cols-2 bg-white border-b border-slate-100">
                <div className="p-6 border-r border-slate-100 flex items-center gap-4">
                  <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Final Estimado</p>
                    <p className="text-xl font-black text-slate-900">{formatCurrency(dailyProjection[dailyProjection.length - 1]?.total || 0)}</p>
                  </div>
                </div>
                <div className="p-6 flex items-center gap-4">
                  <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600">
                    <ArrowUpRight className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plusvalía del Periodo</p>
                    <p className="text-xl font-black text-indigo-600">
                      +{formatCurrency((dailyProjection[dailyProjection.length - 1]?.total || 0) - summary.totalAmount)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Lista Scrollable */}
              <div className="overflow-y-auto max-h-[600px] custom-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 sticky top-0 backdrop-blur-md text-slate-500 font-black uppercase text-[9px] tracking-widest border-b border-slate-100 z-10">
                    <tr>
                      <th className="px-8 py-3 w-1/4">Fecha</th>
                      <th className="px-8 py-3 w-1/3">Movimientos</th>
                      <th className="px-8 py-3">Interés</th>
                      <th className="px-8 py-3 text-right">Saldo Final</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {dailyProjection.map((day) => (
                      <tr key={day.day} className={`hover:bg-indigo-50/20 transition-colors ${day.income > 0 ? 'bg-emerald-50/40' : ''}`}>
                        <td className="px-8 py-4">
                          <div className="flex flex-col">
                            <span className="text-slate-900 font-black">{day.date}</span>
                            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-tight">Día {day.day}</span>
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          {day.events.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {day.events.map((ev, idx) => (
                                <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-black text-[9px] uppercase tracking-tighter">
                                  <ChevronRight className="w-2 h-2" />
                                  {ev}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-300 italic text-[10px] font-medium tracking-tight">Solo rendimientos</span>
                          )}
                        </td>
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-1 text-emerald-600 font-black">
                            <span className="text-[9px]">$</span>
                            {day.earned.toFixed(2)}
                          </div>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <span className="text-slate-900 font-black text-sm tracking-tight">{formatCurrency(day.total)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* BOTÓN FLOTANTE: INTELIGENCIA FINANCIERA */}
      <button 
        onClick={analyzeWithAI}
        disabled={isAnalyzing}
        className="fixed bottom-8 right-8 bg-slate-900 hover:bg-black text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-3 group transition-all z-40 active:scale-95 disabled:opacity-50 border border-slate-700"
      >
        <Sparkles className={`w-5 h-5 text-amber-400 ${isAnalyzing ? 'animate-spin' : ''}`} />
        <span className="font-black text-sm uppercase tracking-widest overflow-hidden max-w-0 group-hover:max-w-xs transition-all duration-500 whitespace-nowrap">
          {isAnalyzing ? 'Consultando...' : 'Asesor AI'}
        </span>
      </button>

      {/* MODAL DE ANÁLISIS AI */}
      {aiAnalysis && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-indigo-600">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-amber-300" />
                <h3 className="font-black text-white text-lg uppercase tracking-wider">
                  Financial Strategy by Gemini
                </h3>
              </div>
              <button 
                onClick={() => setAiAnalysis(null)} 
                className="text-white/60 hover:text-white text-3xl font-light transition-colors leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-10 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap max-h-[60vh] overflow-y-auto custom-scrollbar prose prose-slate">
              {aiAnalysis}
            </div>
            <div className="p-8 bg-slate-50 flex justify-center border-t border-slate-100">
              <button 
                onClick={() => setAiAnalysis(null)} 
                className="px-12 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95"
              >
                Cerrar Análisis
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
