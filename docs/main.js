import { WebGPU } from "./webgpu.js";
import { Controls } from "./controls.js";
import { Animator } from "./animator.js";
import { PlayerController } from "./playerController.js";
import { CameraShader } from "./shaders/circles.js";
async function main() {
    Controls.init();
    await WebGPU.init();
    // ExampleShader.init();
    // ExampleShader.update();
    // SpheresShader.init();
    // SpheresShader.update();
    CameraShader.init();
    PlayerController.init();
    Animator.startAnimation((deltaTime) => PlayerController.update(deltaTime));
    Animator.startAnimation((deltaTime) => CameraShader.update());
    Animator.startAnimation((deltaTime) => Controls.clearUpdate()); // must be last
}
main();
