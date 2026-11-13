"""
Common utilities and path constants for RUL model integration.
"""
import os

# Base paths
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DATA = os.path.join(BASE_DIR, "data")
REPORTS = os.path.join(BASE_DIR, "reports")
MODELS = os.path.join(os.path.dirname(__file__), "models")
FIGS = os.path.join(REPORTS, "figures")

# Random seed for reproducibility
SEED = 42

# Create directories if they don't exist
os.makedirs(DATA, exist_ok=True)
os.makedirs(REPORTS, exist_ok=True)
os.makedirs(MODELS, exist_ok=True)
os.makedirs(FIGS, exist_ok=True)
