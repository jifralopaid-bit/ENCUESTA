import React, { useState, useEffect } from 'react';
import CandidateCard from '../components/CandidateCard';
import VotingModal from '../components/VotingModal';
import CandidateModal from '../components/CandidateModal';
import LiveResults from '../components/LiveResults';
import { Sparkles, Loader2, ShieldCheck, LockKeyhole, UserCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const Votacion = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorLoading, setErrorLoading] = useState('');
  
  // Estados de resultados en vivo
  const [liveResults, setLiveResults] = useState([]);
  const [isResultsLoading, setIsResultsLoading] = useState(true);
  
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
      // Find candidate by ID to pass full object
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
    setIsResultsLoading(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/api/results`);
      if (Array.isArray(response.data)) {
        setLiveResults(response.data);
      }
    } catch (error) {
      console.error("Error fetching results:", error);
    } finally {
      setIsResultsLoading(false);
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

  return (
    <div className="py-12 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Encabezado Estratégico */}
        <div className="text-center mb-16 max-w-4xl mx-auto relative z-10">
          <div className="inline-flex items-center justify-center gap-2 bg-emerald-50 text-emerald-800 px-5 py-2 rounded-full mb-6 shadow-sm border border-emerald-200/50 backdrop-blur-sm">
            <ShieldCheck size={18} className="text-emerald-600" />
            <span className="font-black uppercase tracking-wider text-xs md:text-sm">Proceso Electoral 100% Seguro y Oficial</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 mb-6 tracking-tight leading-tight">
            Elige a tu <span className="text-transparent bg-clip-text bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500">Representante</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 leading-relaxed max-w-3xl mx-auto mb-8 font-medium">
            Tu voz define el futuro de La Peca. Participa emitiendo un voto único, rápido y totalmente <strong className="text-gray-800">secreto</strong>.
          </p>

          {/* Badges de Confianza Rápidos */}
          <div className="flex flex-wrap justify-center gap-3 sm:gap-6 text-sm font-semibold text-gray-600">
             <div className="flex items-center gap-2 bg-white/80 px-4 py-2 rounded-xl shadow-sm border border-gray-100 backdrop-blur-sm">
               <LockKeyhole size={18} className="text-emerald-500" /> 
               <span>Anonimato Garantizado</span>
             </div>
             <div className="flex items-center gap-2 bg-white/80 px-4 py-2 rounded-xl shadow-sm border border-gray-100 backdrop-blur-sm">
               <UserCheck size={18} className="text-emerald-500" /> 
               <span>Validado con RENIEC</span>
             </div>
          </div>
        </div>

        {/* Grid de Candidatos (1 en móvil, hasta 5 en Desktop) */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-emerald-600 mb-4" size={48} />
            <p className="text-gray-500 font-medium">Cargando candidatos oficiales...</p>
          </div>
        ) : errorLoading ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-red-100">
            <p className="text-red-500 text-lg font-medium">{errorLoading}</p>
            <button onClick={() => window.location.reload()} className="mt-4 bg-red-50 text-red-600 px-4 py-2 rounded font-semibold hover:bg-red-100 transition">
              Recargar página
            </button>
          </div>
        ) : candidates.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
            <p className="text-gray-500 text-lg">No hay candidatos registrados en la plataforma.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-6 mb-20">
            {candidates.map((candidato, index) => {
              // Buscar los votos del candidato actual (asumiendo orden 1 a 5)
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
            })}
          </div>
        )}

        {/* Resultados en Vivo (Gráfica solo visible en escritorio) */}
        <div className="mt-16 pt-16 border-t border-gray-200 hidden md:block">
          <LiveResults 
            data={liveResults} 
            candidates={candidates}
            loading={isResultsLoading} 
            onRefresh={fetchLiveResults} 
          />
        </div>

      </div>

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
