import { WebGPU } from "../../webgpu.js";
import { SharedData } from "../shaderData.js";

export class ComputeGrid {
    static computePipeline: GPUComputePipeline;
    static computeBindGroup: GPUBindGroup;
    static computeBindGroupLayout: GPUBindGroupLayout;
    
    static init() {

        const computeModule = this.#createComputeShader();


        const uniformBuffer = WebGPU.device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        WebGPU.device.queue.writeBuffer(uniformBuffer, 0, new Uint32Array([SharedData.NUM_SPHERES]));

        this.computeBindGroupLayout = WebGPU.device.createBindGroupLayout({
            label: "grid bind group layout",
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" as GPUBufferBindingType }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" as GPUBufferBindingType }
                },
                ...SharedData.gridBuffers.map((buffer, index) => ({
                    binding: index + 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" as GPUBufferBindingType }
                })),
                // {
                //     binding: SharedData.NUM_GRID_BUFFERS + 2,
                //     visibility: GPUShaderStage.COMPUTE,
                //     buffer: { type: "storage" as GPUBufferBindingType }
                // },
                {
                    binding: 12,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "uniform" as GPUBufferBindingType }
                }
            ]
        })


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
                ...SharedData.gridBuffers.map((buffer, index) => ({
                    binding: index + 2,
                    resource: { buffer }
                })),
                // {
                //     binding: SharedData.NUM_GRID_BUFFERS + 2,
                //     resource: { buffer: SharedData.colorIndexBuffer }
                // },
                {
                    binding: 12,
                    resource: { buffer: uniformBuffer }
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
        @group(0) @binding(2) var<storage, read_write> grid1: array<vec2u>;
        @group(0) @binding(3) var<storage, read_write> grid2: array<vec2u>;
        @group(0) @binding(4) var<storage, read_write> grid3: array<vec2u>;   
        @group(0) @binding(5) var<storage, read_write> grid4: array<vec2u>;    
        // @group(0) @binding(6) var<storage, read_write> grid5: array<vec2u>;    
        // @group(0) @binding(7) var<storage, read_write> colors: array<atomic<u32>>;    
        @group(0) @binding(12) var<uniform> uniforms: Uniforms;

        fn frac_sign(x: f32) -> f32 {
            let f = x - floor(x);  // Get fractional part
            return select(1.0, -1.0, f < 0.5);
        }

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

            // let neighborOffsets = array<vec3f,8>(
            //     vec3f(frac_sign(spherePos.x), 0.0, 0.0),
            //     vec3f(frac_sign(spherePos.x), 0.0, frac_sign(spherePos.z)),
            //     vec3f(frac_sign(spherePos.x), frac_sign(spherePos.y), 0.0),
            //     vec3f(0.0, frac_sign(spherePos.y), 0.0),
            //     vec3f(0.0, frac_sign(spherePos.y), frac_sign(spherePos.z)),
            //     vec3f(0.0, 0.0, frac_sign(spherePos.z)),
            //     vec3f(frac_sign(spherePos.x), frac_sign(spherePos.y), frac_sign(spherePos.z)),
            //     vec3f(0,0,0)
            // );
            // for (var i = 0u; i < 8u; i++) {
            //     let neighborPos = vec3i(spherePos+neighborOffsets[i]);
        
            //     // Check if the neighbor cell is within grid bounds
            //     if (neighborPos.x >= 0 && neighborPos.x < 256 &&
            //         neighborPos.y >= 0 && neighborPos.y < 256 &&
            //         neighborPos.z >= 0 && neighborPos.z < 256) {
            //let gridIndex = neighborPos.x + neighborPos.y * 256 + neighborPos.z * 65536;
            let gridIndex = spherePos.x + spherePos.y * 256 + spherePos.z * 65536;
            let index = atomicAdd(&atomicCounter[gridIndex], 1);
            // atomicStore(&colors[sphereID], index);

            switch (index / 2u) { 
                case 0u: {
                    grid1[gridIndex][index % 2u] = sphereID; 
                    break;
                }
                case 1u: {
                    grid2[gridIndex][index % 2u] = sphereID; 
                    break;
                }
                case 2u: {
                    grid3[gridIndex][index % 2u] = sphereID; 
                    break;
                }
                case 3u: {
                    grid4[gridIndex][index % 2u] = sphereID; 
                    break;
                }                                              
                default: {
                    break;
                }
                //     }
                // }
            }
        }
    `;

        return WebGPU.device.createShaderModule({
            label: "Grid compute shader",
            code: computeShaderCode
        });
    }
    static tick(commandEncoder:GPUCommandEncoder) {
        // const commandEncoder = WebGPU.device.createCommandEncoder();

        commandEncoder.clearBuffer(SharedData.atomicBuffer, 0, 256 * 256 * 256 * 4);
        // Compute pass
        const computePass = commandEncoder.beginComputePass();
        computePass.setPipeline(this.computePipeline);
        computePass.setBindGroup(0, this.computeBindGroup);
        computePass.dispatchWorkgroups(Math.ceil(SharedData.NUM_SPHERES / 256));
        computePass.end();

        // WebGPU.device.queue.submit([commandEncoder.finish()]);
    }
}