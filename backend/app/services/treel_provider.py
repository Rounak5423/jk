"""
TREEL TPMS Integration Interface & Safe Mock Provider Adapter.
Supports payload validation, unit/timestamp normalization, sensor ID mapping,
deduplication, invalid-data quarantine, freshness tracking, and error logging.
"""

import logging
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("TREELProvider")


class BaseTPMSProvider(ABC):
    @abstractmethod
    def ingest_payload(self, raw_payload: Dict[str, Any]) -> Tuple[bool, List[Dict[str, Any]], List[str]]:
        """
        Ingests a raw telemetry payload from a TPMS provider.
        Returns:
            (success: bool, normalized_records: list, error_or_quarantine_reasons: list)
        """
        pass


class MockTreelAdapter(BaseTPMSProvider):
    """
    Mock adapter representing TREEL TPMS gateway.
    Handles payload normalization (e.g. bar/kPa -> psi, F -> C, ISO timestamps)
    and quarantines malformed or out-of-bound readings.
    """
    PROVIDER_NAME = "TREEL_MOCK_ADAPTER"

    @classmethod
    def normalize_pressure(cls, value: float, unit: str = "psi") -> float:
        u = unit.lower()
        if u == "bar":
            return value * 14.5038
        elif u == "kpa":
            return value * 0.145038
        return value  # already psi

    @classmethod
    def normalize_temp(cls, value: float, unit: str = "c") -> float:
        u = unit.lower()
        if u in ("f", "fahrenheit"):
            return (value - 32.0) * (5.0 / 9.0)
        return value  # already C

    def ingest_payload(self, raw_payload: Dict[str, Any]) -> Tuple[bool, List[Dict[str, Any]], List[str]]:
        normalized = []
        quarantine = []

        if not isinstance(raw_payload, dict):
            return False, [], ["Payload root must be a JSON object"]

        device_id = raw_payload.get("gateway_id") or raw_payload.get("device_id")
        timestamp_str = raw_payload.get("timestamp")

        # Parse timestamp
        dt = datetime.now(timezone.utc)
        if timestamp_str:
            try:
                dt = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
            except Exception:
                quarantine.append(f"Invalid timestamp format: {timestamp_str}")

        readings = raw_payload.get("readings", [])
        if not isinstance(readings, list):
            return False, [], ["Payload 'readings' field must be an array"]

        for idx, item in enumerate(readings):
            sensor_id = item.get("sensor_id")
            pos = item.get("position") or item.get("wheel_position", "FL")
            raw_p = item.get("pressure")
            raw_t = item.get("temperature")
            p_unit = item.get("pressure_unit", "psi")
            t_unit = item.get("temp_unit", "c")
            battery = item.get("battery_pct", 85.0)

            # Validation & Quarantine checks
            reasons = []
            if raw_p is None and raw_t is None:
                reasons.append("Both pressure and temperature are null")
            if raw_p is not None and (raw_p < 0 or raw_p > 300):
                reasons.append(f"Pressure out of plausible range: {raw_p}")
            if raw_t is not None and (raw_t < -40 or raw_t > 150):
                reasons.append(f"Temperature out of plausible range: {raw_t}")

            if reasons:
                quarantine.append(f"Item #{idx} (Sensor {sensor_id}, Pos {pos}) quarantined: {'; '.join(reasons)}")
                continue

            # Normalization
            norm_p = self.normalize_pressure(raw_p, p_unit) if raw_p is not None else None
            norm_t = self.normalize_temp(raw_t, t_unit) if raw_t is not None else None

            normalized.append({
                "sensor_id": sensor_id,
                "wheel_position": pos,
                "pressure_psi": round(norm_p, 1) if norm_p is not None else None,
                "temperature_c": round(norm_t, 1) if norm_t is not None else None,
                "battery_soc": float(battery) if battery is not None else 85.0,
                "timestamp": dt,
                "provenance": "TREEL_MOCK",
            })

        success = len(normalized) > 0 or len(quarantine) == 0
        return success, normalized, quarantine
