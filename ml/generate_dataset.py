"""
RetroScan AI — Synthetic Road Sign Dataset Generator
Generates 500 labeled images simulating different retroreflectivity levels.

Classes:
  - high (200 images)    : RA > 250 cd/lux/m² — bright, sharp, high contrast
  - medium (200 images)  : RA 100-250         — moderate fading
  - degraded (100 images): RA < 100           — faded, blurred, dirty

Usage:
  python generate_dataset.py
  python generate_dataset.py --output ./data --count 500
"""

import os
import random
import argparse
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
import cv2


# ── Sign templates ──────────────────────────────────────────────────────────

SIGN_CONFIGS = [
    # (shape, bg_color, text, text_color, border_color)
    ("circle", (255, 0, 0), "50", (255, 255, 255), (255, 255, 255)),       # Speed limit
    ("circle", (255, 0, 0), "60", (255, 255, 255), (255, 255, 255)),
    ("circle", (255, 0, 0), "80", (255, 255, 255), (255, 255, 255)),
    ("circle", (255, 0, 0), "100", (255, 255, 255), (255, 255, 255)),
    ("octagon", (255, 0, 0), "STOP", (255, 255, 255), (255, 255, 255)),    # Stop sign
    ("triangle", (255, 255, 0), "!", (0, 0, 0), (0, 0, 0)),               # Warning
    ("rect", (0, 100, 0), "EXIT", (255, 255, 255), (255, 255, 255)),       # Directional
    ("rect", (0, 0, 180), "NH-44", (255, 255, 255), (255, 255, 255)),      # Highway marker
    ("rect", (0, 100, 0), "→", (255, 255, 255), (255, 255, 255)),          # Arrow
    ("diamond", (255, 200, 0), "⚠", (0, 0, 0), (0, 0, 0)),               # Caution
    ("circle", (0, 0, 200), "P", (255, 255, 255), (255, 255, 255)),        # Parking
    ("rect", (0, 100, 0), "1 KM", (255, 255, 255), (255, 255, 255)),      # Distance
    ("circle", (255, 0, 0), "30", (255, 255, 255), (255, 255, 255)),
    ("rect", (0, 0, 150), "TOLL", (255, 255, 255), (255, 255, 255)),
]


def get_font(size):
    """Try to load a nice font, fall back to default."""
    font_paths = [
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]
    for fp in font_paths:
        if os.path.exists(fp):
            try:
                return ImageFont.truetype(fp, size)
            except Exception:
                pass
    return ImageFont.load_default()


def draw_sign_shape(draw, shape, bbox, bg_color, border_color):
    """Draw the sign shape on the image."""
    x1, y1, x2, y2 = bbox
    cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
    r = (x2 - x1) // 2

    if shape == "circle":
        draw.ellipse([x1, y1, x2, y2], fill=bg_color, outline=border_color, width=4)
    elif shape == "rect":
        draw.rounded_rectangle([x1, y1, x2, y2], radius=12, fill=bg_color, outline=border_color, width=4)
    elif shape == "octagon":
        # Approximate octagon
        import math
        points = []
        for i in range(8):
            angle = math.pi / 8 + i * math.pi / 4
            px = cx + int(r * math.cos(angle))
            py = cy + int(r * math.sin(angle))
            points.append((px, py))
        draw.polygon(points, fill=bg_color, outline=border_color)
    elif shape == "triangle":
        points = [(cx, y1), (x1, y2), (x2, y2)]
        draw.polygon(points, fill=bg_color, outline=border_color)
    elif shape == "diamond":
        points = [(cx, y1), (x2, cy), (cx, y2), (x1, cy)]
        draw.polygon(points, fill=bg_color, outline=border_color)
    else:
        draw.rectangle([x1, y1, x2, y2], fill=bg_color, outline=border_color, width=3)


