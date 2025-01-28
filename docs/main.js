import { WebGPU } from "./webgpu.js";
import { Controls } from "./controls.js";
import { Animator } from "./animator.js";
import { PlayerController } from "./playerController.js";
import { Orchestrator } from "./pipeline/orchestrator.js";
async function main() {
    Controls.init();
    await WebGPU.init();
    Orchestrator.init();
    PlayerController.init();
    Animator.startAnimation((deltaTime) => PlayerController.update(deltaTime));
    Animator.startAnimation((deltaTime) => Orchestrator.update(deltaTime));
    Animator.startAnimation((deltaTime) => Controls.clearUpdate()); // this line must be last
}
main();
