import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import type { Tyre, WheelPositionConfig } from '../../types';

export type WheelPlacement = {
  id: string;
  axleIndex: number;
  side: 'L' | 'R';
  dual: 'single' | 'outer' | 'inner';
  x: number;
  y: number;
  z: number;
  positionName: string;
};

export function isValidWheelConfiguration(axleCount: number, wheelCount: number): boolean {
  if (!Number.isInteger(axleCount) || !Number.isInteger(wheelCount) || axleCount < 1 || wheelCount < 1) {
    return false;
  }
  // Standard dual rear axles formula: (wheelCount - 2 * axleCount) / 2
  const rearAxles = (wheelCount - 2 * axleCount) / 2;
  const frontAxles = axleCount - rearAxles;
  if (Number.isInteger(rearAxles) && rearAxles >= 1 && frontAxles >= 1) {
    return true;
  }
  // Also valid for 4-wheeler (2 axles, 4 wheels with single tyres on both axles)
  if (axleCount === 2 && wheelCount === 4) {
    return true;
  }
  return false;
}

export function buildWheelLayout(
  axleCount: number,
  wheelCount: number,
  containerFrontY = 359.3,
  containerRearY = -763.6
): WheelPlacement[] {
  const valid = isValidWheelConfiguration(axleCount, wheelCount);
  const axles = valid ? axleCount : 3;
  const wheels = valid ? wheelCount : 10;

  // Handle 4-wheeler (single tyres front and back)
  if (axles === 2 && wheels === 4) {
    return [
      { id: 'F1_L', axleIndex: 0, side: 'L', dual: 'single', x: -108, y: 615.6, z: -53.6, positionName: 'F1_L' },
      { id: 'F1_R', axleIndex: 0, side: 'R', dual: 'single', x: 108, y: 615.6, z: -53.6, positionName: 'F1_R' },
      { id: 'R1_LO', axleIndex: 1, side: 'L', dual: 'single', x: -108, y: containerRearY + 180.0, z: -53.6, positionName: 'R1_LO' },
      { id: 'R1_RO', axleIndex: 1, side: 'R', dual: 'single', x: 108, y: containerRearY + 180.0, z: -53.6, positionName: 'R1_RO' }
    ];
  }

  const rearAxles = Math.max(1, Math.round((wheels - 2 * axles) / 2));
  const frontAxles = Math.max(1, axles - rearAxles);
  const placements: WheelPlacement[] = [];

  // 1. FRONT STEER AXLES (single tyres per side)
  const frontYPositions: number[] = [];
  if (frontAxles === 1) {
    frontYPositions.push(615.6);
  } else if (frontAxles === 2) {
    // Axle 1 sits under the cab at Y = 615.6
    // Axle 2 sits near container front (~312.1)
    const axle2Y = containerFrontY != null ? containerFrontY - 47.2 : 312.1;
    frontYPositions.push(615.6, axle2Y);
  } else {
    const startY = 615.6;
    const endY = 280.0;
    const step = (startY - endY) / (frontAxles - 1);
    for (let i = 0; i < frontAxles; i++) {
      frontYPositions.push(startY - i * step);
    }
  }

  // 2. REAR BOGIE AXLES (dual tyres per side)
  const rearmostY = containerRearY + 122.6; // approx -641.0
  const rearSpacing = 128.0;

  const rearYPositions: number[] = [];
  if (rearAxles === 1) {
    rearYPositions.push(containerRearY + 180.0);
  } else {
    for (let i = 0; i < rearAxles; i++) {
      const offset = (rearAxles - 1 - i) * rearSpacing;
      rearYPositions.push(rearmostY + offset);
    }
  }

  // Generate Front single tyres
  for (let index = 0; index < frontAxles; index++) {
    const axleNumber = index + 1;
    const y = frontYPositions[index];

    for (const side of ['L', 'R'] as const) {
      placements.push({
        id: `F${axleNumber}_${side}`,
        axleIndex: index,
        side,
        dual: 'single',
        x: side === 'L' ? -108 : 108,
        y,
        z: -53.6,
        positionName: `F${axleNumber}_${side}`
      });
    }
  }

  // Generate Rear dual tyres (outer at X = ±108, inner at X = ±76)
  for (let index = 0; index < rearAxles; index++) {
    const axleNumber = index + 1;
    const axleIndex = frontAxles + index;
    const y = rearYPositions[index];

    const rearWheels = [
      { side: 'L', dual: 'outer', x: -108, suffix: 'LO' },
      { side: 'L', dual: 'inner', x: -76, suffix: 'LI' },
      { side: 'R', dual: 'inner', x: 76, suffix: 'RI' },
      { side: 'R', dual: 'outer', x: 108, suffix: 'RO' }
    ] as const;

    for (const wheel of rearWheels) {
      placements.push({
        id: `R${axleNumber}_${wheel.suffix}`,
        axleIndex,
        side: wheel.side,
        dual: wheel.dual,
        x: wheel.x,
        y,
        z: -53.6,
        positionName: `R${axleNumber}_${wheel.suffix}`
      });
    }
  }

  return placements;
}

