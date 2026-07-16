"""Compatibility entry point for real mDeBERTa text-classifier training."""

from ai.training.train_transformer_classifier import main

if __name__ == "__main__":
    main(default_task="text")
