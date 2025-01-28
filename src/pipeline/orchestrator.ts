import { PlayerController } from "../playerController.js";
import { SharedData } from "./shaderData.js";
import { ComputeCollisions } from "./shaders/computeCollisions.js";
import { ComputeGrid } from "./shaders/computeGrid.js";
// import { ComputeCos } from "./shaders/computeCos.js";
import { ComputeMovement } from "./shaders/computeMovement.js";
import { RenderSpheres } from "./shaders/renderSpheres.js";

export class Orchestrator
{
    static resized = false;
    static init()
    {
        SharedData.init();
        ComputeMovement.init();
        ComputeGrid.init();
        ComputeCollisions.init();
        RenderSpheres.init();
    }
    static update(deltaTime:number)
    {
        if(PlayerController.paused) return;
        if(this.resized)
        {
            RenderSpheres.resize();
            this.resized = false;
        }
        // console.log()
        ComputeMovement.tick(deltaTime);
        ComputeGrid.tick();
        ComputeCollisions.tick();
        ComputeGrid.tick();
        ComputeCollisions.tick();
        // ComputeGrid.tick();
        // ComputeCollisions.tick();

        RenderSpheres.tick();
    }
}