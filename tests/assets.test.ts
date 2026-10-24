import { expect, it } from "vitest";
// Characterize the installed Suspense resource cache without a React mount.
import { useGLTF as readCachedGLTF } from "@react-three/drei";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
// drei loads Three through CommonJS in Node; patch its real transport instance.
const { FileLoader } = createRequire(import.meta.url)(
  "three",
) as typeof import("three");
import * as assets from "../components/scene/model-cache";

it("retries model URLs after a transient cached load failure", async () => {
  const bytes = await readFile("public/models/echo-player.glb");
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
  const original = FileLoader.prototype.load;
  let fails = true;
  FileLoader.prototype.load = function (_url, onLoad, _onProgress, onError) {
    queueMicrotask(() =>
      fails ? onError?.(new Error("temporary offline")) : onLoad?.(buffer),
    );
  };
  async function read(url: string) {
    try {
      return readCachedGLTF(url);
    } catch (value) {
      if (value instanceof Promise) {
        await value;
        return readCachedGLTF(url);
      }
      throw value;
    }
  }
  try {
    for (const url of [
      "/models/echo-district.glb",
      "/models/echo-player.glb",
    ]) {
      readCachedGLTF.clear(url);
      await expect(read(url)).rejects.toThrow("temporary offline");
    }
    fails = false;
    assets.clearModelCache();
    for (const url of ["/models/echo-district.glb", "/models/echo-player.glb"])
      expect((await read(url)).scene.isGroup).toBe(true);
  } finally {
    FileLoader.prototype.load = original;
    readCachedGLTF.clear("/models/echo-district.glb");
    readCachedGLTF.clear("/models/echo-player.glb");
  }
});
