"""
RetroScan AI — Convert Keras model to TensorFlow.js format

Converts the trained .h5/.keras model to a browser-ready TF.js format.
Output: model.json + weight shard .bin files

Usage:
  python convert_tfjs.py
  python convert_tfjs.py --model ./models/retroscan_model.h5 --output ../public/models

The output directory should be public/models/ in the React project so
Vite serves them as static assets.
"""

import os
import argparse
import subprocess
import sys


def convert_model(model_path, output_dir, quantize=True):
    """Convert Keras model to TF.js graph model format."""
    os.makedirs(output_dir, exist_ok=True)

    cmd = [
        sys.executable, "-m", "tensorflowjs_converter",
        "--input_format=keras",
        "--output_format=tfjs_layers_model",
    ]

    if quantize:
        cmd.append("--quantize_uint8")
        print("🔧 Quantizing to uint8 (smaller model, slightly lower precision)")

    cmd.extend([model_path, output_dir])

    print(f"\n{'='*60}")
    print(f"Converting: {model_path}")
    print(f"Output:     {output_dir}")
    print(f"Quantize:   {quantize}")
    print(f"{'='*60}")
    print(f"Command: {' '.join(cmd)}\n")

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode == 0:
        print("✅ Conversion successful!")

        # List output files and sizes
        total_size = 0
        for f in os.listdir(output_dir):
            fpath = os.path.join(output_dir, f)
            size = os.path.getsize(fpath)
            total_size += size
            print(f"   {f}: {size / 1024:.1f} KB")

        print(f"\n   Total model size: {total_size / 1024:.1f} KB ({total_size / (1024*1024):.2f} MB)")

        if total_size > 3 * 1024 * 1024:
            print("⚠️  Model is >3MB. Consider enabling quantization (--quantize)")
        else:
            print("✅ Model size is within target (<3MB)")
    else:
        print(f"❌ Conversion failed!")
        print(f"STDOUT: {result.stdout}")
        print(f"STDERR: {result.stderr}")

    return result.returncode == 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert Keras model to TF.js")
    parser.add_argument("--model", default="./models/retroscan_model.h5",
                        help="Path to Keras .h5 or .keras model")
    parser.add_argument("--output", default="../public/models",
                        help="Output directory (should be public/models/ in React project)")
    parser.add_argument("--no-quantize", action="store_true",
                        help="Disable uint8 quantization")
    args = parser.parse_args()

    success = convert_model(args.model, args.output, quantize=not args.no_quantize)
    if not success:
        sys.exit(1)
