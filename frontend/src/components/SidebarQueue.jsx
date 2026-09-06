import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  X, 
  ChevronRight, 
  List, 
  Trash2, 
  RefreshCw, 
  Clock, 
  UserX, 
  MapPinOff, 
  ShieldAlert, 
  CheckCircle2 
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const SidebarQueue = () => {
  const [tickets, setTickets] = useState([]);
  const [isOpen, setIsOpen] = useState(true);
  const [loadingActions, setLoadingActions] = useState({});
  
  useEffect(() => {
    let token = localStorage.getItem('userToken');
    if (!token) {
      token = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('userToken', token);
    }

    const fetchQueue = async () => {
      try {
        const { data, error } = await supabase
          .from('cola_votos')
          .select('*')
          .eq('user_token', token)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        setTickets(data || []);
      } catch (error) {
        console.error("Error fetching queue:", error);
      }
    };

    fetchQueue();
    const interval = setInterval(fetchQueue, 3000); // Polling cada 3 segundos

    return () => clearInterval(interval);
  }, []);

  if (tickets.length === 0) return null;

  const handleDelete = async (id) => {
    setLoadingActions(prev => ({ ...prev, [id]: 'deleting' }));
    try {
      await supabase.from('cola_votos').delete().eq('id', id);
      setTickets(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingActions(prev => ({ ...prev, [id]: null }));
    }
  };

  const handleRetry = (id, ticket) => {
    // Disparar evento para abrir el modal de votación con isRetry
    const event = new CustomEvent('openVotingModal', {
      detail: {
        candidateId: ticket.candidato_id,
        dni: ticket.dni,
        isRetry: true
      }
    });
    window.dispatchEvent(event);
  };

  const handleRevocation = (dni) => {
    const event = new CustomEvent('openRevocationModal', {
      detail: { dni }
    });
    window.dispatchEvent(event);
  };

  // Configuración visual ultra-precisa según la respuesta oficial del sistema
  const getStatusConfig = (estado, mensaje = '') => {
    const msg = (mensaje || '').toLowerCase();

    switch (estado) {
      case 'pendiente': {
        const isHighDemand = msg.includes('demanda') || msg.includes('anti-spam') || msg.includes('ocupado') || msg.includes('esperando');
        return { 
          cardClass: 'bg-amber-50/90 border-amber-200 text-amber-950 shadow-sm', 
          badgeClass: 'bg-amber-100 text-amber-800 border border-amber-300 font-bold',
          icon: <Clock size={18} className="text-amber-600 animate-pulse shrink-0" />, 
          label: isHighDemand ? 'Alta Demanda' : 'En Turno',
          type: 'pending',
          hint: 'Tu ticket está protegido en la fila. El sistema procesará tu turno automáticamente.'
        };
      }

      case 'procesando': {
        return { 
          cardClass: 'bg-blue-50/90 border-blue-200 text-blue-950 shadow-sm', 
          badgeClass: 'bg-blue-100 text-blue-800 border border-blue-300 font-bold',
          icon: <Loader2 size={18} className="animate-spin text-blue-600 shrink-0" />, 
          label: 'Consultando RENIEC',
          type: 'processing',
          hint: 'Conectando con la base de datos oficial para validar identidad y residencia...'
        };
      }

      case 'aprobado': {
        return { 
          cardClass: 'bg-emerald-50/90 border-emerald-200 text-emerald-950 shadow-sm', 
          badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold',
          icon: <CheckCircle size={18} className="text-emerald-600 shrink-0" />, 
          label: 'Voto Registrado',
          type: 'approved',
          hint: '¡Tu identidad y residencia en La Peca fueron certificadas exitosamente!'
        };
      }

      case 'rechazado': {
        let sublabel = 'Rechazado';
        let customIcon = <AlertCircle size={18} className="text-red-600 shrink-0" />;
        let rejectType = 'generic';
        let hint = 'La validación no pudo ser completada satisfactoriamente.';

        if (msg.includes('mayor de edad') || msg.includes('18+')) {
          sublabel = 'Menor de Edad';
          customIcon = <UserX size={18} className="text-red-600 shrink-0" />;
          rejectType = 'age';
          hint = 'El padrón electoral requiere contar con 18 años cumplidos para sufragar.';
        } else if (msg.includes('domicilio') || msg.includes('la peca')) {
          sublabel = 'Padrón No Coincide';
          customIcon = <MapPinOff size={18} className="text-red-600 shrink-0" />;
          rejectType = 'location';
          hint = 'Este proceso electoral es exclusivo para ciudadanos domiciliados en el distrito de La Peca.';
        } else if (msg.includes('ya ha emitido') || msg.includes('ya cuenta') || msg.includes('duplicado')) {
          sublabel = 'Voto Duplicado';
          customIcon = <ShieldAlert size={18} className="text-red-600 shrink-0" />;
          rejectType = 'duplicate';
          hint = 'Este documento ya figura con un voto emitido en el sistema electoral.';
        } else if (msg.includes('no se encontró') || msg.includes('no existe') || msg.includes('no válido')) {
          sublabel = 'DNI No Encontrado';
          customIcon = <AlertCircle size={18} className="text-red-600 shrink-0" />;
          rejectType = 'not_found';
          hint = 'No se encontró registro para este DNI en RENIEC. Revisa el número ingresado.';
        }

        return { 
          cardClass: 'bg-red-50/90 border-red-200 text-red-950 shadow-sm', 
          badgeClass: 'bg-red-100 text-red-800 border border-red-300 font-bold',
          icon: customIcon, 
          label: sublabel,
          type: 'rejected',
          rejectType,
          hint
        };
      }

      default:
        return { 
          cardClass: 'bg-gray-50 border-gray-200 text-gray-800', 
          badgeClass: 'bg-gray-100 text-gray-700',
          icon: <ShieldCheck size={18} className="text-gray-500 shrink-0" />, 
          label: 'En Fila',
          type: 'unknown',
          hint: 'En espera de procesamiento.'
        };
    }
  };

  return (
    <>
      {/* Botón flotante para abrir el sidebar si está cerrado */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            onClick={() => setIsOpen(true)}
            className="fixed top-24 right-0 z-40 bg-[#035c43] text-white p-3 rounded-l-xl shadow-lg hover:bg-[#024532] transition flex items-center gap-2 border border-r-0 border-[#024532]"
          >
            <List size={20} />
            <span className="font-semibold text-sm">Fila ({tickets.length})</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Sidebar Fijo */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            className="fixed top-0 right-0 w-84 sm:w-96 h-full bg-white shadow-[-6px_0_25px_rgba(0,0,0,0.08)] border-l border-gray-200 z-50 flex flex-col"
          >
            {/* Header del Sidebar */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-[#eaf4f1]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#035c43] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  <List size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-[#035c43] text-sm leading-tight">
                    Fila de Votación en Vivo
                  </h3>
                  <p className="text-[11px] text-gray-500">Monitoreo con JNE / RENIEC</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-gray-200/60 rounded-full text-gray-500 hover:text-gray-800 transition"
                title="Minimizar panel"
              >
                <ChevronRight size={22} />
              </button>
            </div>

            {/* Lista de Tickets */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
              {tickets.map((ticket) => {
                const config = getStatusConfig(ticket.estado, ticket.mensaje);
                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={ticket.id} 
                    className={`p-3.5 rounded-xl border flex flex-col gap-2.5 transition-all ${config.cardClass}`}
                  >
                    {/* Fila Superior: DNI + Badge de Estado */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-extrabold tracking-wider text-sm flex items-center gap-2">
                        {config.icon} 
                        DNI: {ticket.dni}
                      </span>
                      <span className={`text-[10px] uppercase px-2.5 py-0.5 rounded-full ${config.badgeClass}`}>
                        {config.label}
                      </span>
                    </div>
                    
                    {/* Mensaje principal del sistema */}
                    {ticket.mensaje && (
                      <p className="text-xs font-semibold leading-snug">
                        {ticket.mensaje}
                      </p>
                    )}

                    {/* Explicación institucional orientativa */}
                    <div className="bg-white/60 p-2 rounded-lg border border-black/5 text-[11px] leading-relaxed text-gray-700">
                      {config.hint}
                    </div>

                    {/* Acciones específicas por estado */}
                    {config.type === 'rejected' && config.rejectType === 'duplicate' && (
                      <button
                        onClick={() => handleRevocation(ticket.dni)}
                        className="mt-1 text-[11px] font-bold text-red-700 bg-red-100/90 hover:bg-red-200/90 py-2 px-3 rounded-lg w-full text-center transition shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <ShieldAlert size={14} />
                        ¿No fuiste tú? Solicitar revocación
                      </button>
                    )}

                    {config.type === 'rejected' && config.rejectType === 'not_found' && (
                      <button
                        onClick={() => handleRetry(ticket.id, ticket)}
                        className="mt-1 text-[11px] font-bold text-gray-800 bg-white hover:bg-gray-100 py-1.5 px-3 rounded-lg w-full text-center transition border border-gray-300 shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <RefreshCw size={13} className="text-[#035c43]" />
                        Corregir número de DNI
                      </button>
                    )}

                    {config.type === 'approved' && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-bold bg-emerald-100/70 py-1.5 px-2.5 rounded-lg border border-emerald-300/60">
                        <CheckCircle2 size={15} className="text-emerald-700" />
                        Voto seguro encriptado en el padrón
                      </div>
                    )}
                    
                    {/* Timestamp y Acciones Generales */}
                    <div className="flex justify-between items-center mt-1 border-t border-black/5 pt-2">
                      <div className="text-[10px] text-gray-500 font-mono">
                        {new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {ticket.estado === 'rechazado' && config.rejectType !== 'not_found' && (
                          <button 
                            onClick={() => handleRetry(ticket.id, ticket)}
                            disabled={loadingActions[ticket.id]}
                            className="flex items-center gap-1 text-[10px] font-medium text-gray-600 hover:text-[#035c43] transition disabled:opacity-50"
                          >
                            <RefreshCw size={12} />
                            Reintentar
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(ticket.id)}
                          disabled={loadingActions[ticket.id]}
                          className="flex items-center gap-1 text-[10px] font-medium text-gray-400 hover:text-red-600 transition disabled:opacity-50"
                        >
                          {loadingActions[ticket.id] === 'deleting' ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          Descartar
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            
            {/* Footer de información del Sidebar */}
            <div className="p-3.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-600 text-center flex flex-col gap-1">
              <span className="font-bold text-gray-800 flex items-center justify-center gap-1.5">
                <ShieldCheck size={15} className="text-[#035c43]" />
                Auditoría Ciudadana RENIEC / JNE
              </span>
              <span className="text-[11px] text-gray-500">
                Puedes navegar libremente mientras tu turno avanza en segundo plano.
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SidebarQueue;
