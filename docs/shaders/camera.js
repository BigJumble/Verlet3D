import { WebGPU } from "../webgpu.js";
import { PlayerController } from "../playerController.js";
export class CameraShader {
    static init() {
        const golden_ratio = (1.0 + Math.sqrt(5.0)) / 2.0;
        this.uniformBuffer = WebGPU.device.createBuffer({
            size: 128, // Two 4x4 matrices
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        // Create bind group layout
        this.bindGroupLayout = WebGPU.device.createBindGroupLayout({
            entries: [{
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: { type: "uniform" }
                }]
        });
        // Create bind group
        this.bindGroup = WebGPU.device.createBindGroup({
            layout: this.bindGroupLayout,
            entries: [{
                    binding: 0,
                    resource: { buffer: this.uniformBuffer }
                }]
        });
        // Create shader module
        const shaderModule = WebGPU.device.createShaderModule({
            label: "Camera shader",
            code: /*wgsl*/ `
                struct Uniforms {
                    viewMatrix: mat4x4f,
                    projectionMatrix: mat4x4f,
                }
                @binding(0) @group(0) var<uniform> uniforms: Uniforms;

                struct VertexOutput {
                    @builtin(position) position: vec4f,
                    @location(0) color: vec3f,
                }

                @vertex
                fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
                    let gr = ${golden_ratio}f;
                    var positions = array<vec3f, 12>(
                        vec3f(-1.0, gr, 0.0),
                        vec3f(1.0, gr, 0.0),
                        vec3f(-1.0, -gr, 0.0),
                        vec3f(1.0, -gr, 0.0),
                        vec3f(0.0, -1.0, gr),
                        vec3f(0.0, 1.0, gr),
                        vec3f(0.0, -1.0, -gr),
                        vec3f(0.0, 1.0, -gr),
                        vec3f(gr, 0.0, -1.0),
                        vec3f(gr, 0.0, 1.0),
                        vec3f(-gr, 0.0, -1.0),
                        vec3f(-gr, 0.0, 1.0)
                    );

                    // Indices for the 20 triangles of the icosahedron
                    var indices = array<u32, 60>(
                        0,11,5,  0,5,1,   0,1,7,   0,7,10,  0,10,11,
                        1,5,9,   5,11,4,  11,10,2, 10,7,6,  7,1,8,
                        3,9,4,   3,4,2,   3,2,6,   3,6,8,   3,8,9,
                        4,9,5,   2,4,11,  6,2,10,  8,6,7,   9,8,1
                    );

                    var colors = array<vec3f, 12>(
                        vec3f(1.0, 0.0, 0.0),  // Red
                        vec3f(0.0, 1.0, 0.0),  // Green
                        vec3f(0.0, 0.0, 1.0),  // Blue
                        vec3f(1.0, 1.0, 0.0),  // Yellow
                        vec3f(1.0, 0.0, 1.0),  // Magenta
                        vec3f(0.0, 1.0, 1.0),  // Cyan
                        vec3f(1.0, 0.5, 0.0),  // Orange
                        vec3f(0.5, 1.0, 0.0),  // Lime
                        vec3f(0.0, 0.5, 1.0),  // Sky Blue
                        vec3f(1.0, 0.0, 0.5),  // Pink
                        vec3f(0.5, 0.0, 1.0),  // Purple
                        vec3f(0.0, 1.0, 0.5)   // Sea Green
                    );

                    var output: VertexOutput;
                    let idx = indices[vertexIndex];
                    var worldPos = positions[idx];
                    // Normalize the position to create a unit icosahedron
                    worldPos = normalize(worldPos);
                    var viewPos = uniforms.viewMatrix * vec4f(worldPos, 1.0);
                    output.position = uniforms.projectionMatrix * viewPos;
                    output.color = colors[idx];
                    return output;
                }

                @fragment
                fn fragmentMain(@location(0) color: vec3f) -> @location(0) vec4f {
                    return vec4f(color, 1.0);
                }
            `
        });
        // Create render pipeline
        this.pipeline = WebGPU.device.createRenderPipeline({
            label: "Camera pipeline",
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
                        format: navigator.gpu.getPreferredCanvasFormat()
                    }]
            },
            primitive: {
                topology: "triangle-list",
                cullMode: "back"
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: "less",
                format: "depth24plus"
            }
        });
        // Create depth texture once
        this.depthTexture = WebGPU.device.createTexture({
            size: [WebGPU.canvas.width, WebGPU.canvas.height],
            format: "depth24plus",
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
    }
    static update() {
        WebGPU.device.queue.writeBuffer(this.uniformBuffer, 0, PlayerController.viewMatrix);
        WebGPU.device.queue.writeBuffer(this.uniformBuffer, 64, PlayerController.projectionMatrix);
        const commandEncoder = WebGPU.device.createCommandEncoder();
        const view = WebGPU.context.getCurrentTexture().createView();
        const renderPass = commandEncoder.beginRenderPass({
            colorAttachments: [{
                    view: view,
                    clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 },
                    loadOp: "clear",
                    storeOp: "store"
                }],
            depthStencilAttachment: {
                view: this.depthTexture.createView(),
                depthClearValue: 1.0,
                depthLoadOp: "clear",
                depthStoreOp: "store",
            }
        });
        renderPass.setPipeline(this.pipeline);
        renderPass.setBindGroup(0, this.bindGroup);
        // Draw all triangles of the icosahedron
        renderPass.draw(60, 1, 0); // 20 triangles * 3 vertices = 60 vertices
        renderPass.end();
        WebGPU.device.queue.submit([commandEncoder.finish()]);
    }
    // Add cleanup method
    static cleanup() {
        this.depthTexture.destroy();
        this.uniformBuffer.destroy();
    }
}
