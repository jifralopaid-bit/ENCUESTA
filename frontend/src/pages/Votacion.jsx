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
      {/* 1. Header Fijo (Sticky Top) */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3 sm:px-6 shadow-sm">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-full bg-[#035c43] flex items-center justify-center text-white font-bold italic text-sm shadow-sm">
               LP
             </div>
             <span className="font-bold text-gray-900 text-lg sm:text-xl tracking-tight">
               La Peca <span className="text-[#035c43]">Decide</span>
             </span>
          </div>
          <button 
            onClick={scrollToCandidates}
            className="bg-[#035c43] text-white px-5 py-2 rounded-md font-bold text-sm hover:scale-105 transition-transform shadow-md hover:bg-[#024230]"
          >
            VOTAR
          </button>
        </div>
      </header>

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
              <div className="flex flex-col items-center grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-300">
                <span className="font-black text-gray-800 text-xl sm:text-2xl tracking-tighter">JNE</span>
              </div>
              {/* RENIEC */}
              <div className="flex flex-col items-center border-l border-r border-gray-300 px-6 sm:px-10 grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-300">
                <span className="font-black text-gray-800 text-xl sm:text-2xl tracking-tighter">RENIEC</span>
              </div>
              {/* ONPE */}
              <div className="flex flex-col items-center grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-300">
                <span className="font-black text-gray-800 text-xl sm:text-2xl tracking-tighter">ONPE</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 5. Footer Institucional */}
      <footer className="bg-[#035c43] text-white pt-12 pb-6 px-4 border-t border-emerald-900">
        <div className="max-w-4xl mx-auto">
          {/* Sección Superior */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-10 text-center sm:text-left">
            <div className="w-16 h-16 bg-white rounded-full flex shrink-0 items-center justify-center text-[#035c43] font-black italic text-xl shadow-lg border-2 border-emerald-800">
              LP
            </div>
            <p className="text-sm sm:text-base leading-relaxed max-w-lg text-white/90">
              Plataforma de participación ciudadana para el fomento de la cultura, la exportación del café y el desarrollo turístico de nuestro distrito.
            </p>
          </div>

          {/* Sección Media (Grid de 2 columnas) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <div>
              <h3 className="font-bold text-lg mb-4 text-emerald-300">Enlaces Rápidos</h3>
              <ul className="space-y-3 text-sm text-white/80">
                <li><a href="#" className="hover:text-white hover:underline transition-all">Inicio</a></li>
                <li><a href="#" className="hover:text-white hover:underline transition-all">Centro de Votación</a></li>
                <li><a href="#" className="hover:text-white hover:underline transition-all">Política de Transparencia</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4 text-emerald-300">Garantía de Proceso</h3>
              <p className="text-sm text-white/80 leading-relaxed">
                Tus votos son verificados con los estándares de RENIEC y asegurados por nuestra tecnología.<br/>
                <strong className="text-white mt-2 block font-semibold text-emerald-100">Un voto, una persona.</strong>
              </p>
            </div>
          </div>

          {/* Sección Inferior */}
          <div className="border-t border-white/20 pt-6 text-center">
            <p className="text-[10px] sm:text-xs text-white/60 tracking-wider">
              © 2026 Distrito de La Peca - Amazonas. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>

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
