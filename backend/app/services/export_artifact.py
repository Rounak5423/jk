"""
Export each page as PNG to the artifact directory for visual preview.
"""
import os
import shutil
from pathlib import Path

ARTIFACT_DIR = Path(r"C:\Users\Rounak singh\.gemini\antigravity\brain\bfe7d14c-c706-40f7-8541-b510c5005919")
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
DATA_DIR = BASE_DIR / "data_source"
PDF_FILE = DATA_DIR / "JK_Tyre_Trip_Score_EDA_Report.pdf"

# Copy PDF to root and downloads if possible
try:
    shutil.copyfile(str(PDF_FILE), str(ARTIFACT_DIR / "JK_Tyre_Trip_Score_EDA_Report.pdf"))
    print("Copied PDF to artifact directory successfully!")
except Exception as e:
    print(f"Error copying PDF: {e}")
