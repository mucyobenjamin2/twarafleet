import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { LogOut, Moon, Sun, DollarSign, Wrench, History, Calendar, CheckCircle2, Clock, XCircle, ShieldAlert, Send, AlertTriangle, Bike, X, MessageSquare } from 'lucide-react';
import ChatBox from '../components/ChatBox';

import twaraLogo from '../assets/logo.png';

export default function DriverDashboard() {
  const { profile, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(true);
  const [activeModal, setActiveModal] = useState(null);
  const [metaPlate, setMetaPlate] = useState('N/A');
  const [adminUserId, setAdminUserId] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // States za Traffic Fines
  const [fines, setFines] = useState([]);
  const [payingFineId, setPayingFineId] = useState(null);
  const [momoRef, setMomoRef] = useState('');
  
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

  const fetchDriverFines = async (driverId, plate) => {
    try {
      let motoId = null;
      if (plate && plate !== 'N/A') {
        const { data: motoData } = await supabase
          .from('motorcycles')
          .select('id')
          .eq('plate_number', plate)
          .maybeSingle();
        motoId = motoData?.id;
      }

      let query = supabase
        .from('fines')
        .select('*')
        .order('created_at', { ascending: false });

      if (driverId && motoId) {
        query = query.or(`driver_id.eq.${driverId},motorcycle_id.eq.${motoId}`);
      } else if (driverId) {
        query = query.eq('driver_id', driverId);
      } else if (motoId) {
        query = query.eq('motorcycle_id', motoId);
      }

      const { data: finesData } = await query;
      setFines(finesData || []);
    } catch (err) {
      console.error("Error fetching fines:", err.message);
    }
  };

  useEffect(() => {
    async function getFreshMetadata() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let currentPlate = 'N/A';
      if (user?.user_metadata?.motorcycle_plate) {
        currentPlate = user.user_metadata.motorcycle_plate;
      } else if (profile?.motorcycle_plate) {
        currentPlate = profile.motorcycle_plate;
      }
      setMetaPlate(currentPlate);

      const { data: driverData } = await supabase
        .from('drivers')
        .select('id, owner_id')
        .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
        .maybeSingle();

      if (driverData?.owner_id) {
        setAdminUserId(driverData.owner_id);
      }

      fetchDriverFines(driverData?.id, currentPlate);
    }

    getFreshMetadata();
  }, [profile]);

  // 🌟 Realtime + Polling ivanze kugira ngo umubare w'ubutumwa uzamuke neza cyane
  useEffect(() => {
    let isMounted = true;

    async function checkUnread() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: driverData } = await supabase
        .from('drivers')
        .select('owner_id')
        .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
        .maybeSingle();

      if (!driverData?.owner_id) return;

      const { count: countUnread } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('sender_id', driverData.owner_id)
        .eq('is_read', false);

      if (isMounted) {
        setUnreadCount(countUnread || 0);
      }
    }

    checkUnread();

    async function setupRealtime() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel(`driver_messages_channel_${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'messages' },
          (payload) => {
            const newMsg = payload.new;
            if (newMsg && newMsg.receiver_id === user.id) {
              checkUnread();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }

    setupRealtime();

    const interval = setInterval(() => {
      checkUnread();
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Igihe umushoferi afunguye chat, umubare uhita uhinduka 0 maze akamenyetso kagahita kagenda burundu
  useEffect(() => {
    if (activeModal === 'contact_admin' && adminUserId) {
      async function markAsRead() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('receiver_id', user.id)
          .eq('sender_id', adminUserId)
          .eq('is_read', false);

        setUnreadCount(0);
      }
      markAsRead();
    }
  }, [activeModal, adminUserId]);

  const handleMarkFineAsPaid = async (fineId) => {
    try {
      setSubmitting(true);
      setMsg({ type: '', text: '' });

      const updatePayload = {
        status: 'paid_by_driver'
      };

      if (momoRef.trim()) {
        updatePayload.momo_ref = momoRef.trim();
      }

      const { error } = await supabase
        .from('fines')
        .update(updatePayload)
        .eq('id', fineId);

      if (error) throw error;

      setPayingFineId(null);
      setMomoRef('');
      setMsg({ type: 'success', text: 'Ubwishyu bw\'amande bwamaze kumenyeshwa Admin neza! 🚦' });
      
      const { data: { user } } = await supabase.auth.getUser();
      const { data: driverData } = await supabase
        .from('drivers')
        .select('id')
        .or(`auth_user_id.eq.${user?.id},email.eq.${user?.email}`)
        .maybeSingle();

      fetchDriverFines(driverData?.id, metaPlate);
    } catch (err) {
      setMsg({ type: 'error', text: 'Ikosa mu kubika ubwishyu: ' + err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const fetchDriverHistory = async () => {
    try {
      setLoadingHistory(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      const { data: driverData } = await supabase
        .from('drivers')
        .select('id')
        .or(`auth_user_id.eq.${user?.id},email.eq.${user?.email}`)
        .maybeSingle();

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
    if (activeModal === 'history') {
      fetchDriverHistory();
    }
  }, [activeModal]);

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

      const { data: { user } } = await supabase.auth.getUser();
      const { data: driverData, error: driverErr } = await supabase
        .from('drivers')
        .select('*')
        .or(`auth_user_id.eq.${user?.id},email.eq.${user?.email}`)
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

      if (isCurrentDate) {
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

        remainingMoney -= targetDaily; 
        let debtLogsCleared = 0;

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

              await supabase.from('debts').update({
                remaining_amount: newRemainingDebt,
                status: newStatus
              }).eq('id', debt.id);

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

      const { data: { user } } = await supabase.auth.getUser();
      const { data: driverData, error: driverErr } = await supabase
        .from('drivers')
        .select('*')
        .or(`auth_user_id.eq.${user?.id},email.eq.${user?.email}`)
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

  const unpaidFines = fines.filter(f => f.status !== 'approved');

  return (
    <div className={`min-h-screen font-sans transition-colors duration-200 ${darkMode ? 'bg-[#0f172a] text-slate-100' : 'bg-slate-100 text-slate-900'} relative pb-20`}>
      
      {/* NAVIGATION BAR */}
      <nav className={`border-b transition-colors duration-200 ${darkMode ? 'border-slate-800 bg-[#0f172a]' : 'border-slate-200 bg-white shadow-sm'}`}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-[#003d29] shadow-sm">
              <img src={twaraLogo} alt="TwaraFleet Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className={`text-base font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {profile?.full_name || 'Umutari'}
              </h1>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-black tracking-wider uppercase bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 inline-block">
                PLATE: {metaPlate}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
             <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
               {darkMode ? <Sun size={18} /> : <Moon size={18} />}
             </button>
             <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${profile?.status === 'Active' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' : 'bg-slate-200 text-slate-600'}`}>
               {profile?.status || 'Active'}
             </span>
             <button onClick={logout} className="p-2 rounded-xl text-slate-500 hover:text-rose-600 transition-colors"><LogOut size={18} /></button>
          </div>
        </div>
      </nav>

      {/* MAIN CENTERED CONTAINER FOR MOBILE OPTIMIZATION */}
      <main className="max-w-md mx-auto p-4 space-y-6 flex flex-col justify-center items-center">

        {/* 🚨 TRAFFIC FINES NOTIFICATION SECTION */}
        {unpaidFines.length > 0 && (
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                <ShieldAlert size={16} className="text-rose-600 dark:text-rose-400" /> Active Traffic Fines ({unpaidFines.length})
              </h2>
            </div>

            <div className="flex flex-col gap-2.5 w-full">
              {unpaidFines.map(fine => (
                <div 
                  key={fine.id} 
                  className={`p-4 rounded-2xl border transition-all shadow-sm flex flex-col justify-between space-y-2.5 ${
                    fine.status === 'paid_by_driver'
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-200'
                      : 'bg-rose-500/10 border-rose-500/40 text-rose-900 dark:text-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="bg-rose-500/20 text-rose-900 dark:text-rose-200 text-[10px] font-mono font-black px-2.5 py-0.5 rounded border border-rose-500/30">
                      REF: {fine.reference_number}
                    </span>
                    <span className="text-sm font-mono font-black text-rose-700 dark:text-rose-400">
                      {Number(fine.amount).toLocaleString()} RWF
                    </span>
                  </div>

                  <p className="text-xs font-black text-slate-900 dark:text-slate-100">
                    "{fine.reason}"
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-rose-500/20 text-[10px] font-mono font-bold">
                    <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <Calendar size={12} /> Due: <strong className="text-rose-700 dark:text-rose-400 font-black">{fine.due_date || fine.issue_date || 'N/A'}</strong>
                    </span>

                    {fine.status === 'paid_by_driver' ? (
                      <span className="text-amber-700 dark:text-amber-400 font-black flex items-center gap-1">
                        <Clock size={12} className="animate-spin" /> Pending Approval
                      </span>
                    ) : (
                      <button
                        onClick={() => setPayingFineId(fine.id)}
                        className="bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black px-3 py-1 rounded-lg shadow-sm transition"
                      >
                        Mark as Paid
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 🎨 CENTERED HIGH CONTRAST ACTION CARDS */}
        <div className="w-full space-y-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-400 text-center">
            Driver Action Services
          </h2>

          <div className="flex flex-col gap-3.5 w-full">
            
            {/* CARD 1: VERSEMENT */}
            <button
              onClick={() => { setActiveModal('versement'); setMsg({ type: '', text: '' }); }}
              className="w-full p-5 rounded-2xl border border-emerald-500/40 bg-white dark:bg-emerald-950/20 hover:border-emerald-500 text-left transition-all shadow-sm active:scale-95 flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <span className="p-3 rounded-xl bg-emerald-600 text-white shadow-md group-hover:scale-110 transition-transform">
                  <DollarSign size={22} />
                </span>
                <div>
                  <h3 className="font-display text-base font-black text-slate-900 dark:text-slate-100">
                    Kohereza Versement
                  </h3>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Submit daily target collections.
                  </p>
                </div>
              </div>
              <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30">
                Send
              </span>
            </button>

            {/* CARD 2: DEPENSE */}
            <button
              onClick={() => { setActiveModal('depense'); setMsg({ type: '', text: '' }); }}
              className="w-full p-5 rounded-2xl border border-amber-500/40 bg-white dark:bg-amber-950/20 hover:border-amber-500 text-left transition-all shadow-sm active:scale-95 flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <span className="p-3 rounded-xl bg-amber-500 text-white shadow-md group-hover:scale-110 transition-transform">
                  <Wrench size={22} />
                </span>
                <div>
                  <h3 className="font-display text-base font-black text-slate-900 dark:text-slate-100">
                    Gushyiramo Depense
                  </h3>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Report maintenance & fuel costs.
                  </p>
                </div>
              </div>
              <span className="text-xs font-black text-amber-800 dark:text-amber-300 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30">
                Log
              </span>
            </button>

            {/* CARD 3: HISTORY */}
            <button
              onClick={() => { setActiveModal('history'); setMsg({ type: '', text: '' }); }}
              className="w-full p-5 rounded-2xl border border-sky-500/40 bg-white dark:bg-sky-950/20 hover:border-sky-500 text-left transition-all shadow-sm active:scale-95 flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <span className="p-3 rounded-xl bg-sky-600 text-white shadow-md group-hover:scale-110 transition-transform">
                  <History size={22} />
                </span>
                <div>
                  <h3 className="font-display text-base font-black text-slate-900 dark:text-slate-100">
                    Amateka y'Ibyanditswe
                  </h3>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    View payment ledger & statuses.
                  </p>
                </div>
              </div>
              <span className="text-xs font-black text-sky-700 dark:text-sky-400 bg-sky-500/20 px-3 py-1 rounded-full border border-sky-500/30">
                View
              </span>
            </button>

          </div>
        </div>

        {/* POPUP MODAL FOR FINE MOMO REF PROMPT */}
        {payingFineId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldAlert className="text-rose-600" size={18} /> Enter MoMo Ref Number
                </h2>
                <button onClick={() => setPayingFineId(null)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Nyamuneka injiza inimero ya MoMo Reference wifuza kwemeza ko waresheje ku amande:
                </p>

                <input
                  type="text"
                  placeholder="Urugero: MP2026073000"
                  value={momoRef}
                  onChange={e => setMomoRef(e.target.value)}
                  className="w-full border p-3 rounded-xl text-xs font-bold bg-slate-50 dark:bg-[#0f172a] border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                  required
                />

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPayingFineId(null)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    Siba
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMarkFineAsPaid(payingFineId)}
                    disabled={submitting}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-black text-white transition shadow-md flex items-center justify-center gap-1"
                  >
                    <Send size={12} /> {submitting ? 'Iri kohereza...' : 'Emeza Fine'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL POPUP DIALOG TABS */}
        {activeModal && activeModal !== 'contact_admin' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
              
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  {activeModal === 'versement' && <><DollarSign className="text-emerald-600" size={18} /> Kohereza Versement</>}
                  {activeModal === 'depense' && <><Wrench className="text-amber-500" size={18} /> Gushyiramo Depense</>}
                  {activeModal === 'history' && <><History className="text-sky-600" size={18} /> Amateka y'Ibyumweru 52 Bishize</>}
                </h2>
                <button onClick={() => setActiveModal(null)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              {msg.text && (
                <div className={`p-3.5 rounded-xl text-xs font-bold ${msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'}`}>
                  {msg.text}
                </div>
              )}

              {/* MODAL 1: VERSEMENT FORM */}
              {activeModal === 'versement' && (
                <form onSubmit={handleSubmitVersement} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-400 mb-1">
                      Amafaranga (RWF) *
                    </label>
                    <input 
                      type="number" 
                      placeholder="6000" 
                      value={amount} 
                      onChange={(e) => setAmount(e.target.value)} 
                      className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0f172a] text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500" 
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-400 mb-1">
                      Itariki ya Payment *
                    </label>
                    <input 
                      type="date" 
                      value={date} 
                      onChange={(e) => setDate(e.target.value)} 
                      className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0f172a] text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500" 
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-400 mb-1">
                      Inimero / Trans ID (Reference Number) *
                    </label>
                    <input 
                      type="text" 
                      placeholder="Urugero: MP2026073000" 
                      value={transactionId} 
                      onChange={(e) => setTransactionId(e.target.value)} 
                      className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0f172a] text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500" 
                      required
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      Siba
                    </button>
                    <button 
                      type="submit" 
                      disabled={submitting} 
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition disabled:opacity-50 shadow-md"
                    >
                      {submitting ? 'Iri kohereza...' : 'Kohereza Versement'}
                    </button>
                  </div>
                </form>
              )}
              
              {/* MODAL 2: DEPENSE FORM */}
              {activeModal === 'depense' && (
                <form onSubmit={handleSubmitExpense} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-400 mb-1">
                      Amafaranga (RWF) *
                    </label>
                    <input 
                      type="number" 
                      placeholder="15000" 
                      value={expenseAmount} 
                      onChange={(e) => setExpenseAmount(e.target.value)} 
                      className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0f172a] text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500" 
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-400 mb-1">
                      Guhitamo Ubwoko bwa Depense *
                    </label>
                    <select 
                      value={expenseCategory} 
                      onChange={(e) => setExpenseCategory(e.target.value)} 
                      className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0f172a] text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    >
                      {categories.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-400 mb-1">
                      Ubusobanuro *
                    </label>
                    <textarea 
                      placeholder="Urugero: Gupfuka ipine ry'inyuma..." 
                      value={reason} 
                      onChange={(e) => setReason(e.target.value)} 
                      className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0f172a] text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500" 
                      rows={2}
                      required
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      Siba
                    </button>
                    <button 
                      type="submit" 
                      disabled={submitting} 
                      className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition disabled:opacity-50 shadow-md"
                    >
                      {submitting ? 'Iri kohereza...' : 'Kohereza Depense'}
                    </button>
                  </div>
                </form>
              )}

              {/* MODAL 3: HISTORY LIST */}
              {activeModal === 'history' && (
                <div className="space-y-3">
                  {loadingHistory ? (
                    <div className="flex justify-center py-10 font-bold text-slate-600 dark:text-slate-400 animate-pulse">Iri gushaka amateka...</div>
                  ) : historyItems.length === 0 ? (
                    <div className="text-center font-bold text-slate-600 dark:text-slate-400 py-10">
                      <p>Nta mateka y'ibikorwa yabonetse muri uyu mwaka. 🎉</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                      {historyItems.map((item) => {
                        const isVersement = item.type === 'versement';
                        const isApproved = item.status === 'paid' || item.status === 'approved';
                        const isRejected = item.status === 'rejected';

                        return (
                          <div key={`${item.type}-${item.id}`} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f172a] flex justify-between items-center shadow-sm">
                            <div className="flex items-center gap-2.5">
                              <div className={`p-2 rounded-lg ${isVersement ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                                {isVersement ? <DollarSign size={16} /> : <Wrench size={16} />}
                              </div>
                              <div>
                                <p className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate max-w-[150px]">
                                  {isVersement ? `Versement` : `${item.category?.toUpperCase() || 'OTHER'}`}
                                </p>
                                <p className="text-[10px] text-slate-500 font-mono font-bold">
                                  {item.sortDate}
                                </p>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <p className={`font-mono font-black text-xs ${isVersement ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {isVersement ? `+` : `-`} {item.amount.toLocaleString()}
                              </p>
                              
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider inline-flex items-center gap-1 mt-0.5 border ${
                                isApproved
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
                                  : isRejected
                                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                              }`}>
                                {isApproved ? 'Paid' : isRejected ? 'Rejected' : 'Pending'}
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
          </div>
        )}

      </main>

      {/* 🟢 FLOATING CONTACT ADMIN / CHAT BUTTON (WITH UNREAD COUNT BADGE) */}
      <div className="fixed bottom-5 right-5 z-40">
        <button
          onClick={() => setActiveModal('contact_admin')}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white p-3.5 rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 border-2 border-emerald-400 relative"
          title="Vugana na Admin"
        >
          <MessageSquare size={22} />
          <span className="text-xs font-black hidden sm:inline pr-1">Contact Admin</span>
          
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-5 w-5 bg-rose-600 border-2 border-white items-center justify-center text-[10px] text-white font-black">
                {unreadCount}
              </span>
            </span>
          )}
        </button>
      </div>

      {/* REALTIME CHAT BOX MODAL COMPONENT */}
      {activeModal === 'contact_admin' && adminUserId && (
        <ChatBox
          recipientId={adminUserId}
          recipientName="Fleet Administrator"
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'contact_admin' && !adminUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-6 text-center space-y-3 max-w-sm">
            <p className="text-sm font-bold text-rose-500">Admin ID ntabwo iraboneka kuri uyu mushoferi.</p>
            <button onClick={() => setActiveModal(null)} className="px-4 py-2 bg-slate-700 text-white rounded-xl text-xs font-black">
              Funga
            </button>
          </div>
        </div>
      )}

    </div>
  );
}