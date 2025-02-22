import { PlayerController } from "./playerController";
import { Orchestrator } from "./pipeline/orchestrator";

export class WebGPU {
    static device: GPUDevice;
    static context: GPUCanvasContext;
    static canvas: HTMLCanvasElement;

    static async init(): Promise<void> {
        // Get WebGPU adapter
        if (!navigator.gpu) {
            throw new Error("WebGPU not supported");
        }

        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            throw new Error("No appropriate GPUAdapter found");
        }

        // Get WebGPU device
        this.device = await adapter.requestDevice();

        // Setup canvas context
        this.canvas = document.querySelector("#webgpu-canvas") as HTMLCanvasElement;
        if (!this.canvas) {
            throw new Error("Canvas not found");
        }

        // Set canvas size to match screen size
        this.resizeCanvas();
        // Add resize event listener
        window.addEventListener('resize', () => this.resizeCanvas());

        this.context = this.canvas.getContext("webgpu") as GPUCanvasContext;
        if (!this.context) {
            throw new Error("WebGPU context not found");
        }

        // Configure the canvas
        const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
        this.context.configure({
            device: this.device,
            format: canvasFormat,
            alphaMode: "premultiplied",
            // viewFormats: ["bgra8unorm-srgb"]
        });
    }

    static resizeCanvas(): void {

        if (this.canvas) {
            // Set the canvas size to match the window's device pixel ratio
            this.canvas.width = window.innerWidth * window.devicePixelRatio;
            this.canvas.height = window.innerHeight * window.devicePixelRatio;
            Orchestrator.resized = true;
            // Update the projection matrix to prevent view stretching
            PlayerController.updateProjectionMatrix();
        }
    }
}
