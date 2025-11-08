import * as THREE from 'three';

/**
 * Predictor de posición de manos usando regresión lineal ponderada
 * NO requiere TensorFlow (implementación pura en JavaScript)
 * Usa historial de posiciones para smoothing y predicción
 */
export class TFHandPredictor {
  private positionHistory: THREE.Vector3[] = [];
  private timestampHistory: number[] = [];
  private lastDetectionTime = 0;
  private lastOutputPosition?: THREE.Vector3;

  // Configuración ajustable en tiempo real
  public config = {
    maxHistorySize: 20,        // Últimos N frames de historial
    maxPredictionTime: 3000,   // Tiempo máximo de predicción (ms)
    noiseThreshold: 5,         // Píxeles - movimientos menores se ignoran
    smoothingWindow: 8,        // Frames para smoothing
    smoothingFactor: 0.7,      // Factor de suavidad (0-1, menor = más suave)
  };

  /**
   * Agrega una nueva posición detectada al historial
   */
  public addPosition(position: THREE.Vector3, timestamp: number): THREE.Vector3 {
    // Aplicar reductor de ruido ANTES de agregar al historial
    const denoisedPosition = this.reduceNoise(position);

    this.positionHistory.push(denoisedPosition);
    this.timestampHistory.push(timestamp);
    this.lastDetectionTime = timestamp;

    // Mantener solo últimas N posiciones
    if (this.positionHistory.length > this.config.maxHistorySize) {
      this.positionHistory.shift();
      this.timestampHistory.shift();
    }

    // Retornar posición suavizada usando media móvil exponencial
    const smoothed = this.smoothPosition(denoisedPosition);
    this.lastOutputPosition = smoothed.clone();
    return smoothed;
  }

  /**
   * Predice la posición futura usando regresión lineal
   */
  public predict(currentTime: number): THREE.Vector3 | null {
    const timeSinceLastDetection = currentTime - this.lastDetectionTime;

    // No predecir más allá del límite
    if (timeSinceLastDetection > this.config.maxPredictionTime) {
      return null;
    }

    // Necesitamos al menos 3 posiciones para hacer predicción
    if (this.positionHistory.length < 3) {
      return this.getLastPosition();
    }

    const n = this.positionHistory.length;

    // Normalizar timestamps a [0, 1]
    const firstTime = this.timestampHistory[0];
    const lastTime = this.timestampHistory[n - 1];
    const timeRange = lastTime - firstTime || 1;

    const normalizedTimes = this.timestampHistory.map(
      t => (t - firstTime) / timeRange
    );

    // Tiempo futuro normalizado
    const futureTime = (currentTime - firstTime) / timeRange;

    // Predecir cada dimensión (x, y, z) por separado
    const predictedX = this.predictDimension(
      normalizedTimes,
      this.positionHistory.map(p => p.x),
      futureTime
    );

    const predictedY = this.predictDimension(
      normalizedTimes,
      this.positionHistory.map(p => p.y),
      futureTime
    );

    const predictedZ = this.predictDimension(
      normalizedTimes,
      this.positionHistory.map(p => p.z),
      futureTime
    );

    // Aplicar decaimiento gradual (menos confianza con el tiempo)
    const decayFactor = Math.exp(-timeSinceLastDetection / 1000);
    const lastPos = this.positionHistory[n - 1];

    // Interpolar entre última posición y predicción según decaimiento
    return new THREE.Vector3(
      lastPos.x + (predictedX - lastPos.x) * decayFactor,
      lastPos.y + (predictedY - lastPos.y) * decayFactor,
      lastPos.z + (predictedZ - lastPos.z) * decayFactor
    );
  }

  /**
   * Predice una dimensión usando regresión lineal ponderada
   * SIN TensorFlow (implementación pura en JavaScript)
   */
  private predictDimension(times: number[], values: number[], futureTime: number): number {
    const n = times.length;

    // Calcular pesos exponenciales (más recientes tienen más peso)
    const weights = times.map((_, i) => Math.exp(i / n));
    const weightSum = weights.reduce((a, b) => a + b, 0);
    const normalizedWeights = weights.map(w => w / weightSum);

    // Calcular medias ponderadas
    let meanTime = 0;
    let meanValue = 0;

    for (let i = 0; i < n; i++) {
      meanTime += times[i] * normalizedWeights[i];
      meanValue += values[i] * normalizedWeights[i];
    }

    // Calcular pendiente (slope) con weighted least squares
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      const timeDiff = times[i] - meanTime;
      const valueDiff = values[i] - meanValue;
      numerator += timeDiff * valueDiff * normalizedWeights[i];
      denominator += timeDiff * timeDiff * normalizedWeights[i];
    }

