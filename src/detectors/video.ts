export class VideoDetector {
  public video: HTMLVideoElement;
  private stream: MediaStream | null = null;

  constructor() {
    this.video = Object.assign(document.createElement('video'), {
      autoplay: true,
      playsInline: true,
    });
  }

  public async initialize(): Promise<void> {
    try {
      document.body.appendChild(this.video);
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }

      this.stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      this.video.srcObject = this.stream;
      
      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        this.video.onloadedmetadata = () => {
          this.video.play()
            .then(() => resolve())
            .catch(reject);
        };
        this.video.onerror = () => reject(new Error('Video failed to load'));
      });
      
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  private handleError(error: any): void {
    let message = 'Failed to initialize camera';
    
    if (error.name === 'NotAllowedError') {
      message = 'Camera permission denied. Please allow camera access and reload.';
    } else if (error.name === 'NotFoundError') {
      message = 'No camera found. Please connect a camera and reload.';
    } else if (error.name === 'NotReadableError') {
      message = 'Camera is already in use by another application.';
    } else if (error.name === 'OverconstrainedError') {
      message = 'Camera does not support the requested resolution.';
    }
    
    console.error('VideoDetector error:', message, error);
    
    // Create user-friendly error display
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255, 0, 0, 0.9);
      color: white;
      padding: 15px 25px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      z-index: 10000;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    // Auto-remove after 10 seconds
    setTimeout(() => errorDiv.remove(), 10000);
  }

  public dispose(): void {
    // Stop all tracks
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    // Remove video element
    if (this.video.parentNode) {
      this.video.parentNode.removeChild(this.video);
    }
    
    // Clear video source
    this.video.srcObject = null;
  }
}
