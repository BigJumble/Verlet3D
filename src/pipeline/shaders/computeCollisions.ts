import { WebGPU } from "../../webgpu";
import { SharedData } from "../shaderData";

export class ComputeCollisions {
    static computePipeline: GPUComputePipeline;
    static computeBindGroup: GPUBindGroup;

    static computeBindGroupLayout: GPUBindGroupLayout;
    static positionsNextBuffer: GPUBuffer;
    static computeBindGroup2: GPUBindGroup;
    static computeBindGroupLayout2: GPUBindGroupLayout;
    static computePipeline2: GPUComputePipeline;
    static uniformBuffer: GPUBuffer;
    static init() {

        this.positionsNextBuffer = WebGPU.device.createBuffer({
            size: SharedData.MAX_SPHERES * 3 * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
        });


        const computeModule = this.#createComputeShader();


        this.computeBindGroupLayout = WebGPU.device.createBindGroupLayout({
            label: "collision bind group layout",
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" as GPUBufferBindingType }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "read-only-storage" as GPUBufferBindingType }
                },
                ...SharedData.gridBuffers.map((buffer, index) => ({
                    binding: index + 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "read-only-storage" as GPUBufferBindingType }
                })),
                {
                    binding: 10,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" as GPUBufferBindingType }
                },
                {
                    binding: 11,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" as GPUBufferBindingType }
                },
                {
                    binding: 12,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "uniform" as GPUBufferBindingType }
                }
            ]
        })
        this.uniformBuffer = WebGPU.device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        WebGPU.device.queue.writeBuffer(this.uniformBuffer, 0, new Uint32Array([SharedData.NUM_SPHERES]));

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
                }
                ,
                {
                    binding: 11,
                    resource: { buffer: SharedData.colorIndexBuffer }
                },
                {
                    binding: 12,
                    resource: { buffer: this.uniformBuffer }
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
@group(0) @binding(1) var<storage, read> atomicCounter: array<u32>;
@group(0) @binding(2) var<storage, read> grid1: array<vec2u>;
@group(0) @binding(3) var<storage, read> grid2: array<vec2u>;
@group(0) @binding(4) var<storage, read> grid3: array<vec2u>;   
@group(0) @binding(5) var<storage, read> grid4: array<vec2u>;    
// @group(0) @binding(6) var<storage, read_write> grid5: array<vec2u>;    
@group(0) @binding(10) var<storage, read_write> positionsNext: array<f32>;
@group(0) @binding(11) var<storage, read_write> colors: array<u32>;
@group(0) @binding(12) var<uniform> uniforms: Uniforms;


fn fast_inversesqrt(x: f32) -> f32 {
    let threehalfs: f32 = 1.5;
    var y: f32 = x;
    var i: i32 = bitcast<i32>(y);  // Interpret float as int
    i = 0x5F3759DF - (i >> 1);      // Magic number and shift
    y = bitcast<f32>(i);            // Reinterpret int as float
    y = y * (threehalfs - (0.5 * x * y * y));  // One iteration of Newton's method
    y = y * (threehalfs - (0.5 * x * y * y));  // 2nd iteration of Newton's method
    return y;
}

fn frac_sign(x: f32) -> i32 {
    let f = x - floor(x);  // Get fractional part
    return select(1, -1, f < 0.5);
}

@compute @workgroup_size(256)
fn computeMain(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let sphereID = u32(global_id.x);
    if (sphereID >= uniforms.numSpheres) {
        return;
    }
    var myPos = vec3f(positions[sphereID*3+0],positions[sphereID*3+1],positions[sphereID*3+2]);


    colors[sphereID] = 0u;
    let spherePos = vec3i(myPos+128);
    if(spherePos.x<0||spherePos.x>=256||spherePos.y<0||spherePos.y>=256||spherePos.z<0||spherePos.z>=256)
    {
        positionsNext[sphereID*3+0] = myPos.x;
        positionsNext[sphereID*3+1] = myPos.y;
        positionsNext[sphereID*3+2] = myPos.z;
        return;
    }
    let gridIndex2 = spherePos.x + spherePos.y * 256 + spherePos.z * 65536;
    // colors[sphereID] = atomicCounter[gridIndex2];

    let neighborOffsets = array<vec3i,8>(
        vec3i(frac_sign(myPos.x), 0, 0),
        vec3i(frac_sign(myPos.x), 0, frac_sign(myPos.z)),
        vec3i(frac_sign(myPos.x), frac_sign(myPos.y), 0),
        vec3i(0, frac_sign(myPos.y), 0),
        vec3i(0, frac_sign(myPos.y), frac_sign(myPos.z)),
        vec3i(0, 0, frac_sign(myPos.z)),
        vec3i(frac_sign(myPos.x), frac_sign(myPos.y), frac_sign(myPos.z)),
        vec3i(0,0,0)
    );

    var countCollisions = 0u;
    var posCorrection = vec3f(0,0,0);

    let spherePosF = vec3f(
        positions[sphereID*3+0],
        positions[sphereID*3+1],
        positions[sphereID*3+2]
    );

    for (var i = 0u; i < 8u; i++) {
        // if(countCollisions>=16) {break;}
        let neighborPos = vec3i(spherePos+neighborOffsets[i]);

        // Check if the neighbor cell is within grid bounds
        if (neighborPos.x >= 0 && neighborPos.x < 256 &&
            neighborPos.y >= 0 && neighborPos.y < 256 &&
            neighborPos.z >= 0 && neighborPos.z < 256) {

            let gridIndex = u32(neighborPos.x + neighborPos.y * 256 + neighborPos.z * 65536);

            let numSpheres = min(atomicCounter[gridIndex], 8);


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
                
                if (otherSphereID != sphereID) {

                    let otherPos = vec3f(
                        positions[otherSphereID*3+0],
                        positions[otherSphereID*3+1],
                        positions[otherSphereID*3+2]
                    );

                    let diff = spherePosF - otherPos;
                    var dist = dot(diff,diff);
                    
                    if (dist < 1) {
                        countCollisions+=1;
                        dist = sqrt(dist);
                        let normal = diff / dist;
                        let correction =  (1.0 - dist)*0.5;
                        posCorrection.x += normal.x * correction;
                        posCorrection.y += normal.y * correction;
                        posCorrection.z += normal.z * correction;
                    }
                }
            }
        }
    }
    colors[sphereID] = min(countCollisions,15);
    posCorrection *= 0.125;
    positionsNext[sphereID*3+0] = myPos.x + posCorrection.x;
    positionsNext[sphereID*3+1] = myPos.y + posCorrection.y;
    positionsNext[sphereID*3+2] = myPos.z + posCorrection.z;

}`;

        return WebGPU.device.createShaderModule({
            label: "Collisions compute shader",
            code: computeShaderCode
        });
    }

    static tick(commandEncoder: GPUCommandEncoder) {
        // const commandEncoder = WebGPU.device.createCommandEncoder();
        WebGPU.device.queue.writeBuffer(this.uniformBuffer, 0, new Uint32Array([SharedData.NUM_SPHERES]));
        // Compute pass
        const computePass = commandEncoder.beginComputePass();
        computePass.setPipeline(this.computePipeline);
        computePass.setBindGroup(0, this.computeBindGroup);
        computePass.dispatchWorkgroups(Math.ceil(SharedData.NUM_SPHERES / 256));
        computePass.end();

        commandEncoder.copyBufferToBuffer(this.positionsNextBuffer, 0, SharedData.spheresBuffer, 0, SharedData.NUM_SPHERES * 3 * 4);
    }
}