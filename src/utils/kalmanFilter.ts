import * as THREE from 'three';

/**
 * Configuraciones preestablecidas para el Filtro de Kalman
 */
export const KalmanPresets = {
  // Muy suave, casi sin bounce (recomendado para movimientos lentos)
  VERY_SMOOTH: { processNoise: 0.0005, measurementNoise: 0.8 },

  // Suave (configuración actual - buena para uso general)
  SMOOTH: { processNoise: 0.001, measurementNoise: 0.5 },

  // Balanceado (buen equilibrio entre suavidad y reactividad)
  BALANCED: { processNoise: 0.005, measurementNoise: 0.3 },

  // Reactivo (responde rápido pero con más ruido)
  RESPONSIVE: { processNoise: 0.01, measurementNoise: 0.15 },

  // Muy reactivo (casi sin smoothing, sigue exactamente la detección)
  VERY_RESPONSIVE: { processNoise: 0.02, measurementNoise: 0.05 },
};

/**
 * Filtro de Kalman 1D para tracking de una variable
 */
export class KalmanFilter1D {
  private x: number; // Estado estimado (posición)
  private v: number; // Velocidad estimada
  private p: number; // Covarianza del error de posición
  private pv: number; // Covarianza del error de velocidad
  private q: number; // Ruido del proceso
  private r: number; // Ruido de la medición
  private lastTimestamp: number = 0;

  constructor(
    initialValue: number,
    processNoise = 0.01,
    measurementNoise = 0.1
  ) {
    this.x = initialValue;
    this.v = 0; // Velocidad inicial = 0
    this.p = 1;
    this.pv = 1;
    this.q = processNoise;
    this.r = measurementNoise;
  }

  /**
   * Actualiza el filtro con una nueva medición
   */
  public update(measurement: number, timestamp: number): number {
    const dt = this.lastTimestamp > 0 ? (timestamp - this.lastTimestamp) / 1000 : 0.016;
    this.lastTimestamp = timestamp;

    // PREDICCIÓN
    // Predecir posición: x = x + v*dt
    const predictedX = this.x + this.v * dt;

    // Predecir covarianza: P = P + Q
    const predictedP = this.p + this.pv * dt * dt + this.q;
    const predictedPv = this.pv + this.q;

    // ACTUALIZACIÓN (corrección con medición)
    // Ganancia de Kalman: K = P / (P + R)
    const k = predictedP / (predictedP + this.r);

    // Actualizar estimación: x = x + K*(medición - x)
    this.x = predictedX + k * (measurement - predictedX);

    // Actualizar velocidad basándose en el cambio
    if (dt > 0) {
      const measuredVelocity = (measurement - predictedX) / dt;
      this.v = this.v + k * measuredVelocity;
    }

    // Actualizar covarianza: P = (1-K)*P
    this.p = (1 - k) * predictedP;
    this.pv = (1 - k) * predictedPv;

    return this.x;
  }

  /**
   * Predice la posición futura sin una medición
   */
  public predict(deltaTime: number): number {
    const dt = deltaTime / 1000; // Convertir ms a segundos

    // Predicción: x_futuro = x_actual + v*dt
    const predictedX = this.x + this.v * dt;

    // Actualizar covarianza (incertidumbre aumenta con el tiempo)
    this.p = this.p + this.pv * dt * dt + this.q * dt;

    return predictedX;
  }

  /**
   * Obtiene la velocidad estimada actual
   */
  public getVelocity(): number {
    return this.v;
  }

  /**
   * Obtiene la posición estimada actual
   */
  public getPosition(): number {
    return this.x;
  }
}

/**
 * Filtro de Kalman 3D para tracking de vectores (x, y, z)
 */
export class KalmanFilter3D {
  private filterX: KalmanFilter1D;
  private filterY: KalmanFilter1D;
  private filterZ: KalmanFilter1D;
  private lastUpdateTime: number = 0;

  constructor(
    initialPos: THREE.Vector3,
    processNoise = KalmanPresets.SMOOTH.processNoise,
    measurementNoise = KalmanPresets.SMOOTH.measurementNoise
  ) {
    this.filterX = new KalmanFilter1D(initialPos.x, processNoise, measurementNoise);
    this.filterY = new KalmanFilter1D(initialPos.y, processNoise, measurementNoise);
    this.filterZ = new KalmanFilter1D(initialPos.z, processNoise, measurementNoise);
  }

  /**
   * Actualiza el filtro con una nueva posición medida
   */
  public update(measurement: THREE.Vector3, timestamp: number): THREE.Vector3 {
    this.lastUpdateTime = timestamp;

    return new THREE.Vector3(
      this.filterX.update(measurement.x, timestamp),
      this.filterY.update(measurement.y, timestamp),
      this.filterZ.update(measurement.z, timestamp)
    );
  }

  /**
   * Predice posición futura sin medición
   * @param currentTime - Tiempo actual en ms
   * @returns Posición predicha
   */
  public predict(currentTime: number): THREE.Vector3 {
    const deltaTime = currentTime - this.lastUpdateTime;

    return new THREE.Vector3(
      this.filterX.predict(deltaTime),
      this.filterY.predict(deltaTime),
      this.filterZ.predict(deltaTime)
    );
  }

