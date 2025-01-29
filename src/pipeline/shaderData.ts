import { MatrixUtils } from "../matrix.js";
import { WebGPU } from "../webgpu.js";
export class SharedData {

    static spheresBuffer: GPUBuffer;
    static oldSpheresBuffer: GPUBuffer;
    static colorIndexBuffer: GPUBuffer;

    static NUM_SPHERES = 1000;
    static lightDirection: Float32Array = MatrixUtils.normalize(new Float32Array([0.0, -1.0, 0.5])); // Light direction in world space

    static atomicBuffer: GPUBuffer;
    static gridBuffers: GPUBuffer[] = [];
    static NUM_GRID_BUFFERS = 5;

    static depthTexture: GPUTexture;

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

    static #initSphereBuffer() {
        // Create instance buffer with random positions
        const instanceData = new Float32Array(this.NUM_SPHERES * 3); // xyz for each instance
        for (let i = 0; i < this.NUM_SPHERES; i++) {
            const dir = MatrixUtils.normalize(new Float32Array([(Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)]))

            instanceData[i * 3] = dir[0] * Math.random() * 30; // x
            instanceData[i * 3 + 1] = dir[1] * Math.random() * 30 // y
            instanceData[i * 3 + 2] = dir[2] * Math.random() * 30; // z
        }

        // instanceData[0] = 2;
        // instanceData[1] = 2;
        // instanceData[2] = 2;

        // instanceData[3] = 2;
        // instanceData[4] = 2;
        // instanceData[5] = -2;

        // instanceData[6] = 0;
        // instanceData[7] = 0;
        // instanceData[8] = 0;

        // instanceData[9] =  0;
        // instanceData[10] = 0;
        // instanceData[11] = 1;

        // console.log(instanceData.byteLength)
        this.spheresBuffer = WebGPU.device.createBuffer({
            size: instanceData.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
            mappedAtCreation: true
        });
        new Float32Array(this.spheresBuffer.getMappedRange()).set(instanceData);
        this.spheresBuffer.unmap();

        this.oldSpheresBuffer = WebGPU.device.createBuffer({
            size: instanceData.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX,
            mappedAtCreation: true
        });
        new Float32Array(this.oldSpheresBuffer.getMappedRange()).set(instanceData);
        this.oldSpheresBuffer.unmap();


    }
    static #initColorInderBuffer() {
        // Create color index buffer with random indices
        const colorIndexData = new Uint32Array(this.NUM_SPHERES);
        for (let i = 0; i < this.NUM_SPHERES; i++) {
            colorIndexData[i] = 0; // 6 different colors
        }

        this.colorIndexBuffer = WebGPU.device.createBuffer({
            size: colorIndexData.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE,
            mappedAtCreation: true
        });
        new Uint32Array(this.colorIndexBuffer.getMappedRange()).set(colorIndexData);
        this.colorIndexBuffer.unmap();
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