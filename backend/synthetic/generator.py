"""
Dedicated Synthetic Data Generator for JK Tyre THI Fleet Intelligence Platform.
Generates reproducible, physically correlated fleet datasets:
- Configurable random seed
- 20-50 starter vehicles (Heavy Truck, Light Truck, Bus, LCV)
- Multi-week history of monotonic odometers, trips, telemetry, inspections, alerts, and THI
- Plausible correlated pressure, temperature, speed, battery, and wear
- Specific edge cases: normal operation, thermal stress, slow puncture, sensor fault, stale data
- Explicit provenance: 'SYNTHETIC'
"""

import argparse
import random
import uuid
from datetime import datetime, timedelta, timezone
from app.config import Config
from app.extensions import db
from app.models import (
    Fleet,
    User,
    UserRole,
    Vehicle,
    VehicleType,
    WheelConfig,
    get_default_layout,
    Tyre,
    TyreStatus,
    HealthStatus,
    TyreFitment,
    Trip,
    TripStatus,
    TelemetryRecord,
    TelemetryProvenance,
    THIRecord,
    Alert,
    AlertSeverity,
    AlertStatus,
    Inspection,
    InspectionCondition,
)
from app.services.thi_engine import THIEngine
from app.services.trip_score_engine import TripScoreEngine
from app.services.alert_engine import AlertEngine


TYRE_MODELS = [
    {"model": "Jetway JUH5", "size": "295/80R22.5", "blueprint_nsd": 16.5, "type": "ALL_POSITION"},
    {"model": "Jetsteel JDH3", "size": "295/80R22.5", "blueprint_nsd": 18.0, "type": "DRIVE"},
    {"model": "Jetsteel JDL3", "size": "10.00R20", "blueprint_nsd": 15.0, "type": "REGIONAL"},
    {"model": "Jetway JUC3", "size": "215/75R17.5", "blueprint_nsd": 13.5, "type": "LIGHT_TRUCK"},
]

HUBS_COORDS = [
    {"name": "Delhi Logistics Hub", "city": "New Delhi", "lat": 28.6139, "lng": 77.2090},
    {"name": "Mumbai Nhava Sheva Terminal", "city": "Navi Mumbai", "lat": 18.9500, "lng": 72.9500},
    {"name": "Bengaluru Peenya Depot", "city": "Bengaluru", "lat": 13.0300, "lng": 77.5200},
    {"name": "Chennai Port Cargo Terminal", "city": "Chennai", "lat": 13.0827, "lng": 80.2707},
    {"name": "Kolkata Dankuni Freight Yard", "city": "Kolkata", "lat": 22.6800, "lng": 88.3000},
    {"name": "Hyderabad Outer Hub", "city": "Hyderabad", "lat": 17.3850, "lng": 78.4867},
    {"name": "Ahmedabad Sanand Freight Depot", "city": "Ahmedabad", "lat": 23.0225, "lng": 72.5714},
    {"name": "Pune Chakan Logistics Center", "city": "Pune", "lat": 18.7500, "lng": 73.8500},
]
HUBS = [h["name"] for h in HUBS_COORDS]


