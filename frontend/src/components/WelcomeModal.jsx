import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Info } from 'lucide-react';

const WelcomeModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Verificar si el usuario ya vio el modal
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('hasSeenWelcome', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl w-full max-w-lg shadow-2xl relative flex flex-col overflow-hidden"
        >
          <div className="bg-emerald-700 p-5 flex flex-col items-center justify-center text-white flex-shrink-0 z-10 text-center">
            <ShieldCheck size={48} className="mb-2" />
            <h2 className="text-2xl font-bold">
              Bienvenido al Sistema de Votación Segura
            </h2>
          </div>
          
          <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar">
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                Esta plataforma garantiza un proceso cívico transparente. Al emitir tu voto, nuestro sistema se conecta en tiempo real a través de canales encriptados para validar tu DNI directamente con los datos del padrón oficial (RENIEC).
              </p>
              
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex gap-3 text-emerald-800">
                <Info className="flex-shrink-0 mt-0.5" size={20} />
                <p className="text-sm font-medium">
                  Por tu seguridad (Zero-Knowledge), no almacenamos tus datos personales, ubicación ni dispositivo. La validación es únicamente para garantizar que cada ciudadano emita un solo voto.
                </p>
              </div>

              <p className="font-bold text-center text-lg mt-6">
                Tu elección es 100% secreta e irreversible.
              </p>
            </div>

            <div className="mt-8">
              <button 
                onClick={handleClose}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-4 rounded-xl transition-all shadow-md hover:shadow-lg focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 outline-none text-lg"
              >
                Entendido, entrar a la plataforma
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default WelcomeModal;