export function resolveWheelPositionName(position?: string): string | undefined {
  if (!position) return undefined;
  const normalized = position.toUpperCase().replace(/[^A-Z0-9]/g, '');

  const aliases: Record<string, string> = {
    // 2-letter standard
    FL: 'F1_L',
    FR: 'F1_R',
    FL1: 'F1_L',
    FR1: 'F1_R',
    FL2: 'F2_L',
    FR2: 'F2_R',
    RL: 'R1_LO',
    RR: 'R1_RO',
    // Word aliases
    FRONTLEFT: 'F1_L',
    FRONTRIGHT: 'F1_R',
    FRONT1LEFT: 'F1_L',
    FRONT1RIGHT: 'F1_R',
    FRONT2LEFT: 'F2_L',
    FRONT2RIGHT: 'F2_R',
    REARLEFT: 'R1_LO',
    REARRIGHT: 'R1_RO',
    REARLEFTOUTER: 'R1_LO',
    REARLEFTINNER: 'R1_LI',
    REARRIGHTINNER: 'R1_RI',
    REARRIGHTOUTER: 'R1_RO',
    REAR1LEFTOUTER: 'R1_LO',
    REAR1LEFTINNER: 'R1_LI',
    REAR1RIGHTINNER: 'R1_RI',
    REAR1RIGHTOUTER: 'R1_RO',
    REAR2LEFTOUTER: 'R2_LO',
    REAR2LEFTINNER: 'R2_LI',
    REAR2RIGHTINNER: 'R2_RI',
    // Commercial fleet inspection sheet format (1R, 1L, 2R, 2L, 3RO, 3RI, 3LO, 3LI, 4RO, 4RI, 4LO, 4LI)
    '1R': 'F1_R',
    '1L': 'F1_L',
    '2R': 'F2_R',
    '2L': 'F2_L',
    '3RO': 'R1_RO',
    '3RI': 'R1_RI',
    '3LO': 'R1_LO',
    '3LI': 'R1_LI',
    '4RO': 'R2_RO',
    '4RI': 'R2_RI',
    '4LO': 'R2_LO',
    '4LI': 'R2_LI',
  };

  if (aliases[normalized]) return aliases[normalized];

  let match = normalized.match(/^F(\d+)(L|R)$/);
  if (match) return `F${match[1]}_${match[2]}`;

  match = normalized.match(/^FRONT(\d+)(LEFT|RIGHT)$/);
  if (match) return `F${match[1]}_${match[2] === 'LEFT' ? 'L' : 'R'}`;

  match = normalized.match(/^R(\d+)(LO|LI|RI|RO)$/);
  if (match) return `R${match[1]}_${match[2]}`;

  match = normalized.match(/^REAR(\d+)(LEFT|RIGHT)(OUTER|INNER)$/);
  if (match) {
    const side = match[2] === 'LEFT' ? 'L' : 'R';
    const dual = match[3] === 'OUTER' ? 'O' : 'I';
    return `R${match[1]}_${side}${dual}`;
  }

  // Already formatted as F1_L or R1_LO
  if (normalized.includes('_')) return normalized;

  return undefined;
}

