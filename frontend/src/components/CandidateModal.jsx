import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Users, FileBarChart, Link as LinkIcon, Download, ShieldCheck, CheckCircle2, ChevronRight, GraduationCap } from 'lucide-react';
import { supabase } from '../lib/supabase';

const CandidateModal = ({ isOpen, onClose, candidato, onVoteClick }) => {
  const [activeTab, setActiveTab] = useState('equipo');
  const [regidores, setRegidores] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && candidato) {
      fetchRegidores();
      setActiveTab('equipo');
    }
  }, [isOpen, candidato]);

  const fetchRegidores = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('regidores')
        .select('*')
        .eq('candidato_id', candidato.id);
      
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
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pt-4 pb-20 sm:p-0">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 transition-opacity bg-black/70 backdrop-blur-md"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 30 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/20"
        >
          {/* Header con Portada */}
          <div className="relative h-56 sm:h-72 bg-gray-900 overflow-hidden shrink-0">
            <img 
              src={candidato.image_url} 
              alt={candidato.name}
              className="w-full h-full object-cover opacity-75 mix-blend-overlay scale-105 transition-transform duration-700 hover:scale-100"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent" />
            
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all hover:scale-110 active:scale-95 border border-white/10"
            >
              <X size={20} strokeWidth={2.5} />
            </button>

            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 flex items-end justify-between">
              <div className="flex items-center gap-5 sm:gap-6">
                {candidato.logo_partido_url && (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white p-2 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.4)] border-4 border-white/10 transform -rotate-3 transition-transform duration-300 hover:rotate-0 flex-shrink-0 relative group">
                    <img src={candidato.logo_partido_url} alt="Logo" className="w-full h-full object-contain rounded-xl" />
                  </div>
                )}
                <div className="pb-1 sm:pb-2">
                  <h2 className="text-2xl sm:text-4xl font-black text-white mb-1.5 tracking-tight drop-shadow-lg leading-tight">
                    {candidato.name}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider backdrop-blur-sm">
                      Candidato a la Alcaldía
                    </span>
                    <span className="text-gray-300 font-medium text-sm hidden sm:inline-block">• La Peca</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navegación de Tabs */}
          <div className="flex px-4 sm:px-8 border-b border-gray-100 bg-white/80 backdrop-blur-lg sticky top-0 z-20 overflow-x-auto custom-scrollbar shrink-0">
            {[
              { id: 'equipo', icon: Users, label: 'Perfil y Equipo' },
              { id: 'plan', icon: FileBarChart, label: 'Plan de Gobierno' },
              { id: 'contacto', icon: LinkIcon, label: 'Contacto' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-4 sm:px-6 text-sm sm:text-base font-bold transition-all relative whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'text-emerald-700' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50/50 rounded-t-xl'
                }`}
              >
                <tab.icon size={18} strokeWidth={activeTab === tab.id ? 2.5 : 2} /> 
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600 rounded-t-full"
                  />
                )}
              </button>
            ))}
          </div>

          {/* Contenido de las Tabs */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30 custom-scrollbar relative">
            
            {/* TAB: EQUIPO */}
            {activeTab === 'equipo' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* Visión Card */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50/40 rounded-3xl p-6 border border-emerald-100/60 shadow-sm relative overflow-hidden group">
                  <div className="absolute -top-6 -right-6 text-emerald-100/50 transform group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                    <GraduationCap size={140} />
                  </div>
                  <div className="relative z-10">
                    <h3 className="font-extrabold text-emerald-950 mb-4 text-xl flex items-center gap-3">
                      <span className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-md">
                        <FileText size={20} />
                      </span> 
                      Visión Principal
                    </h3>
                    <p className="text-gray-700 leading-relaxed text-lg mb-6 font-medium italic text-balance">
                      "{candidato.proposal}"
                    </p>
                    {candidato.hoja_vida_pdf_url && (
                      <a 
                        href={candidato.hoja_vida_pdf_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-white bg-white hover:bg-emerald-600 px-5 py-2.5 rounded-xl shadow-sm border border-emerald-200 hover:border-emerald-600 transition-all active:scale-95 group/btn"
                      >
                        <Download size={16} className="group-hover/btn:-translate-y-0.5 transition-transform" /> 
                        Ver Hoja de Vida Completa
                      </a>
                    )}
                  </div>
                </div>

                {/* Lista de Regidores */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-extrabold text-gray-900 text-2xl flex items-center gap-2">
                      <Users className="text-emerald-600" size={28} /> Equipo de Regidores
                    </h3>
                    <span className="text-sm font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                      {regidores.length} Miembros
                    </span>
                  </div>
                  
                  {loading ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
                    </div>
                  ) : regidores.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {regidores.map((reg, index) => (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          key={reg.id} 
                          className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow group flex items-start gap-4"
                        >
                          <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 font-bold border border-gray-100 flex-shrink-0 group-hover:bg-emerald-50 group-hover:text-emerald-600 group-hover:border-emerald-100 transition-colors">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-lg leading-tight mb-1">{reg.nombre}</p>
                            <p className="text-emerald-600 text-sm font-bold mb-3 uppercase tracking-wide">{reg.cargo}</p>
                            {reg.hoja_vida_pdf_url && (
                              <a 
                                href={reg.hoja_vida_pdf_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-emerald-600 transition-colors"
                              >
                                <FileText size={14} /> Hoja de Vida (PDF) <ChevronRight size={14} />
                              </a>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 border-dashed">
                      <Users size={40} className="mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500 font-medium">El equipo de regidores aún no ha sido publicado.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: PLAN DE GOBIERNO */}
            {activeTab === 'plan' && (
              <div className="flex flex-col items-center justify-center text-center py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-sm border border-emerald-100 relative">
                  <FileBarChart size={48} />
                  <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-sm">
                    <CheckCircle2 className="text-emerald-500" size={24} />
                  </div>
                </div>
                <h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Plan de Gobierno 2027-2030</h3>
                <p className="text-gray-700 leading-relaxed max-w-lg mx-auto mb-10 text-lg">
                  Accede al documento oficial y conoce a detalle todas las propuestas, ejes estratégicos y proyectos estructurados para el desarrollo sostenible de La Peca.
                </p>
                
                {candidato.plan_gobierno_pdf_url ? (
                  <a 
                    href={candidato.plan_gobierno_pdf_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-3 bg-gray-900 hover:bg-black text-white font-bold py-4 px-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 active:scale-95 group text-lg"
                  >
                    <Download size={22} className="group-hover:animate-bounce" />
                    Descargar Plan Completo
                  </a>
                ) : (
                  <div className="bg-orange-50 border border-orange-100 text-orange-800 px-6 py-4 rounded-xl font-medium flex items-center gap-3">
                    <ShieldCheck size={20} className="text-orange-500" />
                    Plan de gobierno en proceso de verificación.
                  </div>
                )}
              </div>
            )}

            {/* TAB: CONTACTO */}
            {activeTab === 'contacto' && (
              <div className="py-12 animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center">
                <h3 className="text-2xl font-black text-gray-900 mb-10 text-center tracking-tight">Canales Oficiales</h3>
                <div className="flex flex-wrap justify-center gap-8">
                  {[
                    { name: 'Facebook', color: 'bg-blue-600', shadow: 'shadow-blue-200' },
                    { name: 'Instagram', color: 'bg-pink-600', shadow: 'shadow-pink-200' },
                    { name: 'TikTok', color: 'bg-black', shadow: 'shadow-gray-300' }
                  ].map((social) => (
                    <a href="#" key={social.name} className="flex flex-col items-center gap-3 group">
                      <div className={`w-16 h-16 bg-white text-gray-400 rounded-2xl flex items-center justify-center border border-gray-100 shadow-sm group-hover:${social.color} group-hover:text-white transition-all duration-300 transform group-hover:-translate-y-2 group-hover:shadow-xl group-hover:${social.shadow}`}>
                        <LinkIcon size={28} />
                      </div>
                      <span className="text-sm font-bold text-gray-400 group-hover:text-gray-900 transition-colors">{social.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Footer Action (Votar) */}
          <div className="shrink-0 bg-white p-4 border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <button 
              onClick={() => onVoteClick(candidato.id, candidato.name)}
              className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black py-4 sm:py-5 rounded-2xl shadow-lg hover:shadow-emerald-500/30 transition-all transform hover:-translate-y-1 active:scale-[0.98] focus:ring-4 focus:ring-emerald-500/30 outline-none text-lg sm:text-xl overflow-hidden relative group"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
              <ShieldCheck size={28} className="relative z-10" /> 
              <span className="relative z-10">Validar mi Voto por {candidato.name}</span>
            </button>
            <p className="text-center text-xs sm:text-sm text-gray-500 mt-3 font-semibold flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Al votar, ingresarás tu Ticket validado por el sistema integrado JNE/RENIEC.
            </p>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CandidateModal;
