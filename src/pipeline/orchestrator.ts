import { PlayerController } from "../playerController.js";
import { SharedData } from "./shaderData.js";
import { ComputeCos } from "./shaders/computeCos.js";
import { RenderSpheres } from "./shaders/renderSpheres.js";

export class Orchestrator
{
    static resized = false;
    static init()
    {
        SharedData.init();
        ComputeCos.init();
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
        ComputeCos.tick(deltaTime);
        RenderSpheres.tick();
    }
}