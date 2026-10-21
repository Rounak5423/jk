"""
Configurable Operational Alert Engine with deduplication and lifecycle management.
Evaluates telemetry and inspection events against JK Tyre operational codes.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
from app.extensions import db
from app.models.alert import Alert, AlertSeverity, AlertStatus


# Reference catalogue from events.xlsx
ALERT_CATALOGUE = {
    # Pressure
    "PR01": {"category": "PRESSURE", "severity": AlertSeverity.WARNING, "name": "Under-Inflation", "expl": "Low pressure reduces casing life and increases fuel consumption.", "action": "Inflate to vehicle recommended baseline pressure at next service point."},
    "PR02": {"category": "PRESSURE", "severity": AlertSeverity.CRITICAL, "name": "Severe Under-Inflation", "expl": "Critical under-inflation: danger of rapid heat build-up and casing rupture.", "action": "Stop vehicle safely and reinflate immediately. Inspect for puncture."},
    "PR03": {"category": "PRESSURE", "severity": AlertSeverity.WARNING, "name": "Over-Inflation", "expl": "Excess pressure leads to harsh ride and rapid center crown tread wear.", "action": "Bleed pressure to recommended specification when cold."},
    "PR04": {"category": "PRESSURE", "severity": AlertSeverity.CRITICAL, "name": "Severe Over-Inflation", "expl": "Severe excess pressure increases impact burst risk.", "action": "Stop vehicle safely and adjust pressure to recommended baseline."},
    "PR06": {"category": "PRESSURE", "severity": AlertSeverity.CRITICAL, "name": "Rapid Pressure Drop", "expl": "Puncture or valve stem failure in progress.", "action": "Pull over safely immediately. Inspect tyre and mount spare."},
    "PR09": {"category": "PRESSURE", "severity": AlertSeverity.RISK, "name": "Pressure Sensor Fault", "expl": "TPMS sensor reporting implausible or blank values.", "action": "Inspect and recalibrate or replace TPMS wheel sensor."},

    # Temperature
    "TP03": {"category": "TEMPERATURE", "severity": AlertSeverity.WARNING, "name": "High Temperature", "expl": "Tyre operating temperature above 65 °C.", "action": "Reduce speed and verify cold inflation pressure."},
    "TP04": {"category": "TEMPERATURE", "severity": AlertSeverity.CRITICAL, "name": "Overheating / Severe Temp", "expl": "Tyre temperature exceeds 85 °C. Casing separation risk imminent.", "action": "Halt vehicle immediately and allow tyre to cool down. Check for brake dragging or under-inflation."},
    "TP07": {"category": "TEMPERATURE", "severity": AlertSeverity.RISK, "name": "Temperature Sensor Fault", "expl": "Temperature sensor reporting open circuit or implausible reading.", "action": "Inspect sensor harness and wiring."},

    # Tread Wear
    "TD03": {"category": "WEAR", "severity": AlertSeverity.WARNING, "name": "High Tread Wear", "expl": "Tread wear has exceeded 70% of virgin blueprint depth.", "action": "Schedule tyre rotation or plan retread cycle."},
    "TD05": {"category": "WEAR", "severity": AlertSeverity.RISK, "name": "Uneven Tread Wear", "expl": "Tread depth variance exceeds 2 mm across same axle or crown shoulder.", "action": "Perform wheel alignment, balancing, and suspension bushing inspection."},
    "TD07": {"category": "WEAR", "severity": AlertSeverity.CRITICAL, "name": "Critical Tread Depth", "expl": "NSD has reached or fallen below the 3.0 mm legal safety limit.", "action": "Replace or retread tyre immediately. Decommission from highway use."},

    # Battery
    "BT01": {"category": "BATTERY", "severity": AlertSeverity.WARNING, "name": "Low Sensor Battery", "expl": "TPMS internal coin cell battery is below 20%.", "action": "Schedule TPMS sensor replacement at upcoming scheduled maintenance."},
}


class AlertEngine:
    COOLDOWN_MINUTES = 30

    @classmethod
    def evaluate_telemetry(
        cls,
        fleet_id: str,
        vehicle_id: str,
        tyre_id: Optional[str],
        wheel_position: str,
        pressure_psi: Optional[float],
        temperature_c: Optional[float],
        battery_soc: Optional[float],
        baseline_pressure: float = 110.0,
    ) -> List[Alert]:
        """
        Evaluates a telemetry frame and creates deduplicated alerts if thresholds are breached.
        """
        new_alerts = []

        # 1. Pressure checks
        if pressure_psi is not None:
            if pressure_psi < 0 or pressure_psi > 2.5 * baseline_pressure:
                cls._trigger_alert(new_alerts, fleet_id, vehicle_id, tyre_id, wheel_position, "PR09", pressure_psi, "psi")
            else:
                p_dev = (pressure_psi - baseline_pressure) / baseline_pressure
                if p_dev < -0.20:
                    cls._trigger_alert(new_alerts, fleet_id, vehicle_id, tyre_id, wheel_position, "PR02", pressure_psi, "psi")
                elif p_dev < -0.10:
                    cls._trigger_alert(new_alerts, fleet_id, vehicle_id, tyre_id, wheel_position, "PR01", pressure_psi, "psi")
                elif p_dev > 0.20:
                    cls._trigger_alert(new_alerts, fleet_id, vehicle_id, tyre_id, wheel_position, "PR04", pressure_psi, "psi")
                elif p_dev > 0.10:
                    cls._trigger_alert(new_alerts, fleet_id, vehicle_id, tyre_id, wheel_position, "PR03", pressure_psi, "psi")

        # 2. Temperature checks
        if temperature_c is not None:
            if temperature_c < -40 or temperature_c > 150:
                cls._trigger_alert(new_alerts, fleet_id, vehicle_id, tyre_id, wheel_position, "TP07", temperature_c, "deg C")
            elif temperature_c > 85.0:
                cls._trigger_alert(new_alerts, fleet_id, vehicle_id, tyre_id, wheel_position, "TP04", temperature_c, "deg C")
            elif temperature_c > 65.0:
                cls._trigger_alert(new_alerts, fleet_id, vehicle_id, tyre_id, wheel_position, "TP03", temperature_c, "deg C")

        # 3. Battery checks
        if battery_soc is not None and battery_soc < 20.0:
            cls._trigger_alert(new_alerts, fleet_id, vehicle_id, tyre_id, wheel_position, "BT01", battery_soc, "%")

        return new_alerts

    @classmethod
    def evaluate_inspection(
        cls,
        fleet_id: str,
        vehicle_id: str,
        tyre_id: str,
        measured_nsd: float,
        blueprint_nsd: float = 16.5,
    ) -> List[Alert]:
        """
        Evaluates physical inspection measurement for tread depth alerts.
        """
        new_alerts = []
        if measured_nsd <= 3.0:
            cls._trigger_alert(new_alerts, fleet_id, vehicle_id, tyre_id, None, "TD07", measured_nsd, "mm")
        elif ((blueprint_nsd - measured_nsd) / blueprint_nsd) >= 0.70:
            cls._trigger_alert(new_alerts, fleet_id, vehicle_id, tyre_id, None, "TD03", measured_nsd, "mm")
        return new_alerts

    @classmethod
    def _trigger_alert(
        cls,
        out_list: list,
        fleet_id: str,
        vehicle_id: str,
        tyre_id: Optional[str],
        wheel_position: Optional[str],
        code: str,
        value: float,
        unit: str,
    ):
        if code not in ALERT_CATALOGUE:
            return

        cat_info = ALERT_CATALOGUE[code]
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=cls.COOLDOWN_MINUTES)

        # Deduplication query
        existing = Alert.query.filter(
            Alert.fleet_id == fleet_id,
            Alert.vehicle_id == vehicle_id,
            Alert.code == code,
            Alert.status.in_([AlertStatus.ACTIVE, AlertStatus.ACKNOWLEDGED]),
            Alert.created_at >= cutoff,
        ).first()

        if existing:
            # Already active in cooldown window; do not spam
            return

        alert = Alert(
            fleet_id=fleet_id,
            vehicle_id=vehicle_id,
            tyre_id=tyre_id,
            wheel_position=wheel_position,
            code=code,
            category=cat_info["category"],
            severity=cat_info["severity"],
            observed_value=value,
            unit=unit,
            explanation=f"{cat_info['name']}: {cat_info['expl']} (Observed: {value:.1f} {unit})",
            recommended_action=cat_info["action"],
            status=AlertStatus.ACTIVE,
        )
        db.session.add(alert)
        out_list.append(alert)
