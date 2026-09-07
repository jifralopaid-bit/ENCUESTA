import React from 'react';

const CandidateCard = ({ candidato, onSelect, onVoteClick, votes = 0, totalVotes = 0 }) => {
  const votosCandidato = candidato.votos !== undefined ? candidato.votos : votes;
  const percentage = totalVotes > 0 ? Math.round((votosCandidato / totalVotes) * 100) : 0;

  return (
    <div className="bg-white border border-[#035c43]/20 rounded-xl shadow-sm hover:shadow-md transition-shadow flex items-center p-3 sm:p-4">
      {/* Izquierda (Avatares) */}
      <div 
        className="flex -space-x-3 shrink-0 cursor-pointer group" 
        onClick={() => onSelect(candidato)}
      >
        <img 
          src={candidato.image_url || 'https://via.placeholder.com/150'} 
          alt={candidato.name}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover ring-2 ring-white z-10 transition-transform group-hover:scale-105 bg-gray-100"
        />
        {candidato.logo_partido_url ? (
           <img 
             src={candidato.logo_partido_url} 
             alt="Partido"
             className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-contain ring-2 ring-white z-20 bg-white transition-transform group-hover:scale-105"
           />
        ) : (
           <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full ring-2 ring-white z-20 bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400">
             Partido
           </div>
        )}
      </div>

      {/* Centro (Info y Progreso) */}
      <div 
        className="flex-1 px-3 sm:px-5 cursor-pointer" 
        onClick={() => onSelect(candidato)}
      >
        <h3 className="text-xs sm:text-sm font-bold italic text-gray-900 uppercase leading-tight line-clamp-1 text-left">
          {candidato.name}
        </h3>
        
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden shadow-inner">
            <div 
              className="bg-gradient-to-r from-[#035c43] to-[#128a67] h-full rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] sm:text-xs font-bold text-gray-700">
              {percentage}%
            </span>
            <span className="text-gray-500 text-xs">({votosCandidato} votos)</span>
          </div>
        </div>
      </div>

      {/* Derecha (Botón de Acción) */}
      <div className="shrink-0">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onVoteClick(candidato);
          }}
          className="bg-[#035c43] text-white px-3 sm:px-5 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-bold hover:scale-105 hover:bg-[#024230] transition-all duration-300 shadow-sm"
        >
          VOTAR
        </button>
      </div>
    </div>
  );
};

export default CandidateCard;
