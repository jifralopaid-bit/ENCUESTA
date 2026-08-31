import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, CheckCircle, AlertCircle, Loader2, Camera } from 'lucide-react';
import { supabase } from '../lib/supabase';

const RevocationModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [dni, setDni] = useState('');
  const [telefono, setTelefono] = useState('');
  const [foto, setFoto] = useState(null);
  const [preview, setPreview] = useState(null);
  
  const [status, setStatus] = useState('IDLE');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleOpen = (e) => {
      setDni(e.detail?.dni || '');
      setTelefono('');
      setFoto(null);
      setPreview(null);
      setStatus('IDLE');
      setIsOpen(true);
    };

    window.addEventListener('openRevocationModal', handleOpen);
    return () => window.removeEventListener('openRevocationModal', handleOpen);
  }, []);

  const handleClose = () => setIsOpen(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFoto(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!telefono || !foto) {
      setMessage("Todos los campos son obligatorios.");
      return;
    }

    try {
      setStatus('PROCESSING');
      
      const fileExt = foto.name.split('.').pop() || 'jpg';
      const fileName = `${dni}_${Math.random().toString(36).substring(2, 10)}.${fileExt}`;
      
      // Upload image to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('evidencias_dni')
        .upload(fileName, foto, {
          contentType: foto.type
        });
        
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('evidencias_dni')
        .getPublicUrl(fileName);
        
      // Insert into database
      const { error: insertError } = await supabase
        .from('solicitudes_revocacion')
        .insert({
            dni: dni,
            telefono: telefono,
            foto_url: publicUrl,
            estado: 'pendiente'
        });
        
      if (insertError) throw insertError;

      setStatus('RESULT');
      setMessage("Solicitud enviada. Nos comunicaremos contigo.");
    } catch (error) {
      console.error(error);
      setStatus('ERROR');
      setMessage("Hubo un error al enviar tu solicitud. Inténtalo más tarde.");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-sm w-full max-w-md shadow-2xl relative flex flex-col max-h-[95vh] overflow-hidden"
        >
          <div className="bg-[#C93339] p-4 flex justify-between items-center text-white flex-shrink-0 z-10">
            <h2 className="text-lg font-bold tracking-wide">
              Solicitud de Revocación
            </h2>
            <button onClick={handleClose} className="hover:bg-white/20 p-1 rounded-full transition">
              <X size={24} />
            </button>
          </div>
          
          <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar">
            {status === 'RESULT' ? (
              <div className="py-10 flex flex-col items-center text-center">
                <CheckCircle size={56} className="text-emerald-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Solicitud Recibida</h3>
                <p className="text-gray-600">{message}</p>
                <button 
                  onClick={handleClose}
                  className="mt-8 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 px-8 rounded-sm transition"
                >
                  Cerrar
                </button>
              </div>
            ) : status === 'ERROR' ? (
              <div className="py-10 flex flex-col items-center text-center">
                <AlertCircle size={56} className="text-red-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Error</h3>
                <p className="text-gray-600">{message}</p>
                <button 
                  onClick={() => setStatus('IDLE')}
                  className="mt-8 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 px-8 rounded-sm transition"
                >
                  Intentar de nuevo
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-3 rounded-sm text-xs mb-4">
                  <p className="leading-relaxed">
                    Utiliza este formulario únicamente si alguien más ha emitido un voto usando tu DNI sin tu consentimiento.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5 uppercase">
                    DNI Afectado
                  </label>
                  <input 
                    type="text" 
                    value={dni}
                    disabled
                    className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-sm text-lg font-medium text-gray-500 h-[48px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5 uppercase">
                    Número de Teléfono (WhatsApp)
                  </label>
                  <input 
                    type="tel"
                    required
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:ring-[#C93339] focus:border-[#C93339] outline-none transition-shadow text-lg font-medium h-[48px]"
                    placeholder="Ej: 987654321"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5 uppercase">
                    Foto Frontal de tu DNI
                  </label>
                  
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-sm hover:border-[#C93339] transition relative overflow-hidden bg-gray-50">
                    {preview ? (
                      <div className="flex flex-col items-center">
                        <img src={preview} alt="Vista previa" className="max-h-40 rounded mb-2 shadow-sm" />
                        <label className="cursor-pointer text-xs font-semibold text-[#C93339] hover:text-red-800">
                          Cambiar imagen
                          <input type="file" className="sr-only" accept="image/*" capture="environment" onChange={handleFileChange} />
                        </label>
                      </div>
                    ) : (
                      <div className="space-y-1 text-center">
                        <Camera className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600 justify-center">
                          <label className="relative cursor-pointer rounded-md font-medium text-[#C93339] hover:text-red-800 focus-within:outline-none">
                            <span>Subir un archivo</span>
                            <input type="file" className="sr-only" accept="image/*" capture="environment" onChange={handleFileChange} required />
                          </label>
                        </div>
                        <p className="text-xs text-gray-500">Tomar foto o subir JPG/PNG</p>
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={status === 'PROCESSING'}
                  className="w-full bg-[#C93339] hover:bg-red-800 text-white font-bold py-3 rounded-sm transition-all shadow-sm focus:ring-2 focus:ring-[#C93339] focus:ring-offset-2 outline-none mt-4 text-base h-[48px] flex justify-center items-center gap-2"
                >
                  {status === 'PROCESSING' ? (
                    <><Loader2 size={20} className="animate-spin" /> Procesando...</>
                  ) : 'Enviar Solicitud'}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default RevocationModal;
