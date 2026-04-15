# RetroScan AI

**AI-powered highway sign retroreflectivity assessment as a Progressive Web App.**

Built for the NHAI 6th Innovation Hackathon — a vehicle-mounted smartphone system that uses on-device deep learning to classify road sign condition, detect environmental conditions, and check compliance against IRC 67:2012 & IRC 35:2015 standards.

> No cloud. No special hardware. Just a phone camera + AI.

---

## Table of Contents

- [Architecture](#architecture)
- [How It Works — End to End](#how-it-works--end-to-end)
  - [1. Camera Capture & GPS](#1-camera-capture--gps)
  - [2. AI Classification (TensorFlow.js)](#2-ai-classification-tensorflowjs)
  - [3. Environmental Condition Detection](#3-environmental-condition-detection)
  - [4. IRC Compliance Check](#4-irc-compliance-check)
  - [5. Degradation Heatmap](#5-degradation-heatmap)
  - [6. GPS-Accurate Map Visualization](#6-gps-accurate-map-visualization)
  - [7. Scan History & Persistence](#7-scan-history--persistence)
  - [8. PDF Export](#8-pdf-export)
  - [9. Offline Support (PWA)](#9-offline-support-pwa)
- [ML Training Pipeline](#ml-training-pipeline)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Setup & Run](#setup--run)
- [Standards Reference](#standards-reference)

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Browser (PWA)                         │
│                                                              │
│  ┌─────────────┐   ┌──────────────┐   ┌────────────────┐   │
│  │ CaptureScreen│──▶│  inference.js │──▶│  ResultScreen   │   │
│  │             │   │  (TF.js)     │   │               │   │
│  │ • Camera    │   │  • Preprocess│   │ • Classification│   │
│  │ • GPS       │   │  • Classify  │   │ • Compliance   │   │
│  │ • Capture   │   │  • Fallback  │   │ • Heatmap      │   │
│  └─────────────┘   └──────────────┘   │ • PDF export   │   │
│         │                              └────────────────┘   │
│         │          ┌──────────────┐   ┌────────────────┐   │
│         │          │conditionDet. │   │  compliance.js  │   │
│         └─────────▶│  (heuristic) │──▶│  (IRC 67/35)   │   │
│                    └──────────────┘   └────────────────┘   │
│                                                              │
│  ┌─────────────┐   ┌──────────────┐                         │
│  │ MapDashboard │   │   History     │  ← localStorage        │
│  │ • Leaflet   │   │ • Scan list  │                         │
│  │ • GPS dot   │   │ • Trend      │                         │
│  │ • Filters   │   │ • Export     │                         │
│  └─────────────┘   └──────────────┘                         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Service Worker (Workbox / VitePWA)          │   │
│  │           Caches: app shell + model.json + .bin       │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                     ML Pipeline (Python)                      │
│                                                              │
│  generate_dataset.py ──▶ train_model.py ──▶ convert_tfjs.py │
│  (500 synthetic signs)   (MobileNetV3)     (Keras → TF.js)  │
│                                                              │
│  Output: public/models/model.json + group1-shard1of1.bin     │
└──────────────────────────────────────────────────────────────┘
```

---

## How It Works — End to End

### 1. Camera Capture & GPS

**File:** `src/pages/CaptureScreen.jsx`

When the user opens the app, two things happen simultaneously:

**Camera initialization:**
```javascript
const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
});
```
- `facingMode: 'environment'` → selects the **rear camera** on mobile (the one facing away from you). This is critical because the user points the phone at road signs.
- The `<video>` element streams live camera frames in real time.

**GPS acquisition:**
```javascript
navigator.geolocation.getCurrentPosition((position) => {
    setLocation({
        lat: position.coords.latitude.toFixed(5),
        lng: position.coords.longitude.toFixed(5)
    });
});
```
- Uses the [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API), a browser standard — **not** a third-party service.
- On mobile, the browser accesses the phone's **GPS chip directly** (hardware GPS), which gives ~3–5 meter accuracy outdoors.
- On desktop, it falls back to **Wi-Fi triangulation / IP geolocation** (~50–200m accuracy).
- `.toFixed(5)` keeps 5 decimal places (≈1.1m precision at the equator).

**Frame capture** (when user taps "Analyze"):
```javascript
const canvas = document.createElement('canvas');
canvas.width = video.videoWidth;
canvas.height = video.videoHeight;
const ctx = canvas.getContext('2d');
ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
const imageDataURL = canvas.toDataURL('image/jpeg', 0.85);
```
- Creates an off-screen `<canvas>`, draws the current video frame onto it.
- Exports as a JPEG data URL (base64 encoded) at 85% quality — balances file size vs. detail.
- This single frame is what gets analyzed, stored, and displayed.

**AI model pre-loading:**
The model loads in the background as soon as the CaptureScreen mounts:
```javascript
loadModel((progress) => {
    setModelProgress(Math.round(progress * 100));
}).then(() => setModelReady(true));
```
The green "● AI Ready" badge appears once loading completes. If it fails (model files don't exist yet), the app silently falls back to the brightness heuristic.

---

### 2. AI Classification (TensorFlow.js)

**File:** `src/utils/inference.js`

This is the core AI engine. It runs a MobileNetV3-Small neural network **entirely in the browser** — no server calls.

**Dynamic import (lazy loading):**
```javascript
let tf = null;
async function getTF() {
    if (tf) return tf;
    tf = await import('@tensorflow/tfjs');
    return tf;
}
```
- TensorFlow.js is ~1.7MB. Loading it at app start would block rendering.
- Using `import()` (dynamic import) means TF.js only loads **when the user first scans**, not when the app opens.
- After the first load, the `tf` variable is cached in module scope — subsequent scans are instant.

**Model loading:**
```javascript
model = await tfLib.loadLayersModel('/models/model.json');
```
- `model.json` describes the network architecture (layers, shapes, weights manifest).
- Weight data lives in `.bin` shard files referenced by `model.json`.
- The Workbox service worker caches these files so the model loads **offline** after first visit.

**Preprocessing pipeline:**
```javascript
function preprocessImage(tfLib, imageSource) {
    return tfLib.tidy(() => {
        const tensor = tfLib.browser.fromPixels(imageSource);      // [H,W,3] uint8
        const resized = tfLib.image.resizeBilinear(tensor, [224, 224]); // → [224,224,3]
        const normalized = resized.div(255.0);                     // → [0, 1] float32
        const batched = normalized.expandDims(0);                  // → [1,224,224,3]
        return batched;
    });
}
```
Step by step:
1. `fromPixels()` — reads the image element's pixel data into a 3D tensor `[height, width, 3]`
2. `resizeBilinear()` — resizes to `224×224` (MobileNetV3's input size) using bilinear interpolation
3. `div(255.0)` — normalizes pixel values from `[0, 255]` to `[0.0, 1.0]` (matching training normalization)
4. `expandDims(0)` — adds a batch dimension: `[224,224,3]` → `[1,224,224,3]` (model expects batched input)
5. `tidy()` — automatic garbage collection of intermediate tensors (prevents WebGL memory leaks)

**Classification:**
```javascript
const prediction = loadedModel.predict(inputTensor);
const probabilities = await prediction.data();
```
- `predict()` runs the forward pass through the neural network on the **GPU via WebGL**.
- Returns a `[1, 3]` tensor: probability for each class.
- `data()` copies the result from GPU memory to JavaScript.

**Class ordering:**
```javascript
const CLASS_NAMES_ORDERED = ['degraded', 'high', 'medium'];
```
- Keras `flow_from_directory` sorts class folders **alphabetically**.
- So index 0 = `degraded`, 1 = `high`, 2 = `medium`.
- The argmax of the probability array gives the predicted class.

**Fallback heuristic** (if model not available):
```javascript
function fallbackClassification(canvas) {
    // Compute average brightness of all pixels
    const avgBrightness = totalBrightness / pixelCount;
    
    if (avgBrightness > 160) return 'High';      // bright → good retroreflectivity
    if (avgBrightness > 100) return 'Medium';     // moderate
    return 'Degraded';                             // dark → poor retroreflectivity
}
```
- Uses the ITU-R BT.601 luminance formula: `Y = 0.299R + 0.587G + 0.114B`
- Bright signs reflect more light → higher retroreflectivity is correlated with pixel brightness.
- This is a crude proxy, but ensures the app **never crashes** even without a trained model.

---

### 3. Environmental Condition Detection

**File:** `src/utils/conditionDetector.js`

Detects whether the photo was taken in **day**, **night**, or **wet** conditions. This matters because IRC standards have different thresholds per condition.

**How it works:**
```javascript
// Downsample to 100×100 for speed (10,000 pixels vs. ~921,600 for 1280×720)
ctx.drawImage(imageSource, 0, 0, 100, 100);
const pixels = ctx.getImageData(0, 0, 100, 100).data;
```

Then iterates all 10,000 pixels and computes:
- **Average brightness** (ITU-R BT.601 weighted luminance)
- **Average R, G, B** channels separately
- **Glare ratio** (% of pixels with brightness > 200)

**Detection rules:**

| Condition | Rule | Why |
|-----------|------|-----|
| **Night** | `avgBrightness < 50` | Very dark image = nighttime |
| **Night** (with lights) | `avgBrightness < 80 && glare > 5%` | Dark but with bright spots = headlights / street lights |
| **Wet** | `avgB > avgR × 1.15 && avgB > avgG && brightness ∈ [100, 200]` | Blue-dominant = sky reflecting off wet road surface |
| **Day** | Everything else | Normal daylight |

This is a **heuristic** (simple rule-based), not a neural network. It works well enough for the hackathon demo because the brightness/color distributions of day, night, and wet photos are quite distinct.

---

### 4. IRC Compliance Check

**File:** `src/utils/compliance.js`

Maps the AI classification to an **estimated retroreflectivity value** (RA, in cd/lux/m²) and checks it against regulatory thresholds.

**Estimated RA mapping:**
```javascript
const RA_ESTIMATES = {
    High: 300,       // RA > 250 → well-maintained sign
    Medium: 175,     // RA 100–250 → moderately worn
    Degraded: 75,    // RA < 100 → needs replacement
};
```

**IRC thresholds by condition:**
```javascript
const CONDITION_THRESHOLDS = {
    day:   { high: 250, degraded: 100 },  // IRC 67:2012
    night: { high: 180, degraded: 70 },   // Adjusted for night visibility
    wet:   { high: 200, degraded: 80 },   // Adjusted for wet surface scatter
};
```

**Logic:**
- If `estimatedRA ≥ high threshold` → **PASS** (green ✓)
- If `estimatedRA ≥ degraded threshold` → **MARGINAL** (amber ⚠)
- If `estimatedRA < degraded threshold` → **FAIL** (red ✗)

Example: A "Degraded" sign (RA≈75) in "night" conditions (threshold=70) → `75 ≥ 70` → **MARGINAL**, not FAIL. The same sign in "day" conditions (threshold=100) → `75 < 100` → **FAIL**. This demonstrates how condition-aware thresholds work.

---

### 5. Degradation Heatmap

**File:** `src/utils/heatmap.js`

Generates a visual overlay showing **where** on the sign the degradation is concentrated.

**Implementation (simplified GradCAM):**
- Only activates for `classification === 'Degraded'`.
- Draws the original image on an off-screen canvas.
- Adds a semi-transparent dark overlay (`rgba(0,0,0,0.15)`) to darken the image.
- Generates 2–5 **radial gradient circles** positioned in the center region of the image (where the sign would be):
  ```javascript
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, 'rgba(239, 68, 68, 0.7)');    // Solid red center
  gradient.addColorStop(0.4, 'rgba(239, 68, 68, 0.45)');  // Fading red
  gradient.addColorStop(0.7, 'rgba(245, 158, 11, 0.25)'); // Transition to amber
  gradient.addColorStop(1, 'rgba(245, 158, 11, 0)');      // Transparent edge
  ```
- Adds a small legend box in the bottom-right corner.
- Exports as a PNG data URL.

**Honesty note:** This is **not** real GradCAM (Gradient-weighted Class Activation Mapping). Real GradCAM would require extracting activations from intermediate convolutional layers of the ONNX/TF.js model during inference, which is complex to implement in-browser. The zones are semi-random but visually convincing for the demo.

---

### 6. GPS-Accurate Map Visualization

**File:** `src/pages/MapDashboard.jsx`

The map is **not** using any special proprietary geolocation service. Here's exactly how the accuracy works:

**Why the GPS location is so accurate:**

```javascript
navigator.geolocation.getCurrentPosition(
    (position) => {
        const loc = [position.coords.latitude, position.coords.longitude];
        setUserLocation(loc);
        setMapCenter(loc);
        setMapZoom(14);
    },
    (err) => { ... },
    { enableHighAccuracy: true, timeout: 8000 }
);
```

The `enableHighAccuracy: true` option tells the browser to use the **best available positioning source**:

| Device | Source | Accuracy |
|--------|--------|----------|
| Mobile (outdoors) | **Hardware GPS chip** (L1/L5 bands) | 3–5 meters |
| Mobile (indoors) | **Wi-Fi + Cell tower triangulation** | 10–50 meters |
| Desktop (Wi-Fi) | **Wi-Fi positioning** (Google/Apple BSSID databases) | 20–100 meters |
| Desktop (Ethernet) | **IP geolocation** | 1–10 km |

The latitude/longitude coordinates come directly from the phone's GPS hardware through the browser's Geolocation API — the same API Google Maps uses. On a modern smartphone outdoors, this is typically **3–5 meter accuracy**.

**Map rendering:**
- Uses **Leaflet** (open-source) + **CARTO** tiles (free, no API key needed).
- Dark/light themes switch between `dark_all` and `light_all` tile layers.
- `MapContainer` is rendered once; subsequent center changes use `FlyToLocation`:
  ```javascript
  function FlyToLocation({ position, zoom }) {
      const map = useMap();
      useEffect(() => {
          if (position) map.flyTo(position, zoom, { duration: 1.5 });
      }, [position, zoom, map]);
      return null;
  }
  ```
  This is needed because react-leaflet's `MapContainer` `center` prop is **immutable after mount**. The `useMap()` hook gives access to the Leaflet instance for programmatic pan/zoom.

**User location marker:**
```javascript
const userLocationIcon = L.divIcon({
    html: `<div style="width:14px;height:14px;background:#3b82f6;border:3px solid #fff;
           border-radius:50%;box-shadow:0 0 0 3px rgba(59,130,246,0.3), 
           0 0 12px rgba(59,130,246,0.5);"></div>`,
});
```
- Blue pulsing dot (styled like Google Maps' location indicator).
- A `Circle` component draws a 50m radius ring around the location for visual context.

**Scan markers:** Each saved scan becomes a colored pin on the map:
- 🟢 Green = High quality
- 🟠 Amber = Medium
- 🔴 Red = Degraded

Clicking a pin shows a popup with: classification, confidence %, RA value, compliance status, and timestamp.

**Centering priority:**
1. User's live GPS → zoom 14 (street-level)
2. Latest scan location → zoom 13
3. Center of India `[20.5937, 78.9629]` → zoom 4

---

### 7. Scan History & Persistence

**File:** `src/pages/History.jsx`

All scan data persists in **`localStorage`** under the key `retroscan_history`. Each scan is a JSON object:

```json
{
    "id": 1713168042000,
    "date": "4/15/2026",
    "time": "01:38 AM",
    "timestamp": "2026-04-14T20:08:42.000Z",
    "imageDataURL": "data:image/jpeg;base64,/9j/4AAQ...",
    "classification": "Degraded",
    "confidence": 78,
    "probabilities": { "high": 16, "medium": 15, "degraded": 78 },
    "inferenceTime": 342,
    "condition": "night",
    "conditionLabel": "Night",
    "conditionIcon": "🌙",
    "complianceStatus": "marginal",
    "complianceLabel": "MARGINAL",
    "complianceIcon": "⚠",
    "complianceColor": "amber",
    "score": 75,
    "estimatedRA": 75,
    "threshold": 70,
    "lat": "8.50658",
    "lng": "76.94326",
    "status": "Fail",
    "accuracy": "78%"
}
```

The History page shows each scan as a card with:
- **Classification badge** (color-coded: green/amber/red)
- **Compliance badge** (PASS/MARGINAL/FAIL with shield icon)
- **Trend arrows**: compares the current scan's RA with the previous scan → ↑ (improving), ↓ (worsening), — (stable)
- **GPS coordinates** in monospace font
- **Confidence %** and condition icon

---

### 8. PDF Export

**File:** `src/pages/ResultScreen.jsx`

Generates an IRC-compliant PDF inspection report using **jsPDF** + **html-to-image**:

```javascript
const imgData = await toPng(input, { cacheBust: true, pixelRatio: 2 });
const pdf = new jsPDF('p', 'mm', 'a4');
```

1. `toPng()` (from `html-to-image`) screenshots the result card as a high-res PNG at 2× pixel ratio.
2. The PDF includes:
   - **Header:** "RetroScan AI - Inspection Report" in rose color
   - **Metadata:** timestamp, GPS coordinates, classification, confidence, RA value, compliance status, condition, IRC standard reference
   - **Visual:** the screenshotted result card
   - **Footer:** signature line + IRC standard reference
3. Saved as `NHAI_Report_{timestamp}.pdf`.

---

### 9. Offline Support (PWA)

**File:** `vite.config.js` — VitePWA plugin configuration

```javascript
VitePWA({
    registerType: 'autoUpdate',
    devOptions: { enabled: true, type: 'module' },
    workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: '/index.html'
    },
    manifest: {
        name: 'RetroScan AI',
        short_name: 'RetroScan',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#e11d48',
        background_color: '#0f0a0d',
    }
})
```

What this does:
- **Service Worker** (Workbox-generated): precaches all JS, CSS, HTML, and image assets on first visit.
- **`registerType: 'autoUpdate'`**: new versions are silently activated without prompting the user.
- **`display: 'standalone'`**: when "Add to Home Screen" is tapped, the app opens without a browser address bar — looks like a native app.
- **Model caching**: the `model.json` and `.bin` files in `public/models/` are also cached by the service worker, so AI inference works **fully offline**.

---

## ML Training Pipeline

Located in the `ml/` directory. Run these sequentially:

### Step 1: Generate Synthetic Dataset

```bash
python generate_dataset.py --split
```

**What it does:**
- Creates 500 synthetic road sign images across 3 classes:
  - `high/` (200) — bright colors, sharp edges, retroreflective shimmer dots
  - `medium/` (200) — moderate blur, fading, slight yellowing
  - `degraded/` (100) — heavy blur, dirt overlay, scratches, low contrast
- Each image starts as a programmatically drawn sign (circles, octagons, rectangles, triangles) with text (50, 60, STOP, NH-44, etc.)
- **Degradation pipeline** applies cumulatively:
  1. Brightness reduction (up to 55%)
  2. Contrast reduction (up to 45%)
  3. Color shift (yellowing)
  4. Gaussian blur (kernel size scales with degradation level)
  5. Noise/dirt texture overlay
  6. Scratch lines (for heavy degradation)
- **Environmental augmentation**: random rotation (±15°), brightness jitter, color jitter, occasional night simulation, motion blur
- `--split` flag automatically creates 80/20 train/val split

### Step 2: Train MobileNetV3-Small

```bash
python train_model.py --epochs 20
```

**Two-phase training:**
1. **Phase 1** (epochs 1–10): Base model frozen, only classification head trains at LR=1e-3
2. **Phase 2** (epochs 11–20): Last 20 layers unfrozen, fine-tuned at LR=1e-4

**Model architecture:**
```
MobileNetV3-Small (ImageNet pretrained, frozen/fine-tuned)
  → GlobalAveragePooling2D
  → BatchNormalization
  → Dense(128, relu)
  → Dropout(0.3)
  → Dense(3, softmax)  →  [degraded, high, medium]
```

**Callbacks:** EarlyStopping (patience=5), ReduceLROnPlateau (factor=0.5), ModelCheckpoint (saves best by val_accuracy).

**Outputs:** `models/retroscan_model.h5`, `models/class_indices.json`, `models/training_metrics.json`

### Step 3: Convert to TF.js

```bash
python convert_tfjs.py
```

- Uses `tensorflowjs_converter` to convert `.h5` → TF.js layers model format
- `--quantize_uint8`: compresses float32 weights to uint8 (4× size reduction, ~1–2% accuracy loss)
- Output: `public/models/model.json` + `group1-shard1of1.bin` (target: <3MB total)

---

## Project Structure

```
RetroScan_AI/
├── public/
│   ├── models/                      # TF.js model files (generated)
│   │   ├── model.json              
│   │   └── group1-shard1of1.bin    
│   └── favicon.svg                 
│
├── src/
│   ├── App.jsx                      # Root: routing + theme + nav bar
│   ├── App.css                      # Theme tokens (CSS custom properties)
│   ├── main.jsx                     # React entry point
│   ├── index.css                    # Tailwind base imports
│   │
│   ├── pages/
│   │   ├── CaptureScreen.jsx        # Camera + GPS + AI pipeline trigger
│   │   ├── ResultScreen.jsx         # Classification display + heatmap + PDF
│   │   ├── MapDashboard.jsx         # Leaflet map + GPS dot + scan pins
│   │   └── History.jsx              # Scan history list with trends
│   │
│   └── utils/
│       ├── inference.js             # TF.js model loading + classification
│       ├── conditionDetector.js     # Day/night/wet heuristic
│       ├── compliance.js            # IRC 67:2012 / IRC 35:2015 thresholds
│       └── heatmap.js               # Degradation overlay generator
│
├── ml/                               # ML training pipeline (Python)
│   ├── generate_dataset.py          # Synthetic sign image generator
│   ├── train_model.py               # MobileNetV3-Small training
│   ├── convert_tfjs.py              # Keras → TF.js converter
│   ├── requirements.txt             # Python dependencies
│   ├── data/                         # Generated dataset (gitignored)
│   └── models/                       # Trained models (gitignored)
│
├── vite.config.js                    # Vite + PWA + TF.js optimize config
├── package.json                      # Node dependencies
└── .gitignore                        # Excludes ml/data, ml/models, ml/venv
```

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Framework** | React 19 | Component-based, fast dev cycle |
| **Bundler** | Vite 8 | Sub-second HMR, ESM-native |
| **Styling** | Tailwind CSS 4 | Utility-first, dark mode built-in |
| **Routing** | React Router 7 | Client-side multi-page navigation |
| **AI Runtime** | TensorFlow.js 4.x | GPU-accelerated (WebGL) browser inference |
| **Model** | MobileNetV3-Small | Designed for mobile: small, fast, accurate |
| **Maps** | Leaflet + react-leaflet | Open-source, no API key needed |
| **Tiles** | CARTO (basemaps) | Free dark/light map tiles |
| **Icons** | Lucide React | Lightweight, tree-shakeable icon set |
| **PDF** | jsPDF + html-to-image | In-browser PDF generation |
| **PWA** | VitePWA (Workbox) | Offline caching, installability |
| **Training** | TensorFlow/Keras (Python) | Pre-training the model on synthetic data |
| **Persistence** | localStorage | No backend needed, works offline |

---

## Setup & Run

### Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.10 (for ML pipeline only)

### Frontend (React PWA)

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Production build
npm run build && npm run preview
```

### ML Pipeline (train the AI model)

```bash
cd ml

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install Python dependencies
pip install -r requirements.txt

# Generate synthetic dataset (500 images, ~2 minutes)
python generate_dataset.py --split

# Train model (20 epochs, ~30 min on GPU)
python train_model.py

# Convert to TF.js and deploy to public/models/
python convert_tfjs.py --model ./models/retroscan_model.h5 --output ../public/models
```

After conversion, restart the dev server — the "● AI Ready" badge on the Capture screen will turn green once the model loads.

---

## Standards Reference

| Standard | Full Title | Relevance |
|----------|-----------|-----------|
| **IRC 67:2012** | Code of Practice for Road Signs | Defines minimum retroreflectivity (RA) values for road signs |
| **IRC 35:2015** | Code of Practice for Road Markings | Defines RA requirements for pavement markings |
| **IS 1721:1987** | Specification for Road Signs | Technical specifications for sign materials |
| **ASTM E810** | Standard Test Method for RA | How retroreflectivity is physically measured |

RetroScan AI estimates RA from visual appearance using AI classification, then checks against IRC thresholds. This is a **screening tool** — it does not replace certified retroreflectometers but enables low-cost, high-frequency monitoring at scale.
