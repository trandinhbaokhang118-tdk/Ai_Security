"""Entry point for real ProtectAI prompt-classifier training or export."""

from ai.training.train_transformer_classifier import main

if __name__ == "__main__":
    main(default_task="prompt")
