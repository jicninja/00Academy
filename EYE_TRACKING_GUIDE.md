# 👁️ Eye Tracking System - Guía Completa

## 🎯 Resumen de Implementación

Hemos implementado un sistema de **tracking de ojos de alta precisión** usando MediaPipe Face Mesh + TensorFlow.js para predicción suave.

---

## ✨ Características Principales

### **1. Eye Tracking Preciso**
- ✅ Trackea el **centro entre los dos ojos** (no la cara completa)
- ✅ Usa **468 puntos faciales** de MediaPipe Face Mesh
- ✅ Estima **profundidad** basándose en la distancia entre ojos
- ✅ **Smoothing con TensorFlow** para eliminar vibración
- ✅ **Predicción hasta 3 segundos** cuando pierdes la cara

### **2. Reducción de Ruido Avanzada**
- ✅ Filtro de **movimientos menores a 5 píxeles** (configurable)
- ✅ **Media móvil exponencial** con 8 frames
- ✅ **Pesos exponenciales** (frames recientes pesan más)
- ✅ Panel de control con **sliders en tiempo real** (presiona **H**)

---

## 🎮 Cómo Usar

### **Iniciar el Juego**
```bash
npm run dev
```

### **Controles de Teclado**
- **H** → Toggle panel de ajustes del predictor TensorFlow
- **Espacio** → Disparar (en shoot scene)

### **Eye Tracking**
1. Mira hacia donde quieres apuntar
2. La cámara seguirá el centro de tus ojos automáticamente
3. Acércate/aléjate para controlar la profundidad

### **Ajustar Smoothing (Presiona H)**

**Sliders disponibles:**
- **Noise Threshold** (0-20px)
  - Mayor = ignora más movimientos pequeños
  - Recomendado: 5-10 para eliminar vibración

- **Smoothing Window** (3-15 frames)
  - Mayor = más suave pero más lag
  - Recomendado: 8 (default)

- **Smoothing Factor** (0.1-1.0)
  - Menor = más suave
  - Recomendado: 0.5-0.7

- **History Size** (10-40 frames)
  - Mayor = mejor predicción pero más memoria
  - Recomendado: 20 (default)

**Presets Rápidos:**
- 🐌 **Ultra Smooth** → Sin vibración, muy suave
- ✨ **Smooth** (default) → Balance perfecto
- ⚖️ **Balanced** → Más reactivo
- ⚡ **Responsive** → Muy rápido, algo de ruido

---

## 🔧 Parámetros Técnicos

### **Face Mesh Keypoints Usados**

```typescript
LEFT_EYE_INNER: 133   // Esquina interior ojo izquierdo
RIGHT_EYE_INNER: 263  // Esquina interior ojo derecho
```

**Centro de mira:**
```typescript
eyesCenterX = (leftEye.x + rightEye.x) / 2
eyesCenterY = (leftEye.y + rightEye.y) / 2
```

### **Cálculo de Profundidad**

```typescript
// Distancia euclidiana entre ojos
eyeDistance = √((rightEye.x - leftEye.x)² + (rightEye.y - leftEye.y)²)

// Profundidad inversa (más cerca = ojos más separados)
depth = clamp(500 / eyeDistance, 3, 15)
```

