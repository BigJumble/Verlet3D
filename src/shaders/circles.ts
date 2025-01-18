import { WebGPU } from "../webgpu.js";
import { PlayerController } from "../playerController.js";

export class CameraShader {
    static pipeline: GPURenderPipeline;
    static bindGroup: GPUBindGroup;
    static bindGroupLayout: GPUBindGroupLayout;
    static uniformBuffer: GPUBuffer;
    static depthTexture: GPUTexture;
    static lightPosition: Float32Array = new Float32Array([4.0, 500.0, 6.0]); // Light position in world space
    static instanceBuffer: GPUBuffer;
    static NUM_INSTANCES = 6000;

    static init(): void {

        // Create instance buffer with random positions
        const instanceData = new Float32Array(this.NUM_INSTANCES * 3); // xyz for each instance
        for (let i = 0; i < this.NUM_INSTANCES; i++) {
            instanceData[i * 3] = (Math.random() - 0.5) * 200; // x
            instanceData[i * 3 + 1] = (Math.random() - 0.5) * 200; // y
            instanceData[i * 3 + 2] = (Math.random() - 0.5) * 200; // z
        }

        this.instanceBuffer = WebGPU.device.createBuffer({
            size: instanceData.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Float32Array(this.instanceBuffer.getMappedRange()).set(instanceData);
        this.instanceBuffer.unmap();

        this.uniformBuffer = WebGPU.device.createBuffer({
            size: 160, // Two 4x4 matrices (128 bytes) + light position (16 bytes) + camera position (16 bytes)
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        // Create bind group layout
        this.bindGroupLayout = WebGPU.device.createBindGroupLayout({
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
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
            label: "circle shader",
            code: /*wgsl*/`
                struct Uniforms {
                    viewMatrix: mat4x4f,
                    projectionMatrix: mat4x4f,
                    lightPosition: vec4f,
                    cameraPosition: vec4f,
                }
                @binding(0) @group(0) var<uniform> uniforms: Uniforms;

                struct VertexOutput {
                    @builtin(position) position: vec4f,
                    @location(0) color: vec3f,
                }



                @vertex
                fn vertexMain(
                    @builtin(vertex_index) vertexIndex: u32,
                    @builtin(instance_index) instanceIndex: u32,
                    @location(0) instancePosition: vec3f
                ) -> VertexOutput {
                    var positions = array<vec2f, 3>(
                        vec2<f32>(0.0, 2.0),
                        vec2<f32>(-1.732, -1.0),
                        vec2<f32>(1.732, -1.0)
                    );

                    var output: VertexOutput;
                    var localPos = vec3f(positions[vertexIndex], 0.0);

                    // Apply rotation first
                    var rotatedPos = uniforms.viewMatrix * vec4f(localPos, 0.0);

                    // Then apply translation
                    var worldPos = rotatedPos.xyz + instancePosition;

                    var viewPos = uniforms.viewMatrix * vec4f(worldPos, 1.0); // View position

                    output.position = uniforms.projectionMatrix * viewPos; // Perspective position
                    output.color = vec3f(1.0, 1.0, 1.0);
                    return output;
                }

                @fragment
                fn fragmentMain(
                    @location(0) color: vec3f
                ) -> @location(0) vec4f {
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
                entryPoint: "vertexMain",
                buffers: [{
                    arrayStride: 12, // 3 * float32
                    stepMode: "instance",
                    attributes: [{
                        shaderLocation: 0,
                        offset: 0,
                        format: "float32x3"
                    }]
                }]
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

        this.resize();
    }

    static resize(): void {
        if (this.depthTexture) {
            this.depthTexture.destroy();
        }

        this.depthTexture = WebGPU.device.createTexture({
            size: [WebGPU.canvas.width, WebGPU.canvas.height],
            format: "depth24plus",
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
    }

    static update(): void {
        WebGPU.device.queue.writeBuffer(this.uniformBuffer, 0, PlayerController.viewMatrix);
        WebGPU.device.queue.writeBuffer(this.uniformBuffer, 64, PlayerController.projectionMatrix);
        WebGPU.device.queue.writeBuffer(this.uniformBuffer, 128, this.lightPosition);
        WebGPU.device.queue.writeBuffer(this.uniformBuffer, 144, PlayerController.viewMatrix.subarray(12, 16)); // Camera position

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
        renderPass.setVertexBuffer(0, this.instanceBuffer);

        // Draw all triangles of the icosahedron for each instance
        renderPass.draw(3, this.NUM_INSTANCES, 0, 0); // 20 triangles * 3 vertices = 60 vertices

        renderPass.end();

        WebGPU.device.queue.submit([commandEncoder.finish()]);
    }

    // Add cleanup method
    static cleanup(): void {
        this.depthTexture.destroy();
        this.uniformBuffer.destroy();
        this.instanceBuffer.destroy();
    }
}
