export class SceneSelector {
  private shootButton: HTMLButtonElement;
  private drivingButton: HTMLButtonElement;
  private blurToggle: HTMLButtonElement;
  private blurOverlay: HTMLDivElement;
  private onSceneChange: ((scene: 'shoot' | 'driving') => void) | null = null;
  private isBlurred: boolean = false;
  
  constructor() {
    // Obtener elementos del DOM
    this.shootButton = document.getElementById('shoot-btn') as HTMLButtonElement;
    this.drivingButton = document.getElementById('driving-btn') as HTMLButtonElement;
    this.blurToggle = document.getElementById('blur-toggle') as HTMLButtonElement;
    this.blurOverlay = document.getElementById('blur-overlay') as HTMLDivElement;
    
    // Configurar event listeners
    this.shootButton.onclick = () => this.selectScene('shoot');
    this.drivingButton.onclick = () => this.selectScene('driving');
    this.blurToggle.onclick = () => this.toggleBlur();
  }
  
  
  private selectScene(scene: 'shoot' | 'driving'): void {
    // Update button states
    this.shootButton.classList.toggle('active', scene === 'shoot');
    this.drivingButton.classList.toggle('active', scene === 'driving');
    
    // Call callback
    if (this.onSceneChange) {
      this.onSceneChange(scene);
    }
  }
  
  public onSceneChangeCallback(callback: (scene: 'shoot' | 'driving') => void): void {
    this.onSceneChange = callback;
  }
  
  public setActiveScene(scene: 'shoot' | 'driving'): void {
    this.selectScene(scene);
  }
  
  private toggleBlur(): void {
    this.isBlurred = !this.isBlurred;
    this.blurOverlay.classList.toggle('active', this.isBlurred);
    this.blurToggle.classList.toggle('active', this.isBlurred);
  }
  
  public dispose(): void {
    // Limpiar event listeners
    this.shootButton.onclick = null;
    this.drivingButton.onclick = null;
    this.blurToggle.onclick = null;
    this.onSceneChange = null;
  }
}