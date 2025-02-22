import { cube } from "../models/cube";
import { PlayerController } from "../playerController";
import { WebGPU } from "../webgpu";
import { GameObject } from "./gameobject";
import { Scene } from "./scene";
import { SharedData } from "./shaderData";
import { ComputeCollisions } from "./shaders/computeCollisions";
import { ComputeGrid } from "./shaders/computeGrid";
import { ComputeGrid3DT } from "./shaders/computeGrid3DT";
import { ComputeMovement } from "./shaders/computeMovement";
import { RenderBillboards } from "./shaders/renderBillboards";
import { RenderCube } from "./shaders/renderGrid";
import { RenderSpheres } from "./shaders/renderSpheres";

export class Orchestrator {
    static resized = false;


    static init() {
        Scene.loadScene0();
        SharedData.init();
        // SharedData.loadSceneToBuffers(Scene.objects);
        // SharedData.loadDefaultScene(1000000);

        ComputeMovement.init();
        ComputeGrid.init();
        ComputeCollisions.init();
        RenderSpheres.init();
        // RenderCube.init();




    }
    static update(deltaTime: number) {
        if (PlayerController.paused) return;
        if (SharedData.NUM_SPHERES === 0) return;
        if (this.resized) {
            SharedData.resize();
            this.resized = false;
        }


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