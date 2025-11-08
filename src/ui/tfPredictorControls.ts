/**
 * Panel de control para ajustar parámetros del TensorFlow Hand Predictor
 */
export class TFPredictorControls {
  private container: HTMLDivElement;
  private isVisible = true;

  // Configuración actual
  public config = {
    noiseThreshold: 5,      // Píxeles - movimientos menores se ignoran
    smoothingWindow: 8,     // Frames para suavizado
    smoothingFactor: 0.7,   // Factor de suavidad (0-1)
    historySize: 20,        // Tamaño del historial
  };

  private onChangeCallback?: (config: typeof this.config) => void;

  constructor() {
    this.container = this.createUI();
    document.body.appendChild(this.container);
  }

  private createUI(): HTMLDivElement {
    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 20px;
      background: rgba(0, 0, 0, 0.9);
      border: 2px solid #00ff00;
      border-radius: 10px;
      padding: 15px;
      font-family: 'Courier New', monospace;
      color: #00ff00;
      z-index: 1000;
      min-width: 320px;
      box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
    `;

    // Título
    const title = document.createElement('div');
    title.textContent = '🎛️ TensorFlow Predictor Settings';
    title.style.cssText = `
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 15px;
      text-align: center;
      border-bottom: 1px solid #00ff00;
      padding-bottom: 8px;
      text-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
    `;
    container.appendChild(title);

    // Crear controles deslizantes
    this.createSlider(container, 'Noise Threshold', 'noiseThreshold', 0, 20, 1, 'px',
      'Ignora movimientos menores a N píxeles');

    this.createSlider(container, 'Smoothing Window', 'smoothingWindow', 3, 15, 1, 'frames',
      'Cuántos frames usar para suavizado');

    this.createSlider(container, 'Smoothing Factor', 'smoothingFactor', 0.1, 1.0, 0.1, '',
      'Qué tan suave (menor = más suave)');

    this.createSlider(container, 'History Size', 'historySize', 10, 40, 5, 'frames',
      'Tamaño del historial de posiciones');

    // Presets rápidos
    const presetsTitle = document.createElement('div');
    presetsTitle.textContent = 'Quick Presets';
    presetsTitle.style.cssText = `
      font-size: 12px;
      margin-top: 15px;
      margin-bottom: 8px;
      opacity: 0.8;
    `;
    container.appendChild(presetsTitle);

    const presets = [
      { name: '🐌 Ultra Smooth', config: { noiseThreshold: 10, smoothingWindow: 12, smoothingFactor: 0.5, historySize: 30 } },
      { name: '✨ Smooth', config: { noiseThreshold: 5, smoothingWindow: 8, smoothingFactor: 0.7, historySize: 20 } },
      { name: '⚖️ Balanced', config: { noiseThreshold: 3, smoothingWindow: 6, smoothingFactor: 0.8, historySize: 15 } },
      { name: '⚡ Responsive', config: { noiseThreshold: 1, smoothingWindow: 4, smoothingFactor: 0.9, historySize: 10 } },
    ];

    presets.forEach(preset => {
      const button = document.createElement('button');
      button.textContent = preset.name;
      button.style.cssText = `
        display: block;
        width: 100%;
        margin: 4px 0;
        padding: 6px;
        background: rgba(0, 255, 0, 0.1);
        color: #00ff00;
        border: 1px solid #00ff00;
        border-radius: 4px;
        cursor: pointer;
        font-family: 'Courier New', monospace;
        font-size: 11px;
        transition: all 0.2s;
      `;

      button.addEventListener('mouseenter', () => {
        button.style.background = 'rgba(0, 255, 0, 0.3)';
        button.style.boxShadow = '0 0 10px rgba(0, 255, 0, 0.4)';
      });

      button.addEventListener('mouseleave', () => {
        button.style.background = 'rgba(0, 255, 0, 0.1)';
        button.style.boxShadow = 'none';
      });

      button.addEventListener('click', () => {
        this.applyPreset(preset.config);
      });

      container.appendChild(button);
    });

    // Footer con instrucciones
    const footer = document.createElement('div');
    footer.style.cssText = `
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid rgba(0, 255, 0, 0.3);
      font-size: 9px;
      text-align: center;
      opacity: 0.6;
    `;
    footer.innerHTML = `Press <strong>H</strong> to toggle this panel`;
    container.appendChild(footer);

    return container;
  }

  private createSlider(
    container: HTMLElement,
    label: string,
    key: keyof typeof this.config,
    min: number,
    max: number,
    step: number,
    unit: string,
    tooltip: string
  ): void {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      margin-bottom: 12px;
    `;

    const labelDiv = document.createElement('div');
    labelDiv.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
      font-size: 11px;
    `;

    const labelText = document.createElement('span');
    labelText.textContent = label;
    labelText.title = tooltip;
    labelText.style.cursor = 'help';

    const valueDisplay = document.createElement('span');
    valueDisplay.id = `value-${key}`;
    valueDisplay.textContent = `${this.config[key]}${unit}`;
    valueDisplay.style.cssText = `
      color: #00ffff;
      font-weight: bold;
    `;

    labelDiv.appendChild(labelText);
    labelDiv.appendChild(valueDisplay);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min.toString();
    slider.max = max.toString();
    slider.step = step.toString();
    slider.value = this.config[key].toString();
    slider.style.cssText = `
      width: 100%;
      height: 6px;
      background: rgba(0, 255, 0, 0.2);
      outline: none;
      border-radius: 3px;
      cursor: pointer;
    `;

    // Estilos CSS para el slider
    const style = document.createElement('style');
    style.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        background: #00ff00;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 8px rgba(0, 255, 0, 0.6);
      }

      input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        background: #00ff00;
        border-radius: 50%;
        cursor: pointer;
        border: none;
        box-shadow: 0 0 8px rgba(0, 255, 0, 0.6);
      }
    `;
    document.head.appendChild(style);

    slider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.config[key] = value as any;
      valueDisplay.textContent = `${value}${unit}`;

      if (this.onChangeCallback) {
        this.onChangeCallback(this.config);
      }
    });

    wrapper.appendChild(labelDiv);
    wrapper.appendChild(slider);
    container.appendChild(wrapper);
  }

  private applyPreset(preset: typeof this.config): void {
    this.config = { ...preset };

    // Actualizar todos los sliders
    Object.keys(preset).forEach(key => {
      const slider = this.container.querySelector(`input[value="${this.config[key as keyof typeof this.config]}"]`) as HTMLInputElement;
      const valueDisplay = this.container.querySelector(`#value-${key}`);

      if (slider) {
        slider.value = this.config[key as keyof typeof this.config].toString();
      }

      if (valueDisplay) {
        const units: Record<string, string> = {
          noiseThreshold: 'px',
          smoothingWindow: 'frames',
          smoothingFactor: '',
          historySize: 'frames'
        };
        valueDisplay.textContent = `${this.config[key as keyof typeof this.config]}${units[key] || ''}`;
      }
    });

    if (this.onChangeCallback) {
      this.onChangeCallback(this.config);
    }
  }

  public onChange(callback: (config: typeof this.config) => void): void {
    this.onChangeCallback = callback;
  }

  public toggle(): void {
    this.isVisible = !this.isVisible;
    this.container.style.display = this.isVisible ? 'block' : 'none';
  }

  public dispose(): void {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
