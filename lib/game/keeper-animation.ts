import { AnimationMixer, LoopOnce, LoopRepeat } from "three";
import type { AnimationClip, Object3D } from "three";

/** In-place clips drive bones only; PlayerRig owns the world transform. */
export function createKeeperAnimation(root: Object3D, clips: AnimationClip[]) {
  const mixer = new AnimationMixer(root);
  const actions = Object.fromEntries(
    clips.map((clip) => [clip.name, mixer.clipAction(clip)]),
  );
  for (const name of ["Idle", "Walk", "Interact"]) {
    if (!actions[name]) throw new Error(`Keeper animation missing: ${name}`);
  }
  actions.Interact.setLoop(LoopOnce, 1);
  actions.Interact.clampWhenFinished = true;
  actions.Idle.setLoop(LoopRepeat, Infinity);
  actions.Walk.setLoop(LoopRepeat, Infinity);
  let active = "";
  let lastInteraction: number | null = null;
  let remaining = 0;
  function play(name: string, fade: number) {
    if (active === name) return;
    if (active) actions[active].fadeOut(fade);
    actions[name].reset().fadeIn(fade).play();
    active = name;
  }
  return {
    mixer,
    get active() {
      return active;
    },
    update(moving: boolean, interaction: number, reduced: boolean, dt: number) {
      if (
        lastInteraction !== null &&
        interaction !== lastInteraction &&
        !reduced
      ) {
        remaining = actions.Interact.getClip().duration;
        // Repeated E presses restart the short lantern gesture.
        if (active === "Interact") active = "";
        play("Interact", 0.12);
      }
      lastInteraction = interaction;
      if (reduced) remaining = 0;
      if (remaining <= 0)
        play(moving ? "Walk" : "Idle", reduced ? 0 : 0.15);
      // Footsteps communicate movement; reduced motion suppresses idle sway.
      actions.Walk.setEffectiveTimeScale(reduced ? 1 : 1.8);
      if (reduced && !moving) actions.Idle.time = 0;
      mixer.update(reduced && !moving ? 0 : dt);
      remaining = Math.max(0, remaining - dt);
    },
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
    },
  };
}
