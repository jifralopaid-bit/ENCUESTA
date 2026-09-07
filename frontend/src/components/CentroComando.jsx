import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { Eye, EyeOff, Plus, Minus, ShieldAlert, Activity, Users, BarChart3 } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const COLORS = ['#035c43', '#128a67', '#eab308', '#f43f5e', '#3b82f6', '#8b5cf6'];

const CentroComando = () => {
  const [estadisticas, setEstadisticas] = useState(null);
  const [resultados, setResultados] = useState([]);
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, resultsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/admin/estadisticas`),
        axios.get(`${BACKEND_URL}/api/results`)
      ]);
      setEstadisticas(statsRes.data);
      setResultados(resultsRes.data.data);
      setIsPublic(!resultsRes.data.resultados_ocultos);
    } catch (error) {
      console.error("Error fetching data", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleVisibility = async () => {
    const newValue = !isPublic;
    try {
      await axios.put(`${BACKEND_URL}/api/admin/config/resultados`, {
        mostrar_resultados_publicos: newValue
      });
      setIsPublic(newValue);
    } catch (error) {
      console.error("Error toggling visibility", error);
      alert("Error al actualizar visibilidad");
    }
  };

  const handleManualVotes = async (candidatoId, amount) => {
    try {
      await axios.post(`${BACKEND_URL}/api/admin/candidatos/${candidatoId}/votos-manuales`, {
        cantidad: amount
      });
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Error updating manual votes", error);
      alert("Error al actualizar votos manuales");
    }
  };

  if (loading) {
    return <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-800"></div></div>;
  }

  return (
    <div className="space-y-6">
      
      {/* SECCIÓN 1: CONTROLES MAESTROS */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <ShieldAlert className="text-emerald-700" /> Controles Maestros
        </h2>
        <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-200">
          <div>
            <h3 className="font-bold text-gray-900">Visibilidad Pública de Resultados</h3>
            <p className="text-sm text-gray-500">Activa o desactiva la visualización de porcentajes y barras de progreso en la página de inicio pública.</p>
          </div>
          <button 
            onClick={toggleVisibility}
            className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isPublic ? 'bg-emerald-600' : 'bg-gray-300'}`}
          >
            <span className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isPublic ? 'translate-x-6' : 'translate-x-0'}`}></span>
          </button>
        </div>
      </div>

      {/* SECCIÓN 2: INYECCIÓN MANUAL DE VOTOS */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="text-emerald-700" /> Monitor de Votos y Control Manual
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 border-b">
              <tr>
                <th className="px-4 py-3 font-semibold rounded-tl-xl">Candidato</th>
                <th className="px-4 py-3 font-semibold text-center">Votos Reales (Sistema)</th>
                <th className="px-4 py-3 font-semibold text-center">Votos Manuales (Inyectados)</th>
                <th className="px-4 py-3 font-semibold text-center">Total Matemático</th>
                <th className="px-4 py-3 font-semibold text-right rounded-tr-xl">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {resultados.map((cand) => (
                <tr key={cand.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-3">
                    <img src={cand.image_url} alt={cand.name} className="w-8 h-8 rounded-full object-cover shadow-sm bg-white" />
                    {cand.name}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-blue-600">{cand.votos_reales}</td>
                  <td className="px-4 py-3 text-center font-bold text-orange-600">{cand.votos_manuales}</td>
                  <td className="px-4 py-3 text-center font-bold text-emerald-700 text-lg">{cand.votos}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleManualVotes(cand.id, -1)} className="p-1.5 rounded bg-red-100 text-red-700 hover:bg-red-200 transition" title="Restar 1">
                        <Minus size={16} />
                      </button>
                      <button onClick={() => handleManualVotes(cand.id, 1)} className="p-1.5 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition" title="Sumar 1">
                        <Plus size={16} />
                      </button>
                      <button onClick={() => handleManualVotes(cand.id, 50)} className="px-2 py-1.5 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 text-xs font-bold transition" title="Sumar 50">
                        +50
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECCIÓN 3: GRÁFICOS ESTADÍSTICOS */}
      {estadisticas && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Users className="text-emerald-700" /> Distribución por Género
            </h2>
            <div className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={estadisticas.genero.filter(g => g.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {estadisticas.genero.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <BarChart3 className="text-emerald-700" /> Grupos de Edad
            </h2>
            <div className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={estadisticas.edades}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="value" fill="#035c43" radius={[4, 4, 0, 0]} name="Votantes" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 lg:col-span-2">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <BarChart3 className="text-emerald-700" /> Preferencia Electoral por Género
            </h2>
            <div className="min-h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={estadisticas.preferencias} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" fontSize={12} angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="MASCULINO" stackId="a" fill="#3b82f6" name="Varones" />
                  <Bar dataKey="FEMENINO" stackId="a" fill="#f43f5e" name="Mujeres" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default CentroComando;
