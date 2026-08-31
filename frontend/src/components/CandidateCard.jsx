import React from 'react';
import { CheckCircle, Info } from 'lucide-react';

const CandidateCard = ({ candidato, onSelect, onVoteClick, votes = 0, totalVotes = 0 }) => {
  const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;

  return (
    <div 
      className="group bg-white rounded-3xl shadow-sm hover:shadow-2xl hover:shadow-emerald-900/10 transition-all duration-500 overflow-hidden flex flex-col h-full border border-gray-100 relative"
    >
      
      {/* 
        SECCIÓN SUPERIOR: IMAGEN Y CONFIANZA
        El cerebro procesa rostros al instante. 
      */}
      <div 
        className="relative w-full aspect-square bg-gray-100 cursor-pointer overflow-hidden"
        onClick={() => onSelect(candidato)}
      >
        <img 
          src={candidato.image_url} 
          alt={candidato.name} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        
        {/* Gradiente sutil para integrar la foto con la tarjeta */}
        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent opacity-90"></div>

        {/* Badge del Partido (Halo Effect - Autoridad) */}
        {candidato.logo_partido_url && (
          <div className="absolute top-4 right-4 w-14 h-14 bg-white/90 backdrop-blur-md rounded-full p-1.5 shadow-lg border border-white/50 z-10 flex items-center justify-center">
            <img 
              src={candidato.logo_partido_url} 
              alt="Logo Partido" 
              className="w-full h-full object-contain rounded-full"
            />
          </div>
        )}
      </div>
      
      {/* 
        SECCIÓN INFERIOR: IDENTIDAD Y ACCIÓN 
        (Ley de Hick - Minimizar opciones para acción directa)
      */}
      <div className="p-5 sm:p-6 flex flex-col flex-grow w-full bg-white relative z-20 -mt-6 rounded-t-3xl border-t border-white shadow-[0_-10px_40px_rgba(255,255,255,1)]">
        <div className="cursor-pointer mb-4" onClick={() => onSelect(candidato)}>
          <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-1 leading-tight tracking-tight">
            {candidato.name}
          </h3>
          <p className="text-gray-500 text-sm font-medium line-clamp-2 leading-relaxed">
            {candidato.proposal}
          </p>
          <button className="text-emerald-600 font-bold text-xs mt-2 flex items-center gap-1 hover:text-emerald-700 transition-colors">
            <Info size={14}/> Leer más
          </button>
        </div>

        {/* CONTENEDOR INFERIOR: Acción Principal Aislada (Von Restorff Effect) */}
        <div className="mt-auto flex flex-col gap-4">
          
          {/* Resultados en vivo (Solo si hay votos y en móvil) */}
          <div className="sm:hidden w-full bg-gray-50 rounded-xl p-3 border border-gray-100 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Votos Reales</span>
              <span className="text-base font-black text-gray-900">{votes}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xl font-extrabold text-emerald-600">{percentage}%</span>
            </div>
          </div>

          {/* BOTÓN SUPER CTA (Call To Action) */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onVoteClick();
            }}
            className="w-full relative overflow-hidden group/btn bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-lg sm:text-xl py-4 rounded-2xl transition-all duration-300 shadow-lg shadow-emerald-600/30 hover:shadow-emerald-500/50 hover:-translate-y-1 active:translate-y-0 active:scale-95 flex items-center justify-center gap-2"
          >
            {/* Efecto de brillo que cruza el botón */}
            <div className="absolute inset-0 -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            
            <CheckCircle className="animate-pulse" size={24} />
            <span>VOTAR AHORA</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CandidateCard;
