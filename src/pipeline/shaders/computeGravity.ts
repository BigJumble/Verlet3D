import { WebGPU } from "../../webgpu.js";
import { SharedData } from "../shaderData.js";

export class ComputeGravity {
    static computePipeline: GPUComputePipeline;
    static computeBindGroup: GPUBindGroup;
    static computeUniformBuffer: GPUBuffer;
    static computeBindGroupLayout: GPUBindGroupLayout;

    static init() {

        // Create compute uniform buffer
        this.computeUniformBuffer = WebGPU.device.createBuffer({
            size: 4, // 3 floats: time, amplitude, frequency
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        const computeModule = this.#createComputeShader();

        this.computePipeline = WebGPU.device.createComputePipeline({
            label: "Bobbing compute pipeline",
            layout: WebGPU.device.createPipelineLayout({
                bindGroupLayouts: [
                    WebGPU.device.createBindGroupLayout({
                        entries: [
                            {
                                binding: 0,
                                visibility: GPUShaderStage.COMPUTE,
                                buffer: { type: "uniform" }
                            },
                            {
                                binding: 1,
                                visibility: GPUShaderStage.COMPUTE,
                                buffer: { type: "storage" }
                            }
                        ]
                    })
                ]
            }),
            compute: {
                module: computeModule,
                entryPoint: "computeMain"
            }
        });

        this.computeBindGroupLayout = WebGPU.device.createBindGroupLayout({
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: { type: "uniform" }
            },
            {
                binding:1,
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
                    resource: { buffer: SharedData.spheresBuffer }
                }
            ]
        });
    }

    static #createComputeShader() {
        const computeShaderCode = /*wgsl*/`
        struct Uniforms {
            time: f32,
        }
    
        @group(0) @binding(0) var<uniform> uniforms: Uniforms;
        @group(0) @binding(1) var<storage, read_write> positions: array<f32>;
    
        @compute @workgroup_size(256)
        fn computeMain(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let sphereID = u32(global_id.x);
            if (global_id.x >= arrayLength(&positions)) {
                return;
            }


            //positions[sphereID*3+0] = f32(0);
            positions[sphereID*3+1] = 6* f32(sin(uniforms.time+f32(sphereID%100)/0.127));
            //positions[sphereID*3+2] = f32(0);
        }
    `;

        return WebGPU.device.createShaderModule({
            label: "Bobbing compute shader",
            code: computeShaderCode
        });
    }

    static tick(deltaTime:number)
    {
        WebGPU.device.queue.writeBuffer(this.computeUniformBuffer, 0, new Float32Array([
            performance.now()/1000,
        ]));

        const commandEncoder = WebGPU.device.createCommandEncoder();

        // Compute pass
        const computePass = commandEncoder.beginComputePass();
        computePass.setPipeline(this.computePipeline);
        computePass.setBindGroup(0, this.computeBindGroup);
        computePass.dispatchWorkgroups(Math.ceil(SharedData.NUM_SPHERES / 256));
        computePass.end();

        WebGPU.device.queue.submit([commandEncoder.finish()]);
    }
}