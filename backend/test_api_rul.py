"""Test RUL API endpoint with database"""
from app import create_app
from app.extensions import db
from app.models import Tyre
from app.services.rul_service import RULService

app = create_app()

with app.app_context():
    # Check model status
    print("=" * 80)
    print("RUL API INTEGRATION TEST")
    print("=" * 80)
    
    print("\n1. Model Status:")
    model_available = RULService.is_model_available()
    print(f"   ML Model Available: {model_available}")
    print(f"   Using: {'ML Predictor' if model_available else 'Formula Fallback'}")
    
    # Find a tyre to test
    print("\n2. Testing with database tyre:")
    tyres = Tyre.query.limit(1).all()
    
    if not tyres:
        print("   ✗ No tyres in database")
        print("   Run synthetic data generator first")
    else:
        tyre = tyres[0]
        print(f"   ✓ Found tyre: {tyre.serial_number}")
        print(f"   Tyre ID: {tyre.id}")
        print(f"   Current NSD: {tyre.current_nsd} mm")
        print(f"   Total KM: {tyre.total_km_run} km")
        
        # Create mock inspection history
        print("\n3. Generating RUL prediction:")
        inspection_history = [
            {
                "tyre_id": tyre.id,
                "inspection_date": "2024-01-01",
                "odometer_km": tyre.total_km_run - 30000 if tyre.total_km_run > 30000 else 0,
                "nsd_fl_mm": tyre.blueprint_nsd - 1.5,
                "otd_mm": tyre.blueprint_nsd,
            },
            {
                "tyre_id": tyre.id,
                "inspection_date": "2024-06-01",
                "odometer_km": tyre.total_km_run - 15000 if tyre.total_km_run > 15000 else tyre.total_km_run / 2,
                "nsd_fl_mm": tyre.blueprint_nsd - 2.5,
                "otd_mm": tyre.blueprint_nsd,
            },
            {
                "tyre_id": tyre.id,
                "inspection_date": "2024-11-01",
                "odometer_km": tyre.total_km_run,
                "nsd_fl_mm": tyre.current_nsd,
                "otd_mm": tyre.blueprint_nsd,
            },
        ]
        
        result = RULService.predict_rul(
            tyre_id=tyre.id,
            inspection_history=inspection_history,
            d_limit=1.6
        )
        
        print(f"   Status: {result.get('status')}")
        print(f"   Method: {result.get('method', result.get('recommended_method', 'N/A'))}")
        
        if result.get('rul_km'):
            print(f"   Predicted RUL: {result.get('rul_km'):,.0f} km")
        elif result.get('rul_recommended_km'):
            print(f"   Predicted RUL: {result.get('rul_recommended_km'):,.0f} km")
        
        print(f"   Confidence: {result.get('confidence')}")
        print(f"   Model Available: {result.get('model_available', False)}")
    
    print("\n" + "=" * 80)
    print("API ENDPOINTS AVAILABLE:")
    print("=" * 80)
    print("GET /api/v1/tyres/<tyre_id>/rul-prediction")
    print("GET /api/v1/tyres/<tyre_id>/rul-prediction?d_limit=1.6")
    print("GET /api/v1/tyres/<tyre_id>/rul-prediction?compare=true")
    print("GET /api/v1/tyres/rul-model/status")
    print("=" * 80)
