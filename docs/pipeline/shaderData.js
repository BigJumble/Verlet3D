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
}
_a = SharedData, _SharedData_initSphereBuffer = function _SharedData_initSphereBuffer() {
    // Create instance buffer with random positions
    const instanceData = new Float32Array(this.NUM_SPHERES * 3); // xyz for each instance
    for (let i = 0; i < this.NUM_SPHERES; i++) {
        const dir = MatrixUtils.normalize(new Float32Array([(Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)]));
        instanceData[i * 3] = dir[0] * Math.random() * 100; // x
        instanceData[i * 3 + 1] = dir[1] * Math.random() * 100; // y
        instanceData[i * 3 + 2] = dir[2] * Math.random() * 100; // z
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
SharedData.NUM_SPHERES = 400000;
SharedData.lightDirection = MatrixUtils.normalize(new Float32Array([0.0, -1.0, 0.5])); // Light direction in world space
SharedData.gridBuffers = [];
SharedData.NUM_GRID_BUFFERS = 4;
