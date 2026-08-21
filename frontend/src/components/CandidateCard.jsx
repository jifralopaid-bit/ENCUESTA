import React from 'react';

const CandidateCard = ({ candidato, onSelect, onVoteClick, votes = 0, totalVotes = 0 }) => {
  const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;

  return (
    <div className="group relative bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden flex flex-row sm:flex-col h-full border border-gray-100 w-full cursor-pointer">
      
      {/* 
        Imagen Contenedor:
        - Móvil: Ancho fijo (por ej. 1/3 del ancho o 120px) para que esté a la izquierda.
        - PC: Ancho completo, cuadrada (aspect-square).
      */}
      <div 
        className="relative overflow-hidden bg-gray-100 flex-shrink-0 w-32 sm:w-full sm:aspect-square"
        onClick={() => onSelect(candidato)}
      >
        <img 
          src={candidato.image_url} 
          alt={candidato.name} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Overlay Hover (Solo se nota en PC por su tamaño) */}
        <div className="hidden sm:flex absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-emerald-800 font-bold py-2 px-6 rounded-full transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-lg text-sm text-center">
            Ver Información
          </span>
        </div>

        {/* Badge del Partido */}
        {candidato.logo_partido_url && (
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 w-8 h-8 sm:w-12 sm:h-12 bg-white rounded-full p-0.5 sm:p-1 shadow-md border-2 border-white z-10 overflow-hidden flex items-center justify-center">
            <img 
              src={candidato.logo_partido_url} 
              alt="Logo Partido" 
              className="w-full h-full object-contain rounded-full"
            />
          </div>
        )}
      </div>
      
      {/* Contenido (Textos, Stats y Acción) */}
      <div className="p-3 sm:p-5 flex flex-col flex-grow w-full">
        <div onClick={() => onSelect(candidato)}>
          <h3 className="text-sm sm:text-lg font-bold text-gray-900 mb-1 sm:mb-2 leading-tight sm:leading-normal">
            {candidato.name}
          </h3>
          <p className="text-gray-600 text-xs sm:text-sm flex-grow mb-3 sm:mb-6 leading-snug sm:leading-relaxed line-clamp-2 sm:line-clamp-3">
            {candidato.proposal}
          </p>
        </div>

        {/* CONTENEDOR INFERIOR: Votos (solo móvil) + Botón de Votar */}
        <div className="mt-auto flex flex-col gap-3">
          
          {/* Resultados en vivo (Solo visible en móviles) */}
          <div className="sm:hidden w-full bg-emerald-50 rounded-lg p-2 border border-emerald-100 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">Votos</span>
              <span className="text-sm font-black text-emerald-800">{votes}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-lg font-extrabold text-emerald-600">{percentage}%</span>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center gap-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onVoteClick();
              }}
              className="w-full text-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm py-2.5 sm:py-2 rounded-lg transition-colors shadow-sm hover:shadow-md"
            >
              Votar <span className="hidden sm:inline">Ahora</span>
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onSelect(candidato);
              }}
              className="sm:hidden px-3 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200"
            >
              Info
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CandidateCard;
