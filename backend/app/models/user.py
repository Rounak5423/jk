import uuid
from datetime import datetime, timezone
import bcrypt
from app.extensions import db


class UserRole:
    SUPER_ADMIN = "SUPER_ADMIN"
    FLEET_MANAGER = "FLEET_MANAGER"
    DRIVER = "DRIVER"

    ALL = [SUPER_ADMIN, FLEET_MANAGER, DRIVER]


user_fleets = db.Table(
    "user_fleets",
    db.Column("user_id", db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    db.Column("fleet_id", db.String(36), db.ForeignKey("fleets.id", ondelete="CASCADE"), primary_key=True),
)


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    fleet_id = db.Column(db.String(36), db.ForeignKey("fleets.id", ondelete="SET NULL"), nullable=True, index=True)
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    full_name = db.Column(db.String(120), nullable=False)
    role = db.Column(db.String(32), nullable=False, default=UserRole.FLEET_MANAGER)
    phone_number = db.Column(db.String(32), nullable=True)
    driver_license_no = db.Column(db.String(64), nullable=True)
    assigned_vehicle_id = db.Column(db.String(36), nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    fleet = db.relationship("Fleet", back_populates="users", lazy="joined")
    managed_fleets = db.relationship("Fleet", secondary=user_fleets, backref=db.backref("managers", lazy="select"), lazy="select")
    trips = db.relationship("Trip", back_populates="driver", lazy="select")
    inspections = db.relationship("Inspection", back_populates="inspector", lazy="select")

    @property
    def authorized_fleets(self):
        """Returns all fleets this user is authorized to manage."""
        result = []
        if self.fleet:
            result.append(self.fleet)
        for f in self.managed_fleets:
            if f.id not in [x.id for x in result]:
                result.append(f)
        return result

    def set_password(self, password: str):
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

    def check_password(self, password: str) -> bool:
        if not self.password_hash:
            return False
        return bcrypt.checkpw(password.encode("utf-8"), self.password_hash.encode("utf-8"))

    def to_dict(self):
        return {
            "id": self.id,
            "fleet_id": self.fleet_id,
            "fleet_name": self.fleet.name if self.fleet else None,
            "managed_fleet_count": len(self.authorized_fleets),
            "username": self.username,
            "email": self.email,
            "full_name": self.full_name,
            "role": self.role,
            "phone_number": self.phone_number,
            "driver_license_no": self.driver_license_no,
            "assigned_vehicle_id": self.assigned_vehicle_id,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
