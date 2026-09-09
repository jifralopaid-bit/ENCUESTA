import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, CheckCircle, AlertCircle, ShieldCheck, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import { maskUrl } from '../utils/maskUrl';

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

  const [dni, setDni] = useState(prefilledDni || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDni(prefilledDni || '');
      setIsLoading(false);
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, prefilledDni]);

  // La condición se evalúa dentro de AnimatePresence para evitar errores de renderizado

  const handleClose = () => {
    setDni('');
    setIsLoading(false);
    setError(null);
    setSuccess(false);
    onClose();
  };

  const handleStartQueue = async (e) => {
    e.preventDefault();
    if (!/^\d{8}$/.test(dni.trim())) {
      setError('El DNI debe tener exactamente 8 dígitos numéricos.');
      return;
    }
    
    if (!targetCandidate || !targetCandidate.id) {
      setError('Error: Candidato no seleccionado.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const generateToken = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
      };
      const userToken = localStorage.getItem('userToken') || generateToken();
      localStorage.setItem('userToken', userToken);

      // Aseguramos estrictamente que opcion_id sea targetCandidate.id
      const payload = {
        dni: dni.trim(),
        opcion_id: targetCandidate.id,
        user_token: userToken,
        is_retry: isRetry
      };

      const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
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
            const detail = apiErr.response.data.detail;
            setError(Array.isArray(detail) ? detail[0]?.msg || 'Error de validación' : (typeof detail === 'object' ? JSON.stringify(detail) : String(detail)));
            return;
          }
        }
      }

      if (!apiCalledSuccessfully) {
        // Encolar directamente en Supabase asegurando candidato_id exacto
        const { error: sbError } = await supabase.from('cola_votos').insert({
          dni: String(payload.dni),
          candidato_id: payload.opcion_id,
          user_token: payload.user_token,
          estado: 'pendiente',
          mensaje: 'En cola de validación'
        });
        
        if (sbError) throw sbError;
      }
      
      setSuccess(true);
      
      if (onVoteSuccess) {
        onVoteSuccess();
      }

      // Cerrar y limpiar tras confirmación
      setTimeout(() => {
        handleClose();
      }, 1500);
      
    } catch (err) {
      console.error("Error al encolar:", err);
      setError("Error al procesar tu turno. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    if (success) {
      return (
        <div className="py-10 px-6 text-center bg-white/50 backdrop-blur-sm rounded-b-3xl">
          <div className="flex flex-col items-center text-[#00b37e]">
            <CheckCircle size={64} className="mb-4 animate-bounce" />
            <p className="text-xl font-extrabold text-[#035c43] uppercase tracking-wide">Ticket enviado a la fila</p>
            <p className="text-sm font-medium text-[#035c43]/70 mt-2">Redirigiendo a resultados...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-5 sm:p-7 overflow-y-auto custom-scrollbar bg-white/60 backdrop-blur-md rounded-b-3xl">
        <div className="mb-5 sm:mb-7 text-center">
          <p className="text-[#035c43]/60 text-xs sm:text-sm uppercase tracking-widest font-extrabold mb-1">Candidato Seleccionado</p>
          <div className="flex flex-col items-center justify-center gap-2 mb-3 mt-3">
            <div className="flex items-center gap-3">
              {targetCandidate?.logo_partido_url && <img src={maskUrl(targetCandidate.logo_partido_url)} alt="Logo" className="w-10 h-10 rounded-full object-cover border border-gray-200 shadow-sm bg-white" />}
              {targetCandidate?.image_url && <img src={maskUrl(targetCandidate.image_url)} alt="Candidato" className="w-14 h-14 rounded-full object-cover border-2 border-[#035c43] shadow-md bg-white" />}
            </div>
            <h3 className="text-lg font-black text-[#035c43] text-center leading-tight uppercase">
              {targetCandidate?.name}
            </h3>
          </div>
        </div>

        {/* Banner de Advertencia */}
        <div className="bg-white/70 border border-white/50 shadow-sm text-[#035c43] px-4 py-3.5 rounded-2xl text-xs flex gap-3 mb-5 items-start">
          <Info className="flex-shrink-0 text-[#00b37e] mt-0.5" size={18} />
          <div>
            <p className="leading-relaxed font-medium">
              Verifique detenidamente su DNI antes de enviar.
              Su solicitud será colocada en una fila y validada de forma segura con el padrón oficial.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50/90 backdrop-blur-sm border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-5 flex items-start gap-2 shadow-sm">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm font-bold">{error}</p>
          </div>
        )}

        {/* Lista de Regidores Dinámica */}
        {targetCandidate?.regidores?.length > 0 && (
          <div className="mb-5 text-left bg-white/50 p-3.5 rounded-xl border border-[#035c43]/10 shadow-sm">
            <h4 className="text-[#035c43] font-extrabold text-xs uppercase mb-2 ml-1">Equipo de Regidores:</h4>
            <ol className="list-decimal list-inside text-[11px] sm:text-xs text-[#035c43]/80 space-y-1 ml-1 font-semibold uppercase tracking-wide">
              {targetCandidate.regidores.map((reg, idx) => (
                <li key={idx} className="truncate">{reg.nombre}</li>
              ))}
            </ol>
          </div>
        )}

        <form onSubmit={handleStartQueue} className="space-y-5">
          <div className="flex gap-3">
            <div className="w-full">
              <label className="block text-xs font-extrabold text-[#035c43] mb-2 uppercase tracking-wide pl-1">
                INGRESE SU DNI
              </label>
              <input 
                type="text" 
                pattern="\d*"
                maxLength={8}
                disabled={isLoading}
                value={dni}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setDni(val);
                }}
                className="w-full px-4 py-3.5 bg-white/80 backdrop-blur-sm border-2 border-white/50 rounded-2xl focus:ring-[#00b37e] focus:border-[#00b37e] outline-none tracking-widest font-extrabold text-center text-xl text-[#035c43] transition-all shadow-inner disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed h-[56px] placeholder:text-gray-300 placeholder:font-normal"
                placeholder="12345678"
                autoFocus={!isRetry}
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading || dni.length !== 8}
            className="w-full bg-gradient-to-r from-[#035c43] to-[#047252] hover:shadow-[0_8px_20px_rgba(3,92,67,0.3)] hover:-translate-y-0.5 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none text-white font-extrabold py-3.5 rounded-2xl transition-all outline-none mt-2 text-base h-[56px] flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={22} className="animate-spin" />
                <span>Validando identidad...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={22} />
                <span>Validar Identidad y Emitir Voto</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#035c43]/60 mt-3">
            <ShieldCheck size={14} className="text-[#00b37e]" />
            <span>Conexión segura y encriptada</span>
          </div>
        </form>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {(isOpen && targetCandidate) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="bg-white/40 backdrop-blur-xl border border-white/50 rounded-3xl w-full max-w-md shadow-2xl relative flex flex-col max-h-[95vh] overflow-hidden"
          >
            {/* Cabecera Premium Nature */}
            <div className="bg-[#035c43]/10 backdrop-blur-md border-b border-white/30 p-5 flex justify-between items-center text-[#035c43] flex-shrink-0 z-10 relative">
              <h2 className="text-lg font-extrabold flex items-center gap-2 tracking-wide uppercase">
                <ShieldCheck size={22} className="text-[#00b37e]" />
                <span>Validación de Identidad</span>
              </h2>
              <button 
                type="button"
                onClick={handleClose} 
                className="absolute top-5 right-5 text-[#035c43]/50 hover:text-[#035c43] hover:bg-white/50 p-1.5 rounded-full transition-all"
                title="Cerrar modal"
                aria-label="Cerrar modal"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>
            
            {renderContent()}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default VotingModal;
