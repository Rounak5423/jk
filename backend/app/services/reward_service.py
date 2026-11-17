import uuid
from datetime import datetime, timezone
from app.extensions import db
from app.models.reward import DriverReward, DriverRedemption
from app.models.user import User, UserRole
from app.models.trip import Trip, TripStatus


class RewardService:
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

        return {
            "summary": {
                "total_drivers": len(drivers),
                "total_rewards_distributed": round(total_fleet_distributed, 1),
                "total_rewards_redeemed": round(total_fleet_redeemed, 1),
                "active_unredeemed_balance": round(active_fleet_unredeemed, 1),
                "top_driver": top_driver,
            },
            "drivers": driver_summaries,
            "eligible_products": cls.JK_ELIGIBLE_PRODUCTS,
        }

