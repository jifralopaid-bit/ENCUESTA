import React from 'react';
import { ShieldCheck, Lock, CheckCircle, Database } from 'lucide-react';
import { Link } from 'react-router-dom';

const Transparencia = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-100 text-emerald-700 rounded-full mb-6">
            <ShieldCheck size={40} />
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">Política de Transparencia</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Nuestro sistema electoral digital está diseñado con los más altos estándares de seguridad para garantizar que cada voto cuente, sea único y totalmente anónimo.
          </p>
        </div>

        {/* Cajas de Información */}
        <div className="space-y-8">
          
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 items-start">
            <div className="flex-shrink-0 p-4 bg-emerald-50 text-emerald-600 rounded-xl">
              <Lock size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Integridad y Privacidad</h2>
              <p className="text-gray-600 leading-relaxed font-medium">
                Nuestro sistema de validación cívica está integrado mediante canales encriptados de extremo a extremo. Los datos (DNI) se verifican en tiempo real bajo los padrones habilitados. Por tu seguridad, la plataforma opera bajo la política de Zero-Knowledge: no almacenamos, ni rastreamos, ni guardamos ninguna información personal o rastro de tu dispositivo. Tu voto es irreversible y 100% secreto.
              </p>
            </div>
          </div>


        </div>

        <div className="mt-16 text-center">
          <Link 
            to="/votacion"
            className="inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-4 px-8 rounded-full transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
          >
            Ir al Centro de Votación
          </Link>
        </div>

      </div>
    </div>
  );
};

export default Transparencia;