def create_base_sign(config, size=512):
    """Create a clean, undegraded road sign image."""
    shape, bg_color, text, text_color, border_color = config

    # Random background (simulate sky/road/vegetation)
    bg_type = random.choice(["sky", "road", "mixed"])
    if bg_type == "sky":
        bg = tuple(random.randint(150, 220) for _ in range(3))
    elif bg_type == "road":
        g = random.randint(80, 140)
        bg = (g, g, g)
    else:
        bg = (random.randint(100, 180), random.randint(130, 200), random.randint(80, 150))

    img = Image.new("RGB", (size, size), bg)
    draw = ImageDraw.Draw(img)

    # Sign area (centered, with some margin for rotation)
    margin = size // 6
    bbox = (margin, margin, size - margin, size - margin)

    # Draw sign shape
    draw_sign_shape(draw, shape, bbox, bg_color, border_color)

    # Draw text
    font_size = size // 4 if len(text) <= 3 else size // 6
    font = get_font(font_size)
    cx, cy = size // 2, size // 2
    try:
        draw.text((cx, cy), text, fill=text_color, font=font, anchor="mm")
    except TypeError:
        # Fallback if anchor not supported
        tw = draw.textlength(text, font=font) if hasattr(draw, 'textlength') else len(text) * font_size // 2
        draw.text((cx - tw // 2, cy - font_size // 2), text, fill=text_color, font=font)

    # Add retroreflective "shimmer" — bright specular highlights for high quality signs
    for _ in range(random.randint(3, 8)):
        sx = random.randint(margin + 20, size - margin - 20)
        sy = random.randint(margin + 20, size - margin - 20)
        sr = random.randint(2, 6)
        draw.ellipse([sx - sr, sy - sr, sx + sr, sy + sr],
                     fill=(255, 255, 255, 200))

    return img


def apply_degradation(img, level):
    """
    Apply degradation effects to simulate retroreflectivity loss.

    level: 0.0 (pristine) to 1.0 (heavily degraded)
    """
    img_array = np.array(img, dtype=np.float32)

    # 1. Reduce brightness (fading retroreflective material)
    brightness_factor = 1.0 - (level * 0.55)
    img_array = img_array * brightness_factor

    # 2. Reduce contrast (weathering)
    contrast_factor = 1.0 - (level * 0.45)
    mean = img_array.mean()
    img_array = mean + (img_array - mean) * contrast_factor

    # 3. Add color shift (yellowing with age)
    if level > 0.3:
        yellow_shift = level * 15
        img_array[:, :, 0] = np.clip(img_array[:, :, 0] + yellow_shift, 0, 255)  # R
        img_array[:, :, 1] = np.clip(img_array[:, :, 1] + yellow_shift * 0.5, 0, 255)  # G

    img_array = np.clip(img_array, 0, 255).astype(np.uint8)

    # 4. Gaussian blur (material degradation + camera blur)
    blur_k = int(level * 8) * 2 + 1  # Must be odd
    if blur_k >= 3:
        img_array = cv2.GaussianBlur(img_array, (blur_k, blur_k), 0)

    # 5. Add dirt / noise texture
    if level > 0.2:
        noise = np.random.randint(0, int(40 * level), img_array.shape, dtype=np.uint8)
        img_array = cv2.addWeighted(img_array, 1.0, noise, 0.3 * level, 0)

    # 6. Add scratches (for heavily degraded)
    if level > 0.6:
        scratch_img = img_array.copy()
        h, w = scratch_img.shape[:2]
        for _ in range(random.randint(2, 5)):
            x1, y1 = random.randint(0, w), random.randint(0, h)
            x2, y2 = random.randint(0, w), random.randint(0, h)
            color = (random.randint(150, 200),) * 3
            cv2.line(scratch_img, (x1, y1), (x2, y2), color, random.randint(1, 3))
        img_array = cv2.addWeighted(img_array, 0.85, scratch_img, 0.15, 0)

    return Image.fromarray(img_array)


def apply_environmental_augmentation(img):
    """Random environmental effects: rotation, lighting, perspective."""
    # Random rotation
    angle = random.uniform(-15, 15)
    img = img.rotate(angle, resample=Image.BICUBIC, expand=False, fillcolor=(128, 128, 128))

    # Random brightness variation (simulating different times of day)
    enhancer = ImageEnhance.Brightness(img)
    img = enhancer.enhance(random.uniform(0.7, 1.3))

    # Random slight color jitter
    enhancer = ImageEnhance.Color(img)
    img = enhancer.enhance(random.uniform(0.8, 1.2))

    # Occasionally simulate night (dark image with bright sign areas)
    if random.random() < 0.15:
        enhancer = ImageEnhance.Brightness(img)
        img = enhancer.enhance(0.3)

    # Occasionally add slight motion blur
    if random.random() < 0.2:
        img = img.filter(ImageFilter.GaussianBlur(radius=random.uniform(0.5, 1.5)))

    return img


def generate_dataset(output_dir, n_high=200, n_medium=200, n_degraded=100, img_size=512):
    """Generate the full synthetic dataset."""
    classes = {
        "high":     (n_high,     0.0, 0.15),     # Very low degradation
        "medium":   (n_medium,   0.25, 0.55),     # Moderate degradation
        "degraded": (n_degraded, 0.60, 0.95),     # Heavy degradation
    }

    total = sum(c[0] for c in classes.values())
    generated = 0

    for class_name, (count, deg_min, deg_max) in classes.items():
        class_dir = os.path.join(output_dir, class_name)
        os.makedirs(class_dir, exist_ok=True)

        print(f"\n{'='*50}")
        print(f"Generating {count} '{class_name}' images (degradation: {deg_min:.0%}-{deg_max:.0%})")
        print(f"{'='*50}")

        for i in range(count):
            # Pick a random sign configuration
            config = random.choice(SIGN_CONFIGS)

            # Create base sign
            img = create_base_sign(config, size=img_size)

            # Apply degradation
            deg_level = random.uniform(deg_min, deg_max)
            img = apply_degradation(img, deg_level)

            # Apply environmental augmentation
            img = apply_environmental_augmentation(img)

            # Resize to training size
            img = img.resize((224, 224), Image.LANCZOS)

            # Save
            filename = f"{class_name}_{i:04d}.jpg"
            img.save(os.path.join(class_dir, filename), "JPEG", quality=90)

            generated += 1
            if (i + 1) % 50 == 0:
                print(f"  [{i+1}/{count}] generated")

    print(f"\n✅ Dataset complete: {generated} images in {output_dir}")
    print(f"   high: {n_high} | medium: {n_medium} | degraded: {n_degraded}")

    return generated


def split_dataset(data_dir, train_ratio=0.8):
    """Split dataset into train and validation sets."""
    import shutil

    train_dir = os.path.join(data_dir, "train")
    val_dir = os.path.join(data_dir, "val")

    for class_name in ["high", "medium", "degraded"]:
        src_dir = os.path.join(data_dir, class_name)
        if not os.path.exists(src_dir):
            continue

        train_class_dir = os.path.join(train_dir, class_name)
        val_class_dir = os.path.join(val_dir, class_name)
        os.makedirs(train_class_dir, exist_ok=True)
        os.makedirs(val_class_dir, exist_ok=True)

        files = sorted(os.listdir(src_dir))
        random.shuffle(files)

        split_idx = int(len(files) * train_ratio)
        train_files = files[:split_idx]
        val_files = files[split_idx:]

        for f in train_files:
            shutil.copy2(os.path.join(src_dir, f), os.path.join(train_class_dir, f))
        for f in val_files:
            shutil.copy2(os.path.join(src_dir, f), os.path.join(val_class_dir, f))

        print(f"  {class_name}: {len(train_files)} train, {len(val_files)} val")

    # Remove original flat class dirs
    for class_name in ["high", "medium", "degraded"]:
        src_dir = os.path.join(data_dir, class_name)
        if os.path.exists(src_dir):
            shutil.rmtree(src_dir)

    print("✅ Train/val split complete")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate synthetic retroreflectivity dataset")
    parser.add_argument("--output", default="./data", help="Output directory")
    parser.add_argument("--high", type=int, default=200, help="Number of high quality images")
    parser.add_argument("--medium", type=int, default=200, help="Number of medium quality images")
    parser.add_argument("--degraded", type=int, default=100, help="Number of degraded images")
    parser.add_argument("--size", type=int, default=512, help="Generation size before resize to 224")
    parser.add_argument("--split", action="store_true", help="Split into train/val after generation")
    args = parser.parse_args()

    generate_dataset(args.output, args.high, args.medium, args.degraded, args.size)

    if args.split:
        split_dataset(args.output)
