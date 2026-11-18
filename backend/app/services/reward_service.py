import uuid
from datetime import datetime, timezone
from app.extensions import db
from app.models.reward import DriverReward, DriverRedemption, DriverActivity
from app.models.user import User, UserRole
from app.models.vehicle import Vehicle
from app.models.trip import Trip, TripStatus


class RewardService:
    ASSIGNED_ACTIVITIES = [
        {
            "activity_type": "REFUELING",
            "title": "Log Fuel Refill & Receipt",
            "base_points": 50.0,
            "discount_value": 50.0,
            "description": "Record fuel litres, total cost, and current odometer at petrol pump stops.",
            "icon": "Fuel",
            "badge": "+50 Pts (₹50 Discount)",
            "fields": ["fuel_litres", "fuel_cost", "odometer", "station_name", "receipt_no"],
        },
        {
            "activity_type": "STOP_ODOMETER",
            "title": "Log Stop Checkpoint & Odometer",
            "base_points": 30.0,
            "discount_value": 30.0,
            "description": "Record intermediate halt location, stop reason (rest, toll, delivery), and odometer.",
            "icon": "MapPin",
            "badge": "+30 Pts (₹30 Discount)",
            "fields": ["stop_location", "stop_reason", "odometer", "notes"],
        },
        {
            "activity_type": "TYRE_CHECK",
            "title": "Log Tyre Walkaround Inspection",
            "base_points": 40.0,
            "discount_value": 40.0,
            "description": "Conduct physical walkaround visual and pressure check on commercial fitted tyres.",
            "icon": "Disc",
            "badge": "+40 Pts (₹40 Discount)",
            "fields": ["odometer", "tyres_checked", "visual_condition", "notes"],
        },
        {
            "activity_type": "TRIP_SCORE_REWARD",
            "title": "Safe Journey Trip Score Bonus",
            "base_points": 150.0,
            "discount_value": 150.0,
            "description": "Earned automatically upon completing journey with high safety compliance (score ≥ 70).",
            "icon": "Award",
            "badge": "Up to +150+ Pts",
            "fields": ["trip_score", "distance_km"],
        },
    ]

    JK_ELIGIBLE_PRODUCTS = [
        {
            "name": "JK Jetway JUH5 Commercial Radial",
            "category": "Steer / All-Position Tyre (16.5mm Virgin Depth)",
            "discount_rate": "1 Point = ₹1 Instant Invoice Discount",
            "description": "High mileage steer tyre engineered for highway haulage and severe steer axle resistance.",
            "badge": "Popular Commercial Steer",
        },
        {
            "name": "JK Jetsteel JDH3 Drive Radial",
            "category": "Drive Axle Deep Tread (Lug Pattern)",
            "discount_rate": "1 Point = ₹1 Instant Invoice Discount",
            "description": "High-torque traction drive tyre for heavy payload commercial multi-axle freight.",
            "badge": "Top Drive Radial",
        },
        {
            "name": "JK Tyre Retread Services (Pre-Cured Tread)",
            "category": "Authorized JK Retread & Casing Renewal",
            "discount_rate": "Up to 100% Retread Invoice Offset",
            "description": "High-bond cold retreading restoring casing life for 100,000+ additional kilometers.",
            "badge": "Casing Sustainability",
        },
        {
            "name": "JK Commercial Heavy Duty Tubes & Flaps",
            "category": "Air Retention & Maintenance Hardware",
            "discount_rate": "100% Points Redeemable",
            "description": "Heat resistant butyl inner tubes and heavy duty puncture repair accessory kits.",
            "badge": "Instant Depot Pickup",
        },
        {
            "name": "TREEL Smart Tyre IoT Sensors",
            "category": "Valve-Mounted BLE TPMS Sensors",
            "discount_rate": "₹500 Flat Partner Discount with Voucher",
            "description": "Real-time pressure & temperature telematics sensors syncing with JK Driver App.",
            "badge": "Smart Telematics",
        },
    ]

    @staticmethod
    def calculate_trip_rewards(trip_score: float, distance_km: float = 0.0) -> dict:
        """
        Calculates driver reward points based on Trip Score:
        - Score >= 90 (Defensive / High Safety): 150 base pts + 1 pt per 10 km
        - Score 80 - 89 (Safe Commercial Driving): 100 base pts + 1 pt per 20 km
        - Score 70 - 79 (Fair / Acceptable Driving): 50 base pts
        - Score < 70 (Aggressive / Warning): 0 pts (Safety review required)

        1 Reward Point = ₹1 discount credit on JK Tyre products.
        """
        if trip_score is None:
            return {
                "trip_score": 0.0,
                "tier": "NONE",
                "points": 0.0,
                "discount_value": 0.0,
                "description": "Trip score pending calculation",
            }

        score = round(float(trip_score), 1)
        dist = max(0.0, float(distance_km or 0.0))

        if score >= 90.0:
            tier = "EXCELLENT"
            dist_bonus = round(dist / 10.0, 1)
            points = 150.0 + dist_bonus
            desc = f"Excellent Trip Score ({score}/100) — 150 base pts + {dist_bonus:.0f} km bonus"
        elif score >= 80.0:
            tier = "GOOD"
            dist_bonus = round(dist / 20.0, 1)
            points = 100.0 + dist_bonus
            desc = f"Good Safe Driving ({score}/100) — 100 base pts + {dist_bonus:.0f} km bonus"
        elif score >= 70.0:
            tier = "FAIR"
            points = 50.0
            desc = f"Fair Trip Score ({score}/100) — 50 base pts"
        else:
            tier = "CRITICAL_WARNING"
            points = 0.0
            desc = f"Score below safety threshold ({score}/100) — 0 reward points earned"

        points = round(points, 1)
        return {
            "trip_score": score,
            "tier": tier,
            "points": points,
            "discount_value": points,  # ₹1 = 1 point
            "description": desc,
        }

    @classmethod
    def get_driver_reward_summary(cls, driver_id: str, fleet_id: str = None) -> dict:
        """
        Gathers full reward profile, balance, trip breakdown, and vouchers for a driver.
        """
        driver = User.query.get(driver_id)
        if not driver:
            return {"error": "Driver not found"}

        # All rewards earned
        reward_records = (
            DriverReward.query.filter_by(driver_id=driver_id)
            .order_by(DriverReward.created_at.desc())
            .all()
        )
        total_earned = sum(r.points_earned for r in reward_records)

        # All redemptions
        redemptions = (
            DriverRedemption.query.filter_by(driver_id=driver_id)
            .order_by(DriverRedemption.redeemed_at.desc())
            .all()
        )
        total_redeemed = sum(r.points_redeemed for r in redemptions)

        available_balance = max(0.0, round(total_earned - total_redeemed, 1))

        # Driver's completed trips
        completed_trips = Trip.query.filter_by(
            driver_id=driver_id, status=TripStatus.COMPLETED
        ).all()
        scored_trips = [t for t in completed_trips if t.trip_score is not None]
        avg_score = (
            round(sum(t.trip_score for t in scored_trips) / len(scored_trips), 1)
            if scored_trips
            else None
        )

        # Determine driver loyalty tier
        if total_earned >= 2000:
            tier_badge = "JK Platinum Pro Driver"
            tier_color = "emerald"
        elif total_earned >= 1000:
            tier_badge = "JK Gold Safe Driver"
            tier_color = "brand-gold"
        elif total_earned >= 300:
            tier_badge = "JK Silver Driver"
            tier_color = "blue"
        else:
            tier_badge = "JK Verified Commercial Driver"
            tier_color = "slate"

        # Recent driver activities logged
        activities = (
            DriverActivity.query.filter_by(driver_id=driver_id)
            .order_by(DriverActivity.created_at.desc())
            .limit(30)
            .all()
        )

        return {
            "driver_id": driver.id,
            "driver_name": driver.full_name,
            "driver_license_no": driver.driver_license_no,
            "username": driver.username,
            "phone_number": driver.phone_number,
            "tier_badge": tier_badge,
            "tier_color": tier_color,
            "points_balance": available_balance,
            "discount_value": available_balance,  # ₹ discount on JK products
            "lifetime_earned": round(total_earned, 1),
            "total_redeemed": round(total_redeemed, 1),
            "trips_completed_count": len(completed_trips),
            "avg_trip_score": avg_score,
            "assigned_activities": cls.ASSIGNED_ACTIVITIES,
            "recent_activities": [a.to_dict() for a in activities],
            "recent_rewards": [r.to_dict() for r in reward_records[:20]],
            "vouchers": [v.to_dict() for v in redemptions],
            "eligible_products": cls.JK_ELIGIBLE_PRODUCTS,
        }

    @classmethod
    def redeem_driver_rewards(
        cls,
        driver_id: str,
        fleet_id: str,
        points_to_redeem: float = None,
        redeemed_by: str = "DRIVER",
        notes: str = None,
    ) -> dict:
        """
        Redeems driver's available reward balance for JK Tyre Product Discount Vouchers.
        Requirement: Resets available balance to ZERO upon redemption.
        """
        driver = User.query.get(driver_id)
        if not driver:
            return {"error": "Driver not found", "success": False}

        # Calculate current available balance
        reward_records = DriverReward.query.filter_by(driver_id=driver_id).all()
        total_earned = sum(r.points_earned for r in reward_records)

        redemptions = DriverRedemption.query.filter_by(driver_id=driver_id).all()
        total_redeemed = sum(r.points_redeemed for r in redemptions)

        available_balance = max(0.0, round(total_earned - total_redeemed, 1))

        if available_balance <= 0.0:
            return {
                "error": "No available reward points to redeem. Complete more trips to earn JK Tyre rewards.",
                "success": False,
                "available_balance": 0.0,
            }

        # If points_to_redeem is omitted, None, or >= available_balance, redeem full balance to reset to zero
        redeem_amount = available_balance
        if points_to_redeem is not None and float(points_to_redeem) > 0:
            # User specified redemption amount (capped at available)
            redeem_amount = min(available_balance, round(float(points_to_redeem), 1))
        
        # When redeeming as per user request: "and if redeemed do it to zero"
        # Always redeem the entire available balance so it becomes 0
        redeem_amount = available_balance

        # Generate unique JK Tyre Product Discount Voucher Code
        voucher_suffix = uuid.uuid4().hex[:6].upper()
        voucher_code = f"JK-DISC-{voucher_suffix}"

        redemption = DriverRedemption(
            id=str(uuid.uuid4()),
            fleet_id=fleet_id or driver.fleet_id,
            driver_id=driver.id,
            voucher_code=voucher_code,
            points_redeemed=redeem_amount,
            discount_amount=redeem_amount,  # 1 point = ₹1 discount on JK products
            product_category="JK Commercial Radial Tyres & Retread Services",
            status="ACTIVE",
            redeemed_by=redeemed_by,
            notes=notes or f"Redeemed by {redeemed_by} for ₹{redeem_amount:,.1f} discount on JK Tyre products",
            redeemed_at=datetime.now(timezone.utc),
        )
        db.session.add(redemption)
        db.session.commit()

        return {
            "success": True,
            "message": f"Successfully redeemed {redeem_amount:,.1f} reward points for ₹{redeem_amount:,.1f} discount voucher on JK Tyre products!",
            "voucher": redemption.to_dict(),
            "points_redeemed": redeem_amount,
            "discount_amount": redeem_amount,
            "remaining_balance": 0.0,  # Balance reset to zero
        }

    @classmethod
    def get_fleet_drivers_rewards_summary(cls, fleet_id: str) -> dict:
        """
        Returns all drivers in the fleet along with their trip scores, lifetime rewards,
        unredeemed available balance, and redemption history.
        """
        drivers = User.query.filter_by(fleet_id=fleet_id, role=UserRole.DRIVER).all()

        driver_summaries = []
        total_fleet_distributed = 0.0
        total_fleet_redeemed = 0.0
        active_fleet_unredeemed = 0.0

        for d in drivers:
            # Rewards
            rewards = DriverReward.query.filter_by(driver_id=d.id).all()
            earned = sum(r.points_earned for r in rewards)

            # Redemptions
            redemptions = (
                DriverRedemption.query.filter_by(driver_id=d.id)
                .order_by(DriverRedemption.redeemed_at.desc())
                .all()
            )
            redeemed = sum(r.points_redeemed for r in redemptions)
            available = max(0.0, round(earned - redeemed, 1))

            total_fleet_distributed += earned
            total_fleet_redeemed += redeemed
            active_fleet_unredeemed += available

            # Trips
            completed = Trip.query.filter_by(driver_id=d.id, status=TripStatus.COMPLETED).all()
            scored = [t for t in completed if t.trip_score is not None]
            avg_score = round(sum(t.trip_score for t in scored) / len(scored), 1) if scored else None

            # Status determination
            if available > 0:
                status = "AVAILABLE"
            elif redeemed > 0:
                status = "REDEEMED"
            else:
                status = "NO_ACTIVITY"

            driver_summaries.append({
                "driver_id": d.id,
                "full_name": d.full_name,
                "username": d.username,
                "driver_license_no": d.driver_license_no,
                "phone_number": d.phone_number,
                "completed_trips": len(completed),
                "avg_trip_score": avg_score,
                "lifetime_earned": round(earned, 1),
                "total_redeemed": round(redeemed, 1),
                "available_balance": available,
                "redemption_status": status,
                "last_redemption": redemptions[0].to_dict() if redemptions else None,
            })

        # Sort drivers by highest trip score / highest rewards
        driver_summaries.sort(key=lambda x: (x["available_balance"], x["avg_trip_score"] or 0), reverse=True)

        top_driver = None
        if driver_summaries:
            active_drivers = [d for d in driver_summaries if d["avg_trip_score"] is not None]
            if active_drivers:
                top = max(active_drivers, key=lambda x: x["avg_trip_score"])
                top_driver = {
                    "full_name": top["full_name"],
                    "avg_score": top["avg_trip_score"],
                    "earned": top["lifetime_earned"],
                }

        # Query all fleet driver activities
        all_activities = (
            DriverActivity.query.filter_by(fleet_id=fleet_id)
            .order_by(DriverActivity.created_at.desc())
            .all()
        )
        total_activities = len(all_activities)
        refuel_count = sum(1 for a in all_activities if a.activity_type == "REFUELING")
        stop_count = sum(1 for a in all_activities if a.activity_type == "STOP_ODOMETER")
        tyre_check_count = sum(1 for a in all_activities if a.activity_type == "TYRE_CHECK")

        return {
            "summary": {
                "total_drivers": len(drivers),
                "total_rewards_distributed": round(total_fleet_distributed, 1),
                "total_rewards_redeemed": round(total_fleet_redeemed, 1),
                "active_unredeemed_balance": round(active_fleet_unredeemed, 1),
                "total_activities_count": total_activities,
                "refuel_count": refuel_count,
                "stop_count": stop_count,
                "tyre_check_count": tyre_check_count,
                "top_driver": top_driver,
            },
            "drivers": driver_summaries,
            "recent_activities": [a.to_dict() for a in all_activities[:60]],
            "eligible_products": cls.JK_ELIGIBLE_PRODUCTS,
        }

    @classmethod
    def log_driver_activity(
        cls,
        driver_id: str,
        fleet_id: str,
        activity_type: str,
        odometer: float = None,
        location: str = None,
        notes: str = None,
        metadata: dict = None,
        vehicle_id: str = None,
        trip_id: str = None,
    ) -> dict:
        """
        Logs an operational activity submitted by the driver (e.g., refueling, intermediate stop odometer,
        tyre physical check), credits the corresponding reward points/discount, and updates vehicle odometer.
        """
        driver = User.query.get(driver_id)
        if not driver:
            return {"success": False, "error": "Driver not found"}

        meta = metadata or {}

        # Fallback to driver's assigned vehicle if vehicle_id not explicitly supplied
        if not vehicle_id and driver.assigned_vehicle_id:
            vehicle_id = driver.assigned_vehicle_id

        # Fallback to active in-progress trip if not explicitly provided
        if not trip_id:
            active_trip = Trip.query.filter_by(driver_id=driver_id, status=TripStatus.IN_PROGRESS).first()
            if active_trip:
                trip_id = active_trip.id
                if not vehicle_id:
                    vehicle_id = active_trip.vehicle_id

        # Determine points and titles by activity type
        if activity_type == "REFUELING":
            points = 50.0
            litres = meta.get("fuel_litres", "")
            cost = meta.get("fuel_cost", "")
            stn = location or meta.get("station_name", "Highway Petrol Pump")
            title = f"Fuel Refill: {litres} L at {stn}".strip()
            desc = f"Logged fuel refill ({litres} L, ₹{cost}) at {stn}"
        elif activity_type == "STOP_ODOMETER":
            points = 30.0
            reason = meta.get("stop_reason", "En-Route Stop")
            loc = location or meta.get("stop_location", "Route Checkpoint")
            title = f"Stop Check-in: {reason} - {loc}"
            desc = f"Logged stop ({reason}) at {loc} with odometer {odometer or '—'} km"
        elif activity_type == "TYRE_CHECK":
            points = 40.0
            tyres_cnt = meta.get("tyres_checked", 12)
            cond = meta.get("visual_condition", "Normal")
            title = f"Tyre Walkaround: {tyres_cnt} Tyres ({cond})"
            desc = f"Physical tyre walkaround inspection ({tyres_cnt} tyres, condition: {cond})"
        else:
            points = 25.0
            title = f"Driver Activity: {activity_type}"
            desc = notes or "Driver activity submitted"

        # Create DriverActivity record
        activity = DriverActivity(
            fleet_id=fleet_id or driver.fleet_id,
            driver_id=driver_id,
            vehicle_id=vehicle_id,
            trip_id=trip_id,
            activity_type=activity_type,
            title=title,
            odometer=float(odometer) if odometer is not None else None,
            location=location,
            points_earned=points,
            discount_value=points,
            notes=notes,
            status="APPROVED",
        )
        activity.activity_metadata = meta
        db.session.add(activity)
        db.session.flush()

        # Create corresponding DriverReward entry so it credits rewards wallet
        reward_entry = DriverReward(
            fleet_id=fleet_id or driver.fleet_id,
            driver_id=driver_id,
            trip_id=trip_id,
            activity_id=activity.id,
            reward_type=activity_type,
            points_earned=points,
            discount_value=points,
            description=desc,
        )
        db.session.add(reward_entry)

        # Update vehicle current odometer if valid and greater than current
        if vehicle_id and odometer is not None:
            try:
                odo_val = float(odometer)
                veh = Vehicle.query.get(vehicle_id)
                if veh and odo_val > (veh.current_odometer or 0.0):
                    veh.current_odometer = round(odo_val, 1)
            except Exception:
                pass

        db.session.commit()

        # Refresh OEM central data vault snapshot so driver updates immediately reflect in admin JSON & Excel
        try:
            from app.services.oem_vault_service import OEMDataSyncService
            OEMDataSyncService.capture_fleet_snapshot(
                fleet_id=fleet_id or driver.fleet_id,
                snapshot_type="DRIVER_DUTY_UPDATE",
                channel="DRIVER_ACTIVITY_INGEST"
            )
        except Exception:
            pass

        # Retrieve updated driver reward profile
        summary = cls.get_driver_reward_summary(driver_id, fleet_id or driver.fleet_id)

        return {
            "success": True,
            "activity": activity.to_dict(),
            "points_earned": points,
            "discount_value": points,
            "new_balance": summary.get("points_balance", 0.0),
            "message": f"Activity successfully logged! Earned +{points:.0f} reward points (₹{points:.0f} JK Tyre discount credit).",
        }

    @classmethod
    def get_fleet_activities(
        cls,
        fleet_id: str,
        driver_id: str = None,
        vehicle_id: str = None,
        activity_type: str = None,
        limit: int = 100,
    ) -> list:
        """
        Retrieves driver activity submissions for fleet admin inspection.
        """
        query = DriverActivity.query.filter_by(fleet_id=fleet_id)
        if driver_id:
            query = query.filter_by(driver_id=driver_id)
        if vehicle_id:
            query = query.filter_by(vehicle_id=vehicle_id)
        if activity_type:
            query = query.filter_by(activity_type=activity_type)

        records = query.order_by(DriverActivity.created_at.desc()).limit(limit).all()
        return [r.to_dict() for r in records]

