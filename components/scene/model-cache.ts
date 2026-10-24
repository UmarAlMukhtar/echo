import { useGLTF } from "@react-three/drei";

/** Suspense retains rejected loads; a fresh scene mount alone cannot retry them. */
export function clearModelCache() {
  useGLTF.clear("/models/echo-district.glb");
  useGLTF.clear("/models/echo-player.glb");
}
