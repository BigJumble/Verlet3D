import { WebGPU } from "./webgpu.js";
import { Controls } from "./controls.js";
import { Animator } from "./animator.js";
import { ExampleShader } from "./shaders/example.js";
import { SpheresShader } from "./shaders/spheres.js";
async function main() {

    Controls.init();
    await WebGPU.init();

    // ExampleShader.init();
    // ExampleShader.update();

    SpheresShader.init();
    SpheresShader.update();




    Animator.startAnimation(Controls.update);
}

main();