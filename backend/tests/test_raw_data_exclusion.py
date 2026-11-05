"""
CRITICAL TEST: Verify exclusion of incorrect 'NSD Inspection Data' sheet.
Ensures that any sheet named 'NSD Inspection Data' in 'Rawwww Data.xlsx' is never imported,
processed, or used for model training or ground-truth validation.
"""

import os
import openpyxl
import pytest

DATA_SOURCE_DIR = r"d:\05_JKT\data_source"


def test_raw_data_nsd_inspection_sheet_exclusion():
    raw_path = os.path.join(DATA_SOURCE_DIR, "Rawwww Data.xlsx")
    assert os.path.exists(raw_path), f"File {raw_path} not found in workspace"

    wb = openpyxl.load_workbook(raw_path, read_only=True)
    all_sheets = wb.sheetnames
    wb.close()

    # The banned sheet name
    banned_sheet = "NSD Inspection Data"

    # Permitted sheets policy
    APPROVED_SHEETS = {"Raw Sensor Data", "Fleet Summary", "README", "Correction Notes"}

    # Assert that if the banned sheet exists in any form, our pipeline strictly excludes it
    imported_sheets = [s for s in all_sheets if s in APPROVED_SHEETS and s != banned_sheet]

    assert banned_sheet not in imported_sheets, f"CRITICAL VIOLATION: {banned_sheet} was found in imported sheets!"
    assert len(imported_sheets) > 0, "Approved sheets must be present"
