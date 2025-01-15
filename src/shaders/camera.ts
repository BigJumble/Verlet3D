import { WebGPU } from "../webgpu.js";
import { Controls } from "../controls.js";
export class CameraShader {
    static pipeline: GPURenderPipeline;
    static bindGroup: GPUBindGroup;
    static bindGroupLayout: GPUBindGroupLayout;
    static uniformBuffer: GPUBuffer;

    static init(): void {
        // Create uniform buffer for camera matrices
        this.uniformBuffer = WebGPU.device.createBuffer({
            size: 2 * 16 * 4, // Two 4x4 matrices (view and projection)
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
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
            code: /*wgsl*/`
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
                    // Simple cube vertices
                    var positions = array<vec3f, 8>(
                        vec3f(-1.0, -1.0, -1.0),
                        vec3f( 1.0, -1.0, -1.0),
                        vec3f( 1.0,  1.0, -1.0),
                        vec3f(-1.0,  1.0, -1.0),
                        vec3f(-1.0, -1.0,  1.0),
                        vec3f( 1.0, -1.0,  1.0),
                        vec3f( 1.0,  1.0,  1.0),
                        vec3f(-1.0,  1.0,  1.0)
                    );

                    // Simple colors for vertices
                    var colors = array<vec3f, 8>(
                        vec3f(1.0, 0.0, 0.0),
                        vec3f(0.0, 1.0, 0.0),
                        vec3f(0.0, 0.0, 1.0),
                        vec3f(1.0, 1.0, 0.0),
                        vec3f(1.0, 0.0, 1.0),
                        vec3f(0.0, 1.0, 1.0),
                        vec3f(1.0, 1.0, 1.0),
                        vec3f(0.5, 0.5, 0.5)
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
                topology: "triangle-list",
                cullMode: "back"
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: "less",
                format: "depth24plus"
            }
        });
    }
            // Create view matrix (camera looking at origin from 5 units back)
            static viewMatrix = new Float32Array([
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, -5, 1
            ]);
    static controllerUpdate(deltaTime: number): void {
        // Get current view matrix
        // console.log(this.viewMatrix);
        // const viewMatrix = new Float32Array(16);
        WebGPU.device.queue.writeBuffer(this.uniformBuffer, 0, this.viewMatrix);

        // Camera movement speed
        const moveSpeed = 2.0 * deltaTime;
        const rotateSpeed = 1.0 * deltaTime;
        // console.log(Controls.pressedKeys)
        // Forward/backward movement
        if (Controls.getKey('KeyW')) {
            this.viewMatrix[14] += moveSpeed;
        }
        if (Controls.getKey('KeyS')) {
            this.viewMatrix[14] -= moveSpeed;
        }

        // Left/right movement 
        if (Controls.getKey('KeyA')) {
            this.viewMatrix[12] -= moveSpeed;
        }
        if (Controls.getKey('KeyD')) {
            this.viewMatrix[12] += moveSpeed;
        }

        // Up/down movement
        if (Controls.getKey('Space')) {
            this.viewMatrix[13] += moveSpeed;
        }
        if (Controls.getKey('ShiftLeft')) {
            this.viewMatrix[13] -= moveSpeed;
        }

        // Update view matrix in uniform buffer
        WebGPU.device.queue.writeBuffer(this.uniformBuffer, 0, this.viewMatrix);
    }

    static update(): void {


        // Create perspective projection matrix
        const aspect = WebGPU.canvas.width / WebGPU.canvas.height;
        const fov = Math.PI / 4; // 45 degrees
        const near = 0.1;
        const far = 100.0;
        const f = 1.0 / Math.tan(fov / 2);
        
        const projectionMatrix = new Float32Array([
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (far + near) / (near - far), -1,
            0, 0, (2 * far * near) / (near - far), 0
        ]);

        // Update uniform buffer with matrices
        WebGPU.device.queue.writeBuffer(this.uniformBuffer, 0, this.viewMatrix);
        WebGPU.device.queue.writeBuffer(this.uniformBuffer, 64, projectionMatrix);

        const commandEncoder = WebGPU.device.createCommandEncoder();
        
        // Create depth texture
        const depthTexture = WebGPU.device.createTexture({
            size: [WebGPU.canvas.width, WebGPU.canvas.height],
            format: "depth24plus",
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });

        const view = WebGPU.context.getCurrentTexture().createView();

        const renderPass = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: view,
                clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 },
                loadOp: "clear",
                storeOp: "store"
            }],
            depthStencilAttachment: {
                view: depthTexture.createView(),
                depthClearValue: 1.0,
                depthLoadOp: "clear",
                depthStoreOp: "store",
            }
        });

        renderPass.setPipeline(this.pipeline);
        renderPass.setBindGroup(0, this.bindGroup);
        renderPass.draw(8); // Draw cube vertices
        renderPass.end();

        WebGPU.device.queue.submit([commandEncoder.finish()]);
    }
}

