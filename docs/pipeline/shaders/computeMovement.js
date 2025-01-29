var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _a, _ComputeMovement_createComputeShader;
import { WebGPU } from "../../webgpu.js";
import { SharedData } from "../shaderData.js";
export class ComputeMovement {
    static init() {
        // Create compute uniform buffer
        this.computeUniformBuffer = WebGPU.device.createBuffer({
            size: 8, // 3 floats: time, amplitude, frequency
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        const computeModule = __classPrivateFieldGet(this, _a, "m", _ComputeMovement_createComputeShader).call(this);
        this.computeBindGroupLayout = WebGPU.device.createBindGroupLayout({
            entries: [{
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "uniform" }
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
                }
            ]
        });
        // Create compute bind group
        this.computeBindGroup = WebGPU.device.createBindGroup({
            layout: this.computeBindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.computeUniformBuffer }
                },
                {
                    binding: 1,
                    resource: { buffer: SharedData.oldSpheresBuffer }
                },
                {
                    binding: 2,
                    resource: { buffer: SharedData.spheresBuffer }
                }
            ]
        });
        this.computePipeline = WebGPU.device.createComputePipeline({
            label: "Movement compute pipeline",
            layout: WebGPU.device.createPipelineLayout({
                bindGroupLayouts: [this.computeBindGroupLayout]
            }),
            compute: {
                module: computeModule,
                entryPoint: "computeMain"
            }
        });
    }
    static tick(deltaTime, commandEncoder) {
        WebGPU.device.queue.writeBuffer(this.computeUniformBuffer, 0, new Float32Array([
            deltaTime,
            SharedData.NUM_SPHERES
        ]));
        // const commandEncoder = WebGPU.device.createCommandEncoder();
        // Compute pass
        const computePass = commandEncoder.beginComputePass();
        computePass.setPipeline(this.computePipeline);
        computePass.setBindGroup(0, this.computeBindGroup);
        computePass.dispatchWorkgroups(Math.ceil(SharedData.NUM_SPHERES / 256));
        computePass.end();
        // WebGPU.device.queue.submit([commandEncoder.finish()]);
    }
}
_a = ComputeMovement, _ComputeMovement_createComputeShader = function _ComputeMovement_createComputeShader() {
    const computeShaderCode = /*wgsl*/ `
        struct Uniforms {
            time: f32,
            numSpheres: u32
        }
    
        @group(0) @binding(0) var<uniform> uniforms: Uniforms;
        @group(0) @binding(1) var<storage, read_write> oldPositions: array<f32>;
        @group(0) @binding(2) var<storage, read_write> positions: array<f32>;
    
        @compute @workgroup_size(256)
        fn computeMain(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let sphereID = u32(global_id.x);
            if (global_id.x >= uniforms.numSpheres) {
                return;
            }
            
            var oldPos = vec3f(oldPositions[sphereID*3+0],oldPositions[sphereID*3+1],oldPositions[sphereID*3+2]);
            var nowPos = vec3f(positions[sphereID*3+0],positions[sphereID*3+1],positions[sphereID*3+2]);

            var gravityDir = vec3f(0,0,0);
            if (dot(nowPos, nowPos)>0)
            {
                gravityDir=-normalize(nowPos);
            }
            // else
            // // if (dot(nowPos, nowPos)<80*80)
            // {
            //     gravityDir = normalize(nowPos);
            // }

            let velocity = nowPos - oldPos;

            oldPos = nowPos;

            nowPos += velocity*0.99;

            nowPos += gravityDir * 5 * 0.0166666 * 0.0166666;
            // nowPos *= 0.99;

            oldPositions[sphereID*3+0] = oldPos.x;
            oldPositions[sphereID*3+1] = oldPos.y;
            oldPositions[sphereID*3+2] = oldPos.z;

            positions[sphereID*3+0] = nowPos.x;
            positions[sphereID*3+1] = nowPos.y;
            positions[sphereID*3+2] = nowPos.z;
        }
    `;
    return WebGPU.device.createShaderModule({
        label: "Movement compute shader",
        code: computeShaderCode
    });
};
