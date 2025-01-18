import { WebGPU } from "./webgpu.js";
import { Controls } from "./controls.js";
import { Animator } from "./animator.js";
import { ExampleShader } from "./shaders/example.js";
import { SpheresShader } from "./shaders/spheres.js";
import { PlayerController } from "./playerController.js";
import { CameraShader } from "./shaders/circles.js";
import { MatrixUtils } from "./matrix.js";
async function main() {

    const identity = MatrixUtils.identity();
    console.log(identity);
    const translation = MatrixUtils.translation(100,0,0);
    const rotation = MatrixUtils.rotationY(0);
    MatrixUtils.log(MatrixUtils.multiply(rotation,translation));
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