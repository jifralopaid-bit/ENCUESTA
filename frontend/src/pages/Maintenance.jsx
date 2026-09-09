import React from 'react';
import { Settings } from 'lucide-react';

const Maintenance = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 animate-fadeIn">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-2xl p-10 text-center border-t-8 border-[#035c43] transform transition-all hover:scale-105">
        <div className="flex justify-center mb-6 relative">
          <Settings className="w-24 h-24 text-[#035c43] animate-[spin_5s_linear_infinite]" />
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-8 h-8 bg-white rounded-full"></div>
          </div>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-4 tracking-tight">Plataforma en Mantenimiento</h1>
        <p className="text-gray-600 mb-8 text-lg leading-relaxed">
          Estamos aplicando actualizaciones críticas de seguridad (Doble Ciego) y mejorando la arquitectura de la plataforma.
          <br/><br/>
          <span className="font-semibold text-[#035c43]">Estaremos de vuelta en unos minutos.</span>
        </p>
        <div className="bg-amber-50 border-l-4 border-amber-500 rounded-r-lg p-5 flex items-start gap-4 text-left shadow-sm">
          <span className="text-2xl">⏳</span>
          <p className="text-sm text-amber-800 font-medium">
            Gracias por tu paciencia. Seguimos trabajando para garantizar elecciones 100% transparentes y seguras.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Maintenance;
