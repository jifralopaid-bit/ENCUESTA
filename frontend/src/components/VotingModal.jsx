import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, CheckCircle, AlertCircle, ShieldCheck, Info } from 'lucide-react';
import axios from 'axios';

const VotingModal = ({ isOpen, onClose, candidate, onVoteSuccess }) => {
  const [ticket, setTicket] = useState('');
  const [controlDigit, setControlDigit] = useState('');
  
  // Estados de la máquina: IDLE, IN_QUEUE, PROCESSING, RESULT
  const [status, setStatus] = useState('IDLE'); 
  const [resultType, setResultType] = useState(null); // 'success' o 'error'
  const [message, setMessage] = useState('');
  
  const [queuePosition, setQueuePosition] = useState(0);

  // Efecto para la simulación de la cola
  useEffect(() => {
    let queueTimer;
    if (status === 'IN_QUEUE') {
      // Simulamos posición inicial en cola
      setQueuePosition(Math.floor(Math.random() * 3) + 2); 
      
      let currentPos = queuePosition || 3;
      
      queueTimer = setInterval(() => {
        currentPos -= 1;
        setQueuePosition(currentPos);
        
        if (currentPos <= 0) {
          clearInterval(queueTimer);
          // Pasar a procesamiento real (bloquea inputs)
          setStatus('PROCESSING');
          executeVote();
        }
      }, 1500); // 1.5s por cada posición en la cola
    }
    
    return () => {
      if (queueTimer) clearInterval(queueTimer);
    };
  }, [status]);

  if (!isOpen) return null;

  const handleStartQueue = (e) => {
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
    
    // Entrar a la cola (los inputs siguen editables)
    setStatus('IN_QUEUE');
  };

  const executeVote = async () => {
    try {
      const response = await axios.post('/api/vote', {
        ticket: ticket,
        control_digit: controlDigit,
        option_id: candidate.id
      });
      
      setResultType('success');
      setMessage(response.data.message || 'Voto registrado exitosamente.');
      setStatus('RESULT');
      
      setTimeout(() => {
        onVoteSuccess();
        handleClose();
      }, 2500);
      
    } catch (error) {
      setResultType('error');
      setMessage(error.response?.data?.detail || 'Ocurrió un error al validar el DNI.');
      setStatus('RESULT');
    }
  };

  const handleClose = () => {
    setTicket('');
    setControlDigit('');
    setStatus('IDLE');
    setResultType(null);
    setMessage('');
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
    const inQueue = status === 'IN_QUEUE';

    return (
      <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar">
        <div className="mb-4 sm:mb-6 text-center">
          <p className="text-gray-500 text-xs sm:text-sm uppercase tracking-wider font-semibold mb-1">Candidato Seleccionado</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900">{candidate?.name}</h3>
        </div>

        {/* Banner de Advertencia */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 flex items-start">
          <Info className="text-blue-600 mt-0.5 mr-3 flex-shrink-0" size={18} />
          <p className="text-xs sm:text-sm text-blue-800 font-medium leading-relaxed">
            Por favor, verifica detenidamente que tu DNI y Dígito Verificador sean correctos antes de que llegue tu turno en la cola.
          </p>
        </div>

        {isProcessing ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-4">
            <Loader2 size={46} className="text-emerald-600 animate-spin" />
            <p className="font-semibold text-gray-800 text-lg">Validando con RENIEC...</p>
            <p className="text-sm text-gray-500 text-center px-4">
              Por favor no cierres la ventana. Estamos procesando tu turno.
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
                src="https://res.cloudinary.com/dipbgu7dd/image/upload/v1787328685/LCCE4P37QNGG5IRLNK6BKJ2HYY_anlmfw.png" 
                alt="Guía Dígito Verificador" 
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

            {inQueue ? (
              <div className="w-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold py-4 rounded-xl flex flex-col items-center justify-center animate-pulse">
                <span>Estás en la cola.</span>
                <span className="text-sm font-medium mt-1">Posición actual: {queuePosition}</span>
              </div>
            ) : (
              <button 
                type="submit" 
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-4 rounded-xl transition-all shadow-md hover:shadow-lg focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 outline-none mt-2 min-h-[44px] text-lg"
              >
                Participar
              </button>
            )}

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
              className="hover:bg-white/20 p-1 rounded-full transition disabled:opacity-50"
              disabled={status === 'PROCESSING'}
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
