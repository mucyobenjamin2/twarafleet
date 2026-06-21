import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { LogOut, Moon, Sun, DollarSign, Wrench, History } from 'lucide-react';

import twaraLogo from '../assets/logo.png';

export default function DriverDashboard() {
  const { profile, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('versement');
  const [metaPlate, setMetaPlate] = useState('N/A');
  
  // States za fomu
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [transactionId, setTransactionId] = useState('');
  const [reason, setReason] = useState('');
  
  // Status za submission
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

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

  // 💰 FUNCTION YO KOHEREZA VERSEMENT MURI DATABASE
  const handleSubmitVersement = async (e) => {
    e.preventDefault();
    if (!amount || !date) {
      setMsg({ type: 'error', text: 'Wandika amafaranga n\'itariki byoroshye!' });
      return;
    }

    try {
      setSubmitting(true);
      setMsg({ type: '', text: '' });

      // 1. SOMA DRIVER REFERENCE ISHINGIYE KURI EMAIL
      const { data: driverData, error: driverErr } = await supabase
        .from('drivers')
        .select('*')
        .eq('email', profile?.email)
        .single();

      if (driverErr || !driverData) throw new Error("Umushoferi ntabwo abonetse muri sisitemu.");

      // 2. SOMA MOTORCYCLE_ID IRI MURI DRIVER_ASSIGNMENTS NYAYO ISANZWE IRI ACTIVE
      const { data: assignData } = await supabase
        .from('driver_assignments')
        .select('*')
        .eq('driver_id', driverData.id)
        .eq('is_active', true)
        .maybeSingle();

      // 3. INJIZA VERSEMENT MURI DATABASE
      const { error: insertErr } = await supabase.from('versements').insert([{
        owner_id: driverData.owner_id, 
        driver_id: driverData.id,
        motorcycle_id: assignData?.motorcycle_id || null, 
        collection_date: date,
        amount: parseFloat(amount),
        payment_method: 'mobile_money',
        reference_number: transactionId || null,
        status: 'pending' // ✅ pending mu nyuguti ntoya nk'uko database ibyifuza
      }]);

      if (insertErr) throw insertErr;

      setMsg({ type: 'success', text: 'Versement yoherejwe neza! Tegereza ko Admin ayemeza. 👍' });
      setAmount('');
      setTransactionId('');
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
              onClick={() => setActiveTab(tab.id)} 
              className={`pb-3 text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === tab.id ? 'text-[#003d29] dark:text-emerald-400 border-b-2 border-[#003d29] dark:border-emerald-400 font-bold' : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'}`}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        <div className={`p-6 rounded-xl border transition-colors duration-200 ${darkMode ? 'bg-[#1e293b] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
          
          {/* DYNAMIC ALERT MESSAGES */}
          {msg.text && (
            <div className={`p-4 mb-4 rounded-lg text-sm font-medium ${msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
              {msg.text}
            </div>
          )}

          {activeTab === 'versement' && (
            <form onSubmit={handleSubmitVersement} className="space-y-4">
              <h2 className="text-base font-bold">Kohereza Versement</h2>
              <input type="number" placeholder="Amafaranga (RWF)" value={amount} onChange={(e) => setAmount(e.target.value)} className={`w-full border p-3 rounded-lg text-sm ${darkMode ? 'bg-[#0f172a] border-gray-700 text-white border-gray-800' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`w-full border p-3 rounded-lg text-sm ${darkMode ? 'bg-[#0f172a] border-gray-700 text-white border-gray-800' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
              <input type="text" placeholder="Inimero (Trans ID)" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} className={`w-full border p-3 rounded-lg text-sm ${darkMode ? 'bg-[#0f172a] border-gray-700 text-white border-gray-800' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
              
              <button type="submit" disabled={submitting} className="w-full bg-[#003d29] hover:bg-[#00291b] text-white font-bold py-3 rounded-lg transition-colors shadow-sm disabled:opacity-50">
                {submitting ? 'Iri kohereza...' : 'Kohereza'}
              </button>
            </form>
          )}
          
          {activeTab === 'depense' && (
            <div className="space-y-4">
              <h2 className="text-base font-bold">Gushyiramo Depense</h2>
              <input type="number" placeholder="Amafaranga" className={`w-full border p-3 rounded-lg text-sm ${darkMode ? 'bg-[#0f172a] border-gray-700 text-white border-gray-800' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
              <input type="text" placeholder="Impamvu" className={`w-full border p-3 rounded-lg text-sm ${darkMode ? 'bg-[#0f172a] border-gray-700 text-white border-gray-800' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
              <button className="w-full bg-orange-700 hover:bg-orange-800 text-white font-bold py-3 rounded-lg transition-colors">Kohereza Depense</button>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="text-center text-gray-500 py-10">
              <p>Nta mateka y'ibikorwa aragaragara.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}