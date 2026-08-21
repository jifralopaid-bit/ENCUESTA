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
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Un Ciudadano, Un Voto</h2>
              <p className="text-gray-600 leading-relaxed">
                Utilizamos el DNI y el dígito verificador para cruzar información en tiempo real con la base de datos de RENIEC a través de nuestro bot auditor de Telegram. Una vez que tu DNI es validado y registrado en el sistema, es criptográficamente marcado como "utilizado", impidiendo la duplicidad de votos bajo cualquier circunstancia.
              </p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 items-start">
            <div className="flex-shrink-0 p-4 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Validación de Residencia</h2>
              <p className="text-gray-600 leading-relaxed">
                El sistema extrae la edad y el distrito registrado en tu DNI de forma automática. Solo los ciudadanos mayores de 18 años y con residencia legal registrada en el distrito de <strong>La Peca</strong> están habilitados para participar. Esto previene la intervención de factores externos en las decisiones de nuestra comunidad.
              </p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 items-start">
            <div className="flex-shrink-0 p-4 bg-emerald-50 text-emerald-600 rounded-xl">
              <Database size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Anonimato Garantizado</h2>
              <p className="text-gray-600 leading-relaxed">
                Nuestra arquitectura de base de datos (Supabase) separa estrictamente la validación de identidad del registro de votos. La tabla de "Votos" solo almacena opciones, sin estar ligada a tu DNI. Tu identidad se usa para abrir la puerta de votación, pero lo que haces adentro es un secreto absoluto.
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
