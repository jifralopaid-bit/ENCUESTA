import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, CheckCircle, AlertCircle, ShieldCheck, Info } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const VotingModal = ({ isOpen, onClose, candidate, onVoteSuccess }) => {
  const [ticket, setTicket] = useState('');
  const [controlDigit, setControlDigit] = useState('');
  
  // Estados de la máquina: IDLE, PROCESSING, RESULT
  const [status, setStatus] = useState('IDLE'); 
  const [resultType, setResultType] = useState(null); // 'success' o 'error'
  const [message, setMessage] = useState('');



  const handleStartQueue = async (e) => {
    e.preventDefault();
    if (ticket.length !== 8) {
      setResultType('error');
      setMessage('El DNI debe tener exactamente 8 dígitos numéricos.');
      setStatus('RESULT');
      return;
    }
    if (controlDigit.length !== 1) {
      setResultType('error');
      setMessage('El dígito verificador es requerido.');
      setStatus('RESULT');
      return;
    }
    
    // Entrar a la cola real llamando al backend
    try {
      const userToken = localStorage.getItem('userToken') || crypto.randomUUID();
      localStorage.setItem('userToken', userToken);

      const payload = {
        dni: String(ticket),
        digito_verificador: String(controlDigit),
        opcion_id: candidate.id,
        user_token: userToken
      };
      
      setStatus('PROCESSING');
      await axios.post(`${BACKEND_URL}/api/votar`, payload);
      
      setResultType('success');
      setMessage('Ticket enviado a la fila de validación.');
      setStatus('RESULT');
      
      // Cerrar inmediatamente, el sidebar manejará el estado
      setTimeout(() => {
        handleClose();
      }, 1500);
      
    } catch (error) {
      console.error("Error al encolar:", error);
      const errorData = error.response?.data?.detail || error.message || "Error al conectar con los servidores centrales.";
      setResultType('error');
      setMessage(typeof errorData === 'string' ? errorData : JSON.stringify(errorData));
      setStatus('RESULT');
    }
  };

  const handleClose = () => {
    setTicket('');
    setControlDigit('');
    setStatus('IDLE');
    setResultType(null);
    onClose();
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
          <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900">{candidate?.name}</h3>
        </div>

        {/* Banner de Advertencia */}
        <div className="bg-blue-50 border border-blue-100 text-blue-800 px-4 py-3 rounded-lg text-sm flex gap-3 mb-4 sm:mb-6">
          <Info className="flex-shrink-0 text-blue-500 mt-0.5" size={18} />
          <div>
            <p>
              Por favor, verifica detenidamente que tu DNI y Dígito Verificador sean correctos antes de enviar tu voto.
            </p>
            <p className="mt-1 font-semibold text-blue-900 flex items-center gap-1.5">
              Tu solicitud será colocada en una fila y validada de forma segura.
            </p>
          </div>
        </div>

        {isProcessing ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-4">
            <Loader2 size={46} className="text-emerald-600 animate-spin" />
            <p className="font-semibold text-gray-800 text-lg text-center">Iniciando protocolo de validación...</p>
            <p className="text-sm text-gray-500 text-center px-4">
              Añadiendo tu solicitud a la fila segura...
            </p>
          </div>
        ) : (
          <form onSubmit={handleStartQueue} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                DNI
              </label>
              <input 
                type="text" 
                maxLength={8}
                required
                disabled={isProcessing}
                value={ticket}
                onChange={(e) => setTicket(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow text-lg tracking-wider font-medium disabled:bg-gray-100 disabled:text-gray-400 min-h-[44px]"
                placeholder="Ej: 12345678"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex justify-between items-center">
                <span>DÍGITO VERIFICADOR</span>
              </label>
              
              {/* Imagen de ayuda visual */}
              <img 
                src="https://res.cloudinary.com/lqgq6nsm/image/upload/v1787692415/LCCE4P37QNGG5IRLNK6BKJ2HYY_1.png" 
                alt="Validación JNE" 
                className="w-full max-w-[200px] sm:max-w-xs mx-auto rounded-md shadow-sm mb-3 border border-gray-200"
              />

              <input 
                type="text" 
                maxLength={1}
                required
                disabled={isProcessing}
                value={controlDigit}
                onChange={(e) => setControlDigit(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none uppercase transition-shadow text-lg tracking-wider font-medium disabled:bg-gray-100 disabled:text-gray-400 min-h-[44px]"
                placeholder="Ej: K o 9"
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-4 rounded-xl transition-all shadow-md hover:shadow-lg focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 outline-none mt-2 min-h-[44px] text-lg"
            >
              Entrar a la Fila de Votación
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
          className="bg-white rounded-2xl w-full max-w-md shadow-2xl relative flex flex-col max-h-[90vh] md:max-h-[95vh] overflow-hidden"
        >
          <div className="bg-emerald-700 p-3 sm:p-4 flex justify-between items-center text-white flex-shrink-0 z-10">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ShieldCheck size={22} />
              Validación de Identidad
            </h2>
            <button 
              onClick={handleClose} 
              className="hover:bg-white/20 p-1 rounded-full transition"
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
