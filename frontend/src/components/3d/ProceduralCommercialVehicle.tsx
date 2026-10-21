import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import { WheelPositionConfig } from '../../types';

interface VehicleProps {
  wheels: WheelPositionConfig[];
  selectedPosition: string | null;
  onSelectWheel: (wheel: WheelPositionConfig) => void;
  vehicleType: string;
}

export const ProceduralCommercialVehicle: React.FC<VehicleProps> = ({
  wheels,
  selectedPosition,
  onSelectWheel,
  vehicleType,
}) => {
  const isBus = vehicleType === 'BUS';

  return (
    <group position={[0, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
      {/* --- 1. CHASSIS RAILS (Steel Frame) --- */}
      <mesh position={[0, 0.9, 0.45]} castShadow receiveShadow>
        <boxGeometry args={[7.6, 0.25, 0.12]} />
        <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.9, -0.45]} castShadow receiveShadow>
        <boxGeometry args={[7.6, 0.25, 0.12]} />
        <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Frame Crossmembers */}
      {[-2.5, -1.0, 0.5, 2.0].map((x, i) => (
        <mesh key={i} position={[x, 0.9, 0]}>
          <boxGeometry args={[0.15, 0.2, 0.85]} />
          <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}

      {/* --- 2. CABIN OR BUS BODY --- */}
      {!isBus ? (
        // Commercial Truck Cab
        <group position={[2.5, 1.85, 0]}>
          {/* Main Cab Block */}
          <mesh position={[0, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.0, 2.0, 2.3]} />
            <meshStandardMaterial color="#0f172a" metalness={0.4} roughness={0.3} />
          </mesh>

          {/* Windshield */}
          <mesh position={[0.7, 0.4, 0]} rotation={[0, 0, -0.2]}>
            <boxGeometry args={[0.08, 0.85, 2.1]} />
            <meshStandardMaterial color="#38bdf8" transparent opacity={0.6} roughness={0.1} metalness={0.9} />
          </mesh>

          {/* JK Tyre Branded Front Grille */}
          <mesh position={[1.02, -0.4, 0]}>
            <boxGeometry args={[0.05, 0.8, 1.9]} />
            <meshStandardMaterial color="#111827" roughness={0.8} />
          </mesh>
          {/* JK Red stripe on Grille */}
          <mesh position={[1.05, -0.2, 0]}>
            <boxGeometry args={[0.02, 0.1, 1.8]} />
            <meshStandardMaterial color="#D9232D" emissive="#D9232D" emissiveIntensity={0.3} />
          </mesh>

          {/* Front Bumper & Headlights */}
          <mesh position={[1.05, -0.85, 0]}>
            <boxGeometry args={[0.2, 0.35, 2.4]} />
            <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[1.15, -0.85, 0.9]}>
            <boxGeometry args={[0.05, 0.15, 0.3]} />
            <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.8} />
          </mesh>
          <mesh position={[1.15, -0.85, -0.9]}>
            <boxGeometry args={[0.05, 0.15, 0.3]} />
            <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.8} />
          </mesh>
        </group>
      ) : (
        // Bus Monocoque Body
        <group position={[0, 2.0, 0]}>
          <mesh position={[0, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[7.8, 2.3, 2.4]} />
            <meshStandardMaterial color="#1e293b" metalness={0.3} roughness={0.4} />
          </mesh>
          {/* Bus Windows Band */}
          <mesh position={[0, 0.35, 0]}>
            <boxGeometry args={[7.6, 0.8, 2.45]} />
            <meshStandardMaterial color="#0284c7" transparent opacity={0.65} />
          </mesh>
          {/* JK Red livery stripe */}
          <mesh position={[0, -0.3, 0]}>
            <boxGeometry args={[7.85, 0.15, 2.42]} />
            <meshStandardMaterial color="#D9232D" emissive="#D9232D" emissiveIntensity={0.4} />
          </mesh>
        </group>
      )}

      {/* --- 3. CARGO BODY (For Trucks) --- */}
      {!isBus && (
        <group position={[-1.3, 2.2, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[5.2, 2.3, 2.4]} />
            <meshStandardMaterial color="#1e293b" metalness={0.2} roughness={0.7} />
          </mesh>
          {/* JK Tyre Logo Accent Banner on Cargo side */}
          <mesh position={[0, 0, 1.22]}>
            <planeGeometry args={[4.2, 0.7]} />
            <meshStandardMaterial color="#D9232D" metalness={0.1} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0, -1.22]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[4.2, 0.7]} />
            <meshStandardMaterial color="#D9232D" metalness={0.1} roughness={0.5} />
          </mesh>
        </group>
      )}

      {/* --- 4. FUEL TANKS & ACCESSORIES --- */}
      <mesh position={[0.2, 0.75, 0.9]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.3, 0.3, 1.4, 24]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0.2, 0.75, -0.9]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.3, 0.3, 1.4, 24]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* --- 5. CONFIGURATION-DRIVEN WHEEL ASSEMBLIES --- */}
      {wheels
        .filter((w) => {
          const anyHasTyre = wheels.some(
            (wh) => wh.tyre && (wh.tyre.tyre_id || wh.tyre.serial_number || wh.tyre.current_thi != null)
          );
          if (!anyHasTyre) return true;
          return Boolean(
            w.tyre && (w.tyre.tyre_id || w.tyre.serial_number || w.tyre.current_thi != null)
          );
        })
        .map((w) => {
          // Compute 3D coordinate from configuration
          // Steer: single wheel on L (+z) or R (-z)
          // Dual:
          //   Outer Left: z = 1.35
          //   Inner Left: z = 1.05
          //   Inner Right: z = -1.05
          //   Outer Right: z = -1.35
          let zPos = 0;
          if (w.is_left) {
            zPos = w.is_inner ? 1.05 : 1.35;
          } else {
            zPos = w.is_inner ? -1.05 : -1.35;
          }

          const isSelected = selectedPosition === w.wheel_position;

          return (
            <WheelMesh
              key={w.wheel_position}
              wheel={w}
              position={[w.x_offset, 0.55, zPos]}
              isSelected={isSelected}
              onClick={() => onSelectWheel(w)}
            />
          );
        })}
    </group>
  );
};

