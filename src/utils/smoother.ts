import { Vector3 } from 'three';

export const createSmoother = (smoothing = 0.9) => {
  let previousValue: number | null = null;
  return (currentValue: number) => {
    if (previousValue === null) previousValue = currentValue;
    const smoothedValue =
      previousValue * smoothing + currentValue * (1 - smoothing);
    previousValue = smoothedValue;
    return smoothedValue;
  };
};

export const createVector3Smoother = (smoothing = 0.9) => {
  const smoothX = createSmoother(smoothing);
  const smoothY = createSmoother(smoothing);
  const smoothZ = createSmoother(smoothing);
  return (currentVector: Vector3) => {
    return new Vector3(
      smoothX(currentVector.x),
      smoothY(currentVector.y),
      smoothZ(currentVector.z)
    );
  };
};

export const easeInOutQuad = (progress: number) => {
  return progress < 0.5
    ? 2 * progress * progress
    : -1 + (4 - 2 * progress) * progress;
};
