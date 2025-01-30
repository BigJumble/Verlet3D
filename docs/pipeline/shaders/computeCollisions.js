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
                ...SharedData.gridBuffers.map((buffer, index) => ({
                    binding: index + 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" }
                })),
                {
                    binding: 10,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" }
                },
                // {
                //     binding: SharedData.NUM_GRID_BUFFERS + 3,
                //     visibility: GPUShaderStage.COMPUTE,
                //     buffer: { type: "storage" as GPUBufferBindingType }
                // },
                {
                    binding: 12,
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
        // Create compute bind group
        this.computeBindGroup = WebGPU.device.createBindGroup({
            label: 'ComputeBindGroup 1',
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
                ...SharedData.gridBuffers.map((buffer, index) => ({
                    binding: index + 2,
                    resource: { buffer }
                })),
                {
                    binding: 10,
                    resource: { buffer: this.positionsNextBuffer }
                },
                // {
                //     binding: 11,
                //     resource: { buffer: SharedData.colorIndexBuffer }
                // },
                {
                    binding: 12,
                    resource: { buffer: uniformBuffer }
                }
            ]
        });
        this.computeBindGroupLayout2 = WebGPU.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" }
                },
                {
                    binding: 10,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" }
                },
                {
                    binding: 12,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "uniform" }
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
        // Create compute bind group
        this.computeBindGroup2 = WebGPU.device.createBindGroup({
            label: 'ComputeBindGroup 2',
            layout: this.computeBindGroupLayout2,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: SharedData.spheresBuffer }
                },
                {
                    binding: 10,
                    resource: { buffer: this.positionsNextBuffer }
                },
                {
                    binding: 12,
                    resource: { buffer: uniformBuffer }
                }
            ]
        });
    }
    static tick(commandEncoder) {
        // const commandEncoder = WebGPU.device.createCommandEncoder();
        // Compute pass
        const computePass = commandEncoder.beginComputePass();
        computePass.setPipeline(this.computePipeline);
        computePass.setBindGroup(0, this.computeBindGroup);
        computePass.dispatchWorkgroups(Math.ceil(SharedData.NUM_SPHERES / 256));
        computePass.end();
        // const commandEncoder2 = WebGPU.device.createCommandEncoder();
        const computePass2 = commandEncoder.beginComputePass();
        computePass2.setPipeline(this.computePipeline2);
        computePass2.setBindGroup(0, this.computeBindGroup2);
        computePass2.dispatchWorkgroups(Math.ceil(SharedData.NUM_SPHERES / 256));
        computePass2.end();
        // WebGPU.device.queue.submit([commandEncoder.finish(), commandEncoder2.finish()]);
    }
}
_a = ComputeCollisions, _ComputeCollisions_createComputeShader = function _ComputeCollisions_createComputeShader() {
    const computeShaderCode = /*wgsl*/ `

        struct Uniforms {
            numSpheres: u32
        }

        @group(0) @binding(0) var<storage, read_write> positions: array<f32>;
        @group(0) @binding(1) var<storage, read> atomicCounter: array<u32>;
        @group(0) @binding(2) var<storage, read_write> grid1: array<vec2u>;
        @group(0) @binding(3) var<storage, read_write> grid2: array<vec2u>;
        @group(0) @binding(4) var<storage, read_write> grid3: array<vec2u>;   
        @group(0) @binding(5) var<storage, read_write> grid4: array<vec2u>;    
        // @group(0) @binding(6) var<storage, read_write> grid5: array<vec2u>;    
        @group(0) @binding(10) var<storage, read_write> positionsNext: array<f32>;
        // @group(0) @binding(11) var<storage, read_write> colors: array<u32>;
        @group(0) @binding(12) var<uniform> uniforms: Uniforms;
        
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
        
        fn fast_inversesqrt(x: f32) -> f32 {
            let threehalfs: f32 = 1.5;
            var y: f32 = x;
            var i: i32 = bitcast<i32>(y);  // Interpret float as int
            i = 0x5F3759DF - (i >> 1);      // Magic number and shift
            y = bitcast<f32>(i);            // Reinterpret int as float
            y = y * (threehalfs - (0.5 * x * y * y));  // One iteration of Newton's method
            return y;
        }

        @compute @workgroup_size(256)
        fn computeMain(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let sphereID = u32(global_id.x);
            if (sphereID >= uniforms.numSpheres) {
                return;
            }
            var myPos = vec3f(positions[sphereID*3+0],positions[sphereID*3+1],positions[sphereID*3+2]);


            // colors[sphereID] = 0u;
            let spherePos = vec3i(myPos+128);
            if(spherePos.x<0||spherePos.x>=256||spherePos.y<0||spherePos.y>=256||spherePos.z<0||spherePos.z>=256)
            {
                positionsNext[sphereID*3+0] = myPos.x;
                positionsNext[sphereID*3+1] = myPos.y;
                positionsNext[sphereID*3+2] = myPos.z;
                return;
            }
            let gridIndex = spherePos.x + spherePos.y * 256 + spherePos.z * 65536;
            

            var posCorrection = vec3f(0,0,0);
            let numSpheres = atomicCounter[gridIndex];
            var countCollisions = 0u;
            let spherePosF = vec3f(
                positions[sphereID*3+0],
                positions[sphereID*3+1],
                positions[sphereID*3+2]
            );
            var otherSphereID: u32;
            for (var i = 0u; i < numSpheres; i++) {
                switch(i / 2u) {
                    case 0u: {
                        otherSphereID = grid1[gridIndex][i%2]; break;
                    }
                    case 1u: {
                        otherSphereID = grid2[gridIndex][i%2]; break;
                    }
                    case 2u: {
                        otherSphereID = grid3[gridIndex][i%2]; break;
                    }
                    case 3u: {
                        otherSphereID = grid4[gridIndex][i%2]; break;
                    }      
                  
                    default: {
                        return;
                    }
                }
                // colors[sphereID] = atomicCounter[gridIndex];
                if (otherSphereID != sphereID) {

                    let otherPos = vec3f(
                        positions[otherSphereID*3+0],
                        positions[otherSphereID*3+1],
                        positions[otherSphereID*3+2]
                    );

                    let diff = spherePosF - otherPos;
                    var dist = dot(diff,diff);
                    countCollisions+=1;
                    if (dist < 1) {

                        
                        dist = fast_inversesqrt(dist);
                        let normal = diff * dist;
                        let correction = (1.0 - (1/dist))*0.5;
                        posCorrection.x += normal.x * correction;
                        posCorrection.y += normal.y * correction;
                        posCorrection.z += normal.z * correction;
                    }
                }
            }
            // colors[sphereID] = countCollisions;
            posCorrection *= 0.5;
            positionsNext[sphereID*3+0] = myPos.x + posCorrection.x;
            positionsNext[sphereID*3+1] = myPos.y + posCorrection.y;
            positionsNext[sphereID*3+2] = myPos.z + posCorrection.z;

        }
    `;
    return WebGPU.device.createShaderModule({
        label: "Collisions compute shader",
        code: computeShaderCode
    });
};
