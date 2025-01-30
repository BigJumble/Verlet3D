import { WebGPU } from "../../webgpu.js";
import { SharedData } from "../shaderData.js";

export class ComputeGrid3DT {
    static computePipeline: GPUComputePipeline;
    static computeBindGroup: GPUBindGroup;
    static computeBindGroupLayout: GPUBindGroupLayout;
    static gridTexture: GPUTexture;
    
    static init() {
        const computeModule = this.#createComputeShader();

        // Create 3D texture for the grid
        this.gridTexture = WebGPU.device.createTexture({
            size: [1024, 256, 1024],
            dimension: "3d",
            format: "r32uint",
            usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
        });
        const uniformBuffer = WebGPU.device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        WebGPU.device.queue.writeBuffer(uniformBuffer, 0, new Uint32Array([SharedData.NUM_SPHERES]));

        this.computeBindGroupLayout = WebGPU.device.createBindGroupLayout({
            label: "grid 2 bind group layout",
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
                    buffer: { type: "uniform" }
                },
                {
                    binding:3,
                    visibility: GPUShaderStage.COMPUTE,
                    storageTexture: {
                        access: "write-only" as GPUStorageTextureAccess,
                        format: "r32uint" as GPUTextureFormat,
                        viewDimension: "3d" as GPUTextureViewDimension
                    }
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
                    resource: { buffer: uniformBuffer }
                },
                {
                    binding:  3,
                    resource: this.gridTexture.createView()
                }
            ]
        });
    }
    static #createComputeShader() {
        const computeShaderCode = /*wgsl*/`
        struct Uniforms {
            numSpheres: u32
        }
    
        @group(0) @binding(0) var<storage, read_write> positions: array<f32>;
        @group(0) @binding(1) var<storage, read_write> atomicCounter: array<atomic<u32>>;
        @group(0) @binding(2) var<uniform> uniforms: Uniforms;
        @group(0) @binding(3) var gridTexture: texture_storage_3d<r32uint, write>;

        fn frac_sign(x: f32) -> f32 {
            let f = x - floor(x);
            return select(1.0, -1.0, f < 0.5);
        }

        @compute @workgroup_size(256)
        fn computeMain(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let sphereID = global_id.x;
            if (sphereID >= uniforms.numSpheres) {
                return;
            }

            let spherePos = vec3f(
                positions[sphereID * 3 + 0],
                positions[sphereID * 3 + 1],
                positions[sphereID * 3 + 2]
            ) + 128.0;

            if (spherePos.x < 0.0 || spherePos.x >= 256.0 ||
                spherePos.y < 0.0 || spherePos.y >= 256.0 ||
                spherePos.z < 0.0 || spherePos.z >= 256.0) {
                return;
            }

            let neighborOffsets = array<vec3f, 8>(
                vec3f(frac_sign(spherePos.x), 0.0, 0.0),
                vec3f(frac_sign(spherePos.x), 0.0, frac_sign(spherePos.z)),
                vec3f(frac_sign(spherePos.x), frac_sign(spherePos.y), 0.0),
                vec3f(0.0, frac_sign(spherePos.y), 0.0),
                vec3f(0.0, frac_sign(spherePos.y), frac_sign(spherePos.z)),
                vec3f(0.0, 0.0, frac_sign(spherePos.z)),
                vec3f(frac_sign(spherePos.x), frac_sign(spherePos.y), frac_sign(spherePos.z)),
                vec3f(0.0, 0.0, 0.0)
            );

            for (var i = 0u; i < 8u; i++) {
                let neighborPos = vec3i(spherePos + neighborOffsets[i]);
        
                if (neighborPos.x >= 0 && neighborPos.x < 256 &&
                    neighborPos.y >= 0 && neighborPos.y < 256 &&
                    neighborPos.z >= 0 && neighborPos.z < 256) {
        
                    let gridIndex = neighborPos.x + neighborPos.y * 256 + neighborPos.z * 65536;
                    let count = atomicAdd(&atomicCounter[gridIndex], 1u);
                    if(count < 16u)
                    {
                        let xoffset = count % 4u;
                        let zoffset = count / 4u;

                        textureStore(
                            gridTexture, 
                            vec3u(neighborPos) + vec3u(xoffset*256, 0u, zoffset*256),
                            vec4u( sphereID, 0u, 0u, 1u)
                        );
                    }
                    
                }
            }
        }`;

        return WebGPU.device.createShaderModule({
            label: "Grid compute shader",
            code: computeShaderCode
        });
    }

    static tick(commandEncoder: GPUCommandEncoder) {
        commandEncoder.clearBuffer(SharedData.atomicBuffer, 0, 256 * 256 * 256 * 4);
        
        const computePass = commandEncoder.beginComputePass();
        computePass.setPipeline(this.computePipeline);
        computePass.setBindGroup(0, this.computeBindGroup);
        computePass.dispatchWorkgroups(Math.ceil(SharedData.NUM_SPHERES / 256));
        computePass.end();
    }
}