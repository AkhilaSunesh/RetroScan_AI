/**
 * RetroScan AI — Environmental Condition Detector
 *
 * Uses pixel-level brightness/color analysis to detect:
 *   - day   (☀️) — normal daylight conditions
 *   - night (🌙) — low ambient light
 *   - wet   (🌧️) — wet road reflections (bluish tint + moderate brightness)
 *
 * This is a simple heuristic, NOT an ML model. Good enough for hackathon demo.
 */

/**
 * Detect the shooting condition from an image.
 *
 * @param {HTMLImageElement|HTMLCanvasElement} imageSource - The captured photo
 * @returns {{ condition: string, brightness: number, label: string, icon: string }}
 */
export function detectCondition(imageSource) {
  const canvas = document.createElement('canvas');
  const sampleSize = 100; // Downsample for speed
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imageSource, 0, 0, sampleSize, sampleSize);

  const pixels = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
  const pixelCount = sampleSize * sampleSize;

  let totalBrightness = 0;
  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let highBrightnessCount = 0; // Pixels with brightness > 200 (potential glare/reflections)

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    // Perceived luminance (ITU-R BT.601)
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
    totalBrightness += brightness;
    totalR += r;
    totalG += g;
    totalB += b;

    if (brightness > 200) highBrightnessCount++;
  }

  const avgBrightness = totalBrightness / pixelCount;
  const avgR = totalR / pixelCount;
  const avgG = totalG / pixelCount;
  const avgB = totalB / pixelCount;
  const glareRatio = highBrightnessCount / pixelCount;

  // Detection logic
  let condition, label, icon;

  if (avgBrightness < 50) {
    // Very dark → nighttime
    condition = 'night';
    label = 'Night';
    icon = '🌙';
  } else if (avgBrightness < 80 && glareRatio > 0.05) {
    // Dark but with bright spots → night with headlights/street lights
    condition = 'night';
    label = 'Night';
    icon = '🌙';
  } else if (avgB > avgR * 1.15 && avgB > avgG && avgBrightness > 100 && avgBrightness < 200) {
    // Blue-dominant in moderate brightness → wet/rainy (sky reflections on wet road)
    condition = 'wet';
    label = 'Wet';
    icon = '🌧️';
  } else {
    // Normal daylight
    condition = 'day';
    label = 'Day';
    icon = '☀️';
  }

  return {
    condition,
    label,
    icon,
    brightness: Math.round(avgBrightness),
    details: {
      avgR: Math.round(avgR),
      avgG: Math.round(avgG),
      avgB: Math.round(avgB),
      glareRatio: Math.round(glareRatio * 100),
    },
  };
}
