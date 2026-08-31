import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, Plus, Trash2, Save, LogOut, FileText, Image as ImageIcon, Edit2, XCircle, Loader2, RefreshCw, CheckCircle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TelegramConfig from '../components/TelegramConfig';
import RevocacionesPanel from './RevocacionesPanel';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Lista de Candidatos
  const [candidatosList, setCandidatosList] = useState([]);
  const [editingId, setEditingId] = useState(null);

  // Tab State
  const [activeTab, setActiveTab] = useState('candidatos');

  // Estado del Candidato
  const [candidato, setCandidato] = useState(getInitialCandidatoState());

  // Estado Dinámico de Regidores
  const [regidores, setRegidores] = useState([]);

  function getInitialCandidatoState() {
    return {
      name: '',
      proposal: '',
      fotoFile: null,
      logoFile: null,
      planPdfFile: null,
      hojaVidaPdfFile: null,
      image_url: '',
      logo_partido_url: '',
      plan_gobierno_pdf_url: '',
      hoja_vida_pdf_url: ''
    };
  }

  useEffect(() => {
    fetchCandidatosList();
  }, []);

  const fetchCandidatosList = async () => {
    try {
      const { data, error } = await supabase.from('candidatos').select('*').neq('name', '___telegram_session___').order('id', { ascending: true });
      if (error) throw error;
      setCandidatosList(data || []);
    } catch (error) {
      console.error("Error fetching candidatos:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  const addRegidor = () => {
    setRegidores([...regidores, { 
      id: Date.now(), 
      nombre: '', 
      cargo: '', 
      hoja_vida_pdf_url: '', 
      hojaVidaPdfFile: null,
      image_url: '',
      fotoFile: null,
      fotoPreview: null
    }]);
  };

  const removeRegidor = (id) => {
    setRegidores(regidores.filter(reg => reg.id !== id));
  };

  const updateRegidor = (id, field, value) => {
    setRegidores(regidores.map(reg => {
      if (reg.id === id) {
        const updated = { ...reg, [field]: value };
        // Create preview if it's a photo file
        if (field === 'fotoFile' && value) {
          updated.fotoPreview = URL.createObjectURL(value);
        }
        return updated;
      }
      return reg;
    }));
  };

  // Helper to handle candidate file changes with previews
  const handleCandidatoFile = (field, file) => {
    const updates = { [field]: file };
    if (field === 'fotoFile' && file) {
      updates.fotoPreview = URL.createObjectURL(file);
    }
    if (field === 'logoFile' && file) {
      updates.logoPreview = URL.createObjectURL(file);
    }
    setCandidato(prev => ({ ...prev, ...updates }));
  };

  const uploadFile = async (file, folder) => {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { data, error } = await supabase.storage.from('archivos_electorales').upload(filePath, file);
    if (error) throw new Error(`Error subiendo archivo ${file.name}: ${error.message}`);

    const { data: { publicUrl } } = supabase.storage.from('archivos_electorales').getPublicUrl(filePath);
    return publicUrl;
  };

  const handleEdit = async (cand) => {
    setEditingId(cand.id);
    setCandidato({
      name: cand.name,
      proposal: cand.proposal,
      fotoFile: null,
      logoFile: null,
      planPdfFile: null,
      hojaVidaPdfFile: null,
      image_url: cand.image_url,
      logo_partido_url: cand.logo_partido_url,
      plan_gobierno_pdf_url: cand.plan_gobierno_pdf_url,
      hoja_vida_pdf_url: cand.hoja_vida_pdf_url
    });
    
    // Fetch regidores for this candidate
    try {
      const { data, error } = await supabase
        .from('regidores')
        .select('*')
        .eq('candidato_id', cand.id)
        .order('cargo', { ascending: true });
        
      if (error) throw error;
      setRegidores(data.map(r => ({ ...r, hojaVidaPdfFile: null })));
    } catch (error) {
      console.error("Error fetching regidores:", error);
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setMessage('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setCandidato(getInitialCandidatoState());
    setRegidores([]);
    setMessage('');
  };

  const handleDelete = async (candId, candName) => {
    if (!window.confirm(`¿Estás seguro de eliminar a ${candName}? Esta acción no se puede deshacer.`)) return;
    
    try {
      // Regidores should cascade delete if FK is configured that way, 
      // but to be safe we delete them manually first
      await supabase.from('regidores').delete().eq('candidato_id', candId);
      
      const { error } = await supabase.from('candidatos').delete().eq('id', candId);
      if (error) throw error;
      
      setMessage(`Candidato ${candName} eliminado exitosamente.`);
      fetchCandidatosList();
      if (editingId === candId) handleCancelEdit();
    } catch (error) {
      console.error(error);
      setMessage(`Error al eliminar: ${error.message}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // 1. Subir archivos si existen nuevos, sino mantener los anteriores
      const imageUrl = await uploadFile(candidato.fotoFile, 'fotos_candidatos') || candidato.image_url;
      const logoUrl = await uploadFile(candidato.logoFile, 'logos_partidos') || candidato.logo_partido_url;
      const planUrl = await uploadFile(candidato.planPdfFile, 'planes_gobierno') || candidato.plan_gobierno_pdf_url;
      const hojaVidaUrl = await uploadFile(candidato.hojaVidaPdfFile, 'hojas_vida') || candidato.hoja_vida_pdf_url;

      let candId = editingId;

      if (editingId) {
        // UPDATE
        const { error: candError } = await supabase
          .from('candidatos')
          .update({
            name: candidato.name,
            proposal: candidato.proposal,
            image_url: imageUrl,
            logo_partido_url: logoUrl,
            plan_gobierno_pdf_url: planUrl,
            hoja_vida_pdf_url: hojaVidaUrl
          })
          .eq('id', editingId);

        if (candError) throw candError;
        
        // Regidores: Borrar antiguos y re-insertar actualizados (método más seguro para listas dinámicas cortas)
        await supabase.from('regidores').delete().eq('candidato_id', editingId);
        
      } else {
        // INSERT
        const { data: candData, error: candError } = await supabase
          .from('candidatos')
          .insert([{
            name: candidato.name,
            proposal: candidato.proposal,
            image_url: imageUrl,
            logo_partido_url: logoUrl,
            plan_gobierno_pdf_url: planUrl,
            hoja_vida_pdf_url: hojaVidaUrl
          }])
          .select()
          .single();

        if (candError) throw candError;
        candId = candData.id;
      }

      // 3. Procesar e insertar regidores
      if (regidores.length > 0) {
        const regidoresToInsert = [];
        for (const reg of regidores) {
          const regPdfUrl = await uploadFile(reg.hojaVidaPdfFile, 'hojas_vida_regidores') || reg.hoja_vida_pdf_url;
          const regFotoUrl = await uploadFile(reg.fotoFile, 'fotos_regidores') || reg.image_url;
          regidoresToInsert.push({
            candidato_id: candId,
            nombre: reg.nombre,
            cargo: reg.cargo,
            hoja_vida_pdf_url: regPdfUrl,
            image_url: regFotoUrl
          });
        }

        const { error: regError } = await supabase
          .from('regidores')
          .insert(regidoresToInsert);

        if (regError) throw regError;
      }

      setMessage(editingId ? '¡Candidato actualizado exitosamente!' : '¡Candidato registrado exitosamente!');
      fetchCandidatosList();
      handleCancelEdit();

    } catch (error) {
      console.error(error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-12">
      {/* Header Admin */}
      <header className="bg-emerald-800 text-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="font-bold text-xl tracking-wide">Panel de Control Electoral</h1>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 bg-emerald-900 hover:bg-emerald-950 px-4 py-2 rounded-lg transition text-sm font-medium"
          >
            <LogOut size={16} /> Salir
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 mt-8 space-y-8">
        
        {/* === TABS === */}
        <div className="flex space-x-4 border-b border-gray-300">
          <button 
            onClick={() => setActiveTab('candidatos')}
            className={`py-3 px-4 font-semibold text-sm ${activeTab === 'candidatos' ? 'border-b-2 border-emerald-600 text-emerald-800' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Gestión de Candidatos
          </button>
          <button 
            onClick={() => setActiveTab('revocaciones')}
            className={`py-3 px-4 font-semibold text-sm ${activeTab === 'revocaciones' ? 'border-b-2 border-emerald-600 text-emerald-800' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Solicitudes de Revocación
          </button>
        </div>

        {activeTab === 'candidatos' ? (
          <>
            {/* === CONFIGURACIÓN DE TELEGRAM === */}
            <TelegramConfig />
        
        {/* === LISTA DE CANDIDATOS === */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 md:p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Candidatos Registrados</h2>
            {candidatosList.length === 0 ? (
              <p className="text-gray-500 italic text-sm">No hay candidatos. Registra uno nuevo abajo.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {candidatosList.map(c => (
                  <div key={c.id} className="border border-gray-200 rounded-xl p-4 flex flex-col items-center text-center relative hover:shadow-md transition">
                    <img src={c.image_url} alt={c.name} className="w-16 h-16 object-cover rounded-full mb-3 shadow-sm" />
                    <h4 className="font-bold text-gray-900 text-sm mb-1">{c.name}</h4>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-4">{c.proposal}</p>
                    
                    <div className="mt-auto w-full flex gap-2">
                      <button 
                        onClick={() => handleEdit(c)}
                        className="flex-1 flex justify-center items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-2 rounded-lg text-xs font-semibold transition"
                      >
                        <Edit2 size={14} /> Editar
                      </button>
                      <button 
                        onClick={() => handleDelete(c.id, c.name)}
                        className="flex-1 flex justify-center items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 py-2 rounded-lg text-xs font-semibold transition"
                      >
                        <Trash2 size={14} /> Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* === FORMULARIO MAESTRO === */}
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
          <div className="p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-emerald-800">
                {editingId ? 'Editar Candidato' : 'Registrar Nuevo Candidato'}
              </h2>
              {editingId && (
                <button 
                  onClick={handleCancelEdit}
                  className="flex items-center gap-1 text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition font-medium"
                >
                  <XCircle size={16} /> Cancelar Edición
                </button>
              )}
            </div>
            
            {message && (
              <div className={`mb-6 p-4 rounded-lg font-medium text-sm ${message.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* DATOS DEL CANDIDATO */}
              <div className="space-y-5">
                <h3 className="text-lg font-semibold text-emerald-700 border-b pb-2">Información Principal</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                    <input 
                      type="text" required
                      value={candidato.name}
                      onChange={e => setCandidato({...candidato, name: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Propuesta Principal</label>
                    <textarea 
                      required rows={3}
                      value={candidato.proposal}
                      onChange={e => setCandidato({...candidato, proposal: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Foto de Perfil {editingId && <span className="text-emerald-600 text-xs font-normal">(Opcional si no deseas cambiarla)</span>}
                    </label>
                    <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-300">
                        {(candidato.fotoPreview || candidato.image_url) ? (
                          <img src={candidato.fotoPreview || candidato.image_url} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="text-gray-400" size={20} />
                        )}
                      </div>
                      <input 
                        type="file" accept="image/*" required={!editingId && !candidato.image_url}
                        onChange={e => handleCandidatoFile('fotoFile', e.target.files[0])}
                        className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 flex-1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Logo del Partido {editingId && <span className="text-emerald-600 text-xs font-normal">(Opcional si no deseas cambiarlo)</span>}
                    </label>
                    <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div className="w-12 h-12 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-300">
                        {(candidato.logoPreview || candidato.logo_partido_url) ? (
                          <img src={candidato.logoPreview || candidato.logo_partido_url} alt="Preview" className="w-full h-full object-contain p-1" />
                        ) : (
                          <ImageIcon className="text-gray-400" size={20} />
                        )}
                      </div>
                      <input 
                        type="file" accept="image/*" required={!editingId && !candidato.logo_partido_url}
                        onChange={e => handleCandidatoFile('logoFile', e.target.files[0])}
                        className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 flex-1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Plan de Gobierno {editingId && <span className="text-emerald-600 text-xs font-normal">(Opcional si no deseas cambiarlo)</span>}
                    </label>
                    <div className="flex items-center gap-3">
                      <FileText className="text-gray-400" size={24} />
                      <input 
                        type="file" accept="application/pdf" required={!editingId && !candidato.plan_gobierno_pdf_url}
                        onChange={e => setCandidato({...candidato, planPdfFile: e.target.files[0]})}
                        className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hoja de Vida {editingId && <span className="text-emerald-600 text-xs font-normal">(Opcional si no deseas cambiarla)</span>}
                    </label>
                    <div className="flex items-center gap-3">
                      <FileText className="text-gray-400" size={24} />
                      <input 
                        type="file" accept="application/pdf" required={!editingId && !candidato.hoja_vida_pdf_url}
                        onChange={e => setCandidato({...candidato, hojaVidaPdfFile: e.target.files[0]})}
                        className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* EQUIPO DE REGIDORES */}
              <div className="space-y-4 pt-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <h3 className="text-lg font-semibold text-emerald-700">Equipo de Regidores</h3>
                  <button 
                    type="button" 
                    onClick={addRegidor}
                    className="flex items-center gap-1 text-sm bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-200 transition"
                  >
                    <Plus size={16} /> Añadir Regidor
                  </button>
                </div>

                {regidores.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4 italic bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    No has añadido ningún regidor aún.
                  </p>
                )}

                <div className="space-y-4">
                  {regidores.map((reg, index) => (
                    <div key={reg.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200 relative shadow-sm">
                      <button 
                        type="button" 
                        onClick={() => removeRegidor(reg.id)}
                        className="absolute top-4 right-4 text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded-md"
                        title="Eliminar regidor"
                      >
                        <Trash2 size={16} />
                      </button>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-10">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del Regidor</label>
                          <input 
                            type="text" required
                            value={reg.nombre}
                            onChange={e => updateRegidor(reg.id, 'nombre', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Cargo (Ej. Primer Regidor)</label>
                          <input 
                            type="text" required
                            value={reg.cargo}
                            onChange={e => updateRegidor(reg.id, 'cargo', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Foto de Perfil {editingId && reg.image_url && <span className="text-emerald-600 font-normal">(Opcional)</span>}
                          </label>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-300">
                              {(reg.fotoPreview || reg.image_url) ? (
                                <img src={reg.fotoPreview || reg.image_url} alt="Preview" className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon className="text-gray-400" size={14} />
                              )}
                            </div>
                            <input 
                              type="file" accept="image/*" 
                              onChange={e => updateRegidor(reg.id, 'fotoFile', e.target.files[0])}
                              className="w-full text-sm text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Hoja de Vida (PDF) {editingId && reg.hoja_vida_pdf_url && <span className="text-emerald-600 font-normal">(Opcional)</span>}
                          </label>
                          <input 
                            type="file" accept="application/pdf" required={!reg.hoja_vida_pdf_url}
                            onChange={e => updateRegidor(reg.id, 'hojaVidaPdfFile', e.target.files[0])}
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SUBMIT */}
              <div className="pt-6 border-t">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-transform transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  {loading 
                    ? 'Subiendo archivos y procesando...' 
                    : (editingId ? 'Actualizar Candidato y Equipo' : 'Guardar Candidato y Equipo')}
                </button>
              </div>
            </form>

          </div>
        </div>
        </>
        ) : (
          <RevocacionesPanel />
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
