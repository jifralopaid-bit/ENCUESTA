import React, { useState, useEffect } from 'react';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, RefreshCw, Users, Shield, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

const PadronElectoralPanel = () => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState({ text: '', type: '' });
  
  const [auditData, setAuditData] = useState([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [auditError, setAuditError] = useState('');

  useEffect(() => {
    fetchAuditData();
  }, []);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && (selected.name.endsWith('.csv') || selected.name.endsWith('.xlsx'))) {
      setFile(selected);
      setUploadMessage({ text: '', type: '' });
    } else {
      setFile(null);
      setUploadMessage({ text: 'Por favor, selecciona un archivo .csv o .xlsx válido.', type: 'error' });
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setIsUploading(true);
    setUploadMessage({ text: 'Encriptando y subiendo padrón... esto puede tardar unos minutos para padrones grandes.', type: 'info' });
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/padron/upload`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setUploadMessage({ text: `¡Padrón actualizado exitosamente! ${data.registros_procesados || ''} registros procesados.`, type: 'success' });
        setFile(null);
        // Reset file input visually
        const fileInput = document.getElementById('padron-file-upload');
        if (fileInput) fileInput.value = '';
      } else {
        setUploadMessage({ text: data.detail || 'Error al subir el archivo.', type: 'error' });
      }
    } catch (error) {
      console.error('Error:', error);
      setUploadMessage({ text: 'Error de conexión con el servidor.', type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const fetchAuditData = async () => {
    setIsLoadingAudit(true);
    setAuditError('');
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/padron/audit`);
      if (!response.ok) {
        throw new Error('Error obteniendo datos de auditoría');
      }
      const data = await response.json();
      setAuditData(data || []);
    } catch (error) {
      console.error('Audit fetch error:', error);
      setAuditError('No se pudo cargar el registro de participación. Reintente más tarde.');
    } finally {
      setIsLoadingAudit(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Desconocida';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('es-PE', { 
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* SECCIÓN 1: CARGA DE PADRÓN */}
      <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
        <div className="p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6 border-b pb-4">
            <div className="bg-emerald-100 p-3 rounded-xl">
              <Shield className="text-emerald-700" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Actualizar Padrón Electoral</h2>
              <p className="text-sm text-gray-500">
                Sube el archivo CSV o Excel oficial. Todos los datos personales serán encriptados antes de guardarse en la base de datos (AES-256).
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="flex-1 w-full">
              <label 
                htmlFor="padron-file-upload" 
                className={`relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                  file ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-emerald-400'
                } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {/* Vista con archivo seleccionado */}
                  <div className={`flex-col items-center text-center ${file ? 'flex' : 'hidden'}`}>
                    <FileText className="w-10 h-10 mb-3 text-emerald-600" />
                    <p className="mb-2 text-sm text-emerald-800 font-semibold">{file ? file.name : ''}</p>
                    <p className="text-xs text-emerald-600">{file ? (file.size / 1024 / 1024).toFixed(2) : '0'} MB</p>
                  </div>
                  
                  {/* Vista sin archivo */}
                  <div className={`flex-col items-center text-center ${!file ? 'flex' : 'hidden'}`}>
                    <Upload className="w-10 h-10 mb-3 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold text-emerald-600">Haz clic para subir</span> o arrastra y suelta
                    </p>
                    <p className="text-xs text-gray-400">CSV o XLSX (Columnas requeridas: DNI, Nombre)</p>
                  </div>
                </div>
                <input 
                  id="padron-file-upload" 
                  type="file" 
                  accept=".csv,.xlsx" 
                  className="hidden" 
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
              </label>
            </div>

            <div className="w-full md:w-1/3 flex flex-col gap-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <p className="font-semibold mb-1 flex items-center gap-1"><AlertCircle size={16}/> Importante</p>
                <p className="text-xs">
                  Esta acción actualizará el padrón. Si un DNI ya existe, se ignorará o actualizará para mantener el registro único. El archivo debe contener al menos <strong>DNI</strong> y <strong>Nombre</strong>.
                </p>
              </div>

              <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="w-full py-3 px-4 flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold transition-all disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                <span className={`items-center gap-2 ${isUploading ? 'flex' : 'hidden'}`}>
                  <Loader2 className="animate-spin" size={18} /> Procesando...
                </span>
                <span className={`items-center gap-2 ${!isUploading ? 'flex' : 'hidden'}`}>
                  <Upload size={18} /> Cargar Padrón Encriptado
                </span>
              </button>
            </div>
          </div>

          <div className={`mt-4 p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${uploadMessage.text ? 'block' : 'hidden'} ${
            uploadMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
            uploadMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            <div className={uploadMessage.type === 'error' ? 'block' : 'hidden'}><AlertCircle size={18}/></div>
            <div className={uploadMessage.type !== 'error' ? 'block' : 'hidden'}><CheckCircle size={18}/></div>
            <span>{uploadMessage.text}</span>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: AUDITORÍA DE PARTICIPACIÓN */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[500px]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Users className="text-blue-700" size={20} />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Registro de Participación (Auditoría)</h2>
          </div>
          <button 
            onClick={fetchAuditData}
            disabled={isLoadingAudit}
            className="flex items-center gap-2 text-sm bg-white border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors text-gray-700 shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoadingAudit ? "animate-spin" : ""} />
            Actualizar
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-white">
          {isLoadingAudit ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Loader2 className="animate-spin mb-2" size={32} />
              <p className="text-sm">Desencriptando registros de auditoría...</p>
            </div>
          ) : auditError ? (
            <div className="flex flex-col items-center justify-center h-full text-red-500">
              <AlertCircle size={32} className="mb-2" />
              <p className="text-sm">{auditError}</p>
            </div>
          ) : auditData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Users size={32} className="mb-2 opacity-50" />
              <p className="text-sm">Aún no hay ciudadanos que hayan emitido su voto.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 shadow-sm">
                <tr>
                  <th scope="col" className="px-6 py-4 font-semibold">DNI</th>
                  <th scope="col" className="px-6 py-4 font-semibold">Nombre Completo</th>
                  <th scope="col" className="px-6 py-4 font-semibold flex items-center gap-1">
                    <Clock size={14}/> Hora de Sufragio
                  </th>
                </tr>
              </thead>
              <tbody>
                {auditData.map((row, idx) => (
                  <tr key={idx} className="border-b hover:bg-emerald-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-900">
                      {row.dni}
                    </td>
                    <td className="px-6 py-3 uppercase">
                      {row.nombres}
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {formatDate(row.fecha_voto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="p-3 border-t bg-gray-50 text-xs text-gray-500 flex justify-between items-center">
          <span>Total participantes: <strong>{auditData.length}</strong></span>
          <span className="flex items-center gap-1"><Shield size={12}/> Desencriptado en memoria (Solo lectura)</span>
        </div>
      </div>
      
    </div>
  );
};

export default PadronElectoralPanel;
