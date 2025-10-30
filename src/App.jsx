import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { X, Plus, LogOut, TrendingUp, DollarSign, Calendar, FileText } from 'lucide-react';

// Configuración de Supabase
const supabaseUrl = 'https://vpkiuusicbglppjctofm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwa2l1dXNpY2JnbHBwamN0b2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NzcyMzcsImV4cCI6MjA3NzM1MzIzN30.8ebUBa0jLesqh0nTRpy8-8P8ZCdwkWcNGL6bXuvLPOY';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Categorías predefinidas
const CATEGORIES = [
  { id: 'food', name: 'Food', color: '#10b981' },
  { id: 'transport', name: 'Transport', color: '#3b82f6' },
  { id: 'entertainment', name: 'Entertainment', color: '#f59e0b' },
  { id: 'utilities', name: 'Utilities', color: '#ef4444' },
  { id: 'shopping', name: 'Shopping', color: '#8b5cf6' },
  { id: 'health', name: 'Health', color: '#ec4899' },
  { id: 'other', name: 'Other', color: '#6b7280' }
];

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');

  // Form state
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  useEffect(() => {
    checkUser();
    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadExpenses(session.user.id);
      }
    });
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
    if (session?.user) {
      await loadExpenses(session.user.id);
    }
    setLoading(false);
  };

  const loadExpenses = async (userId) => {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    
    if (!error && data) {
      setExpenses(data);
    }
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) console.error('Error logging in:', error);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setExpenses([]);
  };

  const addExpense = async () => {
    if (!amount || !category || !date) {
      alert('Please fill in all required fields');
      return;
    }

    const { error } = await supabase
      .from('expenses')
      .insert([
        {
          user_id: user.id,
          amount: parseFloat(amount),
          category: category,
          date: date,
          note: note
        }
      ]);

    if (!error) {
      await loadExpenses(user.id);
      setAmount('');
      setCategory('');
      setDate(new Date().toISOString().split('T')[0]);
      setNote('');
      setShowAddExpense(false);
    }
  };

  // Calculations
  const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthlyExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date);
    return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
  });

  const categoryData = CATEGORIES.map(cat => {
    const total = monthlyExpenses
      .filter(exp => exp.category === cat.id)
      .reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    return {
      name: cat.name,
      value: total,
      color: cat.color
    };
  }).filter(item => item.value > 0);

  // Line chart data (last 6 months)
  const monthlyData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const month = d.toLocaleString('en', { month: 'short' });
    const monthNum = d.getMonth();
    const yearNum = d.getFullYear();
    
    const total = expenses
      .filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.getMonth() === monthNum && expDate.getFullYear() === yearNum;
      })
      .reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    
    monthlyData.push({ month, total });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <DollarSign className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Expense Tracker</h1>
            <p className="text-gray-600">Manage your expenses smartly</p>
          </div>
          
          <button
            onClick={signInWithGoogle}
            className="w-full bg-white border-2 border-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>
          
          <p className="text-xs text-gray-500 mt-6">
            Your data is secure and private
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">
          {currentView === 'dashboard' ? 'Dashboard' : currentView === 'expenses' ? 'Expenses' : 'Settings'}
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user.email}</span>
          <button
            onClick={signOut}
            className="text-red-500 hover:text-red-600"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Add Expense</h2>
              <button onClick={() => setShowAddExpense(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-4xl text-gray-600">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="text-4xl font-light text-gray-600 outline-none flex-1"
                  step="0.01"
                />
              </div>

              <div className="bg-gray-100 rounded-xl p-4 flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-500" />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-gray-700"
                >
                  <option value="">Category</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="bg-gray-100 rounded-xl p-4 flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-500" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-gray-700"
                />
              </div>

              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note (optional)"
                className="w-full bg-gray-100 rounded-xl p-4 outline-none resize-none h-32"
              />

              <button
                onClick={addExpense}
                className="w-full bg-green-500 text-white font-semibold py-4 rounded-xl hover:bg-green-600 transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-4 pb-24">
        {currentView === 'dashboard' && (
          <>
            {/* Total Expenses Card */}
            <div className="bg-green-100 rounded-2xl p-6 mb-6">
              <p className="text-gray-600 text-sm mb-2">Total Expenses</p>
              <p className="text-4xl font-bold text-gray-800">
                ${totalExpenses.toFixed(2)}
              </p>
            </div>

            {/* Expenses by Category */}
            <div className="bg-white rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold">Expenses by Category</h2>
                  <p className="text-sm text-gray-500">This Month</p>
                </div>
              </div>

              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-500 py-12">No expenses this month</p>
              )}
            </div>

            {/* Expenses Over Time */}
            <div className="bg-white rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold">Expenses Over Time</h2>
                  <p className="text-sm text-gray-500">Last 6 Months</p>
                </div>
                <TrendingUp className="w-6 h-6 text-gray-400" />
              </div>

              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    fill="#d1fae5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {currentView === 'expenses' && (
          <div className="space-y-4">
            {expenses.length === 0 ? (
              <p className="text-center text-gray-500 py-12">No expenses yet</p>
            ) : (
              expenses.map((expense) => (
                <div key={expense.id} className="bg-white rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ 
                        backgroundColor: CATEGORIES.find(c => c.id === expense.category)?.color + '20' 
                      }}
                    >
                      <DollarSign 
                        className="w-6 h-6"
                        style={{ 
                          color: CATEGORIES.find(c => c.id === expense.category)?.color 
                        }}
                      />
                    </div>
                    <div>
                      <p className="font-semibold">
                        {CATEGORIES.find(c => c.id === expense.category)?.name}
                      </p>
                      <p className="text-sm text-gray-500">{expense.date}</p>
                      {expense.note && (
                        <p className="text-xs text-gray-400">{expense.note}</p>
                      )}
                    </div>
                  </div>
                  <p className="text-xl font-bold">${parseFloat(expense.amount).toFixed(2)}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`flex flex-col items-center gap-1 ${
              currentView === 'dashboard' ? 'text-green-500' : 'text-gray-400'
            }`}
          >
            <TrendingUp className="w-6 h-6" />
            <span className="text-xs">Dashboard</span>
          </button>
          
          <button
            onClick={() => setCurrentView('expenses')}
            className={`flex flex-col items-center gap-1 ${
              currentView === 'expenses' ? 'text-green-500' : 'text-gray-400'
            }`}
          >
            <FileText className="w-6 h-6" />
            <span className="text-xs">Expenses</span>
          </button>
        </div>
      </div>

      {/* Floating Add Button */}
      <button
        onClick={() => setShowAddExpense(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 transition flex items-center justify-center"
      >
        <Plus className="w-8 h-8" />
      </button>
    </div>
  );
}

export default App;