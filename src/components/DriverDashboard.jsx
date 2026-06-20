import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { LogOut, Moon, Sun, User, DollarSign, Wrench, History } from 'lucide-react';

export default function DriverDashboard() {
  const { profile, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('versement');
  
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [transactionId, setTransactionId] = useState('');
  const [reason, setReason] = useState('');

  return (
    // Nahinduye bg-gray-50 mu light mode ikaba bg-[#f3f4f0] n'amabara y'inyuma
    <div className={`min-h-screen font-sans ${darkMode ? 'bg-[#0f172a] text-gray-100' : 'bg-[#f3f4f0] text-gray-900'}`}>
      
      <nav className={`border-b ${darkMode ? 'border-gray-800 bg-[#0f172a]' : 'border-gray-200 bg-[#f3f4f0]'}`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-gray-800 text-emerald-500' : 'bg-emerald-800 text-white'}`}>
              <User size={24} />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">{profile?.full_name || 'Umutari'}</h1>
              <p className="text-xs text-gray-500 font-mono">PLATE: {profile?.motorcycle_plate || 'N/A'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <button onClick={() => setDarkMode(!darkMode)} className="text-gray-500 hover:text-emerald-600">
               {darkMode ? <Sun size={20} /> : <Moon size={20} />}
             </button>
             <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${profile?.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-gray-200 text-gray-600'}`}>
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
              className={`pb-3 text-sm font-medium flex items-center gap-2 ${activeTab === tab.id ? 'text-emerald-700 border-b-2 border-emerald-700' : 'text-gray-500 hover:text-gray-800'}`}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        {/* Amakarita y'amabara y'umweru (Light mode) vs Umwijima */}
        <div className={`p-6 rounded-xl border ${darkMode ? 'bg-[#1e293b] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
          {activeTab === 'versement' && (
            <div className="space-y-4">
              <h2 className="text-base font-bold">Kohereza Versement</h2>
              <input type="number" placeholder="Amafaranga (RWF)" value={amount} onChange={(e) => setAmount(e.target.value)} className={`w-full border p-3 rounded-lg text-sm ${darkMode ? 'bg-[#0f172a] border-gray-700' : 'bg-gray-50 border-gray-200'}`} />
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`w-full border p-3 rounded-lg text-sm ${darkMode ? 'bg-[#0f172a] border-gray-700' : 'bg-gray-50 border-gray-200'}`} />
              <input type="text" placeholder="Inimero (Trans ID)" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} className={`w-full border p-3 rounded-lg text-sm ${darkMode ? 'bg-[#0f172a] border-gray-700' : 'bg-gray-50 border-gray-200'}`} />
              <button className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-lg transition-colors">Kohereza</button>
            </div>
          )}
          
          {activeTab === 'depense' && (
            <div className="space-y-4">
              <h2 className="text-base font-bold">Gushyiramo Depense</h2>
              <input type="number" placeholder="Amafaranga" onChange={(e) => setAmount(e.target.value)} className={`w-full border p-3 rounded-lg text-sm ${darkMode ? 'bg-[#0f172a] border-gray-700' : 'bg-gray-50 border-gray-200'}`} />
              <input type="text" placeholder="Impamvu" onChange={(e) => setReason(e.target.value)} className={`w-full border p-3 rounded-lg text-sm ${darkMode ? 'bg-[#0f172a] border-gray-700' : 'bg-gray-50 border-gray-200'}`} />
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