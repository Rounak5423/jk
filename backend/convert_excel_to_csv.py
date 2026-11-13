"""
Phase 0: Convert Excel workbooks to CSV format for RUL model training.
This is the preprocessing step before running rul_build_dataset.py
"""
import os
import pandas as pd

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

print("=" * 80)
print("PHASE 0: Converting Excel files to CSV format")
print("=" * 80)

# Excel files from the user
excel_files = {
    "2ND": "2ND.xlsx",
    "3RD": "3RD_INSPECTION.xlsx",
    "4TH": "4TH_INSPECTION.xlsx",
}

all_rows = []
sensor_aggregates = []

print("\n1. Reading Excel files...")
for workbook_name, filename in excel_files.items():
    filepath = os.path.join(DATA_DIR, filename)
    
    if not os.path.exists(filepath):
        print(f"   ✗ {filename} not found!")
        continue
    
    print(f"   Reading {filename}...")
    
    try:
        # Read the Excel file
        df = pd.read_excel(filepath, sheet_name=0)  # First sheet
        
        print(f"      Columns: {list(df.columns)}")
        print(f"      Rows: {len(df)}")
        print(f"      First few rows:")
        print(df.head(3))
        
        # Add workbook identifier
        df['workbook'] = workbook_name
        
        # Determine if this is start or end of workbook
        # Assuming first row is "start", last row could be "end" for 4TH
        df['knot'] = 'start'
        if workbook_name == "4TH" and len(df) > 1:
            df.loc[df.index[-1], 'knot'] = 'end'
        
        all_rows.append(df)
        
        print(f"   ✓ {filename} processed successfully")
        
    except Exception as e:
        print(f"   ✗ Error reading {filename}: {e}")
        import traceback
        traceback.print_exc()

if not all_rows:
    print("\n✗ No Excel files could be read!")
    print("\nPlease ensure your Excel files have the following structure:")
    print("  - Columns for: tyre/position, g1, g2, g3, km_covered, timestamp, etc.")
    print("  - One row per inspection event")
    exit(1)

# Combine all data
print("\n2. Combining data from all workbooks...")
combined = pd.concat(all_rows, ignore_index=True)

print(f"   Total rows combined: {len(combined)}")
print(f"   Columns available: {list(combined.columns)}")

# Save as CSV
output_file = os.path.join(DATA_DIR, "raw_knot_candidates.csv")
combined.to_csv(output_file, index=False)
print(f"\n3. Saved to: {output_file}")

# Create a placeholder for interval_sensor_aggregates.csv if needed
# This would contain telemetry aggregates per workbook interval
# For now, create an empty one with expected structure
agg_file = os.path.join(DATA_DIR, "interval_sensor_aggregates.csv")
if not os.path.exists(agg_file):
    print(f"\n4. Creating placeholder: interval_sensor_aggregates.csv")
    
    # Extract unique tyres/positions
    if 'tyre' in combined.columns or 'position' in combined.columns:
        tyre_col = 'tyre' if 'tyre' in combined.columns else 'position'
        
        agg_data = []
        for wb in excel_files.keys():
            wb_data = combined[combined['workbook'] == wb]
            for tyre in wb_data[tyre_col].unique():
                if pd.notna(tyre) and tyre != "VEHICLE":
                    agg_data.append({
                        'workbook': wb,
                        'tyre': tyre,
                        'pressure_mean': 8.5,  # Default values
                        'pressure_std': 0.2,
                        'temp_mean': 70.0,
                        'temp_max': 85.0,
                    })
        
        if agg_data:
            agg_df = pd.DataFrame(agg_data)
            agg_df.to_csv(agg_file, index=False)
            print(f"   ✓ Created with {len(agg_df)} rows")
    else:
        print("   ⚠ Could not create aggregate file - missing tyre/position column")

print("\n" + "=" * 80)
print("PHASE 0 COMPLETE")
print("=" * 80)
print("\nNext steps:")
print("  1. Review the generated CSV files in backend/data/")
print("  2. Run: python -m app.services.rul_build_dataset")
print("  3. Run: python -m app.services.rul_train_evaluate")
print("=" * 80)
