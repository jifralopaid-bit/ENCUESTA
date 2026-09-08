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
    <div className="bg-white min-h-screen font-sans">
      <main className="pb-16 pt-8">
        {/* 1. Titular Principal (Hero) */}
        <div className="max-w-3xl mx-auto px-4 mt-2 mb-6">
          <h1 className="text-center text-[#035c43] italic font-bold text-lg md:text-xl tracking-wide uppercase px-2 leading-snug">
            PROCESO ELECTORAL 100% SEGURO Y ANÓNIMO
          </h1>
        </div>

        {/* 2. Bloque Institucional de Métricas de Votación en Vivo */}
        <div className="max-w-3xl mx-auto px-4 mb-8">
          <div className="bg-[#eaf4f1] border border-[#035c43]/20 rounded-xl py-3 px-4 text-center shadow-xs flex items-center justify-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#035c43] animate-pulse shrink-0"></span>
            <span className="font-extrabold text-[#035c43] text-xs sm:text-sm tracking-wider uppercase">
              TOTAL DE ELECTORES REGISTRADOS: {totalVotos}
            </span>
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
        <div className="max-w-3xl mx-auto px-4 mt-14 mb-10">
          <div className="bg-[#eaf4f1] border border-[#035c43]/30 rounded-xl p-6 sm:p-8 text-center shadow-sm">
            <h2 className="font-bold italic text-[#035c43] mb-6 text-sm sm:text-base tracking-wide uppercase">
              VERIFICAMOS TU VOTO CON LAS PLATAFORMAS OFICIALES
            </h2>
            <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-10">
              {/* JNE */}
              <a 
                href="https://votoinformado.jne.gob.pe/candidatos/resultados?departamento=Amazonas&depCode=01&provincia=Bagua&provCode=02&distrito=La+Peca&distCode=01" 
                target="_blank" 
                rel="noopener noreferrer"
                title="Voto Informado - JNE"
                className="flex items-center grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-300 hover:scale-105"
              >
                <img 
                  src="https://res.cloudinary.com/lqgq6nsm/image/upload/v1787690626/logo-JNE.png" 
                  alt="JNE" 
                  className="h-10 sm:h-12 w-auto object-contain"
                />
              </a>

              {/* RENIEC */}
              <a 
                href="https://cel.reniec.gob.pe/celweb/index.html" 
                target="_blank" 
                rel="noopener noreferrer"
                title="RENIEC"
                className="flex items-center border-l border-r border-gray-300 px-6 sm:px-10 grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-300 hover:scale-105"
              >
                <img 
                  src="https://res.cloudinary.com/lqgq6nsm/image/upload/v1788724920/reniec-logo-png_seeklogo-192416.png" 
                  alt="RENIEC" 
                  className="h-10 sm:h-12 w-auto object-contain"
                />
              </a>

              {/* ONPE */}
              <a 
                href="https://consultaelectoral.onpe.gob.pe/inicio" 
                target="_blank" 
                rel="noopener noreferrer"
                title="ONPE"
                className="flex items-center grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-300 hover:scale-105"
              >
                <img 
                  src="https://res.cloudinary.com/lqgq6nsm/image/upload/v1788724984/ONPE.png" 
                  alt="ONPE" 
                  className="h-10 sm:h-12 w-auto object-contain"
                />
              </a>
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
