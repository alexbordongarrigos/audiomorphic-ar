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
      const isMac = navigator.userAgent.includes('Mac') || navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      
      console.log("Detectando entorno de captura:", { isElectron, isCapacitor, isMac, isSecure: window.isSecureContext });

      if (sourceType === 'system') {
        if (isCapacitor) {
           throw new Error("LIMITACIÓN NATIVA: Capacitor (Android/iOS) no permite capturar el audio del sistema de otras aplicaciones por seguridad.");
        } else if (isElectron && !isMac) {
           // WINDOWS ELECTRON
           console.log("Windows Electron: Iniciando captura nativa desktopCapturer...");
           try {
             const sources = await (window as any).electronAPI.getDesktopSources();
             const source = sources.find((s: any) => s.id.includes('screen') || s.name.toLowerCase().includes('system')) || sources[0];
             if (!source) throw new Error("No se encontraron pantallas para captura.");
             
             stream = await navigator.mediaDevices.getUserMedia({
               audio: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: source.id } } as any,
               video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: source.id } } as any
             });
           } catch (electronErr: any) {
             console.warn("Fallo desktopCapturer. Intentando getDisplayMedia...", electronErr);
             stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: true });
           }
        } else {
           // MAC ELECTRON, MAC WEB, WINDOWS WEB
           console.log("Web / Mac: Iniciando captura de pantalla/pestaña...");
           try {
             stream = await (navigator.mediaDevices as any).getDisplayMedia({
                 video: { frameRate: { max: 30 } },
                 audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
             });
             if (stream && stream.getAudioTracks().length === 0) {
                 stream.getTracks().forEach((t:any) => t.stop());
                 if (isElectron && isMac) {
                    throw new Error("LIMITACIÓN DE APPLE: macOS bloquea nativamente la captura del audio interno. Escoja 'Micrófono' en su lugar, o instale una extensión como BlackHole.");
                 } else {
                    throw new Error("CAPTURA BLOQUEADA: Asegúrese de marcar la casilla 'Compartir audio del sistema' en la ventana emergente.");
                 }
             }
           } catch (err: any) {
             console.error("Fallo inicial en getDisplayMedia, intentando configuración mínima...", err);
             // Solo reintentamos si no es nuestro propio error detallado
             if (err.message && err.message.includes('LIMITACIÓN DE APPLE')) throw err;
             
             try {
                stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: true });
                if (stream && stream.getAudioTracks().length === 0) {
                   stream.getTracks().forEach((t:any) => t.stop());
                   if (isElectron && isMac) throw new Error("LIMITACIÓN DE APPLE: macOS bloquea la captura de audio interno. Use opción 'Micrófono'.");
                   throw new Error("CAPTURA BLOQUEADA: No se detectó canal de audio.");
                }
             } catch (retryErr: any) {
                if (retryErr.message && retryErr.message.includes('LIMITACIÓN DE APPLE')) throw retryErr;
                throw new Error("CAPTURA CANCELADA O NO SOPORTADA: Verifique permisos de 'Grabación de pantalla' en Ajustes de su sistema.");
             }
           }
        }

        if (!stream) throw new Error("No se pudo iniciar la captura de audio.");

        // Detener video de la captura de pantalla inmediatamente
        if (stream.getVideoTracks) {
           stream.getVideoTracks().forEach(track => track.stop());
        }
        
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
           stream.getTracks().forEach(t => t.stop());
           throw new Error("ERROR DE SEÑAL: No se detectó audio del dispositivo. Recuerde activar 'Compartir audio' en los diálogos del sistema.");
        }
        console.log("Captura de dispositivo iniciada con éxito. Tracks:", audioTracks.length);
      } else {
        console.log("Iniciando captura de micrófono...");
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            deviceId: deviceId || selectedDeviceId ? { exact: deviceId || selectedDeviceId } : undefined,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
      }
      
      if (!stream || stream.getAudioTracks().length === 0) {
        throw new Error("No se pudo obtener una señal de audio válida.");
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