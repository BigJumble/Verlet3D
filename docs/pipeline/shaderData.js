var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _a, _SharedData_initSphereBuffer, _SharedData_initColorInderBuffer, _SharedData_initAccelerationGrid;
import { MatrixUtils } from "../matrix.js";
import { WebGPU } from "../webgpu.js";
export class SharedData {
    // ---------
    static init() {
        __classPrivateFieldGet(this, _a, "m", _SharedData_initSphereBuffer).call(this);
        __classPrivateFieldGet(this, _a, "m", _SharedData_initColorInderBuffer).call(this);
        __classPrivateFieldGet(this, _a, "m", _SharedData_initAccelerationGrid).call(this);
        this.resize();
    }
    static resize() {
        if (this.depthTexture) {
            this.depthTexture.destroy();
        }
        this.depthTexture = WebGPU.device.createTexture({
            size: [WebGPU.canvas.width, WebGPU.canvas.height],
            format: "depth24plus",
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
    }
    static loadSceneToBuffers(objects) {
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
}
_a = SharedData, _SharedData_initSphereBuffer = function _SharedData_initSphereBuffer() {
    // Create instance buffer with random positions
    // const instanceData = new Float32Array(this.MAX_SPHERES * 3); // xyz for each instance
    // for (let i = 0; i < this.NUM_SPHERES; i++) {
    //     const dir = MatrixUtils.normalize(new Float32Array([(Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)]))
    //     instanceData[i * 3] = dir[0] * Math.random() * 100; // x
    //     instanceData[i * 3 + 1] = dir[1] * Math.random() * 100 // y
    //     instanceData[i * 3 + 2] = dir[2] * Math.random() * 100; // z
    // }
    // console.log(instanceData.byteLength)
    this.spheresBuffer = WebGPU.device.createBuffer({
        label: "spheres buffer",
        size: this.MAX_SPHERES * 3 * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        // mappedAtCreation: true
    });
    // new Float32Array(this.spheresBuffer.getMappedRange()).set(instanceData);
    // this.spheresBuffer.unmap();
    this.oldSpheresBuffer = WebGPU.device.createBuffer({
        label: "old spheres buffer",
        size: this.MAX_SPHERES * 3 * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        // mappedAtCreation: true
    });
    // new Float32Array(this.oldSpheresBuffer.getMappedRange()).set(instanceData);
    // this.oldSpheresBuffer.unmap();
}, _SharedData_initColorInderBuffer = function _SharedData_initColorInderBuffer() {
    // Create color index buffer with random indices
    // const colorIndexData = new Uint32Array(this.NUM_SPHERES);
    // for (let i = 0; i < this.NUM_SPHERES; i++) {
    //     colorIndexData[i] = 0; // 6 different colors
    // }
    this.colorIndexBuffer = WebGPU.device.createBuffer({
        label: "color buffer",
        size: this.MAX_SPHERES * 4,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE,
        // mappedAtCreation: true
    });
    // new Uint32Array(this.colorIndexBuffer.getMappedRange()).set(colorIndexData);
    // this.colorIndexBuffer.unmap();
}, _SharedData_initAccelerationGrid = function _SharedData_initAccelerationGrid() {
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
};
SharedData.NUM_SPHERES = 0;
SharedData.MAX_SPHERES = 5000000;
SharedData.gridBuffers = [];
SharedData.NUM_GRID_BUFFERS = 4;
SharedData.lightDirection = MatrixUtils.normalize(new Float32Array([0.0, -1.0, 0.5])); // Light direction in world space