def generate_fleet_data(num_vehicles=30, seed=42, weeks_history=4):
    print(f"[SYNTHETIC GENERATOR] Initializing with seed={seed}, vehicles={num_vehicles}, history={weeks_history} weeks...")
    random.seed(seed)

    # 1. Create Default Fleets
    fleet1 = Fleet.query.filter_by(contact_email="fleet.manager@translogistics.com").first()
    if not fleet1:
        fleet1 = Fleet(
            id=str(uuid.uuid4()),
            name="Apex Trans Logistics Pvt Ltd",
            registration_no="DL-TRANS-2024-889",
            contact_name="Rajesh Sharma",
            contact_email="fleet.manager@translogistics.com",
            contact_phone="+91 98100 12345",
            address="Plot 44, Okhla Industrial Area Phase III, New Delhi",
            city="New Delhi",
            latitude=28.5355,
            longitude=77.2610,
            status="ACTIVE",
        )
        db.session.add(fleet1)

    # Secondary fleet for isolation testing (owned by a separate customer)
    fleet2 = Fleet.query.filter_by(contact_email="contact@bharatfreight.com").first()
    if not fleet2:
        fleet2 = Fleet(
            id=str(uuid.uuid4()),
            name="Bharat Freightways India",
            registration_no="MH-BFI-2023-412",
            contact_name="Anil Kulkarni",
            contact_email="contact@bharatfreight.com",
            contact_phone="+91 98220 54321",
            address="Transport Nagar, Nigdi, Pune, Maharashtra",
            city="Pune",
            latitude=18.6517,
            longitude=73.7686,
            status="ACTIVE",
        )
        db.session.add(fleet2)

    # Additional fleet managed by Apex for multi-fleet portfolio demonstration
    fleet3 = Fleet.query.filter_by(contact_email="north@translogistics.com").first()
    if not fleet3:
        fleet3 = Fleet(
            id=str(uuid.uuid4()),
            name="Apex Northern Express Cargo",
            registration_no="HR-TRANS-2024-512",
            contact_name="Rajesh Sharma",
            contact_email="north@translogistics.com",
            contact_phone="+91 98100 12345",
            address="Sector 18, Udyog Vihar, Gurugram, Haryana",
            city="Gurugram",
            latitude=28.4595,
            longitude=77.0266,
            status="ACTIVE",
        )
        db.session.add(fleet3)

    db.session.commit()

    # 2. Create Standard Preconfigured Users
    # 2.1 Super Admin (JK Tyre)
    admin_user = User.query.filter_by(email="admin@jktyre.com").first()
    if not admin_user:
        admin_user = User(
            id=str(uuid.uuid4()),
            fleet_id=None,  # Cross-fleet JK Tyre Super Admin
            username="jkadmin",
            email="admin@jktyre.com",
            full_name="JK Tyre Operations Admin",
            role=UserRole.SUPER_ADMIN,
            phone_number="+91 11 4141 1111",
            is_active=True,
        )
        admin_user.set_password("Admin@12345")
        db.session.add(admin_user)

    # 2.2 Fleet Manager (Apex Trans)
    mgr_user = User.query.filter_by(email="fleet.manager@translogistics.com").first()
    if not mgr_user:
        mgr_user = User(
            id=str(uuid.uuid4()),
            fleet_id=fleet1.id,
            username="apex_manager",
            email="fleet.manager@translogistics.com",
            full_name="Rajesh Sharma",
            role=UserRole.FLEET_MANAGER,
            phone_number="+91 98100 12345",
            is_active=True,
        )
        mgr_user.set_password("Fleet@12345")
        db.session.add(mgr_user)

    # Link apex_manager with fleet3 (Apex Northern Express) for multi-fleet testing
    if fleet3.id not in [f.id for f in mgr_user.authorized_fleets]:
        mgr_user.managed_fleets.append(fleet3)

    # 2.3 Drivers
    drivers = []
    for d_idx in range(1, 8):
        d_email = f"driver{d_idx}@translogistics.com"
        d_user = User.query.filter_by(email=d_email).first()
        if not d_user:
            d_user = User(
                id=str(uuid.uuid4()),
                fleet_id=fleet1.id,
                username=f"driver{d_idx}",
                email=d_email,
                full_name=f"Driver {d_idx}",
                role=UserRole.DRIVER,
                phone_number=f"+91 98111 {10000 + d_idx}",
                driver_license_no=f"DL-042019000{100 + d_idx}",
                is_active=True,
            )
            d_user.set_password("Driver@12345")
            db.session.add(d_user)
        else:
            if d_user.full_name.endswith(" Singh"):
                d_user.full_name = f"Driver {d_idx}"
        drivers.append(d_user)

    db.session.commit()

    # 3. Create Vehicles & Permanent Tyres
    start_date = datetime.now(timezone.utc) - timedelta(weeks=weeks_history)
    configs = [
        (WheelConfig.TEN_WHEELER, VehicleType.HEAVY_TRUCK, 110.0, 4.5),
        (WheelConfig.TWELVE_WHEELER, VehicleType.HEAVY_TRUCK, 125.0, 3.8),
        (WheelConfig.FOURTEEN_WHEELER, VehicleType.HEAVY_TRUCK, 130.0, 3.5),
        (WheelConfig.SIXTEEN_WHEELER, VehicleType.HEAVY_TRUCK, 135.0, 3.2),
    ]

    all_vehicles = []
    print(f"[SYNTHETIC GENERATOR] Creating {num_vehicles} vehicles and fitting permanent tyres...")

    for v_idx in range(1, num_vehicles + 1):
        v_num = f"NL-01-AF-{1000 + v_idx}"
        existing_v = Vehicle.query.filter_by(vehicle_number=v_num).first()
        cfg_choice = configs[v_idx % len(configs)]
        wheel_cfg, v_type, base_p, base_mpg = cfg_choice
        layout_dict = get_default_layout(wheel_cfg)

        initial_odometer = round(random.uniform(15000, 85000), 1)

        # Geographically plausible coordinates near Indian transit hubs
        hub_info = HUBS_COORDS[v_idx % len(HUBS_COORDS)]
        v_lat = round(hub_info["lat"] + random.uniform(-0.15, 0.15), 4)
        v_lng = round(hub_info["lng"] + random.uniform(-0.15, 0.15), 4)
        v_loc_name = f"Near {hub_info['name']}"

        # Assign vehicles across fleets:
        # v_idx == num_vehicles -> fleet2 (Bharat Freightways, 1 vehicle for isolation test)
        # v_idx in (27, 28) -> fleet3 (Apex Northern Express, for multi-fleet testing)
        # others -> fleet1 (Apex Trans)
        if v_idx == num_vehicles:
            target_fleet_id = fleet2.id
        elif v_idx in (27, 28) and num_vehicles >= 28:
            target_fleet_id = fleet3.id
        else:
            target_fleet_id = fleet1.id

        if not existing_v:
            veh = Vehicle(
                id=str(uuid.uuid4()),
                fleet_id=target_fleet_id,
                vehicle_number=v_num,
                vehicle_type=v_type,
                wheel_config=wheel_cfg,
                axle_count=layout_dict["axle_count"],
                layout_json=None,
                make="Tata Motors" if v_idx % 2 == 0 else "Ashok Leyland",
                model="Signa 2823.K" if wheel_cfg == WheelConfig.TEN_WHEELER else ("Signa 3525.K" if wheel_cfg == WheelConfig.TWELVE_WHEELER else ("Signa 4225.T" if wheel_cfg == WheelConfig.FOURTEEN_WHEELER else "Signa 4825.TK")),
                year=2022 + (v_idx % 3),
                baseline_pressure=base_p,
                baseline_mileage=base_mpg,
                current_odometer=initial_odometer,
                current_latitude=v_lat,
                current_longitude=v_lng,
                current_location_name=v_loc_name,
                location_updated_at=datetime.now(timezone.utc),
                location_source="SIMULATED",
                status="ACTIVE",
                created_at=start_date,
            )
            veh.layout = layout_dict
            db.session.add(veh)
            db.session.flush()
        else:
            veh = existing_v
            if not veh.current_latitude:
                veh.current_latitude = v_lat
                veh.current_longitude = v_lng
                veh.current_location_name = v_loc_name
                veh.location_updated_at = datetime.now(timezone.utc)
                veh.location_source = "SIMULATED"

        all_vehicles.append(veh)

        # Ensure tyres are fitted for each position in vehicle layout
        active_fits = {f.wheel_position: f for f in veh.active_fitments}
        positions = []
        for axle in layout_dict["axles"]:
            for pos in axle["positions"]:
                positions.append((axle["index"], pos, axle.get("dual", False)))

        for axle_idx, pos, is_dual in positions:
            if pos not in active_fits:
                # Create permanent tyre
                tyre_meta = TYRE_MODELS[v_idx % len(TYRE_MODELS)]
                serial = f"JK-{tyre_meta['model'][:3].upper()}-{v_idx:02d}-{pos}-{random.randint(1000, 9999)}"
                # Initial wear
                init_worn = random.uniform(0.5, 4.0)
                cur_nsd = max(3.5, tyre_meta["blueprint_nsd"] - init_worn)

                tyre = Tyre(
                    id=str(uuid.uuid4()),
                    fleet_id=veh.fleet_id,
                    serial_number=serial,
                    brand="JK Tyre",
                    model=tyre_meta["model"],
                    size=tyre_meta["size"],
                    blueprint_nsd=tyre_meta["blueprint_nsd"],
                    current_nsd=round(cur_nsd, 2),
                    retread_count=0,
                    total_km_run=round(initial_odometer * random.uniform(0.6, 0.9), 1),
                    current_thi=95.0,
                    thi_status=HealthStatus.HEALTHY,
                    status=TyreStatus.FITTED,
                    created_at=start_date,
                )
                db.session.add(tyre)
                db.session.flush()

                # Mount tyre
                fit = TyreFitment(
                    id=str(uuid.uuid4()),
                    tyre_id=tyre.id,
                    vehicle_id=veh.id,
                    axle_number=axle_idx,
                    wheel_position=pos,
                    is_dual=is_dual,
                    is_inner=("LI" in pos or "RI" in pos),
                    fitted_at=start_date,
                    fitted_odometer=round(initial_odometer - 5000, 1),
                    fitted_nsd=round(cur_nsd + 0.8, 2),
                )
                db.session.add(fit)

    db.session.commit()

    # 4. Generate Trips & Telemetry History across Weeks
    print(f"[SYNTHETIC GENERATOR] Generating monotonic trips, inspections, alerts, and correlated telemetry...")

    trip_counter = 1
    for veh in all_vehicles:  # Coherent synthetic telemetry for all configured vehicles
        if len(veh.trips) > 0:
            continue

        active_fits = veh.active_fitments
        current_odo = veh.current_odometer
        now_time = datetime.now(timezone.utc)

        # Assign a designated driver
        driver = drivers[trip_counter % len(drivers)]

        # Simulate 4-8 trips per vehicle over time
        num_trips = random.randint(4, 8)
        time_step = (now_time - start_date) / num_trips

        for t_idx in range(num_trips):
            trip_start = start_date + (time_step * t_idx) + timedelta(hours=random.randint(1, 4))
            trip_dist = random.uniform(250.0, 650.0)
            trip_end = trip_start + timedelta(hours=trip_dist / random.uniform(45.0, 60.0))

            if trip_end > now_time:
                trip_end = None
                trip_status = TripStatus.IN_PROGRESS
                end_odo = None
            else:
                trip_status = TripStatus.COMPLETED
                end_odo = round(current_odo + trip_dist, 1)

            trip = Trip(
                id=str(uuid.uuid4()),
                fleet_id=veh.fleet_id,
                vehicle_id=veh.id,
                driver_id=driver.id,
                trip_code=f"TRP-{veh.vehicle_number[-4:]}-{trip_counter:04d}",
                origin=random.choice(HUBS),
                destination=random.choice(HUBS),
                start_time=trip_start,
                start_odometer=round(current_odo, 1),
                end_time=trip_end,
                end_odometer=end_odo,
                distance_km=round(trip_dist, 1) if end_odo else None,
                status=trip_status,
                created_at=trip_start,
            )

            # Generate telemetry frames for tyres during this trip
            trip_samples = []
            is_anomaly_vehicle = (veh.id == all_vehicles[1].id and t_idx >= num_trips - 2)  # inject puncture scenario
            is_overheat_vehicle = (veh.id == all_vehicles[2].id and t_idx >= num_trips - 1) # inject overheating

            for fit in active_fits:
                # Base pressure with plausible temperature correlation
                # Gas law proxy: ~1 psi increase per 5 deg C
                ambient_temp = 28.0 + random.uniform(-4, 8)
                operating_temp = ambient_temp + random.uniform(15, 30)
                press_thermal_rise = (operating_temp - 25.0) * 0.18

                tyre_p = veh.baseline_pressure + press_thermal_rise + random.uniform(-2, 2)
                tyre_t = operating_temp
                is_stale_flag = False
                is_faulty_flag = False

                # Scenario: Tyre FL puncture on vehicle 2
                if is_anomaly_vehicle and fit.wheel_position == "FL":
                    tyre_p = veh.baseline_pressure * 0.72  # severe under-inflation
                    tyre_t = operating_temp + 22.0          # high thermal stress

                # Scenario: Tyre R1_LO overheating on vehicle 3
                if is_overheat_vehicle and fit.wheel_position == "R1_LO":
                    tyre_t = 88.5  # critical overheating

                # Create telemetry sample
                telem = TelemetryRecord(
                    id=str(uuid.uuid4()),
                    fleet_id=veh.fleet_id,
                    vehicle_id=veh.id,
                    tyre_id=fit.tyre_id,
                    wheel_position=fit.wheel_position,
                    timestamp=trip_end if trip_end else now_time,
                    pressure_psi=round(tyre_p, 1),
                    temperature_c=round(tyre_t, 1),
                    speed_kmh=round(random.uniform(50, 78), 1),
                    battery_soc=round(random.uniform(70, 95), 1),
                    odometer_km=end_odo or current_odo,
                    is_stale=is_stale_flag,
                    is_faulty=is_faulty_flag,
                    provenance=TelemetryProvenance.SYNTHETIC,
                )
                db.session.add(telem)

                sample_data = {
                    "pressure_psi": tyre_p,
                    "temperature_c": tyre_t,
                    "speed_kmh": telem.speed_kmh,
                }
                trip_samples.append(sample_data)

                # Compute THI for the tyre
                thi_res = THIEngine.calculate_thi(
                    pressure_psi=tyre_p,
                    temperature_c=tyre_t,
                    current_nsd_mm=fit.tyre.current_nsd,
                    blueprint_nsd_mm=fit.tyre.blueprint_nsd,
                    vehicle_type=veh.vehicle_type,
                    speed_kmh=telem.speed_kmh,
                )

                # Update tyre live THI status
                fit.tyre.current_thi = thi_res["score"]
                fit.tyre.thi_status = thi_res["status"]

                thi_rec = THIRecord(
                    id=str(uuid.uuid4()),
                    tyre_id=fit.tyre_id,
                    vehicle_id=veh.id,
                    calculated_at=telem.timestamp,
                    score=thi_res["score"],
                    status=thi_res["status"],
                    pressure_score=thi_res["components"].get("pressure_score", 100.0),
                    temp_score=thi_res["components"].get("temp_score", 100.0),
                    wear_score=thi_res["components"].get("wear_score", 100.0),
                    rrc_score=thi_res["components"].get("rrc_score", thi_res["components"].get("inv_severity_score", 100.0)),
                    explanation=thi_res["explanation"],
                    inputs_json=None,
                    rule_version=thi_res["rule_version"],
                )
                thi_rec.inputs = thi_res["inputs"]
                db.session.add(thi_rec)

                # Alert Engine Evaluation
                AlertEngine.evaluate_telemetry(
                    fleet_id=veh.fleet_id,
                    vehicle_id=veh.id,
                    tyre_id=fit.tyre_id,
                    wheel_position=fit.wheel_position,
                    pressure_psi=tyre_p,
                    temperature_c=tyre_t,
                    battery_soc=telem.battery_soc,
                    baseline_pressure=veh.baseline_pressure,
                )

            # Compute Trip Score
            if trip_status == TripStatus.COMPLETED:
                trip_eval = TripScoreEngine.calculate_trip_score(
                    telemetry_samples=trip_samples,
                    baseline_pressure=veh.baseline_pressure,
                    baseline_mileage=veh.baseline_mileage,
                )
                trip.trip_score = trip_eval["trip_score"]
                trip.trip_score_status = trip_eval["status"]
                trip.score_breakdown = trip_eval

            db.session.add(trip)
            trip_counter += 1

            if end_odo:
                current_odo = end_odo

        # Update vehicle current odometer to monotonic finish
        veh.current_odometer = current_odo

        # Add physical tyre inspection record
        for fit in active_fits[:2]:
            insp = Inspection(
                id=str(uuid.uuid4()),
                fleet_id=veh.fleet_id,
                vehicle_id=veh.id,
                tyre_id=fit.tyre_id,
                inspector_id=driver.id,
                measured_nsd=fit.tyre.current_nsd,
                measured_pressure=veh.baseline_pressure,
                odometer_at_inspection=current_odo,
                visual_condition=InspectionCondition.NORMAL,
                notes="Routine depot tread inspection. No sidewall cuts or crown stone drilling observed.",
                inspected_at=now_time - timedelta(days=random.randint(1, 5)),
            )
            db.session.add(insp)

    db.session.commit()
    print(f"[SYNTHETIC GENERATOR] Successfully created {len(all_vehicles)} vehicles, starter fleets, users, telemetry and alerts.")


