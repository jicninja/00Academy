# 🎯 Sistema de Predicción de Manos con Filtro de Kalman

## Descripción

Este proyecto incluye un **sistema de predicción de posiciones de manos** usando Filtros de Kalman que permite mantener el tracking suave incluso cuando la cámara pierde temporalmente la detección de las manos.

## ¿Qué es un Filtro de Kalman?

El Filtro de Kalman es un algoritmo matemático que:
- **Predice** la posición futura de un objeto basándose en su historia
- **Suaviza** las mediciones ruidosas
- **Estima** la velocidad y aceleración del movimiento

Es el estándar en:
- 🛰️ GPS y navegación
- 🚀 Sistemas aeroespaciales
- 🎮 Tracking de movimiento en videojuegos
- 📱 Estabilización de imagen en cámaras

## Características

### ✅ Predicción Automática
- Mantiene el tracking hasta **3 segundos** sin detección
- Usa velocidad estimada para extrapolar posición futura
- Funciona inmediatamente (sin necesidad de entrenamiento)

### ✅ Smoothing Incorporado
- Reduce jitter/temblor de la detección
- Combina mediciones ruidosas con predicciones suaves
- Ajustable mediante parámetros de ruido

### ✅ Feedback Visual
- **Azul**: Mano detectada en tiempo real 🔵
- **Naranja**: Mano predicha (no detectada por cámara) 🟠

## Archivos Clave

### [`src/utils/kalmanFilter.ts`](src/utils/kalmanFilter.ts)
Implementación del Filtro de Kalman:
- `KalmanFilter1D`: Filtro para una dimensión (x, y, o z)
- `KalmanFilter3D`: Filtro para vectores 3D
- `HandPositionPredictor`: Wrapper específico para manos

### [`src/detectors/handsDetector.ts`](src/detectors/handsDetector.ts)
Integración con MediaPipe:
- Detecta manos con TensorFlow.js
- Aplica Kalman para smoothing
- Activa predicción cuando se pierde detección

### [`src/scenes/drivingScene.ts`](src/scenes/drivingScene.ts)
Feedback visual:
- Cambia color de indicadores según estado
- Azul = detección real
- Naranja = predicción

## Cómo Funciona

### 1. Detección Normal (Mano Visible)

```
Cámara → MediaPipe → Posición Raw → Kalman Filter → Posición Suavizada
                                           ↓
                                    Actualiza Velocidad
```

### 2. Predicción (Mano Oculta/Perdida)

```
Última Posición + Velocidad Estimada → Predicción Futura
                      ↓
          (hasta 3 segundos máximo)
```

### 3. Recuperación (Mano Reaparece)

```
Nueva Detección → Reset Contador → Volver a Detección Normal
```

## Parámetros Ajustables

En [`src/utils/kalmanFilter.ts`](src/utils/kalmanFilter.ts#L178-L181):

```typescript
new KalmanFilter3D(
  position,
  0.01,  // Process noise: qué tan errático es el movimiento
         // ↓ Menor = más suave, pero menos reactivo
         // ↑ Mayor = más reactivo, pero más ruidoso

  0.15   // Measurement noise: qué tan ruidosa es la detección
         // ↓ Menor = confía más en la cámara
         // ↑ Mayor = confía más en el modelo (más smoothing)
);
```

### Ejemplos de Configuración

| Tipo de Movimiento | Process Noise | Measurement Noise |
|-------------------|---------------|-------------------|
| Lento y suave | 0.005 | 0.2 |
| **Normal** (actual) | **0.01** | **0.15** |
| Rápido y errático | 0.02 | 0.1 |

## Tiempo de Predicción

En [`src/utils/kalmanFilter.ts`](src/utils/kalmanFilter.ts#L168):

```typescript
private maxPredictionTime = 3000; // 3 segundos
```

Para cambiar:
- `1000` = 1 segundo
- `5000` = 5 segundos
- `Infinity` = sin límite (no recomendado)

## Testing

### Probar la Predicción
1. Inicia el juego en modo Driving
2. Mueve tus manos normalmente (verás círculos **azules**)
3. Oculta una mano detrás de tu espalda
4. El círculo cambiará a **naranja** y seguirá el movimiento predicho
5. Muestra la mano de nuevo → vuelve a **azul**

### Verificar Console Logs
Puedes descomentar en `kalmanFilter.ts` para debug:
```typescript
console.log('Predicting...', {
  timeSince: timeSinceLastDetection,
  velocity: this.kalmanFilter.getVelocity()
});
```

## Ventajas vs Alternativas

| Método | Complejidad | Precisión | Latencia | Requiere Training |
|--------|-------------|-----------|----------|-------------------|
| **Kalman Filter** ✅ | Baja | Alta | Muy Baja | ❌ No |
| LSTM/RNN | Muy Alta | Muy Alta | Alta | ✅ Sí |
| Extrapolación Lineal | Muy Baja | Media | Muy Baja | ❌ No |
| Suavizado Simple | Muy Baja | Baja | Muy Baja | ❌ No |

## Posibles Mejoras Futuras

1. **Adaptive Kalman**: Ajustar parámetros dinámicamente según velocidad
2. **Multiple Models**: Diferentes filtros para movimientos lentos vs rápidos
3. **Confidence Decay**: Reducir confianza gradualmente durante predicción
4. **Gesture Recognition**: Detectar patrones (ej: "mano siempre vuelve al centro")

## Referencias

- [Kalman Filter Explained Simply](https://www.kalmanfilter.net/)
- [MediaPipe Hands Documentation](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker)
- [Three.js Vector3](https://threejs.org/docs/#api/en/math/Vector3)

---

**Creado para 00 Academy - Gesture-Controlled Minigames** 🎮