export function stripBakedTyreTriangles(mesh: THREE.Mesh): number {
  const geom = mesh.geometry;
  if (!geom) return 0;
  const pos = geom.attributes.position;
  if (!pos) return 0;

  const tyreYRanges: [number, number][] = [
    [560, 670],   // F1: ~615
    [380, 480],   // F2: ~437
    [260, 360],   // F3: ~312
    [-560, -460], // R1: ~ -513
    [-690, -590]  // R2: ~ -641
  ];

  function isInTyreZone(x: number, y: number, z: number): boolean {
    const absX = Math.abs(x);
    if (absX < 55 || absX > 145) return false;
    if (z < -115 || z > 10) return false;
    return tyreYRanges.some(([minY, maxY]) => y >= minY && y <= maxY);
  }

  let removedCount = 0;
  if (geom.index) {
    const indices = geom.index.array;
    const newIndices: number[] = [];
    const removedTriangleIndices: number[] = [];

    for (let i = 0; i < indices.length; i += 3) {
      const a = indices[i];
      const b = indices[i + 1];
      const c = indices[i + 2];

      const cx = (pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3;
      const cy = (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3;
      const cz = (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3;

      if (isInTyreZone(cx, cy, cz)) {
        removedCount++;
        removedTriangleIndices.push(i / 3);
      } else {
        newIndices.push(a, b, c);
      }
    }

    if (removedCount > 0) {
      geom.setIndex(new THREE.BufferAttribute(new Uint32Array(newIndices), 1));
      geom.computeVertexNormals();
      geom.computeBoundingBox();
    }
  }

  return removedCount;
}

export interface TruckGLBProps {
  explode: boolean;
  tyresData: (Tyre | WheelPositionConfig | any)[];
  axleCount: number;
  wheelCount: number;
  selectedPosition?: string | null;
  onTyreClick: (data: any) => void;
  showGeneratedTyres?: boolean;
}

export function TruckGLB({
  explode,
  tyresData = [],
  axleCount,
  wheelCount,
  selectedPosition,
  onTyreClick,
  showGeneratedTyres = true
}: TruckGLBProps) {
  const TRUCK_MODEL_URL = '/models/truck_clean_no_tyres.glb';
  const { scene } = useGLTF(TRUCK_MODEL_URL);

  const { model, tyreMeshes } = useMemo(() => {
    // Sanitize cached scene
    scene.traverse((obj) => {
      if (obj.name === 'GeneratedTyres') {
        obj.parent?.remove(obj);
      }
    });

    // Work ONLY on the cloned scene
    const cloned = scene.clone(true);

    // Remove any existing GeneratedTyres groups
    const existingGenerated: THREE.Object3D[] = [];
    cloned.traverse((obj) => {
      if (obj.name === 'GeneratedTyres') {
        existingGenerated.push(obj);
      }
    });
    existingGenerated.forEach((g) => g.parent?.remove(g));

    // Direct root filter: truck_low_poly keeps Container and truck_body
    const truckRoot = cloned.getObjectByName('truck_low_poly');
    if (truckRoot) {
      truckRoot.children = truckRoot.children.filter((child) => {
        const name = (child.name || '').toLowerCase();
        return name === 'container' || name === 'truck_body';
      });
    }

    // Remove all unclickable baked fake tyres and billboard skirts (Mesh_3 contains static painted tyres at both front and rear)
    const staticTyreMeshesToRemove: THREE.Object3D[] = [];
    cloned.traverse((obj) => {
      if (obj.name === 'Mesh_3') {
        staticTyreMeshesToRemove.push(obj);
      }
    });
    staticTyreMeshesToRemove.forEach((obj) => obj.parent?.remove(obj));

    // Read container edges dynamically
    const containerMesh = cloned.getObjectByName('Container') as THREE.Mesh | undefined;
    let containerFrontY = 359.3;
    let containerRearY = -763.6;

    if (containerMesh && containerMesh.geometry) {
      containerMesh.geometry.computeBoundingBox();
      if (containerMesh.geometry.boundingBox) {
        containerFrontY = containerMesh.geometry.boundingBox.max.y;
        containerRearY = containerMesh.geometry.boundingBox.min.y;
      }
    }

    // Build generated tyres
    const generatedTyres: THREE.Object3D[] = [];
    const layout = buildWheelLayout(axleCount, wheelCount, containerFrontY, containerRearY);

    const generatedGroup = new THREE.Group();
    generatedGroup.name = 'GeneratedTyres';
    const mountTarget = cloned.getObjectByName('truck_low_poly') ?? cloned;
    mountTarget.add(generatedGroup);

    const tyreRadius = 52.7;
    const tyreWidth = 30.2;
    const hubRadius = 22.0;

    const tyreGeom = new THREE.CylinderGeometry(tyreRadius, tyreRadius, tyreWidth, 32);
    tyreGeom.rotateZ(Math.PI / 2);

    const hubGeom = new THREE.CylinderGeometry(hubRadius, hubRadius, 1.2, 32);
    hubGeom.rotateZ(Math.PI / 2);

    const ringGeom = new THREE.TorusGeometry(38.0, 2.4, 16, 32);
    ringGeom.rotateY(Math.PI / 2);

    const haloGeom = new THREE.TorusGeometry(55.0, 2.0, 16, 32);
    haloGeom.rotateY(Math.PI / 2);

    for (const placement of layout) {
      const tyreGroup = new THREE.Group();
      tyreGroup.name = placement.positionName;
      tyreGroup.position.set(placement.x, placement.y, placement.z);

      const rubberMat = new THREE.MeshStandardMaterial({
        color: 0x1c1c1c,
        roughness: 0.9,
        metalness: 0.1,
        name: 'tyre_rubber'
      });
      const rubberMesh = new THREE.Mesh(tyreGeom, rubberMat);
      rubberMesh.name = `${placement.positionName}_rubber`;
      rubberMesh.castShadow = true;
      rubberMesh.receiveShadow = true;
      rubberMesh.userData.isTyre = true;
      rubberMesh.userData.positionName = placement.positionName;

      const hubMat = new THREE.MeshStandardMaterial({
        color: 0x71767a,
        roughness: 0.4,
        metalness: 0.6,
        name: 'hub_disc'
      });
      const hubMesh = new THREE.Mesh(hubGeom, hubMat);
      hubMesh.name = `${placement.positionName}_hub`;
      const outwardX = placement.side === 'L' ? -(tyreWidth / 2 + 0.1) : tyreWidth / 2 + 0.1;
      hubMesh.position.set(outwardX, 0, 0);
      hubMesh.castShadow = true;
      hubMesh.receiveShadow = true;
      hubMesh.userData.isTyre = true;
      hubMesh.userData.positionName = placement.positionName;

      // Outer sidewall health color indicator ring
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0x9ca3af,
        emissive: 0x9ca3af,
        emissiveIntensity: 0.5,
        roughness: 0.3,
        name: 'indicator_ring'
      });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.name = `${placement.positionName}_ring`;
      ringMesh.position.set(outwardX * 1.02, 0, 0);
      ringMesh.userData.isTyre = true;
      ringMesh.userData.positionName = placement.positionName;

      // Selection halo mesh (bright cyan glow when selected)
      const haloMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: 1.2,
        roughness: 0.1,
        name: 'selection_halo'
      });
      const haloMesh = new THREE.Mesh(haloGeom, haloMat);
      haloMesh.name = `${placement.positionName}_halo`;
      haloMesh.position.set(outwardX * 1.04, 0, 0);
      haloMesh.visible = false;
      haloMesh.userData.isTyre = true;
      haloMesh.userData.positionName = placement.positionName;

      tyreGroup.add(rubberMesh);
      tyreGroup.add(hubMesh);
      tyreGroup.add(ringMesh);
      tyreGroup.add(haloMesh);

      tyreGroup.userData.isTyre = true;
      tyreGroup.userData.positionName = placement.positionName;
      tyreGroup.userData.side = placement.side;
      tyreGroup.userData.originalPosition = tyreGroup.position.clone();

      generatedGroup.add(tyreGroup);
      generatedTyres.push(tyreGroup);
    }

    // Auto-scale and properly position the vehicle on the ground plane (Y = 0)
    cloned.position.set(0, 0, 0);
    cloned.scale.set(1, 1, 1);
    cloned.updateMatrixWorld(true);

    const unscaledBox = new THREE.Box3().setFromObject(cloned);
    const unscaledSize = unscaledBox.getSize(new THREE.Vector3());
    const maxDimension = Math.max(unscaledSize.x, unscaledSize.y, unscaledSize.z);
    const scaleFactor = maxDimension > 0 ? 8 / maxDimension : 1;

    cloned.scale.setScalar(scaleFactor);
    cloned.updateMatrixWorld(true);

    const scaledBox = new THREE.Box3().setFromObject(cloned);
    const centerX = (scaledBox.min.x + scaledBox.max.x) / 2;
    const centerZ = (scaledBox.min.z + scaledBox.max.z) / 2;
    const bottomY = scaledBox.min.y;

    // Ground vehicle so tyres touch ground (Y = 0) and center along X and Z
    cloned.position.set(-centerX, -bottomY, -centerZ);
    cloned.updateMatrixWorld(true);

    return {
      model: cloned,
      tyreMeshes: generatedTyres
    };
  }, [scene, axleCount, wheelCount]);

  useEffect(() => {
    const genGroup = model.getObjectByName('GeneratedTyres');
    if (genGroup) {
      genGroup.visible = showGeneratedTyres;
    }
  }, [model, showGeneratedTyres]);

  useEffect(() => {
    const tyresByPosition = new Map<string, any>();

    for (const item of tyresData) {
      // Support both Tyre and WheelPositionConfig structures
      const posRaw = item.wheel_position || item.position;
      const positionName = resolveWheelPositionName(posRaw);
      if (positionName && !tyresByPosition.has(positionName)) {
        tyresByPosition.set(positionName, item);
      }
    }

    const anyHasTyre = tyresData.some((item) => {
      const tyreObj = item?.tyre ?? item;
      return Boolean(
        tyreObj && (tyreObj.tyre_id || tyreObj.serial_number || tyreObj.current_thi != null)
      );
    });

    tyreMeshes.forEach((object, index) => {
      const positionName = object.userData.positionName as string;
      const rawItem = tyresByPosition.get(positionName);
      const tyreObj = rawItem?.tyre ?? rawItem;

      const hasFittedTyre = Boolean(
        rawItem &&
        (
          (rawItem.tyre && (rawItem.tyre.tyre_id || rawItem.tyre.serial_number || rawItem.tyre.current_thi != null)) ||
          (rawItem.serial_number || rawItem.tyre_id || (rawItem.id && rawItem.status !== 'UNKNOWN'))
        )
      );

      // Only show tyres that are actually fitted/present on the vehicle
      const shouldBeVisible = (anyHasTyre ? hasFittedTyre : true) && showGeneratedTyres;
      object.visible = shouldBeVisible;

      if (!shouldBeVisible) {
        return;
      }

      const statusStr = (tyreObj?.thi_status || rawItem?.status || '')?.toString().toUpperCase();
      const thiValue =
        tyreObj?.thi != null
          ? Number(tyreObj.thi)
          : tyreObj?.current_thi != null
          ? Number(tyreObj.current_thi)
          : null;

      const isSelected =
        selectedPosition &&
        (resolveWheelPositionName(selectedPosition) === positionName ||
          selectedPosition === positionName);

      // Determine colour based on THI thresholds:
      // Red when Critical (thi < 60 or status === 'CRITICAL')
      // Orange when Warning (60 <= thi < 80 or status === 'WARNING')
      // Green when Healthy (thi >= 80 or status === 'HEALTHY')
      let effectiveStatus = statusStr;
      if (thiValue != null) {
        if (thiValue < 60) {
          effectiveStatus = 'CRITICAL';
        } else if (thiValue < 80) {
          effectiveStatus = 'WARNING';
        } else {
          effectiveStatus = 'HEALTHY';
        }
      }

      let tyreColour: number | null = null;
      if (effectiveStatus === 'CRITICAL') {
        tyreColour = 0xef4444; // Red (Critical)
      } else if (effectiveStatus === 'WARNING') {
        tyreColour = 0xf97316; // Orange (Warning)
      } else if (effectiveStatus === 'HEALTHY') {
        tyreColour = 0x22c55e; // Green (Healthy)
      }

      const rubberMesh = object.getObjectByName(`${positionName}_rubber`) as THREE.Mesh | null;
      if (rubberMesh && rubberMesh.material) {
        const mat = rubberMesh.material as THREE.MeshStandardMaterial;

        if (tyreColour != null) {
          mat.color.setHex(tyreColour);
          mat.emissive.setHex(tyreColour);
          mat.emissiveIntensity = isSelected ? 0.6 : 0.25;
          mat.roughness = 0.55;
        } else {
          mat.color.setHex(isSelected ? 0x38bdf8 : 0x1c1c1c);
          mat.emissive.setHex(isSelected ? 0x0284c7 : 0x000000);
          mat.emissiveIntensity = isSelected ? 0.35 : 0;
          mat.roughness = 0.9;
        }

        rubberMesh.userData.tyreData = rawItem;
        rubberMesh.userData.tyreIndex = index;
      }

      const ringMesh = object.getObjectByName(`${positionName}_ring`) as THREE.Mesh | null;
      if (ringMesh && ringMesh.material) {
        const ringMat = ringMesh.material as THREE.MeshStandardMaterial;
        if (tyreColour != null) {
          ringMat.color.setHex(tyreColour);
          ringMat.emissive.setHex(tyreColour);
          ringMat.emissiveIntensity = isSelected ? 1.0 : 0.6;
        } else {
          ringMat.color.setHex(0x9ca3af);
          ringMat.emissive.setHex(0x475569);
          ringMat.emissiveIntensity = 0.2;
        }
        ringMesh.userData.tyreData = rawItem;
        ringMesh.userData.tyreIndex = index;
      }

      const haloMesh = object.getObjectByName(`${positionName}_halo`) as THREE.Mesh | null;
      if (haloMesh) {
        haloMesh.visible = !!isSelected;
        haloMesh.userData.tyreData = rawItem;
        haloMesh.userData.tyreIndex = index;
      }

      const hubMesh = object.getObjectByName(`${positionName}_hub`) as THREE.Mesh | null;
      if (hubMesh) {
        hubMesh.userData.tyreData = rawItem;
        hubMesh.userData.tyreIndex = index;
      }

      object.userData.tyreData = rawItem;
      object.userData.tyreIndex = index;
    });
  }, [tyreMeshes, tyresData, selectedPosition, showGeneratedTyres]);

  useEffect(() => {
    tyreMeshes.forEach((tyre) => {
      const original = tyre.userData.originalPosition as THREE.Vector3;
      if (!original) return;

      tyre.position.copy(original);

      if (explode) {
        const isLeft = tyre.userData.side === 'L' || tyre.userData.positionName?.includes('_L');
        const direction = isLeft ? -1 : 1;
        tyre.position.x += direction * 35;
      }
    });
  }, [explode, tyreMeshes]);

  return (
    <primitive
      object={model}
      onPointerOver={(event: any) => {
        let object = event.object as THREE.Object3D | null;
        while (object) {
          if (object.userData?.isTyre) {
            let curr: THREE.Object3D | null = object;
            let isVisible = true;
            while (curr) {
              if (!curr.visible) {
                isVisible = false;
                break;
              }
              curr = curr.parent;
            }
            if (isVisible) {
              document.body.style.cursor = 'pointer';
              return;
            }
          }
          object = object.parent;
        }
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
      onPointerDown={(event: any) => {
        event.stopPropagation();
        let object = event.object as THREE.Object3D | null;
        while (object) {
          if (object.userData?.isTyre) {
            let curr: THREE.Object3D | null = object;
            let isVisible = true;
            while (curr) {
              if (!curr.visible) {
                isVisible = false;
                break;
              }
              curr = curr.parent;
            }
            if (!isVisible) return;

            const rawData = object.userData.tyreData;
            const tyre = rawData?.tyre ?? rawData;
            const posName = object.userData.positionName;

            if (tyre) {
              onTyreClick({
                stencil: tyre.stencil_id || tyre.serial_number || `TYRE-${object.userData.tyreIndex + 1}`,
                position: rawData.wheel_position || posName,
                thi: tyre.thi ?? tyre.current_thi ?? 0,
                pressure: tyre.pressure ?? tyre.pressure_psi ?? null,
                temperature: tyre.temperature ?? tyre.temperature_c ?? null,
                nsd: tyre.initial_nsd ?? tyre.current_nsd ?? tyre.blueprint_nsd ?? null,
                speed: tyre.speed ?? 0,
                raw: rawData
              });
            } else {
              onTyreClick({
                stencil: `TYRE-${object.userData.tyreIndex + 1}`,
                position: posName,
                thi: 0,
                pressure: null,
                temperature: null,
                nsd: null,
                speed: 0,
                raw: null
              });
            }
            return;
          }
          object = object.parent;
        }
      }}
    />
  );
}

useGLTF.preload('/models/truck_clean_no_tyres.glb');
