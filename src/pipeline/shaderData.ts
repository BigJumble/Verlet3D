import { WebGPU } from "../webgpu";
import { GameObject } from "./gameobject";
import { vec3 } from "gl-matrix";

export class SharedData {

    static NUM_SPHERES = 0;
    static MAX_SPHERES = 5000000;

    static spheresBuffer: GPUBuffer;
    static oldSpheresBuffer: GPUBuffer;
    static colorIndexBuffer: GPUBuffer;





    // - collisions acceleration structure -
    static atomicBuffer: GPUBuffer;
    static gridBuffers: GPUBuffer[] = [];
    static NUM_GRID_BUFFERS = 4;
    // ------------

    // - other -
    static depthTexture: GPUTexture;
    static lightDirection: vec3 = vec3.normalize(vec3.create(), vec3.fromValues(0.0, -1.0, 0.5)); // Light direction in world space
    // ---------

    static init() {
        this.#initSphereBuffer();
        this.#initColorInderBuffer();
        this.#initAccelerationGrid();
        this.resize();
    }

    static resize(): void {
        if (this.depthTexture) {
            this.depthTexture.destroy();
        }

        this.depthTexture = WebGPU.device.createTexture({
            size: [WebGPU.canvas.width, WebGPU.canvas.height],
            format: "depth24plus",
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
    }

    static loadSceneToBuffers(objects: GameObject[]) {
        const commandEncoder = WebGPU.device.createCommandEncoder();
        for (const obj of objects) {
            // console.log(obj)
            obj.strideByteLength = this.NUM_SPHERES * 12;
            this.NUM_SPHERES += obj.numPoints;

            // console.log(obj.strideByteLength,obj.numPoints*12);

            commandEncoder.copyBufferToBuffer(obj.positionsBuffer, 0, this.spheresBuffer, obj.strideByteLength, obj.posByteLength);

        }

        commandEncoder.copyBufferToBuffer(this.spheresBuffer, 0, this.oldSpheresBuffer, 0, this.NUM_SPHERES * 12);
        WebGPU.device.queue.submit([commandEncoder.finish()]);
    }

    static clearScene() {
        this.NUM_SPHERES = 0;
        // this.spheresBuffer.destroy();
        // this.oldSpheresBuffer.destroy();
        // this.colorIndexBuffer.destroy();
        // this.atomicBuffer.destroy();
        // this.gridBuffers.forEach(buffer => buffer.destroy());
        this.resize();
        this.init();
    }

    static loadDefaultScene(spheres: number) {
        // Create instance buffer with random positions
        
        this.NUM_SPHERES = spheres;
        const instanceData = new Float32Array(this.MAX_SPHERES * 3); // xyz for each instance
        for (let i = 0; i < this.NUM_SPHERES; i++) {
            const dir = vec3.create();
            vec3.normalize(dir, vec3.fromValues(
                Math.random() - 0.5,
                Math.random() - 0.5, 
                Math.random() - 0.5
            ));

            instanceData[i * 3] = dir[0] * Math.random() * 100; // x
            instanceData[i * 3 + 1] = dir[1] * Math.random() * 100; // y 
            instanceData[i * 3 + 2] = dir[2] * Math.random() * 100; // z
        }

        WebGPU.device.queue.writeBuffer(this.spheresBuffer, 0, instanceData);
        WebGPU.device.queue.writeBuffer(this.oldSpheresBuffer, 0, instanceData);
    }

    static #initSphereBuffer() {
        this.spheresBuffer = WebGPU.device.createBuffer({
            label: "spheres buffer",
            size: this.MAX_SPHERES * 3 * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        });


        this.oldSpheresBuffer = WebGPU.device.createBuffer({
            label: "old spheres buffer",
            size: this.MAX_SPHERES * 3 * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });


    }
    static #initColorInderBuffer() {
        // Create color index buffer with random indices
        // const colorIndexData = new Uint32Array(this.NUM_SPHERES);
        // for (let i = 0; i < this.NUM_SPHERES; i++) {
        //     colorIndexData[i] = 0; // 6 different colors
        // }

        this.colorIndexBuffer = WebGPU.device.createBuffer({
            label: "color buffer",
            size: this.MAX_SPHERES * 4,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE,
        });
    }
    static #initAccelerationGrid() {
        const size = 256 * 256 * 256 * 4 * 2; // 1/4 GB all 4 buffers
        this.atomicBuffer = WebGPU.device.createBuffer({
            label: "atomic buffer",
            size: size / 2, // cuz not vec4
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        for (let i = 0; i < this.NUM_GRID_BUFFERS; i++) {
            this.gridBuffers.push(WebGPU.device.createBuffer({
                label: `grid${i} buffer`,
                size: size,
                usage: GPUBufferUsage.STORAGE
            }));
        }
    }
}