    const slope = numerator / (denominator + 1e-8); // Evitar división por cero
    const intercept = meanValue - slope * meanTime;

    // Predecir valor futuro: y = slope * x + intercept
    return slope * futureTime + intercept;
  }

  /**
   * Reduce el ruido de alta frecuencia (vibraciones)
   * Filtra movimientos muy pequeños que probablemente son ruido
   */
  private reduceNoise(position: THREE.Vector3): THREE.Vector3 {
    if (!this.lastOutputPosition) {
      return position.clone();
    }

    // Calcular distancia del último output
    const distance = position.distanceTo(this.lastOutputPosition);

    // Si el movimiento es muy pequeño (ruido), mantener posición anterior
    if (distance < this.config.noiseThreshold) {
      return this.lastOutputPosition.clone();
    }

    return position.clone();
  }

  /**
   * Suaviza la posición usando media móvil exponencial ponderada
   * SIN usar TensorFlow (para evitar problemas de backend)
   */
  private smoothPosition(currentPosition: THREE.Vector3): THREE.Vector3 {
    if (this.positionHistory.length < 2) {
      return currentPosition.clone();
    }

    const n = this.positionHistory.length;

    // Usar últimos N frames para smoothing (configurable)
    const windowSize = Math.min(this.config.smoothingWindow, n);
    const recentPositions = this.positionHistory.slice(-windowSize);
    const smoothingWindow = recentPositions.length;

    // Pesos exponenciales con factor configurable
    const weights = Array.from(
      { length: smoothingWindow },
      (_, i) => Math.exp((i / smoothingWindow) * this.config.smoothingFactor)
    );
    const weightSum = weights.reduce((a, b) => a + b, 0);
    const normalizedWeights = weights.map(w => w / weightSum);

    // Media ponderada para cada dimensión (sin TensorFlow)
    const smoothed = new THREE.Vector3();

    for (let i = 0; i < smoothingWindow; i++) {
      smoothed.x += recentPositions[i].x * normalizedWeights[i];
      smoothed.y += recentPositions[i].y * normalizedWeights[i];
      smoothed.z += recentPositions[i].z * normalizedWeights[i];
    }

    return smoothed;
  }

  /**
   * Obtiene la última posición conocida
   */
  private getLastPosition(): THREE.Vector3 | null {
    if (this.positionHistory.length === 0) return null;
    return this.positionHistory[this.positionHistory.length - 1].clone();
  }

  /**
   * Calcula la velocidad promedio actual
   */
  public getVelocity(): THREE.Vector3 {
    if (this.positionHistory.length < 2) {
      return new THREE.Vector3(0, 0, 0);
    }

    const n = this.positionHistory.length;
    const lastPos = this.positionHistory[n - 1];
    const prevPos = this.positionHistory[n - 2];
    const dt = (this.timestampHistory[n - 1] - this.timestampHistory[n - 2]) / 1000;

    if (dt === 0) return new THREE.Vector3(0, 0, 0);

    return new THREE.Vector3(
      (lastPos.x - prevPos.x) / dt,
      (lastPos.y - prevPos.y) / dt,
      (lastPos.z - prevPos.z) / dt
    );
  }

  /**
   * Reinicia el predictor
   */
  public reset(): void {
    this.positionHistory = [];
    this.timestampHistory = [];
    this.lastDetectionTime = 0;
    this.lastOutputPosition = undefined;
  }

  /**
   * Actualiza la configuración del predictor
   */
  public updateConfig(newConfig: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Obtiene información de debug
   */
  public getDebugInfo(): {
    historySize: number;
    velocity: THREE.Vector3;
    timeSinceLastDetection: number;
    config: typeof this.config;
  } {
    return {
      historySize: this.positionHistory.length,
      velocity: this.getVelocity(),
      timeSinceLastDetection: performance.now() - this.lastDetectionTime,
      config: this.config,
    };
  }
}
