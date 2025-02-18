import { MatrixUtils } from "../matrix.js";
import { cube } from "../models/cube.js";
import { PlayerController } from "../playerController.js";
import { WebGPU } from "../webgpu.js";
import { GameObject } from "./gameobject.js";
import { Scene } from "./scene.js";
import { SharedData } from "./shaderData.js";
import { ComputeCollisions } from "./shaders/computeCollisions.js";
import { ComputeGrid } from "./shaders/computeGrid.js";
import { ComputeGrid3DT } from "./shaders/computeGrid3DT.js";
// import { ComputeCos } from "./shaders/computeCos.js";
import { ComputeMovement } from "./shaders/computeMovement.js";
import { RenderBillboards } from "./shaders/renderBillboards.js";
import { RenderCube } from "./shaders/renderGrid.js";
import { RenderSpheres } from "./shaders/renderSpheres.js";

export class Orchestrator {
    static resized = false;


    static init() {
        Scene.loadScene0();
        SharedData.init();
        // SharedData.loadSceneToBuffers(Scene.objects);

        ComputeMovement.init();
        ComputeGrid.init();
        ComputeCollisions.init();
        RenderSpheres.init();
        // RenderCube.init();




    }
    static update(deltaTime: number) {
        if (PlayerController.paused) return;
        if (this.resized) {
            SharedData.resize();
            this.resized = false;
        }
        if (SharedData.NUM_SPHERES === 0) return;

        const commandEncoder = WebGPU.device.createCommandEncoder();

        ComputeMovement.tick(deltaTime, commandEncoder);
        ComputeGrid.tick(commandEncoder);
        ComputeCollisions.tick(commandEncoder);



        const renderPass = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: WebGPU.context.getCurrentTexture().createView(),
                clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 },
                loadOp: "clear",
                storeOp: "store"
            }],
            depthStencilAttachment: {
                view: SharedData.depthTexture.createView(),
                depthClearValue: 1.0,
                depthLoadOp: "clear",
                depthStoreOp: "store",
            }
        });

        // RenderCube.tick(renderPass);
        RenderSpheres.tick(renderPass);

        renderPass.end();

        WebGPU.device.queue.submit([commandEncoder.finish()]);
    }
}