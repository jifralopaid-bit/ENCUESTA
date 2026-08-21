import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Users, FileBarChart, Link as LinkIcon, Download, ShieldCheck } from 'lucide-react';
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
          className="fixed inset-0 transition-opacity bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header con Portada */}
          <div className="relative h-48 sm:h-64 bg-gray-900">
            <img 
              src={candidato.image_url} 
              alt={candidato.name}
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-sm transition-colors"
            >
              <X size={20} />
            </button>

            <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
              <div className="flex items-center gap-4">
                {candidato.logo_partido_url && (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white p-1 rounded-full shadow-lg border-2 border-white">
                    <img src={candidato.logo_partido_url} alt="Logo" className="w-full h-full object-contain rounded-full" />
                  </div>
                )}
                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-1">{candidato.name}</h2>
                  <p className="text-emerald-300 font-medium text-sm sm:text-base">Candidato a la Alcaldía de La Peca</p>
                </div>
              </div>
            </div>
          </div>

          {/* Navegación de Tabs */}
          <div className="flex border-b border-gray-200 bg-gray-50/50">
            <button
              onClick={() => setActiveTab('equipo')}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-colors ${activeTab === 'equipo' ? 'text-emerald-700 border-b-2 border-emerald-700 bg-white' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Users size={18} /> <span className="hidden sm:inline">Perfil y Equipo</span>
            </button>
            <button
              onClick={() => setActiveTab('plan')}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-colors ${activeTab === 'plan' ? 'text-emerald-700 border-b-2 border-emerald-700 bg-white' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <FileBarChart size={18} /> <span className="hidden sm:inline">Plan de Gobierno</span>
            </button>
            <button
              onClick={() => setActiveTab('contacto')}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-colors ${activeTab === 'contacto' ? 'text-emerald-700 border-b-2 border-emerald-700 bg-white' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <LinkIcon size={18} /> <span className="hidden sm:inline">Contacto</span>
            </button>
          </div>

          {/* Contenido de las Tabs */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8">
            
            {/* TAB: EQUIPO */}
            {activeTab === 'equipo' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-100">
                  <h3 className="font-bold text-gray-900 mb-3 text-lg">Visión Principal</h3>
                  <p className="text-gray-700 leading-relaxed mb-5">
                    {candidato.proposal}
                  </p>
                  {candidato.hoja_vida_pdf_url && (
                    <a 
                      href={candidato.hoja_vida_pdf_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-800 bg-white px-4 py-2 rounded-lg shadow-sm border border-emerald-200 transition-colors"
                    >
                      <Download size={16} /> Ver Hoja de Vida (PDF)
                    </a>
                  )}
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 text-xl mb-4 flex items-center gap-2">
                    <Users className="text-emerald-600" /> Lista de Regidores
                  </h3>
                  
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700"></div>
                    </div>
                  ) : regidores.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {regidores.map(reg => (
                        <div key={reg.id} className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                          <p className="font-bold text-gray-900 text-lg mb-1">{reg.nombre}</p>
                          <p className="text-emerald-700 text-sm font-medium mb-3">{reg.cargo}</p>
                          {reg.hoja_vida_pdf_url && (
                            <a 
                              href={reg.hoja_vida_pdf_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-emerald-600 transition-colors"
                            >
                              <FileText size={14} /> Hoja de Vida
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No se ha registrado información de regidores.</p>
                  )}
                </div>
              </div>
            )}

            {/* TAB: PLAN DE GOBIERNO */}
            {activeTab === 'plan' && (
              <div className="flex flex-col items-center justify-center text-center py-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                  <FileBarChart size={40} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Plan de Gobierno Municipal</h3>
                <p className="text-gray-600 max-w-md mx-auto mb-8">
                  Conoce a detalle todas las propuestas, ejes estratégicos y proyectos que {candidato.name} tiene planeado para el desarrollo de La Peca.
                </p>
                
                {candidato.plan_gobierno_pdf_url ? (
                  <a 
                    href={candidato.plan_gobierno_pdf_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-colors"
                  >
                    <Download size={20} />
                    Descargar Plan (PDF)
                  </a>
                ) : (
                  <p className="text-gray-500 italic bg-gray-50 p-4 rounded-lg">Plan de gobierno no disponible por el momento.</p>
                )}
              </div>
            )}

            {/* TAB: CONTACTO */}
            {activeTab === 'contacto' && (
              <div className="py-8 animate-in fade-in slide-in-from-bottom-4 duration-300 text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-8">Redes Sociales y Contacto Oficial</h3>
                <div className="flex flex-wrap justify-center gap-6">
                  {/* Mock links since we didn't add social media fields to DB yet */}
                  <a href="#" className="flex flex-col items-center gap-3 group">
                    <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                      <LinkIcon size={24} />
                    </div>
                    <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900">Facebook</span>
                  </a>
                  <a href="#" className="flex flex-col items-center gap-3 group">
                    <div className="w-14 h-14 bg-pink-50 text-pink-600 rounded-full flex items-center justify-center group-hover:bg-pink-600 group-hover:text-white transition-all shadow-sm">
                      <LinkIcon size={24} />
                    </div>
                    <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900">Instagram</span>
                  </a>
                  <a href="#" className="flex flex-col items-center gap-3 group">
                    <div className="w-14 h-14 bg-sky-50 text-sky-500 rounded-full flex items-center justify-center group-hover:bg-sky-500 group-hover:text-white transition-all shadow-sm">
                      <LinkIcon size={24} />
                    </div>
                    <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900">Twitter</span>
                  </a>
                </div>
              </div>
            )}

          </div>

          {/* Footer Action (Votar) */}
          <div className="bg-gray-50 p-4 sm:p-6 border-t border-gray-200">
            <button 
              onClick={() => onVoteClick(candidato.id, candidato.name)}
              className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-4 rounded-xl shadow-lg transition-transform transform hover:-translate-y-0.5 focus:ring-4 focus:ring-emerald-500/30 outline-none text-lg"
            >
              <ShieldCheck size={24} /> Validar mi Voto por {candidato.name}
            </button>
            <p className="text-center text-xs text-gray-500 mt-3 font-medium">
              Al votar, ingresarás tu Ticket validado por RENIEC.
            </p>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CandidateModal;
