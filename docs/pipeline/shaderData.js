var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _a, _SharedData_initSphereBuffer, _SharedData_initColorInderBuffer;
import { MatrixUtils } from "../matrix.js";
import { WebGPU } from "../webgpu.js";
export class SharedData {
    static init() {
        __classPrivateFieldGet(this, _a, "m", _SharedData_initSphereBuffer).call(this);
        __classPrivateFieldGet(this, _a, "m", _SharedData_initColorInderBuffer).call(this);
    }
}
_a = SharedData, _SharedData_initSphereBuffer = function _SharedData_initSphereBuffer() {
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
}, _SharedData_initColorInderBuffer = function _SharedData_initColorInderBuffer() {
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
};
SharedData.NUM_SPHERES = 10000000;
SharedData.lightDirection = MatrixUtils.normalize(new Float32Array([0.0, -1.0, 0.5])); // Light direction in world space
