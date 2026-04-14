"""
RetroScan AI — Model Training Script
Trains MobileNetV3-Small for retroreflectivity classification.

Can run locally (CPU — slower) or on Google Colab (GPU — faster).

Usage:
  python train_model.py
  python train_model.py --data ./data --epochs 20 --batch 32

For Colab: Upload this file + data/ folder, then run.
"""

import os
import argparse
import numpy as np
import tensorflow as tf
from tensorflow.keras.applications import MobileNetV3Small
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint
from sklearn.metrics import classification_report, confusion_matrix
import json


def create_model(num_classes=3, input_shape=(224, 224, 3)):
    """Create MobileNetV3-Small with custom classification head."""
    # Load pretrained base
    base_model = MobileNetV3Small(
        input_shape=input_shape,
        include_top=False,
        weights="imagenet",
    )

    # Freeze base layers initially
    base_model.trainable = False

    # Build model
    model = tf.keras.Sequential([
        base_model,
        tf.keras.layers.GlobalAveragePooling2D(),
        tf.keras.layers.BatchNormalization(),
        tf.keras.layers.Dense(128, activation="relu"),
        tf.keras.layers.Dropout(0.3),
        tf.keras.layers.Dense(num_classes, activation="softmax"),
    ])

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    return model, base_model


def create_data_generators(data_dir, batch_size=32, img_size=(224, 224)):
    """Create train and validation data generators with augmentation."""
    train_datagen = ImageDataGenerator(
        rescale=1.0 / 255,
        rotation_range=15,
        width_shift_range=0.1,
        height_shift_range=0.1,
        brightness_range=[0.8, 1.2],
        zoom_range=0.1,
        horizontal_flip=True,
        fill_mode="nearest",
    )

    val_datagen = ImageDataGenerator(rescale=1.0 / 255)

    train_dir = os.path.join(data_dir, "train")
    val_dir = os.path.join(data_dir, "val")

    train_gen = train_datagen.flow_from_directory(
        train_dir,
        target_size=img_size,
        batch_size=batch_size,
        class_mode="categorical",
        shuffle=True,
    )

    val_gen = val_datagen.flow_from_directory(
        val_dir,
        target_size=img_size,
        batch_size=batch_size,
        class_mode="categorical",
        shuffle=False,
    )

    print(f"\nClass indices: {train_gen.class_indices}")
    print(f"Train samples: {train_gen.samples}")
    print(f"Val samples:   {val_gen.samples}")

    return train_gen, val_gen


def train(data_dir, epochs=20, batch_size=32, output_dir="./models"):
    """Full training pipeline."""
    os.makedirs(output_dir, exist_ok=True)

    # ── Create data generators ──
    train_gen, val_gen = create_data_generators(data_dir, batch_size)

    # ── Create model ──
    model, base_model = create_model(num_classes=3)
    model.summary()

    # ── Callbacks ──
    callbacks = [
        EarlyStopping(monitor="val_accuracy", patience=5, restore_best_weights=True),
        ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=3, min_lr=1e-6),
        ModelCheckpoint(
            os.path.join(output_dir, "best_model.keras"),
            monitor="val_accuracy",
            save_best_only=True,
        ),
    ]

    # ── Phase 1: Train head only (frozen base) ──
    print("\n" + "=" * 60)
    print("PHASE 1: Training classification head (base frozen)")
    print("=" * 60)

    history1 = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=min(epochs // 2, 10),
        callbacks=callbacks,
    )

    # ── Phase 2: Fine-tune (unfreeze last 20 layers) ──
    print("\n" + "=" * 60)
    print("PHASE 2: Fine-tuning (unfreezing last 20 layers)")
    print("=" * 60)

    base_model.trainable = True
    for layer in base_model.layers[:-20]:
        layer.trainable = False

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-4),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    history2 = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=epochs,
        initial_epoch=len(history1.history["loss"]),
        callbacks=callbacks,
    )

    # ── Evaluate ──
    print("\n" + "=" * 60)
    print("EVALUATION")
    print("=" * 60)

    val_gen.reset()
    y_pred_probs = model.predict(val_gen)
    y_pred = np.argmax(y_pred_probs, axis=1)
    y_true = val_gen.classes

    class_names = list(train_gen.class_indices.keys())
    report = classification_report(y_true, y_pred, target_names=class_names)
    cm = confusion_matrix(y_true, y_pred)

    print(report)
    print(f"\nConfusion Matrix:\n{cm}")

    # ── Save model ──
    model_path = os.path.join(output_dir, "retroscan_model.keras")
    model.save(model_path)
    print(f"\n✅ Model saved to {model_path}")

    # Also save as H5 for compatibility
    h5_path = os.path.join(output_dir, "retroscan_model.h5")
    model.save(h5_path)
    print(f"✅ Model saved to {h5_path}")

    # Save class indices
    with open(os.path.join(output_dir, "class_indices.json"), "w") as f:
        json.dump(train_gen.class_indices, f)

    # Save training metrics
    metrics = {
        "accuracy": float(np.mean(y_pred == y_true)),
        "classification_report": report,
        "confusion_matrix": cm.tolist(),
        "class_names": class_names,
    }
    with open(os.path.join(output_dir, "training_metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"\n🎯 Final Accuracy: {metrics['accuracy']:.2%}")

    return model, metrics


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train RetroScan AI model")
    parser.add_argument("--data", default="./data", help="Dataset directory (with train/ and val/ subdirs)")
    parser.add_argument("--epochs", type=int, default=20, help="Total training epochs")
    parser.add_argument("--batch", type=int, default=32, help="Batch size")
    parser.add_argument("--output", default="./models", help="Output directory for model files")
    args = parser.parse_args()

    model, metrics = train(args.data, args.epochs, args.batch, args.output)
    print("\n✅ Training complete!")
