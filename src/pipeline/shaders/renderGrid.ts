import { SharedData } from "../shaderData.js";
import { WebGPU } from "../../webgpu.js";
import { PlayerController } from "../../playerController.js";

export class RenderCube {
    static pipeline: GPURenderPipeline;
    static bindGroup: GPUBindGroup;
    static bindGroupLayout: GPUBindGroupLayout;
    static uniformBuffer: GPUBuffer;
    static vertexBuffer: GPUBuffer;
    static instanceBuffer:GPUBuffer;
    static gridSize = 16;
    static init() {
        this.uniformBuffer = WebGPU.device.createBuffer({
            size: (4 * 4 * 3 + 4) * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.bindGroupLayout = WebGPU.device.createBindGroupLayout({
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: { type: "uniform" }
            },
            {
                binding: 1,
                visibility: GPUShaderStage.VERTEX,
                buffer: { type: "read-only-storage" }
            },
            {
                binding: 2,
                visibility: GPUShaderStage.VERTEX,
                buffer: { type: "read-only-storage" }
            }]
        });



        const vertices = new Float32Array([
            // Define cube edges as lines (pairs of vertices)
            0, 0, 0, 1, 0, 0,
            1, 0, 0, 1, 1, 0,
            1, 1, 0, 0, 1, 0,
            0, 1, 0, 0, 0, 0,

            0, 0, 1, 1, 0, 1,
            1, 0, 1, 1, 1, 1,
            1, 1, 1, 0, 1, 1,
            0, 1, 1, 0, 0, 1,

            0, 0, 0, 0, 0, 1,
            1, 0, 0, 1, 0, 1,
            1, 1, 0, 1, 1, 1,
            0, 1, 0, 0, 1, 1
        ]);
        console.log(vertices.byteLength)
        this.vertexBuffer = WebGPU.device.createBuffer({
            size: vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });
        WebGPU.device.queue.writeBuffer(this.vertexBuffer, 0, vertices);

        const cellPositions = new Float32Array(32*32*32 * 3); // 3 for x, y, z
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                for (let k = 0; k < this.gridSize; k++) {
                    const index = (i * this.gridSize * this.gridSize) + (j * this.gridSize) + k;
                    cellPositions[index * 3] = i-this.gridSize/2; // x
                    cellPositions[index * 3 + 1] = j-this.gridSize/2; // y
                    cellPositions[index * 3 + 2] = k-this.gridSize/2; // z
                }
            }
        }

        this.instanceBuffer = WebGPU.device.createBuffer({
            size: cellPositions.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        WebGPU.device.queue.writeBuffer(this.instanceBuffer, 0, cellPositions);


        this.bindGroup = WebGPU.device.createBindGroup({
            layout: this.bindGroupLayout,
            entries: [{
                binding: 0,
                resource: { buffer: this.uniformBuffer }
            },{
                binding: 1,
                resource: { buffer: SharedData.atomicBuffer }
            },{
                binding: 2,
                resource: { buffer: this.instanceBuffer }
            }]
        });

        const shaderModule = this.#createRenderShader();

        this.pipeline = WebGPU.device.createRenderPipeline({
            label: "Cube pipeline",
            layout: WebGPU.device.createPipelineLayout({
                bindGroupLayouts: [this.bindGroupLayout]
            }),
            vertex: {
                module: shaderModule,
                entryPoint: "vertexMain"
            },
            fragment: {
                module: shaderModule,
                entryPoint: "fragmentMain",
                targets: [{
                    format: navigator.gpu.getPreferredCanvasFormat(),
                    blend: {
                        color: {
                            srcFactor: 'src-alpha',
                            dstFactor: 'one-minus-src-alpha',
                            operation: 'add',
                        },
                        alpha: {
                            srcFactor: 'one',
                            dstFactor: 'one-minus-src-alpha',
                            operation: 'add',
                        },
                    },
                }],
            },
            primitive: {
                topology: "line-list",
                cullMode: "none"
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: "less",
                format: "depth24plus"
            }

        });
    }

    static #createRenderShader() {
        return WebGPU.device.createShaderModule({
            label: "Cube rendering shader",
            code: /*wgsl*/`

                struct Uniforms {
                    modelViewProj: mat4x4f
                }

                @binding(0) @group(0) var<uniform> uniforms: Uniforms;
                @group(0) @binding(1) var<storage, read> atomicCounter: array<u32>;
                @group(0) @binding(2) var<storage, read> cellPos: array<f32>;

                
                struct VertexOutput {
                    @builtin(position) position: vec4f,
                    @location(0) color: vec3f,
                }
                
                @vertex 
                fn vertexMain(
                    @builtin(vertex_index) vertexIndex: u32,
                    @builtin(instance_index) instanceIndex: u32,
                    // @location(0) position: vec3f,
                ) -> VertexOutput {

                    let cell = vec3f(cellPos[instanceIndex*3+0],cellPos[instanceIndex*3+1],cellPos[instanceIndex*3+2]);

                    let cellPosLocal = vec3i(cell+128);
                    let gridIndex = cellPosLocal.x + cellPosLocal.y * 256 + cellPosLocal.z * 65536;


                    // Cube vertices for edges
                    let vertices = array<vec3f, 24>(
                        // Front face edges
                        vec3f(0.0, 0.0, 0.0), vec3f(1.0, 0.0, 0.0),
                        vec3f(1.0, 0.0, 0.0), vec3f(1.0, 1.0, 0.0),
                        vec3f(1.0, 1.0, 0.0), vec3f(0.0, 1.0, 0.0),
                        vec3f(0.0, 1.0, 0.0), vec3f(0.0, 0.0, 0.0),
                        
                        // Back face edges
                        vec3f(0.0, 0.0, 1.0), vec3f(1.0, 0.0, 1.0),
                        vec3f(1.0, 0.0, 1.0), vec3f(1.0, 1.0, 1.0),
                        vec3f(1.0, 1.0, 1.0), vec3f(0.0, 1.0, 1.0),
                        vec3f(0.0, 1.0, 1.0), vec3f(0.0, 0.0, 1.0),
                        
                        // Connecting edges
                        vec3f(0.0, 0.0, 0.0), vec3f(0.0, 0.0, 1.0),
                        vec3f(1.0, 0.0, 0.0), vec3f(1.0, 0.0, 1.0),
                        vec3f(1.0, 1.0, 0.0), vec3f(1.0, 1.0, 1.0),
                        vec3f(0.0, 1.0, 0.0), vec3f(0.0, 1.0, 1.0)
                    );

                    const colorPalette = array<vec3f, 10>(
                        vec3f(1.0, 1.0, 1.0),  // White
                        vec3f(0.0, 1.0, 0.0),  // Vibrant Green
                        vec3f(0.0, 0.0, 1.0),  // Vibrant Blue
                        vec3f(1.0, 1.0, 0.0),  // Vibrant Yellow
                        vec3f(1.0, 0.5, 0.0),  // light Red
                        vec3f(0.2, 1.0, 1.0),  // Cyan
                        vec3f(1.0, 0.0, 1.0),  // Magenta
                        vec3f(0.5, 0.5, 0.5),  // Gray
                        vec3f(1.0, 0.0, 0.0),  // RED
                        vec3f(0.0, 0.0, 0.0)   // Black
                    );   

                    var output: VertexOutput;

                    var localPos = vertices[vertexIndex]*0.99;

                    output.position = uniforms.modelViewProj * vec4f(localPos + cell, 1.0);
                    output.color = colorPalette[atomicCounter[gridIndex]];
                    return output;
                }
                
                @fragment
                fn fragmentMain(@location(0) color: vec3f) -> @location(0) vec4f {
                    return vec4f(color, 1.0);
                }
            `
        });
    }

    static tick(renderPass:GPURenderPassEncoder) {
        WebGPU.device.queue.writeBuffer(this.uniformBuffer, 0, PlayerController.viewMatrix);

        renderPass.setPipeline(this.pipeline);
        renderPass.setBindGroup(0, this.bindGroup);
        renderPass.setVertexBuffer(0, this.vertexBuffer);
        // renderPass.setVertexBuffer(1, this.instanceBuffer); // Assuming instanceBuffer is defined and set up elsewhere
        renderPass.draw(24, this.gridSize*this.gridSize*this.gridSize, 0, 0); // 12 edges, 2 vertices each
        // renderPass.end();
    }
}
