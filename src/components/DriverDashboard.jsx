import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { LogOut, Moon, Sun, DollarSign, Wrench, History, Calendar, Hash, Tag, MessageSquare, Send, Loader2, Inbox, ShieldCheck, Clock3, Gauge, Fuel, MapPin, ChevronRight } from 'lucide-react';

import twaraLogo from '../assets/logo.png';

export default function DriverDashboard() {
  const { profile, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('versement');
  const [metaPlate, setMetaPlate] = useState('N/A');
  
  // States za fomu ya Versement
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [transactionId, setTransactionId] = useState('');

  // States za fomu ya Depense
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('fuel'); 
  const [reason, setReason] = useState('');

  // States z'amateka (History)
  const [historyItems, setHistoryItems] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Status za submission
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const categories = [
    { value: 'fuel', label: '⛽ Lisansi (Fuel)' },
    { value: 'repair', label: '🛠️ Gukora / Gukosora (Repair)' },
    { value: 'maintenance', label: '🔧 Guhindura Amavuta / Maintenance' },
    { value: 'insurance', label: '📝 Assuransi (Insurance)' },
    { value: 'tax', label: '🏛️ Imisoro (Tax)' },
    { value: 'fine', label: '👮 Iminyago / Amande (Fine)' },
    { value: 'service', label: '🧼 Koza Moto / Service' },
    { value: 'parking', label: '🅿️ Parking' },
    { value: 'spare_parts', label: '⚙️ Ibyuma / Spare Parts' },
    { value: 'other', label: '📦 Ikindi Cyose (Other)' }
  ];

  useEffect(() => {
    async function getFreshMetadata() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.motorcycle_plate) {
        setMetaPlate(user.user_metadata.motorcycle_plate);
      } else if (profile?.motorcycle_plate) {
        setMetaPlate(profile.motorcycle_plate);
      }
    }
    getFreshMetadata();
  }, [profile]);

  const fetchDriverHistory = async () => {
    try {
      setLoadingHistory(true);
      
      const { data: driverData } = await supabase
        .from('drivers')
        .select('id')
        .eq('email', profile?.email)
        .single();

      if (!driverData) return;

      const longTermBack = new Date();
      longTermBack.setMonth(longTermBack.getMonth() - 12);
      const dateString = longTermBack.toISOString().split('T')[0];

      const { data: versements } = await supabase
        .from('versements')
        .select('*')
        .eq('driver_id', driverData.id)
        .gte('collection_date', dateString);

      const { data: assignData } = await supabase
        .from('driver_assignments')
        .select('motorcycle_id')
        .eq('driver_id', driverData.id)
        .eq('is_active', true)
        .maybeSingle();

      let expenses = [];
      if (assignData?.motorcycle_id) {
        const { data: expData } = await supabase
          .from('expenses')
          .select('*')
          .eq('motorcycle_id', assignData.motorcycle_id)
          .gte('expense_date', dateString);
        if (expData) expenses = expData;
      }

      const combined = [
        ...(versements || []).map(v => ({ ...v, type: 'versement', sortDate: v.collection_date })),
        ...(expenses || []).map(e => ({ ...e, type: 'expense', sortDate: e.expense_date }))
      ].sort((a, b) => new Date(b.sortDate) - new Date(a.sortDate));

      setHistoryItems(combined);
    } catch (err) {
      console.error("Error pulling history:", err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchDriverHistory();
    }
  }, [activeTab]);

  // 💰 WATERFALL BILLING ENGINE: CURRENT TARGET -> ACTIVE DEBTS DECUCTION -> TOMORROW SAVINGS
  const handleSubmitVersement = async (e) => {
    e.preventDefault();
    if (!amount || !date || !transactionId.trim()) {
      setMsg({ type: 'error', text: 'Wandika amafaranga, itariki, ndetse n\'inimero ya Trans ID (Reference)! Byose ni itegeko.' });
      return;
    }

    const selectedDateStr = date;
    const todayObj = new Date();
    const todayStr = todayObj.toISOString().split('T')[0];
    
    if (selectedDateStr > todayStr) {
      setMsg({ type: 'error', text: 'Ntabwo wemerewe guhitamo itariki y\'ahazaza n\'intoki! 🛑' });
      return;
    }

    try {
      setSubmitting(true);
      setMsg({ type: '', text: '' });

      const { data: driverData, error: driverErr } = await supabase
        .from('drivers')
        .select('*')
        .eq('email', profile?.email)
        .single();

      if (driverErr || !driverData) throw new Error("Umushoferi ntabwo abonetse muri sisitemu.");

      const { data: assignData } = await supabase
        .from('driver_assignments')
        .select('*, motorcycles(*)')
        .eq('driver_id', driverData.id)
        .eq('is_active', true)
        .maybeSingle();

      let remainingMoney = parseFloat(amount);
      const targetDaily = assignData?.motorcycles?.daily_target || 6000; 
      const isCurrentDate = (selectedDateStr === todayStr);

      // 🌟 IFREMU A: NIBA ARI ITARIKI YA NONE (CURRENT DATE PROCESSOR)
      if (isCurrentDate) {
        
        // 1. Mbese yishyuye munsi ya Target? (Auto-Debt Creator Mode)
        if (remainingMoney < targetDaily) {
          const { error: insErr } = await supabase.from('versements').insert([{
            owner_id: driverData.owner_id, 
            driver_id: driverData.id,
            motorcycle_id: assignData?.motorcycle_id || null, 
            collection_date: selectedDateStr,
            amount: remainingMoney,
            payment_method: 'mobile_money',
            reference_number: transactionId.trim(),
            status: 'pending' 
          }]);
          if (insErr) throw insErr;

          if (assignData?.motorcycle_id) {
            const deficit = targetDaily - remainingMoney;
            await supabase.from('debts').insert([{
              owner_id: driverData.owner_id,
              driver_id: driverData.id,
              motorcycle_id: assignData.motorcycle_id,
              debt_date: selectedDateStr,
              original_amount: deficit,
              remaining_amount: deficit,
              status: 'active',
              notes: `Ideni ryizanye kuko versement ya none yari munsi ya target (${remainingMoney.toLocaleString()} RWF).`
            }]);
          }

          setMsg({ type: 'success', text: `Versement yakiriwe! Ideni rya ${(targetDaily - remainingMoney).toLocaleString()} RWF ryamaze kubarwa automatically.` });
          setAmount('');
          setTransactionId('');
          return;
        }

        // 2. Yishyuye target cyangwa arengaho: Banza utemo 6,000 RWF y'uyu munsi ibe set!
        const { error: insCurrentErr } = await supabase.from('versements').insert([{
          owner_id: driverData.owner_id, 
          driver_id: driverData.id,
          motorcycle_id: assignData?.motorcycle_id || null, 
          collection_date: selectedDateStr,
          amount: targetDaily,
          payment_method: 'mobile_money',
          reference_number: transactionId.trim(),
          status: 'pending' 
        }]);
        if (insCurrentErr) throw insCurrentErr;

        remainingMoney -= targetDaily; // Hasigaye murengera (Surplus)
        let debtLogsCleared = 0;

        // 3. 🔍 REBA AMADENI ARI ACTIVE AYAKUREMO UHEREYE KU RYA KERA
        if (remainingMoney > 0 && assignData?.motorcycle_id) {
          const { data: activeDebts } = await supabase
            .from('debts')
            .select('*')
            .eq('driver_id', driverData.id)
            .eq('status', 'active')
            .order('debt_date', { ascending: true });

          if (activeDebts && activeDebts.length > 0) {
            for (let debt of activeDebts) {
              if (remainingMoney <= 0) break;

              const moneyToApply = Math.min(remainingMoney, debt.remaining_amount);
              const newRemainingDebt = debt.remaining_amount - moneyToApply;
              const newStatus = newRemainingDebt === 0 ? 'paid' : 'active';

              // Vugurura remaining balance y'ideni
              await supabase.from('debts').update({
                remaining_amount: newRemainingDebt,
                status: newStatus
              }).eq('id', debt.id);

              // Gushyira versement ihwanye n'iryo deni ku itariki ryabereyeho
              await supabase.from('versements').insert([{
                owner_id: driverData.owner_id,
                driver_id: driverData.id,
                motorcycle_id: assignData.motorcycle_id,
                collection_date: debt.debt_date, 
                amount: moneyToApply,
                payment_method: 'mobile_money',
                reference_number: `${transactionId.trim()}-DEBT-${debt.id.substring(0,4).toUpperCase()}`,
                status: 'pending',
                notes: `Versement yishfuye ideni ryo ku itariki ya ${debt.debt_date} binyuze mu murengera w'uyu munsi.`
              }]);

              remainingMoney -= moneyToApply;
              debtLogsCleared++;
            }
          }
        }

        // 4. 🚀 SAVING OF TOMORROW (ADVANCE): Niba na n'ubu hari asigaye nyuma y'amadeni yose, ajya ejo!
        if (remainingMoney > 0) {
          const tomorrowObj = new Date();
          tomorrowObj.setDate(tomorrowObj.getDate() + 1);
          const tomorrowStr = tomorrowObj.toISOString().split('T')[0];

          await supabase.from('versements').insert([{
            owner_id: driverData.owner_id, 
            driver_id: driverData.id,
            motorcycle_id: assignData?.motorcycle_id || null, 
            collection_date: tomorrowStr,
            amount: remainingMoney,
            payment_method: 'mobile_money',
            reference_number: `${transactionId.trim()}-TOMORROW`,
            status: 'pending',
            notes: `Versement yizigamiye y'ejo (Advance) kuko amadeni yose yari ashize mu bitabo.`
          }]);

          setMsg({ type: 'success', text: `Umuvuno mwiza! 6,000 RWF yagiye ku y'uyu munsi. Amadeni yakosowe: ${debtLogsCleared}. Ayasigaye ${remainingMoney.toLocaleString()} RWF yahise ajya nka Advance y'ejo (${tomorrowStr}). 👍` });
        } else {
          setMsg({ type: 'success', text: `Versement yoherejwe! 6,000 RWF yagiye ku y'uyu munsi. Ibirarane by'amadeni ${debtLogsCleared} byagabanyijwe/byishyuwe neza.` });
        }

      } else {
        // 🌟 IFREMU B: NIBA ARI ITARIKI YA KERA (PAST DATE) - Ijyana amakuru uko ari nta deni/advance nshya
        const { error: insErr } = await supabase.from('versements').insert([{
          owner_id: driverData.owner_id, 
          driver_id: driverData.id,
          motorcycle_id: assignData?.motorcycle_id || null, 
          collection_date: selectedDateStr,
          amount: remainingMoney,
          payment_method: 'mobile_money',
          reference_number: transactionId.trim(),
          status: 'pending'
        }]);
        if (insErr) throw insErr;
        setMsg({ type: 'success', text: `Versement yo ku itariki ya ${selectedDateStr} yakiriwe neza mu bitabo.` });
      }

      setAmount('');
      setTransactionId('');
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Hari ikosa ryabaye, ongera ugerageze.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitExpense = async (e) => {
    e.preventDefault();
    if (!expenseAmount || !reason.trim() || !expenseCategory) {
      setMsg({ type: 'error', text: 'Ugomba gushyiramo amafaranga, category, n\'ubusobanuro bwa depanse!' });
      return;
    }

    try {
      setSubmitting(true);
      setMsg({ type: '', text: '' });

      const { data: driverData, error: driverErr } = await supabase
        .from('drivers')
        .select('*')
        .eq('email', profile?.email)
        .single();

      if (driverErr || !driverData) throw new Error("Umushoferi ntabwo abonetse muri sisitemu.");

      const { data: assignData } = await supabase
        .from('driver_assignments')
        .select('*')
        .eq('driver_id', driverData.id)
        .eq('is_active', true)
        .maybeSingle();

      let finalMotorcycleId = assignData?.motorcycle_id;
      if (!finalMotorcycleId) {
        const { data: fallbackMoto } = await supabase
          .from('motorcycles')
          .select('id')
          .limit(1)
          .maybeSingle();
        finalMotorcycleId = fallbackMoto?.id;
      }

      if (!finalMotorcycleId) {
        throw new Error("Nta kinyabiziga (motorcycle) na kimwe kibonetse muri sisitemu.");
      }

      const { error: insertErr } = await supabase.from('expenses').insert([{
        motorcycle_id: finalMotorcycleId, 
        category: expenseCategory, 
        expense_date: new Date().toISOString().split('T')[0],
        amount: Math.round(parseFloat(expenseAmount)),
        description: reason.trim(),
        status: 'pending' 
      }]);

      if (insertErr) throw insertErr;

      setMsg({ type: 'success', text: 'Depense yoherejwe neza! Admin arayisuzuma gukora approval. 🛠️' });
      setExpenseAmount('');
      setReason('');
      setExpenseCategory('fuel');
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Hari ikosa ryabaye, ongera ugerageze.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`relative min-h-screen font-sans transition-colors duration-500 overflow-x-hidden ${darkMode ? 'bg-[#050e0a] text-gray-100' : 'bg-[#f4f6f5] text-gray-900'}`}>

      <style>{`
        @keyframes roadmove { to { background-position: 60px 0; } }
        @keyframes glowline { 0%, 100% { opacity: .4; } 50% { opacity: 1; } }
        @keyframes floatY { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
      `}</style>

      {/* Ambient "route" texture */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.05]"
        style={{
          backgroundImage: 'repeating-linear-gradient(90deg, currentColor 0 20px, transparent 20px 40px)',
          backgroundSize: '60px 4px',
          backgroundPosition: '0 12px',
          backgroundRepeat: 'repeat-x',
          animation: 'roadmove 3s linear infinite'
        }}
      />
      <div className={`pointer-events-none fixed -top-32 -left-32 w-[28rem] h-[28rem] rounded-full blur-3xl -z-10 ${darkMode ? 'bg-[#003d29]/40' : 'bg-emerald-300/30'}`} />
      <div className={`pointer-events-none fixed bottom-0 right-0 w-[24rem] h-[24rem] rounded-full blur-3xl -z-10 ${darkMode ? 'bg-orange-700/20' : 'bg-orange-300/25'}`} />

      <nav className={`sticky top-0 z-20 border-b backdrop-blur-xl transition-colors duration-500 ${darkMode ? 'border-emerald-500/10 bg-[#050e0a]/70' : 'border-black/5 bg-white/70 shadow-sm'}`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-emerald-400/40 blur-md" style={{ animation: 'glowline 2.5s ease-in-out infinite' }} />
              <div className="relative w-11 h-11 rounded-full overflow-hidden flex items-center justify-center bg-[#003d29] ring-2 ring-emerald-400/30">
                <img src={twaraLogo} alt="TwaraFleet Logo" className="w-full h-full object-cover" />
              </div>
            </div>
            <div>
              <h1 className={`text-lg font-bold tracking-tight leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {profile?.full_name || 'Umutari'}
              </h1>
              <p className="text-[11px] text-emerald-400 font-mono font-bold tracking-widest uppercase mt-1 inline-flex items-center gap-1">
                <MapPin size={11} /> {metaPlate}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
             <button onClick={() => setDarkMode(!darkMode)} className={`p-2.5 rounded-full border transition-all duration-300 hover:scale-110 active:scale-90 ${darkMode ? 'bg-white/5 border-white/10 hover:border-amber-300/40 text-amber-300' : 'bg-black/5 border-black/5 text-slate-600'}`}>
               {darkMode ? <Sun size={18} /> : <Moon size={18} />}
             </button>
             <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest inline-flex items-center gap-1 border ${profile?.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-gray-200 text-gray-600 border-transparent'}`}>
               <Gauge size={12} className={profile?.status === 'Active' ? 'animate-pulse' : ''} /> {profile?.status || 'Active'}
             </span>
             <button onClick={logout} className={`p-2.5 rounded-full border transition-all duration-300 hover:scale-110 active:scale-90 ${darkMode ? 'bg-white/5 border-white/10 hover:border-red-400/40 text-gray-400 hover:text-red-400' : 'bg-black/5 border-black/5 text-gray-500 hover:text-red-600'}`}>
               <LogOut size={18} />
             </button>
          </div>
        </div>
      </nav>

      <main className="relative max-w-7xl mx-auto p-4 md:p-6">
        <div className="flex items-center gap-6 mb-8 px-2">
          {[ {id:'versement', label:'Versement', icon:DollarSign, glow:'emerald'}, {id:'depense', label:'Depense', icon:Wrench, glow:'orange'}, {id:'history', label:'History', icon:History, glow:'sky'} ].map((tab, i) => (
            <div key={tab.id} className="flex items-center gap-6">
              <button 
                type="button" 
                onClick={(e) => { e.preventDefault(); setActiveTab(tab.id); setMsg({ type: '', text: '' }); }} 
                className="group flex flex-col items-center gap-1.5"
              >
                <div className={`relative w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  activeTab === tab.id
                    ? tab.glow === 'emerald' ? 'border-emerald-400 bg-emerald-400/10 shadow-lg shadow-emerald-400/30 scale-110'
                      : tab.glow === 'orange' ? 'border-orange-400 bg-orange-400/10 shadow-lg shadow-orange-400/30 scale-110'
                      : 'border-sky-400 bg-sky-400/10 shadow-lg shadow-sky-400/30 scale-110'
                    : darkMode ? 'border-white/10 bg-white/5 group-hover:border-white/30 group-hover:scale-105' : 'border-black/10 bg-black/5 group-hover:border-black/20 group-hover:scale-105'
                }`}>
                  <tab.icon size={18} className={activeTab === tab.id ? (tab.glow === 'emerald' ? 'text-emerald-400' : tab.glow === 'orange' ? 'text-orange-400' : 'text-sky-400') : darkMode ? 'text-gray-400' : 'text-gray-500'} />
                </div>
                <span className={`text-[11px] font-bold uppercase tracking-wider transition-colors ${activeTab === tab.id ? (darkMode ? 'text-white' : 'text-slate-900') : 'text-gray-500'}`}>
                  {tab.label}
                </span>
              </button>
              {i < 2 && <div className={`hidden sm:block w-10 h-px ${darkMode ? 'bg-white/10' : 'bg-black/10'}`} />}
            </div>
          ))}
        </div>

        <div className={`relative p-6 md:p-7 rounded-3xl border backdrop-blur-2xl shadow-2xl shadow-black/20 transition-all duration-500 ${darkMode ? 'bg-white/[0.03] border-white/10' : 'bg-white/60 border-black/5'}`}>
          {/* HUD corner ticks */}
          <div className={`absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 rounded-tl-lg ${darkMode ? 'border-emerald-400/30' : 'border-emerald-600/30'}`} />
          <div className={`absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 rounded-br-lg ${darkMode ? 'border-emerald-400/30' : 'border-emerald-600/30'}`} />

          {msg.text && (
            <div className={`p-4 mb-4 rounded-2xl text-sm font-medium backdrop-blur-md border flex items-center gap-2 ${msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
              {msg.type === 'success' ? <ShieldCheck size={16} className="shrink-0" /> : <span className="shrink-0">⚠️</span>}
              {msg.text}
            </div>
          )}

          {/* TAB 1: VERSEMENT */}
          {activeTab === 'versement' && (
            <form onSubmit={handleSubmitVersement} className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-2 mb-4"><Gauge size={16} /> Versement</h2>

              <div className={`flex items-center gap-3 rounded-2xl border pl-4 pr-2 transition-all duration-300 focus-within:ring-2 focus-within:ring-emerald-400/40 ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white/60 border-black/10'}`}>
                <DollarSign size={16} className="text-emerald-400 shrink-0" />
                <input type="number" placeholder="Amafaranga (RWF) *" value={amount} onChange={(e) => setAmount(e.target.value)} className={`w-full bg-transparent py-3 text-sm focus:outline-none ${darkMode ? 'text-white placeholder:text-gray-500' : 'text-gray-900 placeholder:text-gray-400'}`} />
              </div>

              <div className={`flex items-center gap-3 rounded-2xl border pl-4 pr-2 transition-all duration-300 focus-within:ring-2 focus-within:ring-emerald-400/40 ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white/60 border-black/10'}`}>
                <Calendar size={16} className="text-emerald-400 shrink-0" />
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`w-full bg-transparent py-3 text-sm focus:outline-none ${darkMode ? 'text-white' : 'text-gray-900'}`} />
              </div>

              <div className={`flex items-center gap-3 rounded-2xl border pl-4 pr-2 transition-all duration-300 focus-within:ring-2 focus-within:ring-emerald-400/40 ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white/60 border-black/10'}`}>
                <Hash size={16} className="text-emerald-400 shrink-0" />
                <input type="text" placeholder="Trans ID *" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} className={`w-full bg-transparent py-3 text-sm focus:outline-none ${darkMode ? 'text-white placeholder:text-gray-500' : 'text-gray-900 placeholder:text-gray-400'}`} />
              </div>
              
              <button type="submit" disabled={submitting} className="group w-full bg-gradient-to-r from-[#003d29] to-emerald-700 hover:to-emerald-600 text-white font-bold py-3.5 rounded-2xl transition-all duration-300 shadow-lg shadow-emerald-900/40 hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2">
                {submitting ? <><Loader2 size={16} className="animate-spin" /> ...</> : <>Ohereza <ChevronRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" /></>}
              </button>
            </form>
          )}
          
          {/* TAB 2: DEPENSE */}
          {activeTab === 'depense' && (
            <form onSubmit={handleSubmitExpense} className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-orange-400 flex items-center gap-2 mb-4"><Fuel size={16} /> Depense</h2>
              
              <div className={`flex items-center gap-3 rounded-2xl border pl-4 pr-2 transition-all duration-300 focus-within:ring-2 focus-within:ring-orange-400/40 ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white/60 border-black/10'}`}>
                <DollarSign size={16} className="text-orange-400 shrink-0" />
                <input type="number" placeholder="Amafaranga (RWF) *" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} className={`w-full bg-transparent py-3 text-sm focus:outline-none ${darkMode ? 'text-white placeholder:text-gray-500' : 'text-gray-900 placeholder:text-gray-400'}`} />
              </div>
              
              <div className={`flex items-center gap-3 rounded-2xl border pl-4 pr-2 transition-all duration-300 focus-within:ring-2 focus-within:ring-orange-400/40 ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white/60 border-black/10'}`}>
                <Tag size={16} className="text-orange-400 shrink-0" />
                <select 
                  value={expenseCategory} 
                  onChange={(e) => setExpenseCategory(e.target.value)} 
                  className={`w-full bg-transparent py-3 text-sm focus:outline-none ${darkMode ? 'text-white' : 'text-gray-900'}`}
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value} className={darkMode ? 'bg-[#0d1f18]' : 'bg-white'}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={`flex items-center gap-3 rounded-2xl border pl-4 pr-2 transition-all duration-300 focus-within:ring-2 focus-within:ring-orange-400/40 ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white/60 border-black/10'}`}>
                <MessageSquare size={16} className="text-orange-400 shrink-0" />
                <input type="text" placeholder="Ubusobanuro *" value={reason} onChange={(e) => setReason(e.target.value)} className={`w-full bg-transparent py-3 text-sm focus:outline-none ${darkMode ? 'text-white placeholder:text-gray-500' : 'text-gray-900 placeholder:text-gray-400'}`} />
              </div>
              
              <button type="submit" disabled={submitting} className="group w-full bg-gradient-to-r from-orange-700 to-amber-600 hover:to-amber-500 text-white font-bold py-3.5 rounded-2xl transition-all duration-300 shadow-lg shadow-orange-900/40 hover:shadow-orange-500/30 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2">
                {submitting ? <><Loader2 size={16} className="animate-spin" /> ...</> : <>Ohereza <ChevronRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" /></>}
              </button>
            </form>
          )}

          {/* TAB 3: HISTORY */}
          {activeTab === 'history' && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-sky-400 flex items-center gap-2 mb-5">
                <MapPin size={16} /> Amateka (Umwaka)
              </h2>
              
              {loadingHistory ? (
                <div className="flex justify-center items-center gap-2 py-10 text-sm text-gray-400">
                  <Loader2 size={18} className="animate-spin" /> Gushaka...
                </div>
              ) : historyItems.length === 0 ? (
                <div className="flex flex-col items-center gap-2 text-center text-gray-500 py-10">
                  <Inbox size={28} className="opacity-50" />
                  <p className="text-sm">Nta mateka aboneka.</p>
                </div>
              ) : (
                <div className="relative pl-6">
                  <div className={`absolute left-[7px] top-2 bottom-2 w-px ${darkMode ? 'bg-gradient-to-b from-emerald-400/40 via-white/10 to-orange-400/40' : 'bg-gradient-to-b from-emerald-400/50 via-black/10 to-orange-400/50'}`} />
                  <div className="space-y-3">
                    {historyItems.map((item) => {
                      const isVersement = item.type === 'versement';
                      return (
                        <div key={`${item.type}-${item.id}`} className="relative">
                          <div className={`absolute -left-6 top-4 w-3.5 h-3.5 rounded-full border-2 ${darkMode ? 'bg-[#050e0a]' : 'bg-[#f4f6f5]'} ${isVersement ? 'border-emerald-400' : 'border-orange-400'}`} />
                          <div className={`p-4 rounded-2xl border flex justify-between items-center backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl ${darkMode ? 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]' : 'bg-white/50 border-black/5 hover:bg-white/80'}`}>
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-xl ${isVersement ? 'bg-emerald-500/10 text-emerald-400' : 'bg-orange-500/10 text-orange-400'}`}>
                                {isVersement ? <DollarSign size={18} /> : <Wrench size={18} />}
                              </div>
                              <div>
                                <p className="font-semibold text-sm">
                                  {isVersement ? `Versement Mobimoney` : `Depense [${item.category?.toUpperCase() || 'OTHER'}]: ${item.description}`}
                                </p>
                                <p className="text-xs text-gray-500 font-mono flex items-center gap-1 mt-0.5">
                                  <Calendar size={10} /> {item.sortDate} {item.reference_number ? <span className="inline-flex items-center gap-1">· <Hash size={10} />{item.reference_number}</span> : ''}
                                </p>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <p className={`font-mono font-bold text-sm ${isVersement ? 'text-emerald-500' : 'text-orange-500'}`}>
                                {isVersement ? `+` : `-`} {item.amount.toLocaleString()} RWF
                              </p>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider inline-flex items-center gap-1 mt-1 ${
                                item.status === 'paid' || item.status === 'approved' 
                                  ? 'bg-emerald-500/10 text-emerald-400' 
                                  : 'bg-amber-500/10 text-amber-400'
                              }`}>
                                {item.status === 'paid' || item.status === 'approved' ? <ShieldCheck size={11} /> : <Clock3 size={11} />}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}