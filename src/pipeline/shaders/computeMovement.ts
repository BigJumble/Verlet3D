import { PlayerController } from "../../playerController";
import { WebGPU } from "../../webgpu";
import { SharedData } from "../shaderData";

export class ComputeMovement {
    static computePipeline: GPUComputePipeline;
    static computeBindGroup: GPUBindGroup;
    static computeUniformBuffer: GPUBuffer;
    static computeBindGroupLayout: GPUBindGroupLayout;


    static init() {
        // Create compute uniform buffer
        this.computeUniformBuffer = WebGPU.device.createBuffer({
            size: 12, // 3 floats: time, amplitude, frequency
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        const computeModule = this.#createComputeShader();


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
        })

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

    static #createComputeShader() {
        const computeShaderCode = /*wgsl*/`
struct Uniforms {
    time: f32,
    numSpheres: u32,
    gravityMode: u32,
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

    var gravityDir = vec3f(0,0,0);// -normalize(nowPos);
    switch (uniforms.gravityMode)
    {
        case 0u: {
            gravityDir = vec3f(0.0, 0.0, 0.0);
            break;
        }
        case 1u: {
            gravityDir = -normalize(nowPos);
            break;
        }
        case 2u: {
            let distSq = dot(nowPos, nowPos);
            if (distSq > 100.0 * 100.0) {
                gravityDir = -normalize(nowPos);
            } else if (distSq < 95.0 * 95.0) {
                gravityDir = normalize(nowPos);
            }
            break;
        }
        case 3u: {
            let noY = vec3f(nowPos.x,0,nowPos.z);
            let distSq = dot(noY, noY);
            if (distSq > 100.0 * 100.0) {
                gravityDir = -normalize(noY);
            } else if (distSq < 95.0 * 95.0) {
                gravityDir = normalize(noY);
            }
            gravityDir.y =sign(-nowPos.y);
            gravityDir = normalize(gravityDir);
            break;
        }
        default: {
            gravityDir = vec3f(0.0, 0.0, 0.0);
            break;
        }
        
    }

    let velocity = nowPos - oldPos;

    oldPos = nowPos;

    nowPos += velocity * 0.99;

    nowPos += gravityDir * 0.0013888888888;
    // nowPos *= 0.99;

    oldPositions[sphereID*3+0] = oldPos.x;
    oldPositions[sphereID*3+1] = oldPos.y;
    oldPositions[sphereID*3+2] = oldPos.z;

    positions[sphereID*3+0] = nowPos.x;
    positions[sphereID*3+1] = nowPos.y;
    positions[sphereID*3+2] = nowPos.z;
}`;

        return WebGPU.device.createShaderModule({
            label: "Movement compute shader",
            code: computeShaderCode
        });
    }

    static tick(deltaTime: number, commandEncoder:GPUCommandEncoder) {
        WebGPU.device.queue.writeBuffer(this.computeUniformBuffer, 0, new Float32Array([
            deltaTime,
            SharedData.NUM_SPHERES,
        ]));
        WebGPU.device.queue.writeBuffer(this.computeUniformBuffer, 8, new Uint32Array([
            PlayerController.gravityMode
        ]));
        // console.log(PlayerController.gravityMode)
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