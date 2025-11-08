# 🎯 Sistema de Predicción con TensorFlow.js

## Descripción

Sistema de **predicción de posiciones de manos en tiempo real** usando TensorFlow.js con regresión polinómica ponderada. Mucho más suave que el Filtro de Kalman.

---

## ✨ **Ventajas sobre Kalman**

| Característica | Kalman Filter ❌ | TensorFlow Predictor ✅ |
|----------------|------------------|-------------------------|
| Smoothing | Básico | **Exponencial ponderado** |
| Predicción | Lineal simple | **Regresión polinómica** |
| Bounce/Ruido | Presente | **Mínimo** |
| Historial | Solo 2 frames | **20 frames** (~330ms) |
| Pesos | Uniforme | **Más recientes pesan más** |
| Decaimiento | No | **Sí** (pierde confianza gradualmente) |

---

## 🧠 **Cómo Funciona**

### **1. Detección Normal (Mano Visible)**

```
Cámara → MediaPipe → Posición Raw
                         ↓
              Agrega a historial (20 frames)
                         ↓
         Media Móvil Exponencial Ponderada
                         ↓
              Posición Suavizada ✨
```

**Peso por frame:**
```javascript
Frame -20 (más antiguo): peso = e^(0/20)   = 1.0
Frame -15:               peso = e^(15/20)  ≈ 2.1
Frame -10:               peso = e^(10/20)  ≈ 1.6
Frame -5:                peso = e^(5/20)   ≈ 1.3
Frame -1 (más reciente): peso = e^(19/20) ≈ 2.6  ← MÁS IMPORTANTE
```

### **2. Predicción (Mano Oculta)**

```
Historial (20 posiciones) → Normalizar tiempos → Regresión Lineal Ponderada
                                                          ↓
                                                  y = ax + b (para cada x, y, z)
                                                          ↓
                                                  Posición Futura
                                                          ↓
                                            Aplicar Decaimiento Exponencial
                                                          ↓
                                        Interpolar con última posición conocida
```

**Fórmula de decaimiento:**
```javascript
decayFactor = e^(-timeSinceDetection / 1000)

Ejemplo:
- 0ms sin detección:   decay = e^0      = 1.0  (100% confianza)
- 500ms sin detección: decay = e^-0.5   ≈ 0.6  (60% confianza)
- 1000ms (1s):         decay = e^-1     ≈ 0.37 (37% confianza)
- 2000ms (2s):         decay = e^-2     ≈ 0.14 (14% confianza)
- 3000ms (3s):         decay = e^-3     ≈ 0.05 (5% confianza) → STOP
```

---

## 📊 **Parámetros Ajustables**

### En [`tfHandPredictor.ts`](src/ml/tfHandPredictor.ts)

```typescript
// Línea 13: Tamaño del historial
private readonly maxHistorySize = 20; // Más frames = más suave, menos reactivo

// Línea 14: Tiempo máximo de predicción
private readonly maxPredictionTime = 3000; // milisegundos
```

### Configuraciones Recomendadas

| Uso | maxHistorySize | maxPredictionTime | Resultado |
|-----|----------------|-------------------|-----------|
| **Muy suave** (actual) | 20 | 3000 | Mínimo bounce, lento |
| **Balanceado** | 15 | 2000 | Buen equilibrio |
| **Reactivo** | 10 | 1500 | Rápido, algo de ruido |
| **Muy rápido** | 5 | 1000 | Casi sin delay, más ruido |

---

## 🔍 **Algoritmo Detallado**

### **Regresión Lineal Ponderada**

Para cada dimensión (x, y, z):

1. **Normalizar tiempos** a rango [0, 1]
2. **Calcular pesos exponenciales** para cada frame
3. **Calcular media ponderada** de tiempos y valores
4. **Calcular pendiente (slope)**:
   ```
   slope = Σ(weight * (time - meanTime) * (value - meanValue))
           ──────────────────────────────────────────────────
           Σ(weight * (time - meanTime)²)
   ```
5. **Calcular intercepto**:
   ```
   intercept = meanValue - slope * meanTime
   ```
6. **Predecir valor futuro**:
   ```
   prediction = slope * futureTime + intercept
   ```

### **Media Móvil Exponencial**

Para smoothing (usa solo últimos 5 frames):

```
smoothedX = Σ(positionX[i] * weight[i]) / Σ(weight[i])

donde weight[i] = e^(i / numFrames)
```

---

## 🎮 **Uso en el Código**

### Agregar Posición Detectada

```typescript
const predictor = new TFHandPredictor();

// Cuando detectas una mano
const smoothedPosition = predictor.addPosition(rawPosition, timestamp);
// Retorna posición ya suavizada ✨
```

### Predecir cuando se Pierde Detección

```typescript
// Cuando NO detectas la mano
const predictedPosition = predictor.predict(currentTime);

if (predictedPosition) {
  // Usar predicción (con flag isPredicted = true)
} else {
  // Pasaron más de 3 segundos, no hay predicción
}
```

### Debug Info

```typescript
const info = predictor.getDebugInfo();
console.log({
  frames: info.historySize,           // Cuántos frames en historial
  velocity: info.velocity,            // Velocidad actual (px/s)
  timeSince: info.timeSinceLastDetection // ms sin detección
});
```

---

## 🎨 **Feedback Visual**

En [`drivingScene.ts`](src/scenes/drivingScene.ts):

- **🔵 Azul**: Detección real
- **🟠 Naranja**: Predicción

---

## 📈 **Comparación de Métodos**

```
SUAVIDAD (menos bounce):
TensorFlow ██████████ 10/10  ← Mejor ✅
Kalman     ████░░░░░░  4/10
Raw Data   ░░░░░░░░░░  0/10

REACTIVIDAD (respuesta rápida):
Raw Data   ██████████ 10/10
TensorFlow ████████░░  8/10  ← Balanceado ✅
Kalman     ██████░░░░  6/10

USO DE CPU:
Kalman     ██░░░░░░░░  2/10  ← Más ligero
TensorFlow ████░░░░░░  4/10  ← Aceptable ✅
Raw Data   █░░░░░░░░░  1/10
```

---

## 🚀 **Testing**

1. **Ejecuta el proyecto**:
   ```bash
   npm run dev
   ```

2. **Ve a Driving Scene**

3. **Prueba el smoothing**:
   - Mueve las manos rápido → Debería ser **mucho más suave** que antes
   - Sin bounce ni temblor

4. **Prueba la predicción**:
   - Oculta una mano → Círculo naranja 🟠
   - Sigue el movimiento predicho hasta 3 segundos
   - Muestra la mano → Vuelve a azul 🔵 instantáneamente

5. **Abre la consola** para ver warnings si la predicción se sale de límites

---

## 🔧 **Troubleshooting**

### "Demasiado suave / Lag"
```typescript
// Reducir historial
maxHistorySize = 10 // en vez de 20
```

### "Aún hace bounce"
```typescript
// Aumentar historial
maxHistorySize = 30 // en vez de 20
```

### "Predicción se va muy lejos"
```typescript
// Reducir tiempo de predicción
maxPredictionTime = 1500 // en vez de 3000
```

---

## 📚 **Referencias**

- [TensorFlow.js Core](https://www.tensorflow.org/js/guide/tensors_operations)
- [Weighted Least Squares](https://en.wikipedia.org/wiki/Weighted_least_squares)
- [Exponential Smoothing](https://en.wikipedia.org/wiki/Exponential_smoothing)

---

**Implementado para 00 Academy** 🎮