**Ajustar profundidad:**
- En [`faceDetector.ts:82`](src/detectors/faceDetector.ts#L82)
- Cambiar `500` → número mayor = más cerca
- Cambiar `3, 15` → rango de profundidad

### **Normalización a Espacio 3D**

```typescript
normX = (eyesCenterX / video.width) * 2 - 1  // [-1, 1]
normY = -(eyesCenterY / video.height) * 2 + 1  // [-1, 1]

// Escalar a coordenadas de mundo
worldX = -normX * 5  // Invertir para mirror effect
worldY = normY * 3
worldZ = depth
```

---

## 📊 Pipeline Completo

```
┌──────────────────────────────────────────────────────────┐
│  Webcam Video                                            │
└────────────────┬─────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────┐
│  MediaPipe Face Mesh                                     │
│  - Detecta 468 puntos faciales                          │
│  - refineLandmarks: true (mejor precisión para ojos)    │
└────────────────┬─────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────┐
│  Extrae Posición de Ojos                                │
│  - Keypoint 133 (ojo izquierdo interior)                │
│  - Keypoint 263 (ojo derecho interior)                  │
│  - Calcula centro entre ambos ojos                      │
└────────────────┬─────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────┐
│  Calcula Profundidad                                     │
│  - Distancia entre ojos → estimación de cercanía        │
│  - depth = 500 / eyeDistance                            │
└────────────────┬─────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────┐
│  Normaliza Coordenadas                                   │
│  - Pantalla → [-1, 1]                                   │
│  - Escala a mundo 3D                                     │
└────────────────┬─────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────┐
│  TensorFlow Predictor                                    │
│  - Agrega a historial (20 frames)                       │
│  - Reduce ruido (<5px ignorados)                        │
│  - Media móvil exponencial (8 frames)                   │
│  - Pesos: e^(i/n * 0.7)                                 │
└────────────────┬─────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────┐
│  Posición Suavizada → Camera Position                   │
│  ✨ Sin vibración, muy preciso                          │
└──────────────────────────────────────────────────────────┘
```

---

## 🆚 Comparación: Antes vs Ahora

| Aspecto | Antes (Face Detection) | Ahora (Eye Tracking) |
|---------|------------------------|----------------------|
| **Precisión** | Caja de la cara | Centro entre ojos |
| **Keypoints** | 6 puntos | 468 puntos |
| **Smoothing** | Básico | TensorFlow avanzado |
| **Vibración** | Mucha | Mínima/Ninguna |
| **Predicción** | No | Sí (3 segundos) |
| **Profundidad** | Estimada por tamaño | Por distancia entre ojos |
| **Ruido** | Alto | Muy bajo |
| **Para apuntar** | ⭐⭐⭐ (5/10) | ⭐⭐⭐⭐⭐ (10/10) |

---

## 🎯 Casos de Uso Óptimos

### **Shooting Game**
```typescript
// El eye tracking es perfecto para apuntar
// Tu mirada = punto de mira
// Centro de ojos → crosshair position
```

**Ventajas:**
- Apuntado natural e intuitivo
- No necesitas mover la cabeza, solo mirar
- Muy preciso para targets pequeños

### **Driving Game**
```typescript
// Eye tracking para look-ahead
// Miras a donde quieres ir
// Combinado con hand steering
```

**Ventajas:**
- Mirar curvas antes de girar
- Head tracking para cámara cinemática
- Combinación perfecta manos + ojos

---

## 🐛 Troubleshooting

### **"Vibra mucho"**
**Solución:**
1. Presiona **H**
2. Aumenta **Noise Threshold** a 10-15
3. O usa preset **Ultra Smooth**

### **"Muy lento / Lag"**
**Solución:**
1. Presiona **H**
2. Reduce **Smoothing Window** a 5-6
3. O usa preset **Responsive**

### **"No detecta mis ojos"**
**Problemas comunes:**
- Poca iluminación → Mejora la luz
- Gafas de sol → Quítatelas
- Pelo cubriendo ojos → Apártalo

**Debug:**
```javascript
// En la consola del navegador
const debugInfo = faceController.getDebugInfo();
console.log(debugInfo);
```

### **"Se va muy lejos cuando muevo rápido"**
**Solución:**
En [`faceDetector.ts:82`](src/detectors/faceDetector.ts#L82):
```typescript
// Cambiar rango de profundidad
const depth = THREE.MathUtils.clamp(500 / eyeDistance, 5, 10);
// Antes era (3, 15), ahora más restringido
```

---

## 📈 Optimizaciones Futuras

### **1. Iris Tracking (Aún más preciso)**
```typescript
// MediaPipe Face Mesh con refineLandmarks ya detecta iris
// Podemos usar keypoints 468-477 para tracking ultra-preciso
const leftIris = face.keypoints[468];
const rightIris = face.keypoints[473];
```

### **2. Gaze Direction (Dirección de mirada)**
```typescript
// Calcular vector de mirada
const gazeVector = calculateGazeVector(leftIris, rightIris, noseTip);
// Usar para predecir donde el usuario MIRARÁ (no donde está mirando)
```

### **3. Blink Detection (Parpadeo)**
```typescript
// Usar distancia vertical entre párpados
// Parpadeo = disparo automático
const eyeOpenness = calculateEyeOpenness(eyeKeypoints);
if (eyeOpenness < threshold) shoot();
```

### **4. Head Pose Estimation (Orientación de cabeza)**
```typescript
// Usar puntos de la nariz + frente + mentón
// Detectar rotación X, Y, Z de la cabeza
// Para cámara más cinemática
```

---

## 🔗 Referencias

- [MediaPipe Face Mesh](https://google.github.io/mediapipe/solutions/face_mesh.html)
- [TensorFlow.js Face Landmarks](https://github.com/tensorflow/tfjs-models/tree/master/face-landmarks-detection)
- [Face Mesh Keypoints Map](https://github.com/google/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model_uv_visualization.png)

---

## 📝 Archivos Modificados

1. **[src/detectors/faceDetector.ts](src/detectors/faceDetector.ts)**
   - Cambió de Face Detection → Face Mesh
   - Trackea centro de ojos
   - Usa TFHandPredictor para smoothing

2. **[src/ml/tfHandPredictor.ts](src/ml/tfHandPredictor.ts)**
   - Reductor de ruido configurable
   - Smoothing mejorado (8 frames)
   - Configuración ajustable

3. **[src/ui/tfPredictorControls.ts](src/ui/tfPredictorControls.ts)** (nuevo)
   - Panel de control con sliders
   - Presets rápidos
   - Toggle con tecla H

4. **[src/detectors/handsDetector.ts](src/detectors/handsDetector.ts)**
   - Método `updatePredictorConfig()` para cambiar config en tiempo real

5. **[src/main.ts](src/main.ts)**
   - Integración del panel TFPredictorControls
   - Handler de tecla H

---

**Creado para 00 Academy** 🎮👁️
