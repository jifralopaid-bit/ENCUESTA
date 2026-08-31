import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Loader2, CheckCircle, AlertCircle, X, ChevronRight, List, Trash2, RefreshCw } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

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
        const response = await axios.get(`${BACKEND_URL}/api/cola/${token}`);
        setTickets(response.data);
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
      await axios.delete(`${BACKEND_URL}/api/cola/${id}`);
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

  const getStatusConfig = (estado) => {
    switch (estado) {
      case 'pendiente':
        return { color: 'bg-yellow-100 border-yellow-200 text-yellow-800', icon: <div className="w-5 h-5 rounded-full bg-yellow-400 animate-pulse flex-shrink-0" />, label: 'En espera' };
      case 'procesando':
        return { color: 'bg-blue-100 border-blue-200 text-blue-800', icon: <Loader2 size={20} className="animate-spin text-blue-600 flex-shrink-0" />, label: 'Validando' };
      case 'aprobado':
        return { color: 'bg-emerald-100 border-emerald-200 text-emerald-800', icon: <CheckCircle size={20} className="text-emerald-600 flex-shrink-0" />, label: 'Voto Registrado' };
      case 'rechazado':
        return { color: 'bg-red-100 border-red-200 text-red-800', icon: <AlertCircle size={20} className="text-red-600 flex-shrink-0" />, label: 'Rechazado' };
      default:
        return { color: 'bg-gray-100 border-gray-200 text-gray-800', icon: <ShieldCheck size={20} className="flex-shrink-0" />, label: 'Desconocido' };
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
            className="fixed top-24 right-0 z-40 bg-emerald-700 text-white p-3 rounded-l-xl shadow-lg hover:bg-emerald-800 transition flex items-center gap-2 border border-r-0 border-emerald-600"
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
            className="fixed top-0 right-0 w-80 h-full bg-white shadow-[-4px_0_15px_rgba(0,0,0,0.05)] border-l border-gray-200 z-50 flex flex-col"
          >
            {/* Header del Sidebar */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-emerald-50">
              <h3 className="font-bold text-emerald-900 flex items-center gap-2">
                <List size={20} className="text-emerald-700" />
                Mi Fila de Votación
              </h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-emerald-200/50 rounded-full text-emerald-700 transition"
              >
                <ChevronRight size={24} />
              </button>
            </div>

            {/* Lista de Tickets */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {tickets.map((ticket) => {
                const config = getStatusConfig(ticket.estado);
                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={ticket.id} 
                    className={`p-3 rounded-xl border shadow-sm flex flex-col gap-2 ${config.color}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold tracking-widest text-sm flex items-center gap-2">
                        {config.icon} DNI: {ticket.dni}
                      </span>
                      <span className="text-[10px] font-bold uppercase px-2 py-1 bg-white/50 rounded-full">
                        {config.label}
                      </span>
                    </div>
                    
                    {ticket.mensaje && (
                      <p className="text-xs font-medium mt-1 leading-relaxed opacity-90">
                        {ticket.mensaje}
                      </p>
                    )}

                    {ticket.estado === 'rechazado' && ticket.mensaje && ticket.mensaje.includes('ya ha emitido un voto') && (
                      <button
                        onClick={() => handleRevocation(ticket.dni)}
                        className="mt-2 text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 py-1.5 px-2 rounded w-full text-center transition"
                      >
                        ¿No fuiste tú? Solicitar revocación de voto
                      </button>
                    )}
                    
                    {/* Timestamp y Acciones */}
                    <div className="flex justify-between items-center mt-2 border-t border-black/5 pt-2">
                      <div className="text-[9px] opacity-70">
                        {new Date(ticket.created_at).toLocaleTimeString()}
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {ticket.estado === 'rechazado' && (
                          <button 
                            onClick={() => handleRetry(ticket.id, ticket)}
                            disabled={loadingActions[ticket.id]}
                            className="flex items-center gap-1 text-[10px] font-medium text-gray-500 hover:text-[#C93339] transition disabled:opacity-50"
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
                          Borrar
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            
            {/* Footer de información */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 text-center flex flex-col gap-1">
              <span className="font-semibold text-gray-700">Validación Módulo 11 + RENIEC</span>
              <span>Esta ventana no bloquea tu navegación. Puedes cerrarla, tu fila continuará.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SidebarQueue;