interface WheelMeshProps {
  wheel: WheelPositionConfig;
  position: [number, number, number];
  isSelected: boolean;
  onClick: () => void;
}

const WheelMesh: React.FC<WheelMeshProps> = ({
  wheel,
  position,
  isSelected,
  onClick,
}) => {
  const [hovered, setHovered] = useState(false);

  // Health color hex: Orange for WARNING, Red for CRITICAL, Emerald for HEALTHY
  const thiVal = wheel.tyre?.current_thi != null ? Number(wheel.tyre.current_thi) : null;
  const effectiveStatus =
    thiVal != null
      ? (thiVal >= 80 ? 'HEALTHY' : thiVal >= 60 ? 'WARNING' : 'CRITICAL')
      : wheel.status?.toUpperCase();

  const healthHex =
    effectiveStatus === 'CRITICAL' || wheel.health_color === '#ef4444'
      ? '#ef4444'
      : effectiveStatus === 'WARNING' || wheel.health_color === '#f59e0b' || wheel.health_color === '#f97316'
      ? '#f97316'
      : effectiveStatus === 'HEALTHY' || wheel.health_color === '#10b981'
      ? '#10b981'
      : (wheel.health_color || '#9ca3af');

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'default';
      }}
    >
      {/* Outer Tyre Rubber Mesh (Cylinder aligned along Z-axis) */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.55, 0.26, 32]} />
        <meshStandardMaterial
          color={hovered ? '#262626' : '#171717'}
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      {/* Wheel Rim / Hub (Steel / Alloy) */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.28, 24]} />
        <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Wheel Hub Center Cap */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.32, 16]} />
        <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* LIVE HEALTH COLOR CODED INDICATOR RING */}
      {/* Notice: visible ring around tyre sidewall giving instant visual health indication */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.42, 0.025, 12, 32]} />
        <meshStandardMaterial
          color={healthHex}
          emissive={healthHex}
          emissiveIntensity={hovered || isSelected ? 0.9 : 0.5}
          roughness={0.3}
        />
      </mesh>

      {/* SELECTION HALO MESH (Appears when tyre is clicked, keeping health color visible) */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.58, 0.03, 16, 32]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#38bdf8"
            emissiveIntensity={1.2}
            roughness={0.1}
          />
        </mesh>
      )}

      {/* Position Label Tag in 3D */}
      <mesh position={[0, 0.65, 0]}>
        <boxGeometry args={[0.28, 0.12, 0.02]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
    </group>
  );
};
