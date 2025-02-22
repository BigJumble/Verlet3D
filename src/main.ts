import { WebGPU } from "./webgpu";
import { Controls } from "./controls";
import { Animator } from "./animator";
import { PlayerController } from "./playerController";
import { Orchestrator } from "./pipeline/orchestrator";
import { Scene } from "./pipeline/scene";

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

// Expose SharedData to console for debugging
import { SharedData } from "./pipeline/shaderData";
(window as any).SharedData = SharedData;
