import React, { useState, useEffect } from 'react';
import { CheckCircle, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const RevocacionesPanel = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    fetchRevocaciones();
  }, []);

  const fetchRevocaciones = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('solicitudes_revocacion')
        .select('*')
        .eq('estado', 'pendiente')
        .order('created_at', { ascending: false });

      if (err) throw err;
      
      setSolicitudes(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error fetching revocaciones", e);
      setError('Error al cargar las solicitudes');
    } finally {
      setLoading(false);
    }
  };

  const handleAprobarRevocacion = async (id) => {
    if (!window.confirm('¿Estás seguro de aprobar esta solicitud? Se eliminará el voto anterior asociado a este DNI y el usuario podrá votar de nuevo.')) return;
    try {
      // Obtener el DNI de la solicitud
      const { data: reqData, error: reqError } = await supabase
        .from('solicitudes_revocacion')
        .select('dni')
        .eq('id', id)
        .single();
        
      if (reqError) throw reqError;
      
      const dni_afectado = reqData.dni;
      
      // Eliminar el voto existente
      await supabase.from('votos').delete().eq('dni', dni_afectado);
      await supabase.from('cola_votos').delete().eq('dni', dni_afectado);
      
      // Actualizar estado de la solicitud
      const { error: updateError } = await supabase
        .from('solicitudes_revocacion')
        .update({ estado: 'aprobado' })
        .eq('id', id);
        
      if (updateError) throw updateError;
      
      setMessage('Revocación aprobada exitosamente.');
      setSolicitudes(prev => prev.filter(s => s.id !== id));
      
      setTimeout(() => setMessage(''), 3000);
    } catch (e) {
      console.error(e);
      setMessage('Error aprobando la revocación. Intenta nuevamente.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm border border-gray-200">
        <Loader2 className="animate-spin text-emerald-600 mb-4" size={32} />
        <p className="text-gray-500 font-medium">Cargando solicitudes pendientes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-red-100">
        <p className="text-red-500 text-lg font-medium">{error}</p>
        <button onClick={fetchRevocaciones} className="mt-4 bg-red-50 text-red-600 px-4 py-2 rounded font-semibold hover:bg-red-100 transition">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 md:p-8">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h2 className="text-xl font-bold text-gray-900">Solicitudes de Revocación Pendientes</h2>
          <span className="bg-red-100 text-red-600 font-bold py-1 px-3 rounded-full text-xs">
            {solicitudes.length} en cola
          </span>
        </div>
        
        {message && (
          <div className={`mb-6 p-4 rounded-lg font-medium text-sm ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
            {message}
          </div>
        )}

        {solicitudes.length === 0 ? (
          <p className="text-gray-500 italic text-sm text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-200">
            No hay solicitudes pendientes por el momento.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">DNI</th>
                  <th className="px-4 py-3 font-semibold">Teléfono</th>
                  <th className="px-4 py-3 font-semibold">Fecha (UTC)</th>
                  <th className="px-4 py-3 font-semibold text-center">Evidencia</th>
                  <th className="px-4 py-3 font-semibold text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {solicitudes.map(r => {
                  const isBase64 = r.foto_url?.startsWith('data:image');
                  const imageSrc = isBase64 
                    ? r.foto_url 
                    : `/imagen/${r.foto_url?.includes('/') ? r.foto_url.split('/').pop() : r.foto_url}`;
                  
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-bold text-gray-900">{r.dni}</td>
                      <td className="px-4 py-3">{r.telefono}</td>
                      <td className="px-4 py-3 text-xs">{new Date(r.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <button 
                          onClick={() => setPreviewImage(imageSrc)}
                          className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 font-medium bg-emerald-50 px-2 py-1 rounded transition"
                        >
                          Ver Foto <ExternalLink size={14} />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleAprobarRevocacion(r.id)}
                          className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg text-xs font-bold transition shadow-sm hover:shadow-md"
                        >
                          <CheckCircle size={16} /> Aprobar y Devolver Voto
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setPreviewImage(null)}
              className="absolute -top-12 right-0 md:-right-12 text-white hover:text-gray-300 p-2 bg-black/50 hover:bg-black/80 rounded-full transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <img 
              src={previewImage} 
              alt="Evidencia DNI" 
              className="max-w-full max-h-[85vh] object-contain rounded shadow-2xl bg-gray-900" 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default RevocacionesPanel;
