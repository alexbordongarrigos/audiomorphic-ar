import { useEffect, useRef, useState, useCallback } from 'react';

export const useAudioAnalyzer = () => {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  useEffect(() => {
    const getDevices = async () => {
      try {
        const devs = await navigator.mediaDevices.enumerateDevices();
        const audioDevs = devs.filter(d => d.kind === 'audioinput');
        setDevices(audioDevs);
        if (audioDevs.length > 0 && !selectedDeviceId) {
           setSelectedDeviceId(audioDevs[0].deviceId);
        }
      } catch (e) {}
    };
    getDevices();
    // Re-check when devices change
    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', getDevices);
  }, [selectedDeviceId]);

  const startAudio = async (sourceType: 'microphone' | 'system' = 'microphone', deviceId?: string) => {
    try {
      setError(null);
      console.log(`Iniciando captura de audio: ${sourceType}...`);
      
      // Detener pistas anteriores si existen
      if (sourceRef.current) {
        if (sourceRef.current.mediaStream) {
          sourceRef.current.mediaStream.getTracks().forEach(t => t.stop());
        }
        sourceRef.current.disconnect();
      }

      // Asegurar inicialización de AudioContext
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
          latencyHint: 'interactive' // 'high' no es un valor válido. 'interactive' es el estándar para visualizadores.
        });
      }

      // El contexto DEBE reanudarse por interacción del usuario
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      let stream: MediaStream;
      const isElectron = (window as any).electronAPI !== undefined;
      const isCapacitor = (window as any).Capacitor?.isNative;
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const isMac = navigator.userAgent.includes('Mac') || navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      
      console.log("Detectando entorno de captura:", { isElectron, isCapacitor, isMobile, isMac, isSecure: window.isSecureContext });
      
      // Forzar micrófono en móviles
      let actualSourceType = sourceType;
      if (isMobile && !isCapacitor) {
        console.log("Móvil detectado: Forzando captura a Micrófono (getDisplayMedia no soportado).");
        actualSourceType = 'microphone';
      }

      if (actualSourceType === 'system') {
        if (isCapacitor) {
           throw new Error("LIMITACIÓN ANDROID: Google prohíbe capturar audio de otras apps por seguridad. Use 'Micrófono'.");
        } else if (isElectron) {
           console.log("Electron: Iniciando captura...");
           try {
             if (isMac) {
               const screenStatus = await (window as any).electronAPI.getMediaAccessStatus('screen');
               if (screenStatus === 'denied') {
                  throw new Error("ERROR DE PERMISOS (macOS): Active 'Grabación de Pantalla' y REINICIE la app.");
               }
             }
             const sources = await (window as any).electronAPI.getDesktopSources();
             const source = sources.find((s: any) => s.id.includes('screen') || s.name.toLowerCase().includes('system')) || sources[0];
             stream = await navigator.mediaDevices.getUserMedia({
               audio: { 
                 mandatory: { 
                   chromeMediaSource: 'desktop', 
                   chromeMediaSourceId: source.id,
                   echoCancellation: false,
                   noiseSuppression: false,
                   autoGainControl: false 
                 } 
               } as any,
               video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: source.id } } as any
             });
           } catch (err: any) {
             if (err.message && err.message.includes('PERMISOS')) throw err;
             try {
                // Forzar solo audio de sistema (no microphone)
                stream = await (navigator.mediaDevices as any).getDisplayMedia({ 
                  video: true, 
                  audio: { 
                    echoCancellation: false, 
                    noiseSuppression: false,
                    autoGainControl: false,
                    suppressLocalAudioPlayback: false 
                  } 
                });
             } catch (gdmErr) { throw new Error("CAPTURA CANCELADA: Verifique permisos."); }
           }
        } else {
           // Versión Web (Vercel)
           stream = await (navigator.mediaDevices as any).getDisplayMedia({ 
             video: true, 
             audio: { 
               echoCancellation: false,
               noiseSuppression: false,
               autoGainControl: false,
               suppressLocalAudioPlayback: false
             } 
           });
        }

        if (!stream) throw new Error("No se pudo iniciar la captura de audio.");

        // Detener video de la captura de pantalla inmediatamente para ahorrar recursos
        if (stream.getVideoTracks) {
           stream.getVideoTracks().forEach(track => track.stop());
        }
        
        const audioTracks = stream.getAudioTracks();
        
        // VALIDACIÓN CRUCIAL: Filtrar si el navegador coló un micrófono en vez de audio de sistema
        const systemAudioTrack = audioTracks.find(t => !t.label.toLowerCase().includes('mic') && !t.label.toLowerCase().includes('maestro'));
        const finalTrack = systemAudioTrack || audioTracks[0];

        if (!audioTracks.length) {
           stream.getTracks().forEach(t => t.stop());
           throw new Error("ERROR DE SEÑAL: No se detectó audio del dispositivo. Recuerde marcar la casilla 'Compartir audio' (Share Audio) en el selector de pantalla del sistema.");
        }

        // Si detectamos que el track es un micrófono por su nombre (label) pero pedimos sistema
        if (finalTrack && (finalTrack.label.toLowerCase().includes('mic') || finalTrack.label.toLowerCase().includes('micro'))) {
           console.warn("Advertencia: El track detectado parece ser un micrófono:", finalTrack.label);
           // No lanzamos error aún, pero lo logueamos para debug
        }

        console.log("Captura de dispositivo iniciada con éxito. Track usado:", finalTrack?.label || 'Desconocido');
      } else {
        console.log("Iniciando captura de micrófono...");
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            } 
          });
        } catch (micErr) {
          console.warn("Fallo micro genérico, intentando con ID...", micErr);
          stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              deviceId: deviceId || selectedDeviceId ? { exact: deviceId || selectedDeviceId } : undefined
            } 
          });
        }
      }
      
      if (!stream || stream.getAudioTracks().length === 0) {
        throw new Error("No se pudo obtener una señal de audio válida. Verifique permisos.");
      }

      // Re-asegurar que el contexto esté activo (especialmente en iOS Safari)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.8;

      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);

      dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      console.log("Analizador de audio ACTIVADO y FUNCIONAL.");
      setIsActive(true);
    } catch (err: any) {
      console.error("Audio Start Error:", err);
      let errorMessage = "Error al activar el audio.";
      const name = err?.name || '';
      const msg = err?.message || '';

      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        errorMessage = "PERMISO DENEGADO: Por favor, desbloquea el micrófono en el candado de la barra de direcciones.";
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        errorMessage = "ERROR: No se detectó hardware de audio.";
      } else if (msg.includes('display-capture') || name === 'AbortError' || name === 'NotReadableError' || name === 'NotSupportedError') {
        errorMessage = "CAPTURA BLOQUEADA O NO SOPORTADA: Asegúrese de marcar 'Compartir audio' y verifique que la app tenga permisos de 'Grabación de pantalla' en los Ajustes de macOS.";
      } else if (msg) {
        errorMessage = msg;
      }
      
      setError(errorMessage);
      setIsActive(false);
      setTimeout(() => setError(null), 10000); // 10s para leer bien el error
    }
  };

  const stopAudio = () => {
    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }
    setIsActive(false);
  };

  const getAudioMetrics = useCallback((sensitivity: number, freqRange: number): { volume: number, frequency: number, bass: number, mid: number, treble: number } => {
    if (!analyserRef.current || !dataArrayRef.current || !isActive) {
      return { volume: 0, frequency: 0, bass: 0, mid: 0, treble: 0 };
    }

    (analyserRef.current as any).getByteFrequencyData(dataArrayRef.current as any);

    // Limit range to relevant frequencies (mostly bass/mids for visuals)
    const rangeLimit = Math.floor(dataArrayRef.current.length * freqRange);
    
    let totalMagnitude = 0;
    let weightedFrequencySum = 0;
    
    let bassSum = 0, midSum = 0, trebleSum = 0;
    let bassCount = 0, midCount = 0, trebleCount = 0;
    
    for (let i = 0; i < rangeLimit; i++) {
      const val = dataArrayRef.current[i];
      // Noise gate
      if (val > 25) { 
        totalMagnitude += val;
        weightedFrequencySum += i * val;
      }
      
      // Calculate frequency bands (approximate based on 1024 bins for ~22kHz)
      // Bin size is ~21.5 Hz
      if (i > 0 && i <= 12) { // 20Hz - 250Hz
        bassSum += val;
        bassCount++;
      } else if (i > 12 && i <= 93) { // 250Hz - 2000Hz
        midSum += val;
        midCount++;
      } else if (i > 93 && i <= 930) { // 2000Hz - 20000Hz
        trebleSum += val;
        trebleCount++;
      }
    }

    const average = rangeLimit > 0 ? totalMagnitude / rangeLimit : 0;
    const volume = Math.min((average / 50) * sensitivity, 1.0); 

    let frequency = 0;
    if (totalMagnitude > 0) {
      const centroidBin = weightedFrequencySum / totalMagnitude;
      frequency = centroidBin / rangeLimit;
    }
    
    const bass = bassCount > 0 ? Math.min((bassSum / bassCount / 255) * sensitivity * 1.5, 1.0) : 0;
    const mid = midCount > 0 ? Math.min((midSum / midCount / 255) * sensitivity * 1.5, 1.0) : 0;
    const treble = trebleCount > 0 ? Math.min((trebleSum / trebleCount / 255) * sensitivity * 1.5, 1.0) : 0;

    return { volume, frequency, bass, mid, treble };
  }, [isActive]);

  return {
    isActive,
    error,
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    startAudio,
    stopAudio,
    getAudioMetrics
  };
};