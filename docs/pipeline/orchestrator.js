import { PlayerController } from "../playerController.js";
import { WebGPU } from "../webgpu.js";
import { SharedData } from "./shaderData.js";
import { ComputeCollisions } from "./shaders/computeCollisions.js";
import { ComputeGrid } from "./shaders/computeGrid.js";
// import { ComputeCos } from "./shaders/computeCos.js";
import { ComputeMovement } from "./shaders/computeMovement.js";
import { RenderCube } from "./shaders/renderGrid.js";
import { RenderSpheres } from "./shaders/renderSpheres.js";
export class Orchestrator {
    static init() {
        SharedData.init();
        ComputeMovement.init();
        ComputeGrid.init();
        // ComputeGrid3DT.init();
        ComputeCollisions.init();
        RenderSpheres.init();
        RenderCube.init();
    }
    static update(deltaTime) {
        if (PlayerController.paused)
            return;
        if (this.resized) {
            SharedData.resize();
            this.resized = false;
        }
        const commandEncoder = WebGPU.device.createCommandEncoder();
        ComputeMovement.tick(deltaTime, commandEncoder);
        ComputeGrid.tick(commandEncoder);
        // ComputeGrid3DT.tick(commandEncoder);
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
        RenderCube.tick(renderPass);
        RenderSpheres.tick(renderPass);
        renderPass.end();
        WebGPU.device.queue.submit([commandEncoder.finish()]);
    }
}
Orchestrator.resized = false;
