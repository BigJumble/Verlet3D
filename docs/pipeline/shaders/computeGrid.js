var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _a, _ComputeGrid_createComputeShader;
import { WebGPU } from "../../webgpu.js";
import { SharedData } from "../shaderData.js";
export class ComputeGrid {
    static init() {
        const computeModule = __classPrivateFieldGet(this, _a, "m", _ComputeGrid_createComputeShader).call(this);
        this.computeBindGroupLayout = WebGPU.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" }
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" }
                },
                {
                    binding: 3,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" }
                },
                {
                    binding: 4,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" }
                },
                {
                    binding: 5,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" }
                },
                {
                    binding: 6,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "uniform" }
                }
            ]
        });
        const uniformBuffer = WebGPU.device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        WebGPU.device.queue.writeBuffer(uniformBuffer, 0, new Uint32Array([SharedData.NUM_SPHERES]));
        // Create compute bind group
        this.computeBindGroup = WebGPU.device.createBindGroup({
            layout: this.computeBindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: SharedData.spheresBuffer }
                },
                {
                    binding: 1,
                    resource: { buffer: SharedData.atomicBuffer }
                },
                {
                    binding: 2,
                    resource: { buffer: SharedData.grid1Buffer }
                },
                {
                    binding: 3,
                    resource: { buffer: SharedData.grid2Buffer }
                },
                {
                    binding: 4,
                    resource: { buffer: SharedData.grid3Buffer }
                },
                {
                    binding: 5,
                    resource: { buffer: SharedData.colorIndexBuffer }
                },
                {
                    binding: 6,
                    resource: { buffer: uniformBuffer }
                }
            ]
        });
        this.computePipeline = WebGPU.device.createComputePipeline({
            label: "Grid compute pipeline",
            layout: WebGPU.device.createPipelineLayout({
                bindGroupLayouts: [this.computeBindGroupLayout]
            }),
            compute: {
                module: computeModule,
                entryPoint: "computeMain"
            }
        });
    }
    static tick() {
        const commandEncoder = WebGPU.device.createCommandEncoder();
        commandEncoder.clearBuffer(SharedData.atomicBuffer, 0, 256 * 256 * 256 * 4);
        // Compute pass
        const computePass = commandEncoder.beginComputePass();
        computePass.setPipeline(this.computePipeline);
        computePass.setBindGroup(0, this.computeBindGroup);
        computePass.dispatchWorkgroups(Math.ceil(SharedData.NUM_SPHERES / 256));
        computePass.end();
        WebGPU.device.queue.submit([commandEncoder.finish()]);
    }
}
_a = ComputeGrid, _ComputeGrid_createComputeShader = function _ComputeGrid_createComputeShader() {
    const computeShaderCode = /*wgsl*/ `
        struct Uniforms {
            numSpheres: u32
        }
    
        @group(0) @binding(0) var<storage, read_write> positions: array<f32>;
        @group(0) @binding(1) var<storage, read_write> atomicCounter: array<atomic<u32>>;
        @group(0) @binding(2) var<storage, read_write> grid1: array<u32>;
        @group(0) @binding(3) var<storage, read_write> grid2: array<u32>;
        @group(0) @binding(4) var<storage, read_write> grid3: array<u32>;    
        @group(0) @binding(5) var<storage, read_write> colors: array<u32>;    
        @group(0) @binding(6) var<uniform> uniforms: Uniforms;

        @compute @workgroup_size(256)
        fn computeMain(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let sphereID = u32(global_id.x);
            if (sphereID >= uniforms.numSpheres) {
                return;
            }

            let spherePos = vec3i(vec3f(positions[sphereID*3+0],positions[sphereID*3+1],positions[sphereID*3+2])+128);
            if(spherePos.x<0||spherePos.x>=256||spherePos.y<0||spherePos.y>=256||spherePos.z<0||spherePos.z>=256)
            {
                return;
            }

            let gridIndex = spherePos.x + spherePos.y * 256 + spherePos.z * 65536;

            let index = min(atomicAdd(&atomicCounter[gridIndex], 1), 3u);
            switch (index) {
                case 0u:
                {
                    grid1[gridIndex] = sphereID;
                    colors[sphereID] = 1u;
                    break;
                }
                case 1u:
                {
                    grid2[gridIndex] = sphereID;
                    colors[sphereID] = 2u;
                    break;
                }
                case 2u:
                {
                    grid3[gridIndex] = sphereID;
                    colors[sphereID] = 3u;
                    break;
                }
                default:
                {
                    colors[sphereID] = 4u; //RED error or out of bounds
                    //ignore sphere
                    break;
                }
            }

        }
    `;
    return WebGPU.device.createShaderModule({
        label: "Grid compute shader",
        code: computeShaderCode
    });
};
