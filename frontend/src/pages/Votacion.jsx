import React, { useState, useEffect } from 'react';
import CandidateCard from '../components/CandidateCard';
import VotingModal from '../components/VotingModal';
import CandidateModal from '../components/CandidateModal';
import { supabase } from '../lib/supabase';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

const Votacion = () => {
  const [candidatos, setCandidatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorLoading, setErrorLoading] = useState('');
  
  // Estado para el modal de votación y detalle
  const [candidatoSeleccionado, setCandidatoSeleccionado] = useState(null);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const targetDate = new Date('2026-10-03T23:59:59').getTime();
    
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        
        setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft("0d 0h 0m 0s");
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, []);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isVotingModalOpen, setIsVotingModalOpen] = useState(false);
  const [isRetryState, setIsRetryState] = useState(false);
  const [prefilledDni, setPrefilledDni] = useState('');
  const [resultadosOcultos, setResultadosOcultos] = useState(false);
  
  const [refreshResults, setRefreshResults] = useState(0);

  // Carga inicial y polling en vivo de candidatos y votos
  useEffect(() => {
    fetchCandidatesAndVotes();

    const interval = setInterval(() => {
      fetchCandidatesAndVotes(false);
    }, 3000);

    return () => clearInterval(interval);
  }, [refreshResults]);

  // Manejador del evento personalizado disparado por el Sidebar (reintento)
  useEffect(() => {
    const handleOpenModal = (e) => {
      const cand = candidatos?.find(c => c.id === e.detail.candidateId);
      if (cand) {
        setCandidatoSeleccionado(cand);
        setIsRetryState(e.detail.isRetry || false);
        setPrefilledDni(e.detail.dni || '');
        setIsVotingModalOpen(true);
      }
    };
    window.addEventListener('openVotingModal', handleOpenModal);
    
    return () => window.removeEventListener('openVotingModal', handleOpenModal);
  }, [candidatos]);

  const fetchCandidatesAndVotes = async (showLoading = true) => {
    if (showLoading && candidatos.length === 0) setLoading(true);
    setErrorLoading('');
    try {
      const response = await axios.get(`${BACKEND_URL}/api/results`);
      const { resultados_ocultos, data } = response.data;
      
      setResultadosOcultos(resultados_ocultos);
      setCandidatos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching candidates/votes:', error);
      setCandidatos([]);
      if (candidatos?.length === 0 || !candidatos) {
        setErrorLoading('Ocurrió un error al cargar los candidatos. Por favor, recarga la página.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCandidateInfo = (candidato) => {
    setCandidatoSeleccionado(candidato);
    setIsInfoModalOpen(true);
  };

  const handleVoteSuccess = () => {
    setRefreshResults(prev => prev + 1);
  };

  // Cálculo dinámico del total de sufragios
  const totalVotos = candidatos?.reduce((acc, candidato) => acc + (candidato.votos || 0), 0) || 0;

  return (
    <div className="min-h-screen font-sans bg-[url('https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?q=80&w=2074&auto=format&fit=crop')] bg-cover bg-fixed bg-center relative flex flex-col">
      {/* Capa superpuesta blanca translúcida */}
      <div className="absolute inset-0 bg-[#fdfcfb]/85 backdrop-blur-[2px]"></div>
      
      <main className="relative z-10 flex-1 pb-16 pt-8 flex flex-col">
        {/* 1. Titular Principal (Hero) */}
        <div className="max-w-3xl mx-auto px-4 mt-2 mb-8 text-center">
          <p className="text-sm sm:text-base text-[#035c43] tracking-widest font-semibold mb-2 uppercase">ELECCIONES DISTRITALES LA PECA 2027 - 2030</p>
          <h1 className="text-center text-[#035c43] font-extrabold text-2xl sm:text-4xl tracking-tight uppercase leading-tight mb-2">
            PROCESO ELECTORAL<br/>100% SEGURO Y ANÓNIMO
          </h1>
          <p className="text-gray-600 text-sm sm:text-base font-medium">Tu decisión construye un mejor futuro para La Peca</p>
        </div>

        {/* 2. Bloque Institucional de Métricas de Votación en Vivo */}
        <div className="max-w-3xl mx-auto px-4 mb-8">
          <div className="bg-white/60 backdrop-blur-md border border-white/50 rounded-2xl py-3 px-4 text-center shadow-md flex items-center justify-center gap-2.5 max-w-sm mx-auto">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00b37e] animate-pulse shrink-0 shadow-[0_0_8px_#00b37e]"></span>
            <span className="font-extrabold text-[#035c43] text-xs sm:text-sm tracking-wider uppercase">
              TOTAL DE ELECTORES REGISTRADOS: {totalVotos}
            </span>
          </div>
          <div className="mt-4 bg-red-50 border border-red-100 text-red-800 font-bold px-6 py-2 rounded-full shadow-sm text-sm flex items-center justify-center gap-2 animate-pulse max-w-sm mx-auto">
            ⏳ Cierre de Urnas en: {timeLeft}
          </div>
        </div>

        {/* Bloque Oculto */}
        {resultadosOcultos && (
          <div className="max-w-3xl mx-auto px-4 mb-6">
            <div className="bg-orange-50 border border-orange-200 rounded-xl py-3 px-4 text-center shadow-xs">
              <span className="font-bold text-orange-800 text-sm">
                Los resultados en vivo han sido ocultados temporalmente por el comité electoral.
              </span>
            </div>
          </div>
        )}

        {/* 3. Lista de Candidatos */}
        <div id="candidatos-list" className="max-w-3xl mx-auto px-4 space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="animate-pulse bg-gray-200 h-24 rounded-xl"></div>
              ))}
            </div>
          ) : errorLoading ? (
            <div className="text-center py-10 text-red-500 bg-red-50 rounded-xl">{errorLoading}</div>
          ) : (
            candidatos?.map((candidato) => (
              <CandidateCard 
                key={candidato.id}
                candidato={candidato}
                votes={candidato.votos || 0}
                totalVotes={totalVotos}
                hiddenResults={resultadosOcultos}
                onSelect={() => handleSelectCandidateInfo(candidato)}
                onVoteClick={() => {
                  setCandidatoSeleccionado(candidato);
                  setIsVotingModalOpen(true);
                }}
              />
            ))
          )}
        </div>

        {/* 4. Banner de Confianza Oficial */}
        <div className="max-w-3xl mx-auto px-4 mt-14 mb-10 w-full">
          <div className="bg-white/50 backdrop-blur-sm border border-white/60 rounded-2xl p-6 sm:p-8 text-center shadow-xl">
            <h2 className="font-bold text-[#035c43] mb-6 text-sm sm:text-base tracking-wide uppercase">
              VERIFICAMOS TU VOTO CON LAS PLATAFORMAS OFICIALES
            </h2>
            <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-10">
              {/* JNE */}
              <a 
                href="https://votoinformado.jne.gob.pe/candidatos/resultados?departamento=Amazonas&depCode=01&provincia=Bagua&provCode=02&distrito=La+Peca&distCode=01" 
                target="_blank" 
                rel="noopener noreferrer"
                title="Voto Informado - JNE"
                className="flex items-center grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-300 hover:scale-105"
              >
                <img 
                  src="https://res.cloudinary.com/lqgq6nsm/image/upload/v1787690626/logo-JNE.png" 
                  alt="JNE" 
                  className="h-10 sm:h-12 w-auto object-contain drop-shadow-sm"
                />
              </a>

              {/* RENIEC */}
              <a 
                href="https://cel.reniec.gob.pe/celweb/index.html" 
                target="_blank" 
                rel="noopener noreferrer"
                title="RENIEC"
                className="flex items-center border-l border-r border-[#035c43]/20 px-6 sm:px-10 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-300 hover:scale-105"
              >
                <img 
                  src="https://res.cloudinary.com/lqgq6nsm/image/upload/v1788724920/reniec-logo-png_seeklogo-192416.png" 
                  alt="RENIEC" 
                  className="h-10 sm:h-12 w-auto object-contain drop-shadow-sm"
                />
              </a>

              {/* ONPE */}
              <a 
                href="https://consultaelectoral.onpe.gob.pe/inicio" 
                target="_blank" 
                rel="noopener noreferrer"
                title="ONPE"
                className="flex items-center grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-300 hover:scale-105"
              >
                <img 
                  src="https://res.cloudinary.com/lqgq6nsm/image/upload/v1788724984/ONPE.png" 
                  alt="ONPE" 
                  className="h-10 sm:h-12 w-auto object-contain drop-shadow-sm"
                />
              </a>
            </div>
            
            <div className="mt-8 inline-flex items-center gap-2 bg-white/70 px-4 py-2 rounded-full border border-white/50 text-[#035c43] text-xs font-semibold shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              TU VOTO ES SEGURO - TECNOLOGÍA DE ÚLTIMA GENERACIÓN
            </div>
          </div>
        </div>
      </main>

      <CandidateModal 
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        candidato={candidatoSeleccionado}
        onVoteClick={(candidato) => {
          setIsInfoModalOpen(false);
          setCandidatoSeleccionado(candidato);
          setIsVotingModalOpen(true);
        }}
      />

      <VotingModal 
        isOpen={isVotingModalOpen}
        onClose={() => setIsVotingModalOpen(false)}
        candidatoSeleccionado={candidatoSeleccionado}
        candidate={candidatoSeleccionado}
        isRetry={isRetryState}
        prefilledDni={prefilledDni}
        onVoteSuccess={handleVoteSuccess}
      />
    </div>
  );
};

export default Votacion;
