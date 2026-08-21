import React, { useState, useEffect } from 'react';
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { supabase } from '../lib/supabase';
import { Smartphone, CheckCircle, Loader2, AlertCircle, Save } from 'lucide-react';

const API_ID = 2040;
const API_HASH = 'b18441a1ff607e10a989891a5462e627';

const TelegramConfig = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  
  const [step, setStep] = useState('CHECKING'); // CHECKING, ENTER_PHONE, ENTER_CODE, CONNECTED
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [client, setClient] = useState(null);

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('candidatos')
        .select('proposal')
        .eq('name', '___telegram_session___')
        .single();
      
      if (data && data.proposal) {
        setStep('CONNECTED');
      } else {
        setStep('ENTER_PHONE');
      }
    } catch (e) {
      console.log("No session found or error:", e);
      setStep('ENTER_PHONE');
    }
    setLoading(false);
  };

  const initClient = () => {
    if (client) return client;
    const stringSession = new StringSession(''); 
    const newClient = new TelegramClient(stringSession, API_ID, API_HASH, {
      connectionRetries: 5,
    });
    setClient(newClient);
    return newClient;
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const tgClient = initClient();
      await tgClient.connect();
      
      const { phoneCodeHash } = await tgClient.sendCode(
        {
          apiId: API_ID,
          apiHash: API_HASH,
        },
        phoneNumber
      );
      
      setPhoneCodeHash(phoneCodeHash);
      setStep('ENTER_CODE');
    } catch (e) {
      console.error(e);
      setError(e.message || 'Error al enviar código SMS.');
    }
    setLoading(false);
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (!client) throw new Error("Cliente no inicializado");
      
      await client.invoke(
        new Api.auth.SignIn({
          phoneNumber: phoneNumber,
          phoneCodeHash: phoneCodeHash,
          phoneCode: phoneCode,
        })
      );
      
      // Guardar sesión
      const sessionString = client.session.save();
      
      const { data: existing } = await supabase.from('candidatos').select('id').eq('name', '___telegram_session___').single();
      
      if (existing) {
        await supabase.from('candidatos').update({ proposal: sessionString }).eq('id', existing.id);
      } else {
        await supabase.from('candidatos').insert({ name: '___telegram_session___', proposal: sessionString });
      }
      
      setStep('CONNECTED');
      
    } catch (e) {
      console.error(e);
      setError(e.message || 'Código incorrecto o expirado.');
    }
    setLoading(false);
  };

  const handleDisconnect = async () => {
    if (window.confirm("¿Estás seguro de desconectar el Bot de Telegram? Los usuarios no podrán votar hasta que conectes uno nuevo.")) {
      setLoading(true);
      await supabase.from('candidatos').delete().eq('name', '___telegram_session___');
      if (client) await client.disconnect();
      setClient(null);
      setPhoneNumber('');
      setPhoneCode('');
      setStep('ENTER_PHONE');
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden mb-8">
      <div className="p-6 md:p-8">
        <h2 className="text-xl font-bold text-emerald-800 mb-6 flex items-center gap-2">
          <Smartphone size={24} />
          Conexión de Telegram (Bot Validador)
        </h2>
        
        {step === 'CHECKING' && (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="animate-spin" size={20} /> Comprobando estado...
          </div>
        )}

        {step === 'CONNECTED' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
            <div className="flex justify-center mb-3 text-emerald-600">
              <CheckCircle size={48} />
            </div>
            <h3 className="text-lg font-bold text-emerald-800 mb-2">Bot de Telegram Conectado</h3>
            <p className="text-emerald-700 text-sm mb-6">
              El sistema está listo para validar DNI de forma automática a través de Telegram.
            </p>
            <button 
              onClick={handleDisconnect}
              disabled={loading}
              className="bg-red-100 text-red-700 hover:bg-red-200 font-semibold px-4 py-2 rounded-lg text-sm transition"
            >
              {loading ? 'Desconectando...' : 'Desconectar Cuenta'}
            </button>
          </div>
        )}

        {step === 'ENTER_PHONE' && (
          <form onSubmit={handleSendCode} className="max-w-md space-y-4">
            <p className="text-gray-600 text-sm">
              Para validar los DNI, necesitamos conectar una cuenta de Telegram que interactúe con el Bot de RENIEC. Ingresa el número con el código de país.
            </p>
            
            {error && <div className="text-red-600 bg-red-50 p-3 rounded-lg text-sm flex items-center gap-2"><AlertCircle size={16}/> {error}</div>}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número de Teléfono</label>
              <input 
                type="text" 
                required
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                placeholder="+51999888777"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg transition disabled:opacity-70"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : 'Enviar Código SMS'}
            </button>
          </form>
        )}

        {step === 'ENTER_CODE' && (
          <form onSubmit={handleVerifyCode} className="max-w-md space-y-4">
            <p className="text-gray-600 text-sm">
              Hemos enviado un código a tu cuenta de Telegram al número <span className="font-bold">{phoneNumber}</span>.
            </p>
            
            {error && <div className="text-red-600 bg-red-50 p-3 rounded-lg text-sm flex items-center gap-2"><AlertCircle size={16}/> {error}</div>}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código de Verificación</label>
              <input 
                type="text" 
                required
                value={phoneCode}
                onChange={e => setPhoneCode(e.target.value)}
                placeholder="12345"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-center tracking-widest text-lg font-bold"
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg transition disabled:opacity-70"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18}/>}
              Verificar e Iniciar Sesión
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

export default TelegramConfig;
