import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, MapPin, User, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { maskUrl } from '../utils/maskUrl';

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

  // La condición se evalúa dentro de AnimatePresence para evitar errores de renderizado

  return (
    <AnimatePresence>
      {(isOpen && candidato) && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-3xl bg-white/40 backdrop-blur-xl border border-white/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] md:max-h-[85vh]"
          >
            {/* Header Institucional */}
            <div className="shrink-0 bg-white/60 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-white/40 relative z-10 shadow-sm">
              <div className="flex items-center gap-4">
                {candidato.logo_partido_url ? (
                  <div className="w-12 h-12 rounded-full border-2 border-white bg-white/80 p-1 flex-shrink-0 shadow-sm">
                    <img src={maskUrl(candidato.logo_partido_url)} alt="Logo" className="w-full h-full object-contain rounded-full" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full border-2 border-white bg-white/50 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <ShieldCheck className="text-[#035c43]" />
                  </div>
                )}
                <div>
                  <h2 className="text-[15px] font-extrabold text-[#035c43] uppercase leading-tight tracking-tight">ORGANIZACIÓN POLÍTICA</h2>
                  <p className="text-xs font-semibold text-[#035c43]/70">Municipalidad Distrital</p>
                </div>
              </div>
              
              <button 
                onClick={onClose}
                className="text-[#035c43]/50 hover:text-[#035c43] hover:bg-white/50 p-2 rounded-full transition-all"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            {/* Botonera Superior */}
            <div className="shrink-0 bg-white/40 backdrop-blur-sm px-6 py-3 border-b border-white/30 flex flex-wrap gap-3 justify-center shadow-sm relative z-10">
              {candidato.plan_gobierno_pdf_url && (
                <a 
                  href={maskUrl(candidato.plan_gobierno_pdf_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 border-2 border-[#035c43] text-[#035c43] hover:bg-[#035c43] hover:text-white text-xs sm:text-sm font-extrabold rounded-full transition-colors"
                >
                  <FileText size={16} /> <span>Plan de Gobierno</span>
                </a>
              )}
              {candidato.proposal && (
                <a href="#vision-propuesta" className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white/70 text-[#035c43] hover:bg-white text-xs sm:text-sm font-extrabold rounded-full transition-colors shadow-sm cursor-pointer">
                  Resumen de Plan de Gobierno
                </a>
              )}
            </div>

            {/* Área de Contenido con Scroll */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar relative">
              
              {/* Tarjeta del Alcalde */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-white border-2 border-white overflow-hidden flex-shrink-0 flex items-center justify-center shadow-sm">
                      {candidato.image_url ? (
                        <img src={maskUrl(candidato.image_url)} alt={candidato.name} className="w-full h-full object-cover" />
                      ) : (
                        <User size={32} className="text-gray-300" />
                      )}
                    </div>
                    <div>
                      <span className="text-[#00b37e] text-[11px] font-extrabold tracking-widest uppercase">
                        Alcalde Distrital
                      </span>
                      <h3 className="text-lg font-extrabold text-[#035c43] leading-tight mt-0.5 uppercase">
                        {candidato.name}
                      </h3>
                      <div className="flex items-center gap-1 text-[#035c43]/60 font-semibold text-xs mt-1.5 mb-2">
                        <MapPin size={12} /> Postula por La Peca
                      </div>
                      <span className="inline-block px-3 py-1 bg-[#00b37e]/10 text-[#00b37e] border border-[#00b37e]/20 rounded-full text-[10px] font-extrabold">
                        Inscrito
                      </span>
                    </div>
                  </div>

                  {candidato.hoja_vida_pdf_url && (
                    <a 
                      href={maskUrl(candidato.hoja_vida_pdf_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-[#035c43] border border-[#035c43]/20 hover:bg-[#035c43]/5 hover:border-[#035c43]/40 rounded-xl text-sm font-extrabold transition-all w-full sm:w-auto justify-center shadow-sm"
                    >
                      <FileText size={16} /> <span>Ver hoja de vida</span>
                    </a>
                  )}
                </div>
                
                {/* Resumen del Plan de Gobierno (Inyectado) */}
                <div id="vision-propuesta" className="bg-gray-50 border-l-4 border-[#035c43] p-5 rounded-r-xl my-6 shadow-inner mx-5 mb-5">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Propuesta Principal
                  </h4>
                  
                  {/* Conexión dinámica a la base de datos cubriendo posibles nombres de columnas */}
                  <p className="text-gray-700 text-sm italic leading-relaxed whitespace-pre-wrap">
                    {candidato.propuesta_principal || candidato.resumen_propuesta || candidato.plan_gobierno || candidato.proposal || "Resumen del plan de gobierno no disponible en este momento."}
                  </p>

                  {/* Renderizado condicional del botón PDF con diseño premium */}
                  {(candidato.plan_gobierno_url || candidato.pdf_url || candidato.plan_gobierno_pdf_url) && (
                    <a 
                      href={maskUrl(candidato.plan_gobierno_url || candidato.pdf_url || candidato.plan_gobierno_pdf_url)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center mt-4 w-full sm:w-auto px-6 py-2 bg-white border border-[#035c43] text-[#035c43] text-sm font-bold rounded-full hover:bg-[#eaf4f1] transition-all shadow-sm"
                    >
                      📄 Leer Plan de Gobierno Completo (PDF)
                    </a>
                  )}
                </div>
              </div>

              {/* Lista de Regidores */}
              <div>
                <h3 className="text-sm font-extrabold text-[#035c43] mb-4 ml-1 uppercase tracking-wide">
                  Regidores ({regidores.length})
                </h3>
                
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00b37e]"></div>
                  </div>
                ) : regidores.length > 0 ? (
                  <div className="space-y-3">
                    {regidores.map((reg, index) => (
                      <div key={reg.id} className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm hover:shadow-md p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all">
                        
                        <div className="flex items-center gap-4">
                          <span className="text-[#035c43]/40 font-extrabold w-4 text-center">{index + 1}</span>
                          <div className="w-12 h-12 rounded-full bg-white border-2 border-white flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
                            {reg.image_url ? (
                              <img src={maskUrl(reg.image_url)} alt={reg.nombre} className="w-full h-full object-cover" />
                            ) : (
                              <User size={24} className="text-gray-300" />
                            )}
                          </div>
                          <div>
                            <span className="text-[#035c43]/60 text-[10px] font-extrabold tracking-widest uppercase block mb-0.5">
                              {reg.cargo || 'Regidor Distrital'}
                            </span>
                            <h4 className="text-sm font-extrabold text-[#035c43] leading-tight uppercase">
                              {reg.nombre}
                            </h4>
                            <div className="flex items-center gap-1 text-[#035c43]/60 font-medium text-[11px] mt-1 mb-1.5">
                              <MapPin size={10} /> Postula por La Peca
                            </div>
                            <span className="inline-block px-2 py-0.5 bg-[#00b37e]/10 text-[#00b37e] border border-[#00b37e]/20 rounded-full text-[10px] font-extrabold">
                              Inscrito
                            </span>
                          </div>
                        </div>

                        {reg.hoja_vida_pdf_url && (
                          <a 
                            href={maskUrl(reg.hoja_vida_pdf_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#035c43] border border-[#035c43]/20 hover:bg-[#035c43]/5 hover:border-[#035c43]/40 rounded-xl text-[12px] font-extrabold transition-all w-full sm:w-auto justify-center ml-8 sm:ml-0 shadow-sm"
                          >
                            <FileText size={14} /> <span>Ver hoja de vida</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-white/40 backdrop-blur-sm rounded-2xl border border-white/50 border-dashed">
                    <p className="text-sm font-semibold text-[#035c43]/60">No se ha registrado información de regidores.</p>
                  </div>
                )}
              </div>

            </div>

            {/* Footer de Acción */}
            <div className="shrink-0 bg-white/70 backdrop-blur-md p-5 sm:p-6 border-t border-white/40 shadow-inner relative z-20">
              <button 
                onClick={() => onVoteClick(candidato)}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#035c43] to-[#047252] hover:shadow-[0_8px_20px_rgba(3,92,67,0.3)] hover:-translate-y-0.5 text-white font-extrabold py-4 rounded-2xl transition-all active:scale-[0.99] outline-none text-base sm:text-lg"
              >
                <ShieldCheck size={24} /> 
                <span>Validar mi Voto por {candidato.name}</span>
              </button>
              <p className="text-center text-xs text-[#035c43]/70 mt-3 font-semibold flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00b37e]"></span>
                Al votar, ingresarás tu Ticket validado por el sistema integrado JNE/RENIEC.
              </p>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CandidateModal;
