# RetroScan AI

AI-powered highway sign retroreflectivity scanner — a Progressive Web App that uses on-device deep learning to assess road sign condition, detect environmental conditions, and verify IRC compliance.

Built for the **NHAI 6th Innovation Hackathon**.

## Features

- **Real-time AI Classification** — MobileNetV3-Small runs in-browser via TensorFlow.js (no server)
- **3 Quality Classes** — High / Medium / Degraded retroreflectivity
- **IRC Compliance** — Automated checks against IRC 67:2012 & IRC 35:2015 thresholds
- **Condition Detection** — Day / Night / Wet environment heuristic
- **Degradation Heatmap** — Visual overlay highlighting degraded zones
- **GPS-Accurate Mapping** — Live location + scan pins on Leaflet map
- **PDF Reports** — IRC-compliant inspection report export
- **Offline-First PWA** — Works without internet after first install

## Quick Start

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Production build
npm run build
```

### Train the AI Model

```bash
cd ml
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt

python generate_dataset.py --split     # Generate 500 synthetic images
python train_model.py                   # Train MobileNetV3-Small (~30min GPU)
python convert_tfjs.py                  # Export to public/models/
```

> The app works without a trained model — it falls back to a brightness-based heuristic.

## Project Structure

```
RetroScan_AI/
├── public/models/           # TF.js model (model.json + .bin shards)
├── src/
│   ├── App.jsx              # Root: routing, theme, nav
│   ├── pages/
│   │   ├── CaptureScreen    # Camera + GPS + AI trigger
│   │   ├── ResultScreen     # Classification + compliance + heatmap
│   │   ├── MapDashboard     # Leaflet map + GPS dot + scan pins
│   │   └── History          # Scan history with trends
│   └── utils/
│       ├── inference.js     # TF.js model loading + classification
│       ├── conditionDetector.js  # Day/night/wet heuristic
│       ├── compliance.js    # IRC threshold logic
│       └── heatmap.js       # Degradation overlay
├── ml/                      # Python ML pipeline
│   ├── generate_dataset.py  # Synthetic sign generator
│   ├── train_model.py       # MobileNetV3 training
│   └── convert_tfjs.py      # Keras → TF.js converter
└── vite.config.js           # Vite + PWA + TF.js config
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite 8, Tailwind CSS 4 |
| AI | TensorFlow.js (WebGL), MobileNetV3-Small |
| Maps | Leaflet + react-leaflet, CARTO tiles |
| PDF | jsPDF + html-to-image |
| PWA | VitePWA (Workbox) |
| Training | TensorFlow/Keras (Python) |

## Standards

- **IRC 67:2012** — Code of Practice for Road Signs
- **IRC 35:2015** — Code of Practice for Road Markings


