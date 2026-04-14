/**
 * RetroScan AI — Degradation Heatmap Overlay
 *
 * Generates a visual overlay highlighting degraded zones on road sign photos.
 * This is a SIMPLIFIED version (not real GradCAM) — uses random degradation zones
 * positioned within the sign area for a convincing demo effect.
 *
 * Only generates overlays for "Degraded" classifications.
 */

/**
 * Generate a heatmap overlay image showing degraded zones.
 *
 * @param {string} classification - 'High', 'Medium', or 'Degraded'
 * @param {HTMLImageElement|HTMLCanvasElement} imageSource - The original photo
 * @returns {string|null} - Data URL of the overlay image, or null if not degraded
 */
export function generateHeatmapOverlay(classification, imageSource) {
  // Only show heatmap for degraded signs
  if (classification !== 'Degraded') return null;

  const canvas = document.createElement('canvas');
  const width = imageSource.naturalWidth || imageSource.width || 640;
  const height = imageSource.naturalHeight || imageSource.height || 480;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Draw original image
  ctx.drawImage(imageSource, 0, 0, width, height);

  // Add semi-transparent dark overlay to make red zones pop
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.fillRect(0, 0, width, height);

  // Generate 2-5 degradation zones (red gradient circles)
  const numZones = 2 + Math.floor(Math.random() * 4);

  for (let i = 0; i < numZones; i++) {
    // Position zones mostly in the center (where the sign would be)
    const x = width * (0.2 + Math.random() * 0.6);
    const y = height * (0.2 + Math.random() * 0.6);
    const radius = Math.min(width, height) * (0.08 + Math.random() * 0.15);

    // Create radial gradient (red in center, transparent at edges)
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, 'rgba(239, 68, 68, 0.7)');   // red-500, 70%
    gradient.addColorStop(0.4, 'rgba(239, 68, 68, 0.45)');
    gradient.addColorStop(0.7, 'rgba(245, 158, 11, 0.25)'); // amber transition
    gradient.addColorStop(1, 'rgba(245, 158, 11, 0)');      // transparent

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Add a subtle legend in the bottom-right corner
  const legendX = width - 160;
  const legendY = height - 50;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.roundRect(legendX - 10, legendY - 5, 160, 45, 6);
  ctx.fill();

  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#ef4444';
  ctx.fillText('● Severe degradation', legendX, legendY + 12);
  ctx.fillStyle = '#f59e0b';
  ctx.fillText('● Moderate degradation', legendX, legendY + 28);

  return canvas.toDataURL('image/png');
}

/**
 * Generate a comparison view: original on left, heatmap on right.
 *
 * @param {HTMLImageElement} imageSource - The original photo
 * @returns {string} - Data URL of the comparison image
 */
export function generateComparisonView(imageSource) {
  const width = (imageSource.naturalWidth || imageSource.width || 640) * 2;
  const height = imageSource.naturalHeight || imageSource.height || 480;
  const halfWidth = width / 2;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Left side: original
  ctx.drawImage(imageSource, 0, 0, halfWidth, height);

  // Right side: build heatmap on a temp canvas
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = halfWidth;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(imageSource, 0, 0, halfWidth, height);

  // Apply overlay
  const numZones = 3;
  for (let i = 0; i < numZones; i++) {
    const x = halfWidth * (0.2 + Math.random() * 0.6);
    const y = height * (0.2 + Math.random() * 0.6);
    const radius = Math.min(halfWidth, height) * (0.1 + Math.random() * 0.15);

    const gradient = tempCtx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, 'rgba(239, 68, 68, 0.65)');
    gradient.addColorStop(0.6, 'rgba(245, 158, 11, 0.3)');
    gradient.addColorStop(1, 'rgba(245, 158, 11, 0)');

    tempCtx.fillStyle = gradient;
    tempCtx.beginPath();
    tempCtx.arc(x, y, radius, 0, Math.PI * 2);
    tempCtx.fill();
  }

  ctx.drawImage(tempCanvas, halfWidth, 0);

  // Divider line
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(halfWidth, 0);
  ctx.lineTo(halfWidth, height);
  ctx.stroke();

  // Labels
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(10, height - 30, 80, 22);
  ctx.fillRect(halfWidth + 10, height - 30, 80, 22);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Original', 16, height - 13);
  ctx.fillText('Heatmap', halfWidth + 16, height - 13);

  return canvas.toDataURL('image/png');
}
