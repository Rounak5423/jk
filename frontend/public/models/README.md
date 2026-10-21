# 3D Vehicle Model Setup

## Required File

To use the 3D vehicle GLB model, you need to place the following file in this directory:

**File name:** `truck_clean_no_tyres.glb`

**Location:** Place it here:
```
frontend/public/models/truck_clean_no_tyres.glb
```

## How to Add the GLB File

1. **If you have the GLB file** on your computer:
   - Copy the file `truck_clean_no_tyres.glb` 
   - Paste it into this folder: `frontend/public/models/`

2. **If you don't have the GLB file yet**:
   - The current 3D viewer will continue working with the procedural (programmatically generated) vehicle
   - No errors will occur - the system automatically falls back to the procedural model

## What the GLB Model Provides

The GLB model (`truck_clean_no_tyres.glb`) provides:
- A photorealistic 3D commercial truck model
- Optimized geometry for real-time rendering
- Proper materials and textures
- The tyres are generated programmatically and overlaid on the model with health-status colors

## Current Status

✅ The 3D viewer is working with a procedural fallback
✅ Ready to load the GLB model once you provide the file
✅ Tyre health visualization is fully functional

Simply add the GLB file when you have it available!
