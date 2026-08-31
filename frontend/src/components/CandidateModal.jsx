import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, MapPin, User, Download, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

const CandidateModal = ({ isOpen, onClose, candidato, onVoteClick }) => {
  const [regidores, setRegidores] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && candidato) {
      fetchRegidores();
    }
  }, [isOpen, candidato]);

  const fetchRegidores = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('regidores')
        .select('*')
        .eq('candidato_id', candidato.id)
        .order('cargo', { ascending: true });
      
      if (error) throw error;
      setRegidores(data || []);
    } catch (error) {
      console.error('Error fetching regidores:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !candidato) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-3xl bg-[#f8f9fa] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] md:max-h-[85vh]"
        >
          {/* Header Institucional (shrink-0) */}
          <div className="shrink-0 bg-white px-6 py-4 flex items-center justify-between border-b border-gray-200 relative z-10">
            <div className="flex items-center gap-4">
              {candidato.logo_partido_url ? (
                <div className="w-12 h-12 rounded-full border border-gray-200 p-1 flex-shrink-0">
                  <img src={candidato.logo_partido_url} alt="Logo" className="w-full h-full object-contain rounded-full" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="text-gray-400" />
                </div>
              )}
              <div>
                <h2 className="text-[15px] font-bold text-gray-900 uppercase leading-tight tracking-tight">ORGANIZACIÓN POLÍTICA</h2>
                <p className="text-xs text-gray-500">Municipalidad Distrital</p>
              </div>
            </div>
            
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-full transition-colors"
            >
              <X size={20} strokeWidth={2} />
            </button>
          </div>

          {/* Botonera Superior (shrink-0) */}
          <div className="shrink-0 bg-white px-6 py-3 border-b border-gray-200 flex flex-wrap gap-3 justify-center shadow-sm relative z-10">
            {candidato.plan_gobierno_pdf_url && (
              <a 
                href={candidato.plan_gobierno_pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-[#dc2626] text-[#dc2626] hover:bg-red-50 text-xs sm:text-sm font-semibold rounded-full transition-colors"
              >
                Plan de Gobierno
              </a>
            )}
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-[#dc2626] text-[#dc2626] hover:bg-red-50 text-xs sm:text-sm font-semibold rounded-full transition-colors cursor-pointer">
              Resumen de Plan de Gobierno
            </div>
          </div>

          {/* Área de Contenido con Scroll (flex-1 overflow-y-auto) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar relative">
            
            {/* Tarjeta del Alcalde */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {candidato.image_url ? (
                      <img src={candidato.image_url} alt={candidato.name} className="w-full h-full object-cover" />
                    ) : (
                      <User size={32} className="text-gray-400" />
                    )}
                  </div>
                  <div>
                    <span className="text-[#dc2626] text-[11px] font-bold tracking-widest uppercase">
                      Alcalde Distrital
                    </span>
                    <h3 className="text-lg font-bold text-gray-900 leading-tight mt-0.5">
                      {candidato.name}
                    </h3>
                    <div className="flex items-center gap-1 text-gray-500 text-xs mt-1.5 mb-2">
                      <MapPin size={12} /> Postula por La Peca
                    </div>
                    <span className="inline-block px-2.5 py-0.5 bg-gray-100 text-gray-600 border border-gray-200 rounded-full text-[11px] font-semibold">
                      Inscrito
                    </span>
                  </div>
                </div>

                {candidato.hoja_vida_pdf_url && (
                  <a 
                    href={candidato.hoja_vida_pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#dc2626] text-[#dc2626] hover:bg-red-50 rounded-md text-sm font-medium transition-colors w-full sm:w-auto justify-center"
                  >
                    <FileText size={16} /> Ver hoja de vida
                  </a>
                )}
              </div>
              
              {/* Visión / Propuesta */}
              <div className="px-5 py-4 bg-gray-50 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Visión / Propuesta Principal</h4>
                <p className="text-sm text-gray-700 leading-relaxed italic">
                  "{candidato.proposal}"
                </p>
              </div>
            </div>

            {/* Lista de Regidores */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-3 ml-1">Regidores ({regidores.length})</h3>
              
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                </div>
              ) : regidores.length > 0 ? (
                <div className="space-y-3">
                  {regidores.map((reg, index) => (
                    <div key={reg.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      
                      <div className="flex items-center gap-4">
                        <span className="text-gray-400 font-bold w-4 text-center">{index + 1}</span>
                        <div className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {reg.image_url ? (
                            <img src={reg.image_url} alt={reg.nombre} className="w-full h-full object-cover" />
                          ) : (
                            <User size={24} className="text-gray-400" />
                          )}
                        </div>
                        <div>
                          <span className="text-gray-500 text-[10px] font-bold tracking-widest uppercase block mb-0.5">
                            {reg.cargo || 'Regidor Distrital'}
                          </span>
                          <h4 className="text-sm font-bold text-gray-900 leading-tight">
                            {reg.nombre}
                          </h4>
                          <div className="flex items-center gap-1 text-gray-500 text-[11px] mt-1 mb-1.5">
                            <MapPin size={10} /> Postula por La Peca
                          </div>
                          <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 border border-gray-200 rounded-full text-[10px] font-semibold">
                            Inscrito
                          </span>
                        </div>
                      </div>

                      {reg.hoja_vida_pdf_url && (
                        <a 
                          href={reg.hoja_vida_pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#dc2626] text-[#dc2626] hover:bg-red-50 rounded-md text-[13px] font-medium transition-colors w-full sm:w-auto justify-center ml-8 sm:ml-0"
                        >
                          <FileText size={14} /> Ver hoja de vida
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-white rounded-xl border border-gray-200 border-dashed">
                  <p className="text-sm text-gray-500">No se ha registrado información de regidores.</p>
                </div>
              )}
            </div>

          </div>

          {/* Footer de Acción (shrink-0) */}
          <div className="shrink-0 bg-white p-4 border-t border-gray-200 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] relative z-20">
            <button 
              onClick={() => onVoteClick(candidato.id, candidato.name)}
              className="w-full flex items-center justify-center gap-2 bg-[#009688] hover:bg-[#00796b] text-white font-bold py-3.5 rounded-lg shadow-md transition-colors active:scale-[0.99] outline-none text-base sm:text-lg"
            >
              <ShieldCheck size={24} /> 
              Validar mi Voto por {candidato.name}
            </button>
            <p className="text-center text-xs text-gray-500 mt-2.5 font-medium flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#009688]"></span>
              Al votar, ingresarás tu Ticket validado por el sistema integrado JNE/RENIEC.
            </p>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CandidateModal;
