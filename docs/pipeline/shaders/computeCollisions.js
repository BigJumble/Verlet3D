var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _a, _ComputeCollisions_createComputeShader;
import { WebGPU } from "../../webgpu.js";
import { SharedData } from "../shaderData.js";
export class ComputeCollisions {
    static init() {
        this.positionsNextBuffer = WebGPU.device.createBuffer({
            size: SharedData.NUM_SPHERES * 3 * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
        });
        const computeModule = __classPrivateFieldGet(this, _a, "m", _ComputeCollisions_createComputeShader).call(this);
        this.computeBindGroupLayout = WebGPU.device.createBindGroupLayout({
            label: "collision bind group layout",
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "read-only-storage" }
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "read-only-storage" }
                },
                {
                    binding: 3,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "read-only-storage" }
                },
                {
                    binding: 4,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "read-only-storage" }
                },
                {
                    binding: 5,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "read-only-storage" }
                },
                {
                    binding: 6,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" }
                },
                {
                    binding: 7,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" }
                },
                {
                    binding: 8,
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
                    resource: { buffer: SharedData.grid4Buffer }
                },
                {
                    binding: 6,
                    resource: { buffer: this.positionsNextBuffer }
                },
                {
                    binding: 7,
                    resource: { buffer: SharedData.colorIndexBuffer }
                },
                {
                    binding: 8,
                    resource: { buffer: uniformBuffer }
                }
            ]
        });
        this.computePipeline = WebGPU.device.createComputePipeline({
            label: "Collisions compute pipeline",
            layout: WebGPU.device.createPipelineLayout({
                bindGroupLayouts: [this.computeBindGroupLayout]
            }),
            compute: {
                module: computeModule,
                entryPoint: "computeMain"
            }
        });
        this.computeBindGroupLayout2 = WebGPU.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" }
                },
                {
                    binding: 6,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" }
                },
                {
                    binding: 8,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "uniform" }
                }
            ]
        });
        // Create compute bind group
        this.computeBindGroup2 = WebGPU.device.createBindGroup({
            layout: this.computeBindGroupLayout2,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: SharedData.spheresBuffer }
                },
                {
                    binding: 6,
                    resource: { buffer: this.positionsNextBuffer }
                },
                {
                    binding: 8,
                    resource: { buffer: uniformBuffer }
                }
            ]
        });
        this.computePipeline2 = WebGPU.device.createComputePipeline({
            label: "Collisions Copy compute pipeline",
            layout: WebGPU.device.createPipelineLayout({
                bindGroupLayouts: [this.computeBindGroupLayout2]
            }),
            compute: {
                module: computeModule,
                entryPoint: "copyPositions"
            }
        });
    }
    static tick() {
        const commandEncoder = WebGPU.device.createCommandEncoder();
        // Compute pass
        const computePass = commandEncoder.beginComputePass();
        computePass.setPipeline(this.computePipeline);
        computePass.setBindGroup(0, this.computeBindGroup);
        computePass.dispatchWorkgroups(Math.ceil(SharedData.NUM_SPHERES / 256));
        computePass.end();
        const commandEncoder2 = WebGPU.device.createCommandEncoder();
        const computePass2 = commandEncoder2.beginComputePass();
        computePass2.setPipeline(this.computePipeline2);
        computePass2.setBindGroup(0, this.computeBindGroup2);
        computePass2.dispatchWorkgroups(Math.ceil(SharedData.NUM_SPHERES / 256));
        computePass2.end();
        WebGPU.device.queue.submit([commandEncoder.finish(), commandEncoder2.finish()]);
    }
}
_a = ComputeCollisions, _ComputeCollisions_createComputeShader = function _ComputeCollisions_createComputeShader() {
    const computeShaderCode = /*wgsl*/ `

        struct Uniforms {
            numSpheres: u32
        }

        @group(0) @binding(0) var<storage, read_write> positions: array<f32>;
        @group(0) @binding(1) var<storage, read> atomicCounter: array<u32>;
        @group(0) @binding(2) var<storage, read> grid1: array<u32>;
        @group(0) @binding(3) var<storage, read> grid2: array<u32>;
        @group(0) @binding(4) var<storage, read> grid3: array<u32>;  
        @group(0) @binding(5) var<storage, read> grid4: array<u32>;  
        @group(0) @binding(6) var<storage, read_write> positionsNext: array<f32>;
        @group(0) @binding(7) var<storage, read_write> colors: array<u32>;
        @group(0) @binding(8) var<uniform> uniforms: Uniforms;
        
        @compute @workgroup_size(256)
        fn copyPositions(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let index = global_id.x;
            if (index >= uniforms.numSpheres) {
                return;
            }
            
            positions[index*3+0] = positionsNext[index*3+0];
            positions[index*3+1] = positionsNext[index*3+1];
            positions[index*3+2] = positionsNext[index*3+2];
        }
        

        @compute @workgroup_size(256)
        fn computeMain(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let sphereID = u32(global_id.x);
            if (sphereID >= uniforms.numSpheres) {
                return;
            }
            var myPos = vec3f(positions[sphereID*3+0],positions[sphereID*3+1],positions[sphereID*3+2]);


            // colors[sphereID] = 4u;
            let spherePos = vec3i(myPos+128);
            if(spherePos.x<0||spherePos.x>=256||spherePos.y<0||spherePos.y>=256||spherePos.z<0||spherePos.z>=256)
            {
                positionsNext[sphereID*3+0] = myPos.x;
                positionsNext[sphereID*3+1] = myPos.y;
                positionsNext[sphereID*3+2] = myPos.z;
                return;
            }
            let gridIndex = spherePos.x + spherePos.y * 256 + spherePos.z * 65536;
            

            const neighbors = array<vec3i, 27>(
                vec3i(-1,-1,-1), vec3i(-1,-1,0), vec3i(-1,-1,1),
                vec3i(-1,0,-1), vec3i(-1,0,0), vec3i(-1,0,1),
                vec3i(-1,1,-1), vec3i(-1,1,0), vec3i(-1,1,1),
                vec3i(0,-1,-1), vec3i(0,-1,0), vec3i(0,-1,1),
                vec3i(0,0,-1), vec3i(0,0,0), vec3i(0,0,1),
                vec3i(0,1,-1), vec3i(0,1,0), vec3i(0,1,1),
                vec3i(1,-1,-1), vec3i(1,-1,0), vec3i(1,-1,1),
                vec3i(1,0,-1), vec3i(1,0,0), vec3i(1,0,1),
                vec3i(1,1,-1), vec3i(1,1,0), vec3i(1,1,1)
            );
            for (var i = 0; i < 27; i++) {
                let neighborPos = spherePos + neighbors[i];
                if(neighborPos.x<0||neighborPos.x>=256||neighborPos.y<0||neighborPos.y>=256||neighborPos.z<0||neighborPos.z>=256)
                {
                    continue;
                }

                let neighborIndex = neighborPos.x + neighborPos.y * 256 + neighborPos.z * 65536;
                let numSpheres = min(atomicCounter[neighborIndex], 3u);

                for (var i = 0u; i < numSpheres; i++) {

                    var otherSphereID: u32;
                    switch(i) {
                        case 0u:
                        {
                            otherSphereID = grid1[neighborIndex];
                            break;
                        }
                        case 1u:
                        {
                            otherSphereID = grid2[neighborIndex];
                            break;
                        }
                        case 2u:
                        {
                            otherSphereID = grid3[neighborIndex];
                            break;
                        }
                        default:
                        {
                            //ignore
                            break;
                        }
                    }
                    
                    if (otherSphereID != sphereID) {

                        let otherPos = vec3f(
                            positions[otherSphereID*3+0],
                            positions[otherSphereID*3+1],
                            positions[otherSphereID*3+2]
                        );
                        let spherePosF = vec3f(
                            positions[sphereID*3+0],
                            positions[sphereID*3+1],
                            positions[sphereID*3+2]
                        );
                        let diff = spherePosF - otherPos;
                        let dist = length(diff);
                        if (dist < 1.0) {
                            // colors[sphereID] = i;
                            let normal = normalize(diff);
                            let correction = (1.0 - dist)*0.5;
                            myPos.x += normal.x * correction;
                            myPos.y += normal.y * correction;
                            myPos.z += normal.z * correction;
                        }
                    }
                }
            }

            positionsNext[sphereID*3+0] = myPos.x;
            positionsNext[sphereID*3+1] = myPos.y;
            positionsNext[sphereID*3+2] = myPos.z;

        }
    `;
    return WebGPU.device.createShaderModule({
        label: "Collisions compute shader",
        code: computeShaderCode
    });
};
