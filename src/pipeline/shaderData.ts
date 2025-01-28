import { MatrixUtils } from "../matrix.js";
import { WebGPU } from "../webgpu.js";
export class SharedData {

    static spheresBuffer: GPUBuffer;
    static oldSpheresBuffer:GPUBuffer;
    static colorIndexBuffer: GPUBuffer;

    static NUM_SPHERES = 1000000;
    static lightDirection: Float32Array = MatrixUtils.normalize(new Float32Array([0.0, -1.0, 0.5])); // Light direction in world space
    static init() {
        this.#initSphereBuffer();
        this.#initColorInderBuffer();

    }

    static #initSphereBuffer() {
        // Create instance buffer with random positions
        const instanceData = new Float32Array(this.NUM_SPHERES * 3); // xyz for each instance
        for (let i = 0; i < this.NUM_SPHERES; i++) {
            const dir = MatrixUtils.normalize(new Float32Array([(Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)]))

            instanceData[i * 3] = dir[0] * Math.random() * 100; // x
            instanceData[i * 3 + 1] = dir[1] *Math.random() * 100 // y
            instanceData[i * 3 + 2] = dir[2] *Math.random() * 100; // z
        }

        this.spheresBuffer = WebGPU.device.createBuffer({
            size: instanceData.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX ,
            mappedAtCreation: true
        });
        new Float32Array(this.spheresBuffer.getMappedRange()).set(instanceData);
        this.spheresBuffer.unmap();

        this.oldSpheresBuffer = WebGPU.device.createBuffer({
            size: instanceData.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX ,
            mappedAtCreation: true
        });
        new Float32Array(this.oldSpheresBuffer.getMappedRange()).set(instanceData);
        this.oldSpheresBuffer.unmap();


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