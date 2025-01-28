import { MatrixUtils } from "../matrix.js";
import { WebGPU } from "../webgpu.js";
export class SharedData {

    static spheresBuffer: GPUBuffer;
    static colorIndexBuffer: GPUBuffer;

    static NUM_SPHERES = 10000000;
    static lightDirection: Float32Array = MatrixUtils.normalize(new Float32Array([0.0, -1.0, 0.5])); // Light direction in world space
    static init() {
        this.#initSphereBuffer();
        this.#initColorInderBuffer();

    }

    static #initSphereBuffer() {
        // Create instance buffer with random positions
        const instanceData = new Float32Array(this.NUM_SPHERES * 3); // xyz for each instance
        for (let i = 0; i < this.NUM_SPHERES; i++) {
            instanceData[i * 3] = (Math.random() - 0.5) * 3000; // x
            instanceData[i * 3 + 1] = (Math.random() - 0.5) * 2; // y
            instanceData[i * 3 + 2] = (Math.random() - 0.5) * 3000; // z
        }

        this.spheresBuffer = WebGPU.device.createBuffer({
            size: instanceData.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_SRC,
            mappedAtCreation: true
        });
        new Float32Array(this.spheresBuffer.getMappedRange()).set(instanceData);
        this.spheresBuffer.unmap();


    }
    static #initColorInderBuffer()
    {
        // Create color index buffer with random indices
        const colorIndexData = new Uint32Array(this.NUM_SPHERES);
        for (let i = 0; i < this.NUM_SPHERES; i++) {
            colorIndexData[i] = i % 6; // 6 different colors
        }

        this.colorIndexBuffer = WebGPU.device.createBuffer({
            size: colorIndexData.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Uint32Array(this.colorIndexBuffer.getMappedRange()).set(colorIndexData);
        this.colorIndexBuffer.unmap();
    }
}