import { WebGPU } from "../webgpu.js";
import { PlayerController } from "../playerController.js";
export class CameraShader {
    static init() {
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
                    // Cube vertices arranged for triangle strip
                    var positions = array<vec3f, 24>(
                        // Back face
                        vec3f(1.0, 1.0, -1.0),    // 0
                        vec3f(1.0, -1.0, -1.0),   // 1
                        vec3f(-1.0, 1.0, -1.0),   // 2
                        vec3f(-1.0, -1.0, -1.0),  // 3
                        // Right face
                        vec3f(1.0, 1.0, 1.0),     // 4
                        vec3f(1.0, -1.0, 1.0),    // 5
                        vec3f(1.0, 1.0, -1.0),    // 6
                        vec3f(1.0, -1.0, -1.0),   // 7
                        // Front face
                        vec3f(-1.0, 1.0, 1.0),    // 8
                        vec3f(-1.0, -1.0, 1.0),   // 9
                        vec3f(1.0, 1.0, 1.0),     // 10
                        vec3f(1.0, -1.0, 1.0),    // 11
                        // Left face
                        vec3f(-1.0, 1.0, -1.0),   // 12
                        vec3f(-1.0, -1.0, -1.0),  // 13
                        vec3f(-1.0, 1.0, 1.0),    // 14
                        vec3f(-1.0, -1.0, 1.0),   // 15
                        // Top face
                        vec3f(-1.0, 1.0, 1.0),    // 16
                        vec3f(1.0, 1.0, 1.0),     // 17
                        vec3f(-1.0, 1.0, -1.0),   // 18
                        vec3f(1.0, 1.0, -1.0),    // 19
                        // Bottom face
                        vec3f(-1.0, -1.0, -1.0),  // 20
                        vec3f(1.0, -1.0, -1.0),   // 21
                        vec3f(-1.0, -1.0, 1.0),   // 22
                        vec3f(1.0, -1.0, 1.0)     // 23
                    );

                    // Colors for vertices
                    var colors = array<vec3f, 24>(
                        // Back face (Red)
                        vec3f(1.0, 0.0, 0.0),
                        vec3f(1.0, 0.0, 0.0),
                        vec3f(1.0, 0.0, 0.0),
                        vec3f(1.0, 0.0, 0.0),
                        // Right face (Green)
                        vec3f(0.0, 1.0, 0.0),
                        vec3f(0.0, 1.0, 0.0),
                        vec3f(0.0, 1.0, 0.0),
                        vec3f(0.0, 1.0, 0.0),
                        // Front face (Blue)
                        vec3f(0.0, 0.0, 1.0),
                        vec3f(0.0, 0.0, 1.0),
                        vec3f(0.0, 0.0, 1.0),
                        vec3f(0.0, 0.0, 1.0),
                        // Left face (Yellow)
                        vec3f(1.0, 1.0, 0.0),
                        vec3f(1.0, 1.0, 0.0),
                        vec3f(1.0, 1.0, 0.0),
                        vec3f(1.0, 1.0, 0.0),
                        // Top face (Magenta)
                        vec3f(1.0, 0.0, 1.0),
                        vec3f(1.0, 0.0, 1.0),
                        vec3f(1.0, 0.0, 1.0),
                        vec3f(1.0, 0.0, 1.0),
                        // Bottom face (Cyan)
                        vec3f(0.0, 1.0, 1.0),
                        vec3f(0.0, 1.0, 1.0),
                        vec3f(0.0, 1.0, 1.0),
                        vec3f(0.0, 1.0, 1.0)
                    );

                    var output: VertexOutput;
                    var worldPos = positions[vertexIndex];
                    var viewPos = uniforms.viewMatrix * vec4f(worldPos, 1.0);
                    output.position = uniforms.projectionMatrix * viewPos;
                    output.color = colors[vertexIndex];
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
                topology: "triangle-strip",
                stripIndexFormat: "uint32",
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
        // console.log(PlayerController.viewMatrix);
        // console.log(PlayerController.projectionMatrix);
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
        // Draw each face of the cube
        for (var i = 0; i < 6; i++) {
            renderPass.draw(4, 1, i * 4); // Draw 4 vertices starting at i * 4
        }
        renderPass.end();
        WebGPU.device.queue.submit([commandEncoder.finish()]);
    }
    // Add cleanup method
    static cleanup() {
        this.depthTexture.destroy();
        this.uniformBuffer.destroy();
    }
}
