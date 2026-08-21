import React, { useState, useEffect } from 'react';
import CandidateCard from '../components/CandidateCard';
import VotingModal from '../components/VotingModal';
import CandidateModal from '../components/CandidateModal';
import LiveResults from '../components/LiveResults';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import axios from 'axios';

const Votacion = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados de resultados en vivo
  const [liveResults, setLiveResults] = useState([]);
  const [isResultsLoading, setIsResultsLoading] = useState(true);
  
  // Estados para modales
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isVotingModalOpen, setIsVotingModalOpen] = useState(false);
  
  const [refreshResults, setRefreshResults] = useState(0);

  useEffect(() => {
    fetchCandidates();
  }, []);

  // Efecto para cargar y hacer polling de los resultados
  useEffect(() => {
    fetchLiveResults();
    
    const interval = setInterval(() => {
      axios.get('http://localhost:8000/api/results')
        .then(response => {
          setLiveResults(response.data);
        })
        .catch(error => console.error("Error auto-fetching results:", error));
    }, 3000);

    return () => clearInterval(interval);
  }, [refreshResults]);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('candidatos')
        .select('*')
        .order('id', { ascending: true });
        
      if (error) throw error;
      setCandidates(data || []);
    } catch (error) {
      console.error('Error fetching candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveResults = async () => {
    setIsResultsLoading(true);
    try {
      const response = await axios.get('http://localhost:8000/api/results');
      setLiveResults(response.data);
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
        
        {/* Encabezado */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-2 text-emerald-600 mb-4">
            <Sparkles size={24} />
            <span className="font-semibold uppercase tracking-wider text-sm">Proceso Electoral en Curso</span>
            <Sparkles size={24} />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
            Elige a tu <span className="text-emerald-700">Representante</span>
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Revisa detenidamente las propuestas de los líderes de nuestro distrito. 
            Utiliza tu DNI y dígito verificador para emitir un voto único y seguro.
          </p>
        </div>

        {/* Grid de Candidatos (1 en móvil, hasta 5 en Desktop) */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-emerald-600 mb-4" size={48} />
            <p className="text-gray-500 font-medium">Cargando candidatos oficiales...</p>
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
        onVoteSuccess={handleVoteSuccess}
      />
    </div>
  );
};

export default Votacion;
