import React, { useState } from 'react';
import { X, Mail, Lock, LogIn, UserPlus, AlertCircle, Chrome } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setAuthModalOpen, loginWithGoogle } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      setAuthModalOpen(false);
      setEmail('');
      setPassword('');
    } catch (err: any) {
      console.error("Auth error:", err);
      // Map common firebase errors to user friendly messages
      switch(err.code) {
        case 'auth/invalid-email':
          setError('El correo electrónico no es válido.');
          break;
        case 'auth/user-disabled':
          setError('Esta cuenta ha sido deshabilitada.');
          break;
        case 'auth/user-not-found':
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
          setError('Correo o contraseña incorrectos.');
          break;
        case 'auth/email-already-in-use':
          setError('Ya existe un usuario con este correo electrónico.');
          break;
        case 'auth/weak-password':
          setError('La contraseña debe tener al menos 6 caracteres.');
          break;
        default:
          setError('Hubo un error al procesar tu solicitud. Intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8">
        
        {/* Close Button */}
        <button 
          onClick={() => setAuthModalOpen(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">
            {isLogin ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
          </h2>
          <p className="text-gray-400 text-sm">
            {isLogin 
              ? 'Ingresa tus datos para continuar.' 
              : 'Únete para guardar presets y sincronizar tus dispositivos.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-red-400 text-sm">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Correo Electrónico</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail size={16} className="text-gray-500" />
              </div>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-black/50 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="tu@correo.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Contraseña</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={16} className="text-gray-500" />
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-black/50 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
              loading 
                ? 'bg-cyan-500/50 text-white/50 cursor-not-allowed' 
                : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]'
            }`}
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></span>
            ) : isLogin ? (
              <><LogIn size={18} /> Iniciar Sesión</>
            ) : (
              <><UserPlus size={18} /> Registrarse</>
            )}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-gray-900 text-gray-500">O continuar con</span>
            </div>
          </div>

          <button 
            onClick={loginWithGoogle}
            type="button"
            className="mt-6 w-full flex items-center justify-center gap-2 py-2.5 bg-white text-gray-900 rounded-xl font-medium hover:bg-gray-100 transition-colors shadow-lg active:scale-95"
          >
            <Chrome size={18} />
            Google
          </button>

          {/* Native/Desktop Login Helper */}
          {((window as any).Capacitor?.isNative || navigator.userAgent.toLowerCase().includes('electron')) && (
            <div className="mt-4 p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-xl text-[10px] text-cyan-200/60 text-center flex flex-col gap-1 italic">
              <p>Si usas la versión descargada, Google se abrirá en tu navegador para mayor seguridad.</p>
              <button 
                onClick={() => window.open('https://audiomorphic-ar.firebaseapp.com/__/auth/handler', '_blank')}
                className="text-cyan-400 underline hover:text-cyan-300"
              >
                ¿Problemas con el inicio? Haz clic aquí
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-sm">
          <span className="text-gray-500">
            {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
          </span>
          <button 
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="ml-2 text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
          >
            {isLogin ? 'Regístrate' : 'Inicia Sesión'}
          </button>
        </div>

      </div>
    </div>
  );
};
