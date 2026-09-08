import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { 
  ShieldCheck, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  X, 
  List, 
  Trash2, 
  RefreshCw, 
  Clock, 
  UserX, 
  MapPinOff, 
  ShieldAlert, 
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const SidebarQueue = () => {
  const [tickets, setTickets] = useState([]);
  const [isOpen, setIsOpen] = useState(true);
  const [loadingActions, setLoadingActions] = useState({});
  const [isMobile, setIsMobile] = useState(false);
  
  const dragControls = useDragControls();
  const listRef = useRef(null);
  const touchStartY = useRef(0);
  const touchCurrentY = useRef(0);
  const prevCountRef = useRef(0);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    let token = localStorage.getItem('userToken');
    if (!token) {
      token = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
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
        setTickets([]); // Fallback to empty array on error
      }
    };

    fetchQueue();
    const interval = setInterval(fetchQueue, 1500); // Polling cada 1.5 segundos

    return () => clearInterval(interval);
  }, []);

  // Si llega un nuevo ticket emitido, abrir el panel automáticamente si estaba cerrado
  useEffect(() => {
    if ((tickets?.length || 0) > prevCountRef.current && prevCountRef.current > 0) {
      setIsOpen(true);
    }
    prevCountRef.current = tickets?.length || 0;
  }, [tickets?.length]);

  if (!tickets || tickets.length === 0) return null;

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

  // Gestos táctiles de respaldo en celular cuando el scroll está en el inicio
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    touchCurrentY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (listRef.current && listRef.current.scrollTop <= 0) {
      const deltaY = touchCurrentY.current - touchStartY.current;
      if (deltaY > 75) {
        setIsOpen(false);
      }
    }
    touchStartY.current = 0;
    touchCurrentY.current = 0;
  };

  // Configuración visual según la respuesta oficial del sistema
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
      {/* Fondo tenue (Backdrop) en Celular cuando la ventana está abierta */}
      <AnimatePresence>
        {isOpen && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 sm:hidden"
          />
        )}
      </AnimatePresence>

      {/* Botón flotante para abrir la fila si está cerrada */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            onClick={() => setIsOpen(true)}
            className="fixed top-24 right-0 z-40 bg-[#035c43] text-white py-2.5 px-3.5 rounded-l-xl shadow-xl hover:bg-[#024532] transition-all flex items-center gap-2 border border-r-0 border-[#024532] group cursor-pointer"
            title="Abrir fila de votación"
          >
            <List size={18} className="group-hover:scale-110 transition-transform" />
            <span className="font-semibold text-xs sm:text-sm">Fila ({tickets?.length || 0})</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Ventana de Cola: Bottom Sheet en Móvil / Sidebar Lateral en Desktop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={isMobile ? { opacity: 0, y: '100%' } : { opacity: 0, x: '100%' }}
            animate={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, x: 0 }}
            exit={isMobile ? { opacity: 0, y: '100%' } : { opacity: 0, x: '100%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
            drag={isMobile ? "y" : false}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(e, info) => {
              if (info.offset.y > 60 || info.velocity.y > 300) {
                setIsOpen(false);
              }
            }}
            className="fixed inset-x-0 bottom-0 max-h-[85vh] sm:max-h-full sm:top-0 sm:right-0 sm:left-auto sm:w-96 sm:h-full bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.18)] sm:shadow-[-6px_0_25px_rgba(0,0,0,0.1)] rounded-t-2xl sm:rounded-none border-t sm:border-t-0 sm:border-l border-gray-200 z-50 flex flex-col overflow-hidden"
          >
            {/* Barra de arrastre ("pull handle") visible exclusivamente en celular */}
            <div 
              onPointerDown={(e) => {
                if (isMobile && !e.target.closest('button')) dragControls.start(e);
              }}
              className="w-full pt-2.5 pb-1 flex flex-col items-center justify-center sm:hidden cursor-grab active:cursor-grabbing touch-none select-none bg-[#eaf4f1]"
            >
              <div className="w-12 h-1.5 bg-gray-400/80 rounded-full" />
              <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium mt-1">
                <ChevronDown size={12} className="animate-bounce" />
                <span>Jala hacia abajo para cerrar</span>
              </div>
            </div>

            {/* Cabecera del Panel / Bottom Sheet */}
            <div 
              onPointerDown={(e) => {
                if (isMobile && !e.target.closest('button')) dragControls.start(e);
              }}
              className="flex items-center justify-between p-3.5 sm:p-4 border-b border-gray-200 bg-[#eaf4f1] select-none shrink-0"
            >
              <div className="flex items-center gap-2.5">
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
              
              {/* Botón de Cierre visible y destacado */}
              <button 
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/90 hover:bg-red-50 text-gray-600 hover:text-red-600 border border-gray-200 shadow-xs transition-colors cursor-pointer"
                title="Cerrar ventana de fila"
                aria-label="Cerrar ventana de fila"
              >
                <X size={18} className="stroke-[2.5]" />
              </button>
            </div>

            {/* Lista Scrollable de Tickets */}
            <div 
              ref={listRef}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar"
            >
              {tickets?.map((ticket) => {
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
                        className="mt-1 text-[11px] font-bold text-red-700 bg-red-100/90 hover:bg-red-200/90 py-2 px-3 rounded-lg w-full text-center transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ShieldAlert size={14} />
                        ¿No fuiste tú? Solicitar Revocación
                      </button>
                    )}

                    {config.type === 'rejected' && config.rejectType === 'not_found' && (
                      <button
                        onClick={() => handleRetry(ticket.id, ticket)}
                        className="mt-1 text-[11px] font-bold text-gray-800 bg-white hover:bg-gray-100 py-1.5 px-3 rounded-lg w-full text-center transition border border-gray-300 shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
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
                        {ticket.created_at && !isNaN(new Date(ticket.created_at).getTime()) ? new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {ticket.estado === 'rechazado' && config.rejectType !== 'not_found' && (
                          <button 
                            onClick={() => handleRetry(ticket.id, ticket)}
                            disabled={loadingActions[ticket.id]}
                            className="flex items-center gap-1 text-[10px] font-medium text-gray-600 hover:text-[#035c43] transition disabled:opacity-50 cursor-pointer"
                          >
                            <RefreshCw size={12} />
                            Reintentar
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(ticket.id)}
                          disabled={loadingActions[ticket.id]}
                          className="flex items-center gap-1 text-[10px] font-medium text-gray-400 hover:text-red-600 transition disabled:opacity-50 cursor-pointer"
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
            <div className="p-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-600 text-center flex flex-col gap-0.5 shrink-0">
              <span className="font-bold text-gray-800 flex items-center justify-center gap-1.5 text-xs">
                <ShieldCheck size={14} className="text-[#035c43]" />
                Auditoría Ciudadana RENIEC / JNE
              </span>
              <span className="text-[10px] text-gray-500">
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
