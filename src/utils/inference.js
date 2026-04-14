/**
 * RetroScan AI — TensorFlow.js Inference Module
 *
 * Loads the MobileNetV3-Small model and runs classification on captured images.
 * Classes: degraded (0), high (1), medium (2)  — alphabetical order from Keras
 *
 * Usage:
 *   import { classifyImage, isModelLoaded } from './utils/inference';
 *   const result = await classifyImage(imageElement);
 *   // result = { classification: 'Degraded', confidence: 87, probabilities: { high: 8, medium: 5, degraded: 87 } }
 */

import * as tf from '@tensorflow/tfjs';

let model = null;
let isLoading = false;

// Class names in the order Keras flow_from_directory uses (alphabetical)
const CLASS_NAMES_ORDERED = ['degraded', 'high', 'medium'];

// Map to display names
const DISPLAY_NAMES = {
  degraded: 'Degraded',
  high: 'High',
  medium: 'Medium',
};

/**
 * Load the TF.js model (lazy — only on first inference call)
 */
export async function loadModel(onProgress) {
  if (model) return model;
  if (isLoading) {
    // Wait for existing load to complete
    while (isLoading) {
      await new Promise((r) => setTimeout(r, 100));
    }
    return model;
  }

  isLoading = true;
  try {
    console.time('Model load');
    model = await tf.loadLayersModel('/models/model.json', {
      onProgress: (fraction) => {
        if (onProgress) onProgress(fraction);
        console.log(`Loading model: ${(fraction * 100).toFixed(0)}%`);
      },
    });
    console.timeEnd('Model load');
    console.log('✅ RetroScan model loaded successfully');
    return model;
  } catch (error) {
    console.error('❌ Failed to load model:', error);
    throw error;
  } finally {
    isLoading = false;
  }
}

/**
 * Check if the model is currently loaded in memory
 */
export function isModelLoaded() {
  return model !== null;
}

/**
 * Preprocess an image element to a tensor for MobileNetV3.
 * Resizes to 224x224, normalizes to [0, 1].
 */
function preprocessImage(imageSource) {
  return tf.tidy(() => {
    // Convert image source to tensor
    let tensor;

    if (imageSource instanceof HTMLImageElement || imageSource instanceof HTMLVideoElement) {
      tensor = tf.browser.fromPixels(imageSource);
    } else if (imageSource instanceof HTMLCanvasElement) {
      tensor = tf.browser.fromPixels(imageSource);
    } else if (typeof imageSource === 'string') {
      // If it's a base64/data URL, we need to draw it to canvas first
      // This case should be handled by the caller
      throw new Error('Pass an HTMLImageElement, not a string. Use loadImageFromDataURL() first.');
    } else {
      tensor = tf.browser.fromPixels(imageSource);
    }

    // Resize to 224x224
    const resized = tf.image.resizeBilinear(tensor, [224, 224]);

    // Normalize to [0, 1]
    const normalized = resized.div(255.0);

    // Add batch dimension: [224, 224, 3] → [1, 224, 224, 3]
    const batched = normalized.expandDims(0);

    return batched;
  });
}

/**
 * Helper: load an image from a data URL / base64 string
 */
export function loadImageFromDataURL(dataURL) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataURL;
  });
}

/**
 * Run classification on an image.
 *
 * @param {HTMLImageElement|HTMLCanvasElement|HTMLVideoElement} imageSource
 * @returns {Promise<{classification: string, confidence: number, probabilities: Object, inferenceTime: number}>}
 */
export async function classifyImage(imageSource) {
  // Ensure model is loaded
  const loadedModel = await loadModel();

  const startTime = performance.now();

  // Preprocess
  const inputTensor = preprocessImage(imageSource);

  // Run inference
  const prediction = loadedModel.predict(inputTensor);
  const probabilities = await prediction.data();

  // Clean up tensors
  inputTensor.dispose();
  prediction.dispose();

  const inferenceTime = Math.round(performance.now() - startTime);

  // Find the predicted class
  const probArray = Array.from(probabilities);
  const maxIndex = probArray.indexOf(Math.max(...probArray));
  const predictedClass = CLASS_NAMES_ORDERED[maxIndex];

  const result = {
    classification: DISPLAY_NAMES[predictedClass],
    confidence: Math.round(probArray[maxIndex] * 100),
    probabilities: {
      high: Math.round(probArray[CLASS_NAMES_ORDERED.indexOf('high')] * 100),
      medium: Math.round(probArray[CLASS_NAMES_ORDERED.indexOf('medium')] * 100),
      degraded: Math.round(probArray[CLASS_NAMES_ORDERED.indexOf('degraded')] * 100),
    },
    inferenceTime,
  };

  console.log(`🔍 Classification: ${result.classification} (${result.confidence}%) in ${inferenceTime}ms`);

  return result;
}

/**
 * Warm up the model with a dummy inference (makes first real inference faster)
 */
export async function warmupModel() {
  const loadedModel = await loadModel();
  const dummy = tf.zeros([1, 224, 224, 3]);
  const warmupResult = loadedModel.predict(dummy);
  warmupResult.dispose();
  dummy.dispose();
  console.log('🔥 Model warmed up');
}
