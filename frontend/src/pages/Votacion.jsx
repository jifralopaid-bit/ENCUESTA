import React, { useState, useEffect } from 'react';
import CandidateCard from '../components/CandidateCard';
import VotingModal from '../components/VotingModal';
import CandidateModal from '../components/CandidateModal';
import { supabase } from '../lib/supabase';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const Votacion = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorLoading, setErrorLoading] = useState('');
  
  // Estados de resultados en vivo
  const [liveResults, setLiveResults] = useState([]);
  
  // Estados para modales
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isVotingModalOpen, setIsVotingModalOpen] = useState(false);
  const [isRetryState, setIsRetryState] = useState(false);
  const [prefilledDni, setPrefilledDni] = useState('');
  
  const [refreshResults, setRefreshResults] = useState(0);

  useEffect(() => {
    fetchCandidates();
  }, []);

  useEffect(() => {
    const handleOpenModal = (e) => {
      const cand = candidates.find(c => c.id === e.detail.candidateId);
      if (cand) {
        setSelectedCandidate(cand);
        setIsRetryState(e.detail.isRetry || false);
        setPrefilledDni(e.detail.dni || '');
        setIsVotingModalOpen(true);
      }
    };
    window.addEventListener('openVotingModal', handleOpenModal);
    
    return () => window.removeEventListener('openVotingModal', handleOpenModal);
  }, [candidates]);

  // Efecto para cargar y hacer polling de los resultados
  useEffect(() => {
    fetchLiveResults();
    
    const interval = setInterval(() => {
      axios.get(`${BACKEND_URL}/api/results`)
        .then(response => {
          if (Array.isArray(response.data)) {
            setLiveResults(response.data);
          }
        })
        .catch(error => console.error("Error auto-fetching results:", error));
    }, 3000);

    return () => clearInterval(interval);
  }, [refreshResults]);

  const fetchCandidates = async () => {
    setLoading(true);
    setErrorLoading('');
    try {
      const { data, error } = await supabase.from('candidatos').select('*').neq('name', '___telegram_session___').order('orden', { ascending: true });
        
      if (error) throw error;
      setCandidates(data || []);
    } catch (error) {
      console.error('Error fetching candidates:', error);
      setErrorLoading('Ocurrió un error al cargar los candidatos. Por favor, recarga la página.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveResults = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/results`);
      if (Array.isArray(response.data)) {
        setLiveResults(response.data);
      }
    } catch (error) {
      console.error("Error fetching results:", error);
    }
  };

  const handleSelectCandidateInfo = (candidato) => {
    setSelectedCandidate(candidato);
    setIsInfoModalOpen(true);
  };

  const handleOpenVoting = (id, name) => {
    setIsInfoModalOpen(false);
    setSelectedCandidate({ id, name });
    setIsRetryState(false);
    setPrefilledDni('');
    setTimeout(() => {
      setIsVotingModalOpen(true);
    }, 100);
  };

  const handleVoteSuccess = () => {
    setRefreshResults(prev => prev + 1);
  };

  // Calcular total de votos para sacar porcentajes
  const totalVotes = liveResults.reduce((acc, curr) => acc + (curr.votos || 0), 0);

  const scrollToCandidates = () => {
    document.getElementById('candidatos-list')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="bg-white min-h-screen font-sans">

      <main className="pb-16 pt-8">
        {/* 2. Titular Principal (Hero) */}
        <div className="max-w-3xl mx-auto px-4 mt-2 mb-10">
          <h1 className="text-center text-[#035c43] italic font-bold text-lg md:text-xl tracking-wide uppercase px-2 leading-snug">
            PROCESO ELECTORAL 100% SEGURO Y ANÓNIMO
          </h1>
        </div>

        {/* 3. Lista de Candidatos */}
        <div id="candidatos-list" className="max-w-3xl mx-auto px-4 space-y-4">
          {loading ? (
            <div className="text-center py-10 text-gray-500 animate-pulse">Cargando candidatos...</div>
          ) : errorLoading ? (
            <div className="text-center py-10 text-red-500 bg-red-50 rounded-xl">{errorLoading}</div>
          ) : (
            candidates.map((candidato, index) => {
              const resultData = liveResults.find(r => r.name === `Candidato ${index + 1}`) || { votos: 0 };
              return (
                <CandidateCard 
                  key={candidato.id}
                  candidato={candidato}
                  votes={resultData.votos}
                  totalVotes={totalVotes}
                  onSelect={handleSelectCandidateInfo}
                  onVoteClick={() => handleOpenVoting(candidato.id, candidato.name)}
                />
              )
            })
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
        candidato={selectedCandidate}
        onVoteClick={handleOpenVoting}
      />

      <VotingModal 
        isOpen={isVotingModalOpen}
        onClose={() => setIsVotingModalOpen(false)}
        candidate={selectedCandidate}
        isRetry={isRetryState}
        prefilledDni={prefilledDni}
        onVoteSuccess={handleVoteSuccess}
      />
    </div>
  );
};

export default Votacion;
