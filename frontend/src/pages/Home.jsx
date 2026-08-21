import React from 'react';
import { Link } from 'react-router-dom';
import { Users, ShieldCheck, ArrowRight, Sprout } from 'lucide-react';

const Home = () => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[80vh] flex items-center justify-center overflow-hidden bg-[url('https://res.cloudinary.com/dipbgu7dd/image/upload/v1787327545/images_2_qgjhrx.jpg')] bg-cover bg-center bg-no-repeat">
        {/* Background Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80"></div>

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <span className="inline-block py-1 px-3 rounded-full bg-emerald-500/20 text-emerald-300 backdrop-blur-sm font-semibold text-sm mb-6 border border-emerald-500/30">
            Elecciones Vecinales 2026
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight mb-6 leading-tight drop-shadow-xl">
            El futuro de <span className="text-emerald-400">La Peca</span> está en tus manos.
          </h1>
          <p className="text-lg md:text-xl text-gray-200 mb-10 max-w-2xl mx-auto leading-relaxed">
            Participa en el proceso democrático más seguro y transparente de nuestro distrito. Tu voz decide el próximo líder que impulsará nuestra cultura y desarrollo.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              to="/votacion"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 text-white font-bold py-4 px-8 rounded-full transform hover:scale-105 shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/50 hover:bg-emerald-500 transition-all duration-300"
            >
              Participar Ahora
              <ArrowRight size={20} />
            </Link>
            <Link 
              to="/transparencia"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold py-4 px-8 rounded-full backdrop-blur-sm transition-all border border-white/20"
            >
              Conoce el Sistema
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Nuestros Pilares</h2>
            <div className="w-24 h-1 bg-emerald-600 mx-auto rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            
            {/* Pilar 1 */}
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-emerald-50 shadow-lg border border-emerald-50/50 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-xl hover:shadow-emerald-100">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mb-6">
                <Sprout size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Cultura y Agro</h3>
              <p className="text-gray-600 leading-relaxed">
                Nuestros candidatos presentan propuestas reales para impulsar el café orgánico, cacao y las maravillas turísticas de La Peca.
              </p>
            </div>

            {/* Pilar 2 */}
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-emerald-50 shadow-lg border border-emerald-50/50 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-xl hover:shadow-emerald-100">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mb-6">
                <ShieldCheck size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Máxima Transparencia</h3>
              <p className="text-gray-600 leading-relaxed">
                Cada voto es auditado y verificado. Utilizamos cruce de datos con RENIEC vía Telegram para garantizar que solo voten los residentes.
              </p>
            </div>

            {/* Pilar 3 */}
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-emerald-50 shadow-lg border border-emerald-50/50 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-xl hover:shadow-emerald-100">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mb-6">
                <Users size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Participación Vecinal</h3>
              <p className="text-gray-600 leading-relaxed">
                Tu participación directa empodera a la comunidad. Un distrito unido toma mejores decisiones para el futuro de nuestras familias.
              </p>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