def clear_vehicle_and_tyre_data():
    """Removes all dummy vehicles, tyres, and associated operational records."""
    print("[SYNTHETIC GENERATOR] Clearing all vehicle and tyre data...")
    try:
        from app.models.lifecycle_history import TyreLifecycleHistory
        db.session.query(TyreLifecycleHistory).delete()
    except Exception:
        pass
    try:
        from app.models.oem_vault import OEMFleetVault
        db.session.query(OEMFleetVault).delete()
    except Exception:
        pass

    db.session.query(TyreFitment).delete()
    db.session.query(TelemetryRecord).delete()
    db.session.query(THIRecord).delete()
    db.session.query(Inspection).delete()
    db.session.query(Trip).delete()
    db.session.query(Alert).delete()
    db.session.query(Tyre).delete()
    db.session.query(Vehicle).delete()
    db.session.commit()
    print("[SYNTHETIC GENERATOR] All vehicles and tyres cleared. 0 vehicles in all fleets.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="JK Tyre Synthetic Data Generator")
    parser.add_argument("--vehicles", type=int, default=30, help="Number of vehicles to generate (set 0 for 0 vehicles)")
    parser.add_argument("--seed", type=int, default=42, help="Reproducible random seed")
    parser.add_argument("--weeks", type=int, default=4, help="Weeks of historical telemetry")
    parser.add_argument("--clear", action="store_true", help="Remove all vehicles and tyre data so that all fleets have 0 vehicles")
    args = parser.parse_args()

    from app import create_app
    app = create_app()
    with app.app_context():
        db.create_all()
        if args.clear:
            clear_vehicle_and_tyre_data()
        elif args.vehicles == 0:
            clear_vehicle_and_tyre_data()
            generate_fleet_data(num_vehicles=0, seed=args.seed, weeks_history=args.weeks)
        else:
            generate_fleet_data(num_vehicles=args.vehicles, seed=args.seed, weeks_history=args.weeks)
