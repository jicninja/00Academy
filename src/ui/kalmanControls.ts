import { KalmanPresets } from '../utils/kalmanFilter';

export type KalmanPresetName = keyof typeof KalmanPresets;

export class KalmanControls {
  private container: HTMLDivElement;
  private currentPreset: KalmanPresetName = 'SMOOTH';
  private onChangeCallback?: (preset: typeof KalmanPresets[KalmanPresetName]) => void;

  constructor() {
    this.container = this.createUI();
    document.body.appendChild(this.container);
  }

  private createUI(): HTMLDivElement {
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      background: rgba(0, 0, 0, 0.8);
      border: 2px solid #00ff00;
      border-radius: 10px;
      padding: 15px;
      font-family: 'Courier New', monospace;
      color: #00ff00;
      z-index: 1000;
      min-width: 250px;
    `;

    const title = document.createElement('div');
    title.textContent = '🎛️ Kalman Smoothing';
    title.style.cssText = `
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 10px;
      text-align: center;
      border-bottom: 1px solid #00ff00;
      padding-bottom: 5px;
    `;
    container.appendChild(title);

    // Crear botones para cada preset
    const presets: KalmanPresetName[] = ['VERY_SMOOTH', 'SMOOTH', 'BALANCED', 'RESPONSIVE', 'VERY_RESPONSIVE'];
    const labels = {
      VERY_SMOOTH: '🐌 Very Smooth',
      SMOOTH: '✨ Smooth',
      BALANCED: '⚖️ Balanced',
      RESPONSIVE: '⚡ Responsive',
      VERY_RESPONSIVE: '🚀 Very Fast'
    };

    presets.forEach(preset => {
      const button = document.createElement('button');
      button.textContent = labels[preset];
      button.dataset.preset = preset;
      button.style.cssText = `
        display: block;
        width: 100%;
        margin: 5px 0;
        padding: 8px;
        background: ${preset === this.currentPreset ? '#00ff00' : 'rgba(0, 255, 0, 0.1)'};
        color: ${preset === this.currentPreset ? '#000' : '#00ff00'};
        border: 1px solid #00ff00;
        border-radius: 5px;
        cursor: pointer;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        font-weight: bold;
        transition: all 0.2s;
      `;

      button.addEventListener('mouseenter', () => {
        if (preset !== this.currentPreset) {
          button.style.background = 'rgba(0, 255, 0, 0.3)';
        }
      });

      button.addEventListener('mouseleave', () => {
        if (preset !== this.currentPreset) {
          button.style.background = 'rgba(0, 255, 0, 0.1)';
        }
      });

      button.addEventListener('click', () => {
        this.setPreset(preset);
      });

      container.appendChild(button);
    });

    // Descripción
    const description = document.createElement('div');
    description.style.cssText = `
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #00ff00;
      font-size: 10px;
      text-align: center;
      opacity: 0.7;
    `;
    description.innerHTML = `
      Current: <strong>${labels[this.currentPreset]}</strong><br>
      <span style="font-size: 9px;">Press H to toggle this panel</span>
    `;
    description.id = 'kalman-description';
    container.appendChild(description);

    return container;
  }

  public setPreset(preset: KalmanPresetName): void {
    this.currentPreset = preset;

    // Actualizar estilos de botones
    const buttons = this.container.querySelectorAll('button');
    buttons.forEach(button => {
      const buttonPreset = button.dataset.preset as KalmanPresetName;
      if (buttonPreset === preset) {
        button.style.background = '#00ff00';
        button.style.color = '#000';
      } else {
        button.style.background = 'rgba(0, 255, 0, 0.1)';
        button.style.color = '#00ff00';
      }
    });

    // Actualizar descripción
    const description = this.container.querySelector('#kalman-description');
    if (description) {
      const labels = {
        VERY_SMOOTH: '🐌 Very Smooth',
        SMOOTH: '✨ Smooth',
        BALANCED: '⚖️ Balanced',
        RESPONSIVE: '⚡ Responsive',
        VERY_RESPONSIVE: '🚀 Very Fast'
      };
      description.innerHTML = `
        Current: <strong>${labels[preset]}</strong><br>
        <span style="font-size: 9px;">Press H to toggle this panel</span>
      `;
    }

    // Llamar callback si existe
    if (this.onChangeCallback) {
      this.onChangeCallback(KalmanPresets[preset]);
    }
  }

  public onChange(callback: (preset: typeof KalmanPresets[KalmanPresetName]) => void): void {
    this.onChangeCallback = callback;
  }

  public toggle(): void {
    if (this.container.style.display === 'none') {
      this.container.style.display = 'block';
    } else {
      this.container.style.display = 'none';
    }
  }

  public dispose(): void {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
