import { SharedData } from "../shaderData.js";
import { WebGPU } from "../../webgpu.js";
import { PlayerController } from "../../playerController.js";

export class RenderBillboards {
    static pipeline: GPURenderPipeline;
    static bindGroup: GPUBindGroup;
    static bindGroupLayout: GPUBindGroupLayout;
    static uniformBuffer: GPUBuffer;
    static depthTexture: GPUTexture;

    static init() {
        this.uniformBuffer = WebGPU.device.createBuffer({
            size: (4 * 4 * 3 + 4) * 4,
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

        const shaderModule = this.#createRenderShader();
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
                },
                {
                    arrayStride: 4, // 1 * uint32
                    stepMode: "instance",
                    attributes: [{
                        shaderLocation: 1,
                        offset: 0,
                        format: "uint32"
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

    static #createRenderShader() {
        // Create shader module
        return WebGPU.device.createShaderModule({
            label: "Spheres rendering shader",
            code: /*wgsl*/`
            struct Uniforms {
                translationMatrix: mat4x4f,
                rotationMatrix: mat4x4f,
                projectionMatrix: mat4x4f,
                lightDirection: vec4f,
            }
            @binding(0) @group(0) var<uniform> uniforms: Uniforms;
            
            struct VertexOutput {
                @builtin(position) position: vec4f,
                @location(0) @interpolate(flat) color: vec3f,
                @location(1) uv: vec2f,
            }
            
            const colorPalette = array<vec3f, 6>(
                vec3f(1.0, 1.0, 1.0),  // White
                vec3f(0.0, 1.0, 0.0),  // Vibrant Green
                vec3f(0.0, 0.0, 1.0),  // Vibrant Blue
                vec3f(1.0, 1.0, 0.0),  // Vibrant Yellow
                vec3f(1.0, 0.0, 0.0),  // RED
                vec3f(0.2, 1.0, 1.0)   // Vibrant Cyan
            );
            
            @vertex
            fn vertexMain(
                @builtin(vertex_index) vertexIndex: u32,
                @builtin(instance_index) instanceIndex: u32,
                @location(0) instancePosition: vec3f,
                @location(1) colorIndex: u32
            ) -> VertexOutput {
                let positions = array<vec2f, 3>(
                    vec2f(0.0,  0.5773502691896258),    // Top vertex: (0, 1/√3)
                    vec2f(-0.5, -0.2886751345948129),   // Bottom left: (-1/2, -1/(2√3))
                    vec2f(0.5,  -0.2886751345948129)    // Bottom right: (1/2, -1/(2√3))
                );
                
                // UV coordinates for triangle vertices
                let uvs = array<vec2f, 3>(
                    vec2f(0.0,  0.5773502691896258),    // Top vertex: (0, 1/√3)
                    vec2f(-0.5, -0.2886751345948129),   // Bottom left: (-1/2, -1/(2√3))
                    vec2f(0.5,  -0.2886751345948129)    // Bottom right: (1/2, -1/(2√3))
                );
            
                var output: VertexOutput;
                let localPos = vec3f(positions[vertexIndex], 0.0);
                
                // Calculate direction from instance position to camera position
                let cameraPos = -uniforms.translationMatrix[3].xyz;
                let toCamera = normalize(cameraPos - instancePosition);
                
                // Create rotation matrix to face camera
                let up = vec3f(0.0, 1.0, 0.0);
                let right = normalize(cross(up, toCamera));
                let adjustedUp = normalize(cross(toCamera, right));
                
                let scaledLocalPos = localPos * 3.464101615137754 * 0.5; // Scale manually as needed
                
                // Apply billboard rotation to local position
                let billboardPos = right * scaledLocalPos.x + adjustedUp * scaledLocalPos.y + toCamera * scaledLocalPos.z;
            
                // Apply translation
                let worldPos = billboardPos + instancePosition;
            
                // Apply view transform
                let viewPos = uniforms.translationMatrix * vec4f(worldPos, 1.0);
            
                // Apply rotation
                let rotatedPos = uniforms.rotationMatrix * viewPos;
            
                // Apply projection
                output.position = uniforms.projectionMatrix * rotatedPos;
                output.color = colorPalette[colorIndex]; // Use color from palette
                output.uv = uvs[vertexIndex];
                
                return output;
            }
            
            @fragment
            fn fragmentMain(
                @location(0) @interpolate(flat) color: vec3f,
                @location(1) uv: vec2f
            ) -> @location(0) vec4f {
                // Calculate distance from center of triangle
                let dist = length(uv);
                
                // Create circle mask
                let radius = 0.2886751345948129; // Distance from center to edge of the triangle
                if (dist > radius) {
                    discard;
                }
                
                return vec4f(color, 1.0);
            }
        
                    `
        });

    }


    static tick() {
        WebGPU.device.queue.writeBuffer(this.uniformBuffer, 0, PlayerController.translationMatrix);
        WebGPU.device.queue.writeBuffer(this.uniformBuffer, 64, PlayerController.rotationMatrix);
        WebGPU.device.queue.writeBuffer(this.uniformBuffer, 128, PlayerController.projectionMatrix);
        WebGPU.device.queue.writeBuffer(this.uniformBuffer, 192, SharedData.lightDirection);

        const view = WebGPU.context.getCurrentTexture().createView();

        const commandEncoder = WebGPU.device.createCommandEncoder();
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
        renderPass.setVertexBuffer(0, SharedData.spheresBuffer);
        renderPass.setVertexBuffer(1, SharedData.colorIndexBuffer);

        renderPass.draw(3, SharedData.NUM_SPHERES, 0, 0); 
        renderPass.end();

        WebGPU.device.queue.submit([commandEncoder.finish()]);
    }
}