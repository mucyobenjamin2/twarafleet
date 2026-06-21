import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { LogOut, Moon, Sun, DollarSign, Wrench, History, Calendar } from 'lucide-react';

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

  const handleSubmitVersement = async (e) => {
    e.preventDefault();
    if (!amount || !date || !transactionId.trim()) {
      setMsg({ type: 'error', text: 'Wandika amafaranga, itariki, ndetse n\'inimero ya Trans ID (Reference)! Byose ni itegeko.' });
      return;
    }

    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999); 
    if (selectedDate > today) {
      setMsg({ type: 'error', text: 'Ntabwo wemerewe kohereza versement y\'itariki y\'ahazaza! 🛑' });
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

      const paymentAmount = parseFloat(amount);
      const targetDaily = assignData?.motorcycles?.daily_target || 6000; 

      const { error: insertErr } = await supabase.from('versements').insert([{
        owner_id: driverData.owner_id, 
        driver_id: driverData.id,
        motorcycle_id: assignData?.motorcycle_id || null, 
        collection_date: date,
        amount: paymentAmount,
        payment_method: 'mobile_money',
        reference_number: transactionId.trim(),
        status: 'pending' 
      }]);

      if (insertErr) throw insertErr;

      if (paymentAmount < targetDaily && assignData?.motorcycle_id) {
        const remainingDebt = targetDaily - paymentAmount;
        
        await supabase.from('debts').insert([{
          owner_id: driverData.owner_id,
          driver_id: driverData.id,
          motorcycle_id: assignData.motorcycle_id,
          debt_date: date,
          original_amount: remainingDebt,
          remaining_amount: remainingDebt,
          status: 'active', 
          notes: `Ideni ryizanye automatically kuko versement yari munsi ya target (${paymentAmount.toLocaleString()} / ${targetDaily.toLocaleString()} RWF).`
        }]);
      }

      setMsg({ 
        type: 'success', 
        text: paymentAmount < targetDaily 
          ? `Versement yoherejwe neza! Kubera ko ari munsi ya target (${targetDaily.toLocaleString()} RWF), ideni rya ${ (targetDaily - paymentAmount).toLocaleString() } RWF ryamaze kubarwa. 👍`
          : 'Versement yoherejwe neza! Tegereza ko Admin ayemeza. 👍'
      });
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
    <div className={`min-h-screen font-sans transition-colors duration-200 ${darkMode ? 'bg-[#0f172a] text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      
      <nav className={`border-b transition-colors duration-200 ${darkMode ? 'border-gray-800 bg-[#0f172a]' : 'border-gray-200 bg-white shadow-sm'}`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center bg-[#003d29]">
              <img src={twaraLogo} alt="TwaraFleet Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className={`text-lg font-semibold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {profile?.full_name || 'Umutari'}
              </h1>
              <p className="text-xs text-emerald-400 font-mono font-bold tracking-wider uppercase bg-[#003d29]/20 px-2 py-0.5 rounded mt-0.5 inline-block">
                PLATE: {metaPlate}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <button onClick={() => setDarkMode(!darkMode)} className="text-gray-500 hover:text-[#003d29]">
               {darkMode ? <Sun size={20} /> : <Moon size={20} />}
             </button>
             <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${profile?.status === 'Active' ? 'bg-[#003d29]/10 text-[#003d29] dark:bg-[#003d29]/30 dark:text-emerald-400' : 'bg-gray-200 text-gray-600'}`}>
               {profile?.status || 'Active'}
             </span>
             <button onClick={logout} className="text-gray-500 hover:text-red-600"><LogOut size={20} /></button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-6">
        <div className={`flex gap-6 mb-6 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          {[ {id:'versement', label:'Versement', icon:DollarSign}, {id:'depense', label:'Depense', icon:Wrench}, {id:'history', label:'History', icon:History} ].map(tab => (
            <button 
              key={tab.id} 
              type="button" 
              onClick={(e) => { e.preventDefault(); setActiveTab(tab.id); setMsg({ type: '', text: '' }); }} 
              className={`pb-3 text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === tab.id ? 'text-[#003d29] dark:text-emerald-400 border-b-2 border-[#003d29] dark:border-emerald-400 font-bold' : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'}`}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        <div className={`p-6 rounded-xl border transition-colors duration-200 ${darkMode ? 'bg-[#1e293b] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
          
          {msg.text && (
            <div className={`p-4 mb-4 rounded-lg text-sm font-medium ${msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
              {msg.text}
            </div>
          )}

          {/* TAB 1: VERSEMENT */}
          {activeTab === 'versement' && (
            <form onSubmit={handleSubmitVersement} className="space-y-4">
              <h2 className="text-base font-bold">Kohereza Versement</h2>
              <input type="number" placeholder="Amafaranga (RWF) *" value={amount} onChange={(e) => setAmount(e.target.value)} className={`w-full border p-3 rounded-lg text-sm ${darkMode ? 'bg-[#0f172a] border-gray-700 text-white border-gray-800' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`w-full border p-3 rounded-lg text-sm ${darkMode ? 'bg-[#0f172a] border-gray-700 text-white border-gray-800' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
              <input type="text" placeholder="Inimero / Trans ID (Reference Number) *" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} className={`w-full border p-3 rounded-lg text-sm ${darkMode ? 'bg-[#0f172a] border-gray-700 text-white border-gray-800' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
              
              <button type="submit" disabled={submitting} className="w-full bg-[#003d29] hover:bg-[#00291b] text-white font-bold py-3 rounded-lg transition-colors shadow-sm disabled:opacity-50">
                {submitting ? 'Iri kohereza...' : 'Kohereza'}
              </button>
            </form>
          )}
          
          {/* TAB 2: DEPENSE */}
          {activeTab === 'depense' && (
            <form onSubmit={handleSubmitExpense} className="space-y-4">
              <h2 className="text-base font-bold">Gushyiramo Depense</h2>
              
              <input type="number" placeholder="Amafaranga (RWF) *" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} className={`w-full border p-3 rounded-lg text-sm ${darkMode ? 'bg-[#0f172a] border-gray-700 text-white border-gray-800' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">Guhitamo Ubwoko bwa Depense *</label>
                <select 
                  value={expenseCategory} 
                  onChange={(e) => setExpenseCategory(e.target.value)} 
                  className={`w-full border p-3 rounded-lg text-sm ${darkMode ? 'bg-[#0f172a] border-gray-700 text-white border-gray-800' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value} className={darkMode ? 'bg-[#1e293b]' : 'bg-white'}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <input type="text" placeholder="Ubusobanuro (Urugero: Gupfuka ipine ry'inyuma...) *" value={reason} onChange={(e) => setReason(e.target.value)} className={`w-full border p-3 rounded-lg text-sm ${darkMode ? 'bg-[#0f172a] border-gray-700 text-white border-gray-800' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
              
              <button type="submit" disabled={submitting} className="w-full bg-orange-700 hover:bg-orange-800 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50">
                {submitting ? 'Iri kohereza...' : 'Kohereza Depense'}
              </button>
            </form>
          )}

          {/* TAB 3: HISTORY */}
          {activeTab === 'history' && (
            <div>
              <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                <Calendar size={18} /> Amateka y'Ibyumweru 52 Bishize (Full Year)
              </h2>
              
              {loadingHistory ? (
                <div className="flex justify-center py-10">Iri gushaka amateka...</div>
              ) : historyItems.length === 0 ? (
                <div className="text-center text-gray-500 py-10">
                  <p>Nta mateka y'ibikorwa yabonetse muri uyu mwaka.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyItems.map((item) => {
                    const isVersement = item.type === 'versement';
                    return (
                      <div key={`${item.type}-${item.id}`} className={`p-4 rounded-xl border flex justify-between items-center ${darkMode ? 'bg-[#0f172a] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${isVersement ? 'bg-emerald-500/10 text-emerald-400' : 'bg-orange-500/10 text-orange-400'}`}>
                            {isVersement ? <DollarSign size={18} /> : <Wrench size={18} />}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">
                              {isVersement ? `Versement Mobimoney` : `Depense [${item.category?.toUpperCase() || 'OTHER'}]: ${item.description}`}
                            </p>
                            <p className="text-xs text-gray-500 font-mono">
                              {item.sortDate} {item.reference_number ? `· REF: ${item.reference_number}` : ''}
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
                            {item.status === 'paid' || item.status === 'approved' ? 'Success' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}