  /**
   * Obtiene la velocidad estimada actual
   */
  public getVelocity(): THREE.Vector3 {
    return new THREE.Vector3(
      this.filterX.getVelocity(),
      this.filterY.getVelocity(),
      this.filterZ.getVelocity()
    );
  }

  /**
   * Obtiene la posición estimada actual
   */
  public getPosition(): THREE.Vector3 {
    return new THREE.Vector3(
      this.filterX.getPosition(),
      this.filterY.getPosition(),
      this.filterZ.getPosition()
    );
  }
}

/**
 * Predictor de posición de manos usando Filtro de Kalman
 */
export class HandPositionPredictor {
  private kalmanFilter?: KalmanFilter3D;
  private maxPredictionTime = 3000; // 3 segundos máximo
  private lastDetectionTime = 0;
  private hasBeenInitialized = false;
  private preset = KalmanPresets.SMOOTH; // Configuración actual

  // Límites válidos para las manos (en coordenadas de pantalla)
  private bounds = {
    minX: -window.innerWidth * 0.5,  // 50% fuera por la izquierda
    maxX: window.innerWidth * 1.5,   // 50% fuera por la derecha
    minY: -window.innerHeight * 0.5, // 50% fuera arriba
    maxY: window.innerHeight * 1.5,  // 50% fuera abajo
    minZ: -5,  // Límite de profundidad hacia atrás
    maxZ: 2,   // Límite de profundidad hacia adelante
  };

  private lastValidPosition?: THREE.Vector3;

  /**
   * Agrega una posición detectada
   */
  public addPosition(position: THREE.Vector3, timestamp: number): THREE.Vector3 {
    if (!this.kalmanFilter) {
      // Inicializar filtro con primera posición
      this.kalmanFilter = new KalmanFilter3D(
        position,
        this.preset.processNoise,   // Process noise: qué tan "errático" es el movimiento (menor = más suave)
        this.preset.measurementNoise // Measurement noise: qué tan ruidosa es la detección (mayor = más smoothing)
      );
      this.hasBeenInitialized = true;
    }

    this.lastDetectionTime = timestamp;

    // Actualizar y retornar posición filtrada
    const filteredPosition = this.kalmanFilter.update(position, timestamp);
    this.lastValidPosition = filteredPosition.clone();

    return filteredPosition;
  }

  /**
   * Predice posición cuando no hay detección
   */
  public predict(currentTime: number): THREE.Vector3 | null {
    if (!this.kalmanFilter || !this.hasBeenInitialized) {
      return null;
    }

    const timeSinceLastDetection = currentTime - this.lastDetectionTime;

    // No predecir más allá del límite (3 segundos)
    if (timeSinceLastDetection > this.maxPredictionTime) {
      return null;
    }

    // Predecir posición futura
    const predictedPosition = this.kalmanFilter.predict(currentTime);

    // Validar que la predicción está dentro de límites razonables
    if (!this.isPositionValid(predictedPosition)) {
      console.warn('Predicted position out of bounds, stopping prediction', {
        position: predictedPosition,
        timeSince: timeSinceLastDetection,
      });
      return null; // Cancelar predicción si sale de límites
    }

    // Validar que la velocidad no es excesiva
    const velocity = this.kalmanFilter.getVelocity();
    const speed = velocity.length();
    const maxSpeed = 5000; // píxeles por segundo (ajustable)

    if (speed > maxSpeed) {
      console.warn('Predicted velocity too high, stopping prediction', {
        speed,
        maxSpeed,
      });
      return null;
    }

    return predictedPosition;
  }

  /**
   * Verifica si una posición está dentro de límites razonables
   */
  private isPositionValid(position: THREE.Vector3): boolean {
    return (
      position.x >= this.bounds.minX &&
      position.x <= this.bounds.maxX &&
      position.y >= this.bounds.minY &&
      position.y <= this.bounds.maxY &&
      position.z >= this.bounds.minZ &&
      position.z <= this.bounds.maxZ
    );
  }

  /**
   * Obtiene la última posición conocida
   */
  public getLastPosition(): THREE.Vector3 | null {
    if (!this.kalmanFilter) return null;
    return this.kalmanFilter.getPosition();
  }

  /**
   * Obtiene la velocidad estimada
   */
  public getVelocity(): THREE.Vector3 | null {
    if (!this.kalmanFilter) return null;
    return this.kalmanFilter.getVelocity();
  }

  /**
   * Cambia el preset de suavizado
   */
  public setPreset(preset: typeof KalmanPresets[keyof typeof KalmanPresets]): void {
    this.preset = preset;
    // Reiniciar filtro para aplicar nueva configuración
    if (this.kalmanFilter) {
      this.reset();
    }
  }

  /**
   * Reinicia el predictor
   */
  public reset(): void {
    this.kalmanFilter = undefined;
    this.hasBeenInitialized = false;
    this.lastDetectionTime = 0;
  }
}
