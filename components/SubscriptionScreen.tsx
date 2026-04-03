import React from 'react';
import { X, Check, PlayCircle, Heart, Star, Zap, Shield, Sparkles, Sprout, Glasses, LogIn, Lock } from 'lucide-react';
import { SubscriptionTier } from '../types';
import { useAuth } from '../contexts/AuthContext';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'stripe-buy-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'buy-button-id'?: string;
        'publishable-key'?: string;
        'client-reference-id'?: string;
        'customer-email'?: string;
      };
    }
  }
}

interface SubscriptionScreenProps {
  onClose: () => void;
  onSubscribe: (tier: SubscriptionTier) => void;
  onShowAbout: () => void;
}

const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({ onClose, onSubscribe, onShowAbout }) => {
  const { user, userData, setAuthModalOpen } = useAuth();
  const currentTier = userData?.subscriptionTier || 'free';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-500 overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-gray-900/90 border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col my-auto">
        
        {/* Header */}
        <div className="relative p-6 sm:p-8 border-b border-white/10 text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-emerald-500/20 opacity-50 pointer-events-none"></div>
          <button 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
            className="absolute top-4 right-4 md:top-6 md:right-6 text-gray-400 hover:text-white transition-colors z-[100] bg-black/50 p-2 rounded-full hover:bg-white/10 cursor-pointer pointer-events-auto"
          >
            <X size={24} />
          </button>
          
          <h2 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-emerald-400 mb-4 relative z-10">
            Desbloquea el Universo
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto text-sm sm:text-base relative z-10 mb-4">
            Experimenta la sinestesia completa con acceso a todas las geometrías sagradas, modos de realidad virtual y aumentada, y control total sobre la experiencia visual.
          </p>
          {!user && (
            <button 
              onClick={() => setAuthModalOpen(true)}
              className="relative z-10 inline-flex items-center gap-2 px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium transition-colors"
            >
              <LogIn size={18} />
              Iniciar Sesión para Suscribirse
            </button>
          )}
          {user && (
            <div className="relative z-10 inline-flex items-center gap-2 px-6 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Conectado como {user.email} (Nivel: {currentTier.toUpperCase()})
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 overflow-y-auto">
          
          {/* Contribution Button */}
          <div className="mb-10 text-center">
            <button 
              onClick={onShowAbout}
              className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-pink-500/20 to-orange-500/20 border border-pink-500/30 hover:border-pink-500/60 transition-all group"
            >
              <Heart className="w-5 h-5 text-pink-400 group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <span className="block text-sm font-bold text-pink-200">¿Cómo ayuda tu contribución?</span>
                <span className="block text-xs text-pink-300/80">Apoya el desarrollo y a la Fundación Starseed</span>
              </div>
            </button>
          </div>

          {/* Tiers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Free Tier */}
            <div className="bg-black/40 border border-white/10 rounded-2xl p-6 flex flex-col relative overflow-hidden group hover:border-white/20 transition-all">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-300 mb-2">Explorador</h3>
                <div className="text-3xl font-bold text-white mb-1">Gratis</div>
                <p className="text-xs text-gray-500">Acceso básico</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-start gap-2 text-sm text-gray-400"><Check size={16} className="text-gray-500 shrink-0 mt-0.5" /> Visualización de audio básica</li>
                <li className="flex items-start gap-2 text-sm text-gray-400"><Check size={16} className="text-gray-500 shrink-0 mt-0.5" /> Controles de color limitados</li>
                <li className="flex items-start gap-2 text-sm text-gray-400"><Check size={16} className="text-emerald-500 shrink-0 mt-0.5" /> Acceso manual a Geometría Sagrada y Perturbación</li>
                <li className="flex items-start gap-2 text-sm text-gray-400"><Check size={16} className="text-emerald-500 shrink-0 mt-0.5" /> Ajustes Automáticos: Aleatorio Total</li>
                <li className="flex items-start gap-2 text-sm text-gray-400"><Check size={16} className="text-emerald-500 shrink-0 mt-0.5" /> Piloto Automático: Génesis y Armónico</li>
                <li className="flex items-start gap-2 text-sm text-gray-500 opacity-60"><Lock size={14} className="text-yellow-500 shrink-0 mt-0.5" /> Piloto Automático: Deriva (Bloqueado)</li>
                <li className="flex items-start gap-2 text-sm text-gray-500 opacity-60"><Lock size={14} className="text-yellow-500 shrink-0 mt-0.5" /> Ajustes Automáticos Avanzados (Bloqueado)</li>
              </ul>
              <button 
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold transition-colors border border-white/10"
              >
                Continuar Gratis
              </button>
            </div>

            {/* Trial Tier */}
            <div className="bg-gradient-to-b from-cyan-900/40 to-black/40 border border-cyan-500/30 rounded-2xl p-6 flex flex-col relative overflow-hidden group hover:border-cyan-500/50 transition-all">
              <div className="absolute top-0 right-0 bg-cyan-500 text-black text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                Prueba
              </div>
              <div className="mb-4">
                <h3 className="text-xl font-bold text-cyan-300 mb-2">Viajero</h3>
                <div className="text-3xl font-bold text-white mb-1">1 Hora</div>
                <p className="text-xs text-cyan-500/80">Acceso completo temporal</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-start gap-2 text-sm text-gray-300"><Check size={16} className="text-cyan-400 shrink-0 mt-0.5" /> Todas las funciones Premium</li>
                <li className="flex items-start gap-2 text-sm text-gray-300"><Check size={16} className="text-cyan-400 shrink-0 mt-0.5" /> Geometría Sagrada</li>
                <li className="flex items-start gap-2 text-sm text-gray-300"><Check size={16} className="text-cyan-400 shrink-0 mt-0.5" /> Realidad Virtual y AR</li>
              </ul>
              <button 
                onClick={() => onSubscribe('trial')}
                disabled={!user || currentTier === 'trial' || currentTier === 'annual' || currentTier === 'lifetime'}
                className={`w-full py-3 rounded-xl font-semibold transition-colors border flex items-center justify-center gap-2 ${
                  !user || currentTier !== 'free'
                    ? 'bg-gray-800/50 text-gray-500 border-gray-700 cursor-not-allowed'
                    : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/50'
                }`}
              >
                <Zap size={18} /> {currentTier === 'trial' ? 'Prueba Activa' : 'Iniciar Prueba'}
              </button>
            </div>

            {/* Annual Tier */}
            <div className="bg-gradient-to-b from-purple-900/40 to-black/40 border border-purple-500/50 rounded-2xl p-6 flex flex-col relative overflow-hidden group hover:border-purple-500/70 transition-all transform md:-translate-y-2 shadow-[0_10px_30px_rgba(168,85,247,0.2)]">
              <div className="absolute top-0 right-0 bg-purple-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                Popular
              </div>
              <div className="mb-4">
                <h3 className="text-xl font-bold text-purple-300 mb-2">Creador</h3>
                <div className="text-3xl font-bold text-white mb-1">$369<span className="text-lg text-gray-400 font-normal"> MXN/año</span></div>
                <p className="text-xs text-purple-400/80">Facturado anualmente</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-start gap-2 text-sm text-gray-200"><Check size={16} className="text-purple-400 shrink-0 mt-0.5" /> Todas las funciones Premium</li>
                <li className="flex items-start gap-2 text-sm text-gray-200"><Check size={16} className="text-purple-400 shrink-0 mt-0.5" /> Geometría Sagrada Completa</li>
                <li className="flex items-start gap-2 text-sm text-gray-200"><Check size={16} className="text-purple-400 shrink-0 mt-0.5" /> Realidad Virtual y AR</li>
                <li className="flex items-start gap-2 text-sm text-gray-200"><Check size={16} className="text-purple-400 shrink-0 mt-0.5" /> Guardar presets ilimitados</li>
              </ul>
              {(!user || currentTier === 'annual' || currentTier === 'lifetime') ? (
                <button 
                  onClick={!user ? () => setAuthModalOpen(true) : undefined}
                  disabled={!!user}
                  className={`w-full py-3 rounded-xl font-bold transition-colors shadow-[0_0_15px_rgba(168,85,247,0.5)] flex items-center justify-center gap-2 ${
                    !user 
                      ? 'bg-purple-500 hover:bg-purple-600 text-white'
                      : 'bg-gray-800/50 text-gray-500 shadow-none cursor-not-allowed'
                  }`}
                >
                  <Star size={18} /> {!user ? 'Iniciar Sesión para Suscribirse' : (currentTier === 'annual' ? 'Suscrito' : 'Plan Inferior')}
                </button>
              ) : (
                <div className="flex justify-center w-full">
                  <stripe-buy-button
                    buy-button-id="buy_btn_1THXtjRxtUn1kHYyHQndXHxm"
                    publishable-key="pk_live_51THUSJRxtUn1kHYyi4JOokgXWyUSLqyZwqqWXgIHU2q3xn4N4o7rPtxxe6GPjqsVPu7FOwlRPSb8nzVz0Qk1vAc400GT4711QT"
                    client-reference-id={user.uid}
                    customer-email={user.email || undefined}
                  >
                  </stripe-buy-button>
                </div>
              )}
            </div>

            {/* Lifetime Tier */}
            <div className="bg-gradient-to-b from-emerald-900/40 to-black/40 border border-emerald-500/30 rounded-2xl p-6 flex flex-col relative overflow-hidden group hover:border-emerald-500/50 transition-all">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-emerald-300 mb-2">Maestro</h3>
                <div className="text-3xl font-bold text-white mb-1">$963<span className="text-lg text-gray-400 font-normal"> MXN</span></div>
                <p className="text-xs text-emerald-500/80">Pago único de por vida</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-start gap-2 text-sm text-gray-300"><Check size={16} className="text-emerald-400 shrink-0 mt-0.5" /> Acceso de por vida</li>
                <li className="flex items-start gap-2 text-sm text-gray-300"><Check size={16} className="text-emerald-400 shrink-0 mt-0.5" /> Todas las actualizaciones futuras</li>
                <li className="flex items-start gap-2 text-sm text-gray-300"><Check size={16} className="text-emerald-400 shrink-0 mt-0.5" /> Soporte prioritario</li>
              </ul>
              {(!user || currentTier === 'lifetime') ? (
                <button 
                  onClick={!user ? () => setAuthModalOpen(true) : undefined}
                  disabled={!!user}
                  className={`w-full py-3 rounded-xl font-semibold transition-colors border flex items-center justify-center gap-2 ${
                    !user 
                      ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/50'
                      : 'bg-gray-800/50 text-gray-500 border-gray-700 cursor-not-allowed'
                  }`}
                >
                  <Shield size={18} /> {!user ? 'Iniciar Sesión para Obtener' : 'Desbloqueado'}
                </button>
              ) : (
                <div className="flex justify-center w-full">
                  <stripe-buy-button
                    buy-button-id="buy_btn_1THXv8RxtUn1kHYynllQlH3N"
                    publishable-key="pk_live_51THUSJRxtUn1kHYyi4JOokgXWyUSLqyZwqqWXgIHU2q3xn4N4o7rPtxxe6GPjqsVPu7FOwlRPSb8nzVz0Qk1vAc400GT4711QT"
                    client-reference-id={user.uid}
                    customer-email={user.email || undefined}
                  >
                  </stripe-buy-button>
                </div>
              )}
            </div>

          </div>

          {/* Feature Previews */}
          <div className="mt-12 pt-8 border-t border-white/10">
            <h3 className="text-2xl font-bold text-center text-white mb-8">Descubre el Poder Premium</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-black/30 rounded-xl overflow-hidden border border-white/5 group">
                <div className="aspect-video bg-gray-800 relative flex items-center justify-center">
                  <PlayCircle className="w-12 h-12 text-white/50 group-hover:text-white/80 transition-colors" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                  <span className="absolute bottom-3 left-3 text-sm font-bold text-emerald-300 flex items-center gap-2"><Sprout size={14}/> Geometría Sagrada</span>
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-400">Desbloquea patrones matemáticos complejos como la Flor de la Vida y el Cubo de Metatrón, sincronizados perfectamente con tu música.</p>
                </div>
              </div>
              <div className="bg-black/30 rounded-xl overflow-hidden border border-white/5 group">
                <div className="aspect-video bg-gray-800 relative flex items-center justify-center">
                  <PlayCircle className="w-12 h-12 text-white/50 group-hover:text-white/80 transition-colors" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                  <span className="absolute bottom-3 left-3 text-sm font-bold text-purple-300 flex items-center gap-2"><Glasses size={14}/> Realidad Virtual</span>
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-400">Sumérgete en el sonido con el modo VR 3D. Explora portales infinitos y visualizaciones inmersivas que responden a cada latido.</p>
                </div>
              </div>
              <div className="bg-black/30 rounded-xl overflow-hidden border border-white/5 group">
                <div className="aspect-video bg-gray-800 relative flex items-center justify-center">
                  <PlayCircle className="w-12 h-12 text-white/50 group-hover:text-white/80 transition-colors" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                  <span className="absolute bottom-3 left-3 text-sm font-bold text-cyan-300 flex items-center gap-2"><Sparkles size={14}/> Auto-Pilot Deriva</span>
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-400">Deja que la IA tome el control total. El modo Deriva explora infinitas combinaciones creando evoluciones visuales asombrosas de forma autónoma.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SubscriptionScreen;
