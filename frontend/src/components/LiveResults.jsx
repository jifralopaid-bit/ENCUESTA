import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { RefreshCw } from 'lucide-react';

const COLORS = ['#047857', '#059669', '#10b981', '#92400e', '#b45309'];

// Componente para renderizar la imagen/logo y el nombre en el Eje X
const CustomXAxisTick = (props) => {
  const { x, y, payload, candidates } = props;
  const candidateName = payload.value; 
  
  // Asumimos que payload.value es "Candidato 1", "Candidato 2", etc.
  const match = candidateName.match(/Candidato (\d+)/);
  let imageUrl = null;
  let shortName = candidateName;

  if (match && candidates && candidates.length >= match[1]) {
    const idx = parseInt(match[1]) - 1;
    if (candidates[idx]) {
      // Priorizamos el logo del partido, si no, la foto del candidato
      imageUrl = candidates[idx].logo_partido_url || candidates[idx].image_url;
      
      // Acortamos el nombre para que no se superponga
      const nameParts = candidates[idx].name.split(' ');
      shortName = nameParts.slice(0, 2).join(' '); // Primeros 2 nombres
    }
  }

  return (
    <g transform={`translate(${x},${y})`}>
      {imageUrl && (
        <>
          <defs>
            <clipPath id={`clip-${payload.value}`}>
              <circle cx="0" cy="15" r="15" />
            </clipPath>
          </defs>
          <image 
            x={-15} 
            y={0} 
            width={30} 
            height={30} 
            href={imageUrl}
            clipPath={`url(#clip-${payload.value})`}
            preserveAspectRatio="xMidYMid slice"
          />
        </>
      )}
      <text x={0} y={45} textAnchor="middle" fill="#4b5563" fontSize={12} fontWeight={600}>
        {shortName}
      </text>
    </g>
  );
};

const LiveResults = ({ data, candidates, loading, onRefresh }) => {
  return (
    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
        <div className="text-center md:text-left">
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Resultados en Vivo</h2>
          <p className="text-gray-500 mt-1">Escrutinio automatizado en tiempo real</p>
        </div>
        <button 
          onClick={onRefresh}
          className="flex items-center gap-2 text-emerald-700 hover:text-emerald-800 transition-colors px-4 py-2 bg-emerald-50 hover:bg-emerald-100 rounded-full font-medium text-sm"
          title="Actualizar manualmente"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>Actualizar</span>
        </button>
      </div>

      <div className="h-[420px] w-full">
        {loading && (!data || data.length === 0) ? (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-emerald-700 animate-pulse font-medium flex items-center gap-2">
              <RefreshCw className="animate-spin" size={20} />
              Conectando con el servidor...
            </span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 30, left: 0, bottom: 50 }}
            >
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                interval={0}
                tick={<CustomXAxisTick candidates={candidates} />}
              />
              <YAxis 
                allowDecimals={false} 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: '#9ca3af' }}
              />
              <Tooltip 
                cursor={{ fill: '#f3f4f6' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ color: '#047857', fontWeight: 'bold' }}
                formatter={(value) => [`${value} votos`, 'Total']}
              />
              <Bar dataKey="votos" radius={[6, 6, 0, 0]}>
                {data?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default LiveResults;
