import { WebGPU } from "../webgpu.js";
import { MatrixUtils } from "../matrix.js";
export class GameObject {
    constructor(model, transform) {
        // 10 buffers of connection constraints
        this.connectionPairsBuffers = [];
        this.connectionDistanceBuffers = [];
        this.connectionBufferSizes = [];
        this.numPoints = model.points.length;
        this.posByteLength = this.numPoints * 3 * 4;
        this.strideByteLength = -1;
        const transformedPositions = [];
        for (let i = 0; i < this.numPoints; i++) {
            let pos = new Float32Array([...model.points[i], 1]);
            pos = MatrixUtils.multiplyVec4(transform, pos);
            transformedPositions.push(pos[0], pos[1], pos[2]);
        }
        this.positionsBuffer = WebGPU.device.createBuffer({
            label: "gameobject point buffer",
            size: this.numPoints * 3 * 4, // vec3 (not aligned, don't use vec3 in wgsl)
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
            mappedAtCreation: true
        });
        new Float32Array(this.positionsBuffer.getMappedRange()).set(new Float32Array(transformedPositions));
        this.positionsBuffer.unmap();
        this.colorsBuffer = WebGPU.device.createBuffer({
            label: "gameobject color buffer",
            size: this.numPoints * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
            mappedAtCreation: true
        });
        new Float32Array(this.colorsBuffer.getMappedRange()).set(new Float32Array(model.colorIDs));
        this.colorsBuffer.unmap();
        this.numBuffers = model.connectionIDsBuffers.length;
        for (let i = 0; i < this.numBuffers; i++) {
            this.connectionBufferSizes.push(model.connectionIDsBuffers[i].length);
            const tempPairBuffer = WebGPU.device.createBuffer({
                size: this.numPoints * 2 * 4, // vec2u
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
                mappedAtCreation: true
            });
            new Float32Array(tempPairBuffer.getMappedRange()).set(new Float32Array(model.connectionIDsBuffers[i].flat(1)));
            tempPairBuffer.unmap();
            this.connectionPairsBuffers.push(tempPairBuffer);
            const tempDistBuffer = WebGPU.device.createBuffer({
                size: this.numPoints * 4, // f32
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
                mappedAtCreation: true
            });
            new Float32Array(tempDistBuffer.getMappedRange()).set(new Float32Array(model.connectionDistancesBuffers[i].flat(1)));
            tempDistBuffer.unmap();
            this.connectionPairsBuffers.push(tempDistBuffer);
        }
        this.centerPosition = { x: 0, y: 0, z: 0 };
        this.boundingBoxMin = { x: 0, y: 0, z: 0 };
        this.boundingBoxMax = { x: 0, y: 0, z: 0 };
        this.isActive = false;
    }
}
// "obtaining center and bounding edges":
// step 1: concatenate active positions using buffer to buffer copy.
// step 2: run parallel reduction compute shader.
// step 3: get positions back to objects.
// these steps make sure that position buffers don't leave gpu.
