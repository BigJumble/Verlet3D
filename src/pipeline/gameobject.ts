import { WebGPU } from "../webgpu";
import { Model } from "../interfaces/model";
import { mat4, vec3, vec4 } from "gl-matrix";

export class GameObject {

    numPoints: number;     
    numBuffers: number;
    strideByteLength: number;
    posByteLength: number;

    positionsBuffer: GPUBuffer; 

    colorsBuffer: GPUBuffer;

    // 10 buffers of connection constraints
    connectionPairsBuffers: GPUBuffer[] = [];
    connectionDistanceBuffers: GPUBuffer[] = [];
    connectionBufferSizes: number[] = [];

    // current center position
    centerPosition: vec3;

    // current min_xyz | bounding box min
    boundingBoxMin: vec3;

    // current max_xyz | bounding box max
    boundingBoxMax: vec3;

    // isactive bool | in the scene? / near player?
    isActive: boolean;

    constructor(model: Model, transform: mat4) {

        this.numPoints = model.points.length;
        this.posByteLength = this.numPoints * 3 * 4;
        this.strideByteLength = -1;

        const transformedPositions: number[] = [];
        const tempVec4 = vec4.create();
        const tempVec3 = vec3.create();

        for(let i = 0; i < this.numPoints; i++) {
            vec3.copy(tempVec3, model.points[i] as vec3);
            vec4.set(tempVec4, tempVec3[0], tempVec3[1], tempVec3[2], 1.0);
            vec4.transformMat4(tempVec4, tempVec4, transform);
            transformedPositions.push(tempVec4[0], tempVec4[1], tempVec4[2]);
        }

        this.positionsBuffer = WebGPU.device.createBuffer({
            label:"gameobject point buffer",
            size: this.numPoints * 3 * 4, // vec3 (not aligned, don't use vec3 in wgsl)
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
            mappedAtCreation: true
        });
        new Float32Array(this.positionsBuffer.getMappedRange()).set(new Float32Array(transformedPositions));
        this.positionsBuffer.unmap();


        this.colorsBuffer = WebGPU.device.createBuffer({
            label:"gameobject color buffer",
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

        this.centerPosition = vec3.create();
        this.boundingBoxMin = vec3.create();
        this.boundingBoxMax = vec3.create();
        this.isActive = false;
    }
    // buffer of positions
    // buffer of colors
    // 10 buffers of connection constraints

    // current center position
    // current min_xyz | bounding box min
    // current max_xyz | bounding box max

    // isactive bool | in the scene? / near player?
}


// "obtaining center and bounding edges":
// step 1: concatenate active positions using buffer to buffer copy.
// step 2: run parallel reduction compute shader.
// step 3: get positions back to objects.
// these steps make sure that position buffers don't leave gpu.