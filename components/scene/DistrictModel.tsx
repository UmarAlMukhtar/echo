"use client";
import { useEffect, useLayoutEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { Color, Mesh, MeshStandardMaterial } from "three";
import { BRIDGES, bridgeOffset } from "@/lib/game/city";
import { useGameStore } from "@/lib/game/store";

export default function DistrictModel() {
  const gltf = useGLTF("/models/echo-district.glb");
  const joints = useGameStore((s) => s.joints);
  const retain = useGameStore((s) => s.decisions.retain);
  const serve = useGameStore((s) => s.decisions.serve);
  const { scene, materials, bridges } = useMemo(() => {
    const scene = gltf.scene.clone(true);
    const materials = new Map<MeshStandardMaterial, MeshStandardMaterial>();
    scene.traverse((o) => {
      if (o instanceof Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        const material = o.material as MeshStandardMaterial;
        if (!materials.has(material)) materials.set(material, material.clone());
        o.material = materials.get(material)!;
      }
    });
    const bridges = BRIDGES.map((b) => {
      const node = scene.getObjectByName(b.name);
      if (!node) throw Error(`District bridge missing: ${b.name}`);
      return { node, y: node.position.y };
    });
    return { scene, materials, bridges };
  }, [gltf.scene]);
  useLayoutEffect(() => {
    for (const { node, y } of bridges)
      node.position.y = y + bridgeOffset(node.name, joints);
    for (const [source, m] of materials) {
      m.color.copy(source.color);
      m.emissive.copy(source.emissive);
      m.emissiveIntensity = source.emissiveIntensity;
      if (
        retain === false &&
        (m.name === "MAT_Ivory" || m.name === "MAT_Peach")
      )
        m.color.lerp(new Color("#9caed5"), 0.18);
      if (m.name === "MAT_Mint" && serve === true) {
        m.emissive.set("#f2b84b");
        m.emissiveIntensity = 0.6;
      }
      if (m.name === "MAT_Memory_Glow")
        m.emissiveIntensity = serve === false ? 3 : 1;
    }
  }, [bridges, joints, materials, serve, retain]);
  useEffect(
    () => () => {
      for (const m of materials.values()) m.dispose();
    },
    [materials],
  );
  return <primitive object={scene} dispose={null} />;
}
