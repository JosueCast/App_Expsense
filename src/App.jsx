import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { X, Plus, LogOut, TrendingUp, DollarSign, Calendar, FileText, Edit, Trash2, Save, Download, Filter, Search } from 'lucide-react';

// Configuración de Supabase
const supabaseUrl = 'https://vpkiuusicbglppjctofm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwa2l1dXNpY2JnbHBwamN0b2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NzcyMzcsImV4cCI6MjA3NzM1MzIzN30.8ebUBa0jLesqh0nTRpy8-8P8ZCdwkWcNGL6bXuvLPOY';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Categorías predefinidas
const CATEGORIES = [
  { id: 'food', name: 'Comida', color: '#10b981' },
  { id: 'transport', name: 'Transporte', color: '#3b82f6' },
  { id: 'entertainment', name: 'Entretenimiento', color: '#f59e0b' },
  { id: 'utilities', name: 'Servicios', color: '#ef4444' },
  { id: 'shopping', name: 'Compras', color: '#8b5cf6' },
  { id: 'health', name: 'Salud', color: '#ec4899' },
  { id: 'other', name: 'Otros', color: '#6b7280' }
];

// Opciones de período para gráficas
const PERIOD_OPTIONS = [
  { value: '7days', label: 'Últimos 7 Días', type: 'days' },
  { value: '30days', label: 'Últimos 30 Días', type: 'days' },
  { value: '3months', label: 'Últimos 3 Meses', type: 'months' },
  { value: '6months', label: 'Últimos 6 Meses', type: 'months' },
  { value: '1year', label: 'Último 1 Año', type: 'months' },
  { value: '2years', label: 'Últimos 2 Años', type: 'years' }
];

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [chartPeriod, setChartPeriod] = useState('6months');
  const [exportPeriod, setExportPeriod] = useState('currentMonth');
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showFilters, setShowFilters] = useState(false);

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

  useEffect(() => {
    applyFilters();
  }, [expenses, searchTerm, categoryFilter, priceRange, dateRange]);

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

  // Función para aplicar todos los filtros
  const applyFilters = () => {
    let filtered = [...expenses];

    // Filtro por búsqueda en notas
    if (searchTerm) {
      filtered = filtered.filter(expense =>
        expense.note?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por categoría
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(expense => expense.category === categoryFilter);
    }

    // Filtro por rango de precio
    if (priceRange.min) {
      filtered = filtered.filter(expense => parseFloat(expense.amount) >= parseFloat(priceRange.min));
    }
    if (priceRange.max) {
      filtered = filtered.filter(expense => parseFloat(expense.amount) <= parseFloat(priceRange.max));
    }

    // Filtro por rango de fecha
    if (dateRange.start) {
      filtered = filtered.filter(expense => expense.date >= dateRange.start);
    }
    if (dateRange.end) {
      filtered = filtered.filter(expense => expense.date <= dateRange.end);
    }

    setFilteredExpenses(filtered);
  };

  // Limpiar todos los filtros
  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setPriceRange({ min: '', max: '' });
    setDateRange({ start: '', end: '' });
    setShowFilters(false);
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
    setFilteredExpenses([]);
    setEditingExpense(null);
    setDeleteConfirm(null);
    clearFilters();
  };

  // CREATE - Agregar gasto
  const addExpense = async () => {
    if (!amount || !category || !date) {
      alert('Por favor complete todos los campos requeridos');
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
      resetForm();
      setShowAddExpense(false);
    } else {
      alert('Error agregando gasto: ' + error.message);
    }
  };

  // UPDATE - Editar gasto
  const updateExpense = async () => {
    if (!amount || !category || !date) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    const { error } = await supabase
      .from('expenses')
      .update({
        amount: parseFloat(amount),
        category: category,
        date: date,
        note: note
      })
      .eq('id', editingExpense.id)
      .eq('user_id', user.id);

    if (!error) {
      await loadExpenses(user.id);
      resetForm();
      setEditingExpense(null);
    } else {
      alert('Error actualizando gasto: ' + error.message);
    }
  };

  // DELETE - Eliminar gasto
  const deleteExpense = async (expenseId) => {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId)
      .eq('user_id', user.id);

    if (!error) {
      await loadExpenses(user.id);
      setDeleteConfirm(null);
    } else {
      alert('Error eliminando gasto: ' + error.message);
    }
  };

  // Iniciar edición
  const startEdit = (expense) => {
    setEditingExpense(expense);
    setAmount(expense.amount.toString());
    setCategory(expense.category);
    setDate(expense.date);
    setNote(expense.note || '');
    setShowAddExpense(true);
  };

  // Resetear formulario
  const resetForm = () => {
    setAmount('');
    setCategory('');
    setDate(new Date().toISOString().split('T')[0]);
    setNote('');
  };

  // Cerrar modal
  const closeModal = () => {
    setShowAddExpense(false);
    setEditingExpense(null);
    resetForm();
  };

  // Función para generar datos de la gráfica según el período seleccionado
  const generateChartData = () => {
    const now = new Date();
    const period = PERIOD_OPTIONS.find(p => p.value === chartPeriod);
    
    if (!period) return [];

    let data = [];
    
    switch (period.type) {
      case 'days':
        for (let i = parseInt(period.value) - 1; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const day = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
          
          const total = expenses
            .filter(exp => {
              const expDate = new Date(exp.date);
              return expDate.toDateString() === d.toDateString();
            })
            .reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
          
          data.push({ period: day, total, date: d });
        }
        break;

      case 'months':
        const monthCount = parseInt(period.value);
        for (let i = monthCount - 1; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const month = d.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
          const monthNum = d.getMonth();
          const yearNum = d.getFullYear();
          
          const total = expenses
            .filter(exp => {
              const expDate = new Date(exp.date);
              return expDate.getMonth() === monthNum && expDate.getFullYear() === yearNum;
            })
            .reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
          
          data.push({ period: month, total });
        }
        break;

      case 'years':
        for (let i = parseInt(period.value.replace('years', '')) - 1; i >= 0; i--) {
          const d = new Date();
          d.setFullYear(d.getFullYear() - i);
          const year = d.getFullYear().toString();
          
          const total = expenses
            .filter(exp => {
              const expDate = new Date(exp.date);
              return expDate.getFullYear() === d.getFullYear();
            })
            .reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
          
          data.push({ period: year, total });
        }
        break;
    }

    return data;
  };

  // metodo para exportar a PDF 
  const exportToPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      
      const doc = new jsPDF();
      
      // Título
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text('Reporte de Gastos', 105, 20, { align: 'center' });
      
      // Información del usuario y fecha
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Usuario: ${user.email}`, 20, 30);
      doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, 20, 37);
      
      let exportFilteredExpenses = expenses;
      let periodText = 'Todo el Historial';
      
      // Filtrar gastos según el período de exportación
      const now = new Date();
      switch (exportPeriod) {
        case 'currentMonth':
          exportFilteredExpenses = expenses.filter(exp => {
            const expDate = new Date(exp.date);
            return expDate.getMonth() === now.getMonth() && 
                   expDate.getFullYear() === now.getFullYear();
          });
          periodText = `Mes Actual (${now.toLocaleString('es-ES', { month: 'long', year: 'numeric' })})`;
          break;
          
        case 'lastMonth':
          const lastMonth = new Date();
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          exportFilteredExpenses = expenses.filter(exp => {
            const expDate = new Date(exp.date);
            return expDate.getMonth() === lastMonth.getMonth() && 
                   expDate.getFullYear() === lastMonth.getFullYear();
          });
          periodText = `Mes Anterior (${lastMonth.toLocaleString('es-ES', { month: 'long', year: 'numeric' })})`;
          break;
          
        case 'currentYear':
          exportFilteredExpenses = expenses.filter(exp => {
            const expDate = new Date(exp.date);
            return expDate.getFullYear() === now.getFullYear();
          });
          periodText = `Año Actual (${now.getFullYear()})`;
          break;
      }
      
      doc.text(`Período: ${periodText}`, 20, 44);
      
      // Resumen estadístico
      const total = exportFilteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
      const avg = exportFilteredExpenses.length > 0 ? total / exportFilteredExpenses.length : 0;
      
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text('Resumen:', 20, 60);
      doc.setFontSize(10);
      doc.text(`Gastos Totales: $${total.toFixed(2)}`, 30, 70);
      doc.text(`Número de Gastos: ${exportFilteredExpenses.length}`, 30, 77);
      doc.text(`Promedio por Gasto: $${avg.toFixed(2)}`, 30, 84);
      
      // Encabezados de la tabla manual
      let yPos = 100;
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.setFillColor(16, 185, 129);
      doc.rect(20, yPos - 5, 170, 8, 'F');
      doc.text('Fecha', 25, yPos);
      doc.text('Categoría', 60, yPos);
      doc.text('Monto', 120, yPos);
      doc.text('Nota', 150, yPos);
      
      // Datos de la tabla manual
      doc.setTextColor(0, 0, 0);
      yPos += 10;
      
      if (exportFilteredExpenses.length > 0) {
        exportFilteredExpenses.forEach((expense, index) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          
          // Formatear fecha en formato español
          const expenseDate = new Date(expense.date);
          const formattedDate = expenseDate.toLocaleDateString('es-ES');
          
          doc.text(formattedDate, 25, yPos);
          doc.text(CATEGORIES.find(cat => cat.id === expense.category)?.name || 'Otros', 60, yPos);
          doc.text(`$${parseFloat(expense.amount).toFixed(2)}`, 120, yPos);
          
          // Nota truncada si es muy larga
          const note = expense.note || '-';
          const truncatedNote = note.length > 20 ? note.substring(0, 20) + '...' : note;
          doc.text(truncatedNote, 150, yPos);
          
          // Línea separadora
          if (index < exportFilteredExpenses.length - 1) {
            doc.setDrawColor(200, 200, 200);
            doc.line(20, yPos + 3, 190, yPos + 3);
          }
          
          yPos += 10;
        });
      } else {
        doc.text('No se encontraron gastos para el período seleccionado.', 20, yPos);
      }
      
      // Distribución por categorías
      const categoryTotals = {};
      exportFilteredExpenses.forEach(exp => {
        categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + parseFloat(exp.amount);
      });
      
      yPos += 20;
      
      if (Object.keys(categoryTotals).length > 0 && yPos < 250) {
        doc.setFontSize(12);
        doc.text('Gastos por Categoría:', 20, yPos);
        
        yPos += 10;
        Object.entries(categoryTotals).forEach(([catId, totalCat]) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          
          const catName = CATEGORIES.find(c => c.id === catId)?.name || 'Otros';
          const percentage = total > 0 ? ((totalCat / total) * 100).toFixed(1) : 0;
          doc.setFontSize(10);
          doc.text(`${catName}: $${totalCat.toFixed(2)} (${percentage}%)`, 30, yPos);
          yPos += 7;
        });
      }
      
      // Número de página
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Página ${i} de ${pageCount}`, 195, 290, { align: 'right' });
      }
      
      // Guardar PDF
      doc.save(`reporte-gastos-${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Por favor, intente nuevamente.');
    }
  };

  // Calculations usando filteredExpenses para las vistas
  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthlyExpenses = filteredExpenses.filter(exp => {
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

  const chartData = generateChartData();

  // Verificar si hay filtros activos
  const hasActiveFilters = 
    searchTerm || 
    categoryFilter !== 'all' || 
    priceRange.min || 
    priceRange.max || 
    dateRange.start || 
    dateRange.end;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <DollarSign className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Gestor de Gastos</h1>
            <p className="text-gray-600">Administra tus gastos inteligentemente</p>
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
            Iniciar sesión con Google
          </button>
          
          <p className="text-xs text-gray-500 mt-6">
            Tus datos están seguros y son privados
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
          {currentView === 'dashboard' ? 'Dashboard' : currentView === 'expenses' ? 'Gastos' : 'Exportar'}
        </h1>
        <div className="flex items-center gap-4">
        
          <span className="text-sm text-gray-600 hidden sm:inline">{user.email}</span>
          <button
            onClick={signOut}
            className="text-red-500 hover:text-red-600 p-2"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Add/Edit Expense Modal - CORREGIDO */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                {editingExpense ? 'Editar Gasto' : 'Agregar Gasto'}
              </h2>
              <button 
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
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
                  className="text-4xl font-light text-gray-600 outline-none flex-1 bg-transparent"
                  step="0.01"
                  min="0"
                />
              </div>

              <div className="bg-gray-100 rounded-xl p-4 flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-500" />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-gray-700"
                  required
                >
                  <option value="">Selecciona una categoría</option>
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
                  required
                />
              </div>

              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Nota (opcional)"
                className="w-full bg-gray-100 rounded-xl p-4 outline-none resize-none h-32"
              />

              <button
                onClick={editingExpense ? updateExpense : addExpense}
                className="w-full bg-green-500 text-white font-semibold py-4 rounded-xl hover:bg-green-600 transition flex items-center justify-center gap-2"
              >
                {editingExpense ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                {editingExpense ? 'Actualizar Gasto' : 'Guardar Gasto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-red-600">Confirmar Eliminación</h2>
              <button onClick={() => setDeleteConfirm(null)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-700">
                ¿Estás seguro de que quieres eliminar este gasto?
              </p>
              <div className="bg-red-50 rounded-xl p-4">
                <p className="font-semibold">
                  {CATEGORIES.find(c => c.id === deleteConfirm.category)?.name}
                </p>
                <p className="text-lg font-bold">${parseFloat(deleteConfirm.amount).toFixed(2)}</p>
                <p className="text-sm text-gray-500">{deleteConfirm.date}</p>
                {deleteConfirm.note && (
                  <p className="text-sm text-gray-600 mt-1">{deleteConfirm.note}</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 bg-gray-500 text-white font-semibold py-3 rounded-xl hover:bg-gray-600 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => deleteExpense(deleteConfirm.id)}
                  className="flex-1 bg-red-500 text-white font-semibold py-3 rounded-xl hover:bg-red-600 transition flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-4 pb-32 sm:pb-24">
        {currentView === 'dashboard' && (
          <>
            {/* Filtros para Dashboard - MEJORADO RESPONSIVE */}
            <div className="bg-white rounded-2xl p-4 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">Filtros</h3>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 text-green-500 hover:text-green-600 p-2"
                >
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
                  </span>
                </button>
              </div>

              {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Búsqueda por nota */}
                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Notas</label>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar en notas..."
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>

                  {/* Filtro por categoría */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="all">Todas las Categorías</option>
                      {CATEGORIES.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro por rango de precio */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rango de Precio</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={priceRange.min}
                        onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                        placeholder="Mín"
                        className="w-1/2 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                      <input
                        type="number"
                        value={priceRange.max}
                        onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                        placeholder="Máx"
                        className="w-1/2 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>

                  {/* Filtro por rango de fecha */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rango de Fechas</label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        className="w-1/2 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                      <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        className="w-1/2 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {hasActiveFilters && (
                <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="text-sm text-gray-600">
                    Mostrando {filteredExpenses.length} de {expenses.length} gastos
                  </span>
                  <button
                    onClick={clearFilters}
                    className="text-red-500 hover:text-red-600 text-sm font-medium"
                  >
                    Limpiar Filtros
                  </button>
                </div>
              )}
            </div>

            {/* Total Expenses Card */}
            <div className="bg-green-100 rounded-2xl p-6 mb-6">
              <p className="text-gray-600 text-sm mb-2">Total de Gastos</p>
              <p className="text-3xl sm:text-4xl font-bold text-gray-800">
                ${totalExpenses.toFixed(2)}
              </p>
              {hasActiveFilters && (
                <p className="text-sm text-gray-600 mt-2">
                  (Filtrado de ${expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0).toFixed(2)} total)
                </p>
              )}
            </div>

            {/* Expenses by Category */}
            <div className="bg-white rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold">Gastos por Categoría</h2>
                  <p className="text-sm text-gray-500">Este Mes</p>
                </div>
              </div>

              {categoryData.length > 0 ? (
                <div className="h-64 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
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
                </div>
              ) : (
                <p className="text-center text-gray-500 py-12">No hay gastos este mes</p>
              )}
            </div>

            {/* Expenses Over Time */}
            <div className="bg-white rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold">Gastos en el Tiempo</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select
                      value={chartPeriod}
                      onChange={(e) => setChartPeriod(e.target.value)}
                      className="text-sm bg-gray-100 rounded-lg px-3 py-1 outline-none"
                    >
                      {PERIOD_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <TrendingUp className="w-6 h-6 text-gray-400" />
              </div>

              {chartData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="period" 
                        stroke="#9ca3af"
                        angle={-45}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip 
                        formatter={(value) => [`$${value.toFixed(2)}`, 'Total']}
                        labelFormatter={(label) => `Período: ${label}`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="total" 
                        stroke="#10b981" 
                        strokeWidth={3}
                        dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-12">No hay datos para el período seleccionado</p>
              )}
            </div>
          </>
        )}

        {currentView === 'expenses' && (
          <div className="space-y-4">
            {/* Filtros para Expenses - MEJORADO RESPONSIVE */}
            <div className="bg-white rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">Filtrar Gastos</h3>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 text-green-500 hover:text-green-600 p-2"
                >
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
                  </span>
                </button>
              </div>

              {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Búsqueda por nota */}
                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Buscar en Notas</label>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar en notas..."
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>

                  {/* Filtro por categoría */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="all">Todas las Categorías</option>
                      {CATEGORIES.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro por rango de precio */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rango de Precio</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={priceRange.min}
                        onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                        placeholder="Mín"
                        className="w-1/2 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                      <input
                        type="number"
                        value={priceRange.max}
                        onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                        placeholder="Máx"
                        className="w-1/2 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>

                  {/* Filtro por rango de fecha */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rango de Fechas</label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        className="w-1/2 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                      <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        className="w-1/2 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {hasActiveFilters && (
                <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="text-sm text-gray-600">
                    Mostrando {filteredExpenses.length} de {expenses.length} gastos
                  </span>
                  <button
                    onClick={clearFilters}
                    className="text-red-500 hover:text-red-600 text-sm font-medium"
                  >
                    Limpiar Filtros
                  </button>
                </div>
              )}
            </div>

            {filteredExpenses.length === 0 ? (
              <p className="text-center text-gray-500 py-12">
                {expenses.length === 0 ? 'No hay gastos aún' : 'No hay gastos que coincidan con tus filtros'}
              </p>
            ) : (
              filteredExpenses.map((expense) => (
                <div key={expense.id} className="bg-white rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center"
                        style={{ 
                          backgroundColor: CATEGORIES.find(c => c.id === expense.category)?.color + '20' 
                        }}
                      >
                        <DollarSign 
                          className="w-4 h-4 sm:w-6 sm:h-6"
                          style={{ 
                            color: CATEGORIES.find(c => c.id === expense.category)?.color 
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm sm:text-base truncate">
                          {CATEGORIES.find(c => c.id === expense.category)?.name}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500">{expense.date}</p>
                        {expense.note && (
                          <p className="text-xs text-gray-400 truncate">{expense.note}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-lg sm:text-xl font-bold">${parseFloat(expense.amount).toFixed(2)}</p>
                      <div className="flex gap-1 ml-2 sm:ml-4">
                        <button
                          onClick={() => startEdit(expense)}
                          className="p-1 sm:p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(expense)}
                          className="p-1 sm:p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {currentView === 'export' && (
          <div className="bg-white rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4">Exportar Gastos</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">                
                  Período de Exportación
                </label>
                <select
                  value={exportPeriod}
                  onChange={(e) => setExportPeriod(e.target.value)}
                  className="w-full bg-gray-100 rounded-xl p-4 outline-none text-gray-700"
                >
                  <option value="currentMonth">Mes Actual</option>
                  <option value="lastMonth">Mes Anterior</option>
                  <option value="currentYear">Año Actual</option>
                  <option value="all">Todo el Tiempo</option>
                </select>
              </div>

              <button
                onClick={exportToPDF}
                className="w-full bg-green-500 text-white font-semibold py-4 rounded-xl hover:bg-green-600 transition flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Generar Reporte en PDF
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation - MEJORADO RESPONSIVE */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${
              currentView === 'dashboard' ? 'text-green-500 bg-green-50' : 'text-gray-400'
            }`}
          >
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-xs">Dashboard</span>
          </button>
          
          <button
            onClick={() => setCurrentView('expenses')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${
              currentView === 'expenses' ? 'text-green-500 bg-green-50' : 'text-gray-400'
            }`}
          >
            <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-xs">Gastos</span>
          </button>

          <button
            onClick={() => setCurrentView('export')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${
              currentView === 'export' ? 'text-green-500 bg-green-50' : 'text-gray-400'
            }`}
          >
            <Download className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-xs">Exportar</span>
          </button>
        </div>
      </div>

      {/* Floating Add Button - CORREGIDO */}
      <button
        onClick={() => setShowAddExpense(true)}
        className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 transition flex items-center justify-center z-40"
      >
        <Plus className="w-6 h-6 sm:w-8 sm:h-8" />
      </button>
    </div>
  );
}

export default App;