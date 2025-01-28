var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _a, _SharedData_initSphereBuffer, _SharedData_initColorInderBuffer, _SharedData_initAccelerationGrid;
import { MatrixUtils } from "../matrix.js";
import { WebGPU } from "../webgpu.js";
export class SharedData {
    static init() {
        __classPrivateFieldGet(this, _a, "m", _SharedData_initSphereBuffer).call(this);
        __classPrivateFieldGet(this, _a, "m", _SharedData_initColorInderBuffer).call(this);
        __classPrivateFieldGet(this, _a, "m", _SharedData_initAccelerationGrid).call(this);
    }
}
_a = SharedData, _SharedData_initSphereBuffer = function _SharedData_initSphereBuffer() {
    // Create instance buffer with random positions
    const instanceData = new Float32Array(this.NUM_SPHERES * 3); // xyz for each instance
    for (let i = 0; i < this.NUM_SPHERES; i++) {
        const dir = MatrixUtils.normalize(new Float32Array([(Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)]));
        instanceData[i * 3] = dir[0] * Math.random() * 300; // x
        instanceData[i * 3 + 1] = dir[1] * Math.random() * 300; // y
        instanceData[i * 3 + 2] = dir[2] * Math.random() * 300; // z
    }
    // instanceData[0] = 0;
    // instanceData[1] = -0.4;
    // instanceData[2] = 0;
    // instanceData[3] = 0;
    // instanceData[4] = 0.4;
    // instanceData[5] = 0;
    // instanceData[6] = 0.4;
    // instanceData[7] = 0;
    // instanceData[8] = 0;
    // instanceData[9] = 0;
    // instanceData[10] = 0;
    // instanceData[11] = 0.4;
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
}, _SharedData_initColorInderBuffer = function _SharedData_initColorInderBuffer() {
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
}, _SharedData_initAccelerationGrid = function _SharedData_initAccelerationGrid() {
    const size = 256 * 256 * 256 * 4; // 1/4 GB all 4 buffers
    this.atomicBuffer = WebGPU.device.createBuffer({
        label: "atomic buffer",
        size: size,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });
    this.grid1Buffer = WebGPU.device.createBuffer({
        label: "grid1 buffer",
        size: size,
        usage: GPUBufferUsage.STORAGE
    });
    this.grid2Buffer = WebGPU.device.createBuffer({
        label: "grid2 buffer",
        size: size,
        usage: GPUBufferUsage.STORAGE
    });
    this.grid3Buffer = WebGPU.device.createBuffer({
        label: "grid3 buffer",
        size: size,
        usage: GPUBufferUsage.STORAGE
    });
};
SharedData.NUM_SPHERES = 300000;
SharedData.lightDirection = MatrixUtils.normalize(new Float32Array([0.0, -1.0, 0.5])); // Light direction in world space
