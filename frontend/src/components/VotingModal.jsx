import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, CheckCircle, AlertCircle, ShieldCheck, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import axios from 'axios';

const VotingModal = ({ 
  isOpen, 
  onClose, 
  candidate, 
  candidatoSeleccionado, 
  isRetry = false, 
  prefilledDni = '', 
  onVoteSuccess 
}) => {
  const targetCandidate = candidatoSeleccionado || candidate;

  const [ticket, setTicket] = useState(prefilledDni || '');
  const [controlDigit, setControlDigit] = useState('');
  const dvRef = useRef(null);

  // Estados de la máquina: IDLE, PROCESSING, RESULT
  const [status, setStatus] = useState('IDLE'); 
  const [resultType, setResultType] = useState(null); // 'success' o 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTicket(prefilledDni || '');
      setControlDigit('');
      setStatus('IDLE');
      setResultType(null);
    }
  }, [isOpen, prefilledDni]);

  // Prevenir renderizado con estado nulo y si está cerrado
  if (!isOpen || !targetCandidate) return null;

  const handleClose = () => {
    setTicket('');
    setControlDigit('');
    setStatus('IDLE');
    setResultType(null);
    onClose();
  };

  const handleStartQueue = async (e) => {
    e.preventDefault();
    if (!/^\d{8}$/.test(ticket.trim())) {
      setResultType('error');
      setMessage('El DNI debe tener exactamente 8 dígitos numéricos.');
      setStatus('RESULT');
      return;
    }
    if (controlDigit.trim().length !== 1) {
      setResultType('error');
      setMessage('El dígito verificador es requerido (1 carácter).');
      setStatus('RESULT');
      return;
    }
    
    if (!targetCandidate || !targetCandidate.id) {
      setResultType('error');
      setMessage('Error: Candidato no seleccionado.');
      setStatus('RESULT');
      return;
    }

    try {
      const userToken = localStorage.getItem('userToken') || crypto.randomUUID();
      localStorage.setItem('userToken', userToken);

      setStatus('PROCESSING');
      
      // Aseguramos estrictamente que opcion_id sea targetCandidate.id
      const payload = {
        dni: ticket.trim(),
        digito_verificador: controlDigit.trim().toUpperCase(),
        opcion_id: targetCandidate.id,
        user_token: userToken,
        is_retry: isRetry
      };

      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      let apiCalledSuccessfully = false;

      if (backendUrl) {
        try {
          const res = await axios.post(`${backendUrl}/api/votar`, payload);
          if (res.status === 200 || res.status === 202) {
            apiCalledSuccessfully = true;
          }
        } catch (apiErr) {
          console.warn("Fallo o advertencia al llamar a /api/votar:", apiErr);
          if (apiErr.response && apiErr.response.data && apiErr.response.data.detail) {
            setResultType('error');
            setMessage(apiErr.response.data.detail);
            setStatus('RESULT');
            return;
          }
        }
      }

      if (!apiCalledSuccessfully) {
        // Encolar directamente en Supabase asegurando candidato_id exacto
        const { error } = await supabase.from('cola_votos').insert({
          dni: String(payload.dni),
          dv: String(payload.digito_verificador),
          candidato_id: payload.opcion_id,
          user_token: payload.user_token,
          estado: 'pendiente',
          mensaje: 'En cola de validación'
        });
        
        if (error) throw error;
      }
      
      setResultType('success');
      setMessage('Ticket enviado a la fila de validación.');
      setStatus('RESULT');
      
      if (onVoteSuccess) {
        onVoteSuccess();
      }

      // Cerrar y limpiar tras confirmación
      setTimeout(() => {
        handleClose();
      }, 1500);
      
    } catch (error) {
      console.error("Error al encolar:", error);
      setResultType('error');
      setMessage("Error al procesar tu turno. Intenta nuevamente.");
      setStatus('RESULT');
    }
  };

  const renderContent = () => {
    if (status === 'RESULT') {
      return (
        <div className="py-8 px-4 text-center">
          {resultType === 'success' ? (
            <div className="flex flex-col items-center text-emerald-600">
              <CheckCircle size={56} className="mb-4" />
              <p className="text-lg font-bold text-gray-900">{message}</p>
              <p className="text-sm text-gray-500 mt-2">Redirigiendo a resultados...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center text-red-600">
              <AlertCircle size={56} className="mb-4" />
              <p className="text-lg font-bold text-gray-900 mb-6">{message}</p>
              <button 
                onClick={() => setStatus('IDLE')}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-6 rounded-xl transition min-h-[44px]"
              >
                Intentar de nuevo
              </button>
            </div>
          )}
        </div>
      );
    }

    const isProcessing = status === 'PROCESSING';

    return (
      <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar">
        <div className="mb-4 sm:mb-6 text-center">
          <p className="text-gray-500 text-xs sm:text-sm uppercase tracking-wider font-semibold mb-1">Candidato Seleccionado</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900">{targetCandidate?.name}</h3>
        </div>

        {/* Banner de Advertencia */}
        <div className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-3 rounded-sm text-xs flex gap-3 mb-4">
          <Info className="flex-shrink-0 text-gray-500 mt-0.5" size={16} />
          <div>
            <p className="leading-relaxed">
              Verifique detenidamente su DNI y Dígito Verificador antes de enviar.
              Su solicitud será colocada en una fila y validada de forma segura con el padrón oficial.
            </p>
          </div>
        </div>

        {isProcessing ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-4">
            <Loader2 size={46} className="text-[#C93339] animate-spin" />
            <p className="font-semibold text-gray-800 text-lg text-center">Iniciando protocolo de validación...</p>
            <p className="text-sm text-gray-500 text-center px-4">
              Añadiendo tu solicitud a la fila segura...
            </p>
          </div>
        ) : (
          <form onSubmit={handleStartQueue} className="space-y-4">
            <div className="flex gap-3">
              <div className="w-[75%]">
                <label className="block text-xs font-bold text-gray-800 mb-1.5 uppercase">
                  DNI
                </label>
                <input 
                  type="text" 
                  pattern="\d*"
                  maxLength={8}
                  disabled={isRetry}
                  value={ticket}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setTicket(val);
                    if (val.length === 8 && dvRef.current) {
                      dvRef.current.focus();
                    }
                  }}
                  className="w-full px-3 py-3 border border-gray-300 rounded-sm focus:ring-[#C93339] focus:border-[#C93339] outline-none tracking-widest font-mono text-lg transition-shadow disabled:bg-gray-100 disabled:text-gray-500 h-[48px]"
                  placeholder="12345678"
                  autoFocus={!isRetry}
                />
              </div>

              <div className="w-[25%]">
                <label className="block text-xs font-bold text-gray-800 mb-1.5 uppercase text-center">
                  D.V.
                </label>
                <input 
                  ref={dvRef}
                  type="text" 
                  maxLength={1}
                  value={controlDigit}
                  onChange={(e) => setControlDigit(e.target.value.toUpperCase())}
                  className="w-full px-2 py-3 border border-gray-300 rounded-sm focus:ring-[#C93339] focus:border-[#C93339] outline-none uppercase transition-shadow text-lg tracking-wider font-medium text-center disabled:bg-gray-100 disabled:text-gray-400 h-[48px]"
                  placeholder="9"
                />
              </div>
            </div>

            <div className="flex justify-center py-1">
              <img 
                src="https://res.cloudinary.com/lqgq6nsm/image/upload/v1787692415/LCCE4P37QNGG5IRLNK6BKJ2HYY_1.png" 
                alt="Ubicación del Dígito Verificador" 
                className="h-28 object-contain rounded opacity-90 mix-blend-multiply" 
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-[#C93339] hover:bg-red-800 text-white font-bold py-3 rounded-sm transition-all shadow-sm focus:ring-2 focus:ring-[#C93339] focus:ring-offset-2 outline-none mt-2 text-base h-[48px]"
            >
              Validar Identidad y Emitir Voto
            </button>

            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 mt-2">
              <ShieldCheck size={14} />
              <span>Conexión segura y encriptada</span>
            </div>
          </form>
        )}
      </div>
    );
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-sm w-full max-w-md shadow-2xl relative flex flex-col max-h-[95vh] overflow-hidden"
        >
          {/* Cabecera Roja con botón de cierre absoluto */}
          <div className="bg-[#C93339] p-4 flex justify-between items-center text-white flex-shrink-0 z-10 relative">
            <h2 className="text-lg font-bold flex items-center gap-2 tracking-wide">
              <ShieldCheck size={20} />
              Validación de Identidad
            </h2>
            <button 
              type="button"
              onClick={handleClose} 
              className="absolute top-4 right-4 text-white hover:text-gray-200 p-1 rounded-full transition"
              title="Cerrar modal"
              aria-label="Cerrar modal"
            >
              <X size={24} />
            </button>
          </div>
          
          {renderContent()}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default VotingModal;
