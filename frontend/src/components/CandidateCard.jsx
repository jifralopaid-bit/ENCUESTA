import React from 'react';
import { maskUrl } from '../utils/maskUrl';

const CandidateCard = ({ candidato, onSelect, onVoteClick, votes = 0, totalVotes = 0 }) => {
  const votosCandidato = candidato.votos !== undefined ? candidato.votos : votes;
  const percentage = totalVotes > 0 ? Math.round((votosCandidato / totalVotes) * 100) : 0;

  return (
    <div className="flex flex-row items-center justify-between p-2.5 sm:p-5 gap-2 sm:gap-4 bg-white/60 backdrop-blur-md border border-white/50 shadow-xl rounded-2xl mb-2 sm:mb-4 hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300">
      {/* Izquierda (Avatares) */}
      <div 
        className="flex -space-x-2 sm:-space-x-3 shrink-0 cursor-pointer group" 
        onClick={() => onSelect(candidato)}
      >
        <img 
          src={maskUrl(candidato.image_url) || 'https://via.placeholder.com/150'} 
          alt={candidato.name}
          className="w-10 h-10 sm:w-16 sm:h-16 rounded-full object-cover ring-2 ring-white z-10 transition-transform group-hover:scale-105 bg-gray-100 shadow-md"
        />
        {candidato.logo_partido_url ? (
           <img 
             src={maskUrl(candidato.logo_partido_url)} 
             alt="Partido"
             className="w-10 h-10 sm:w-16 sm:h-16 rounded-full object-contain ring-2 ring-white z-20 bg-white transition-transform group-hover:scale-105 shadow-md"
           />
        ) : (
           <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-full ring-2 ring-white z-20 bg-white flex items-center justify-center text-[8px] sm:text-[10px] font-bold text-gray-400 shadow-md">
             Partido
           </div>
        )}
      </div>

      {/* Centro (Info y Progreso) */}
      <div 
        className="flex-1 min-w-0 flex flex-col justify-center cursor-pointer" 
        onClick={() => onSelect(candidato)}
      >
        <h3 className="text-xs sm:text-base font-bold text-[#035c43] leading-tight truncate text-left">
          {candidato.name}
        </h3>
        <p className="hidden sm:block text-xs text-gray-500 font-medium truncate mt-0.5">
          {candidato.lema || "Candidato Distrital para La Peca"}
        </p>
        
        <div className="flex items-center gap-2 mt-1 sm:mt-2">
          <div className="flex-1 bg-white/50 border border-[#035c43]/10 rounded-full h-1.5 sm:h-2 overflow-hidden shadow-inner">
            <div 
              className="bg-[#00b37e] h-full rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="flex items-center gap-1 shrink-0 min-w-[40px] sm:min-w-[50px] justify-end text-[10px] sm:text-xs font-medium truncate">
            <span className="font-bold text-[#035c43]">
              {percentage}%
            </span>
            <span className="text-gray-500">({candidato.votos || 0} votos)</span>
          </div>
        </div>
      </div>

      {/* Derecha (Botón de Acción) */}
      <div className="shrink-0 pl-1 sm:pl-2">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onVoteClick(candidato);
          }}
          className="px-3 py-1.5 sm:px-6 sm:py-2 text-xs sm:text-base bg-gradient-to-r from-[#035c43] to-[#047252] text-white rounded-full font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1 sm:gap-1.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
          </svg>
          VOTAR
        </button>
      </div>
    </div>
  );
};

export default CandidateCard;
