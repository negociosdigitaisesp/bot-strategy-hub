/**
 * Serviço de notificação sonora compatível com desktop e mobile
 */
class AudioNotificationService {
  private audioContext: AudioContext | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private isInitialized = false;

  constructor() {
    this.initializeAudio();
  }

  private async initializeAudio() {
    try {
      // Tentar usar HTMLAudioElement primeiro (mais compatível)
      this.audioElement = new Audio('/notification-sound.mp3');
      this.audioElement.preload = 'auto';
      this.audioElement.volume = 0.7;
      
      // Preparar Web Audio API como fallback
      if (typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined') {
        const AudioContextClass = AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioContextClass();
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.warn('Erro ao inicializar áudio:', error);
    }
  }

  /**
   * Reproduz som de notificação
   * Funciona em desktop e mobile
   */
  async playNotification(): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeAudio();
    }

    try {
      // Método 1: HTMLAudioElement (mais compatível)
      if (this.audioElement) {
        this.audioElement.currentTime = 0;
        const playPromise = this.audioElement.play();
        
        if (playPromise !== undefined) {
          await playPromise;
          return;
        }
      }
    } catch (error) {
      console.warn('Erro ao reproduzir com HTMLAudioElement:', error);
    }

    try {
      // Método 2: Web Audio API (fallback)
      if (this.audioContext) {
        await this.playWithWebAudioAPI();
        return;
      }
    } catch (error) {
      console.warn('Erro ao reproduzir com Web Audio API:', error);
    }

    try {
      // Método 3: Som sintético (último recurso)
      await this.playSyntheticSound();
    } catch (error) {
      console.error('Falha em todos os métodos de reprodução de áudio:', error);
    }
  }

  private async playWithWebAudioAPI(): Promise<void> {
    if (!this.audioContext) return;

    // Retomar contexto se suspenso (necessário para mobile)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // Carregar e reproduzir arquivo de áudio
    try {
      const response = await fetch('/notification-sound.mp3');
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      source.start();
    } catch (error) {
      throw new Error('Erro ao reproduzir com Web Audio API: ' + error);
    }
  }

  private async playSyntheticSound(): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioContext não disponível');
    }

    // Retomar contexto se suspenso
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // Criar som sintético (beep)
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.5);
  }

  /**
   * Inicializa o áudio após interação do usuário (necessário para mobile)
   */
  async initializeAfterUserInteraction(): Promise<void> {
    try {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      if (this.audioElement) {
        // Reproduzir silenciosamente para "desbloquear" o áudio
        this.audioElement.volume = 0;
        const playPromise = this.audioElement.play();
        if (playPromise !== undefined) {
          await playPromise;
          this.audioElement.pause();
          this.audioElement.currentTime = 0;
          this.audioElement.volume = 0.7;
        }
      }
    } catch (error) {
      console.warn('Erro ao inicializar áudio após interação:', error);
    }
  }

  /**
   * Define o volume da notificação (0.0 a 1.0)
   */
  setVolume(volume: number): void {
    if (this.audioElement) {
      this.audioElement.volume = Math.max(0, Math.min(1, volume));
    }
  }
}

// Instância singleton
export const audioNotificationService = new AudioNotificationService();

// Hook para usar em componentes React
export const useAudioNotification = () => {
  const playNotification = async () => {
    await audioNotificationService.playNotification();
  };

  const initializeAudio = async () => {
    await audioNotificationService.initializeAfterUserInteraction();
  };

  const setVolume = (volume: number) => {
    audioNotificationService.setVolume(volume);
  };

  return {
    playNotification,
    initializeAudio,
    setVolume
  };
};