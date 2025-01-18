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
    static NUM_INSTANCES = 100000;

    static init(): void {
        const golden_ratio = (1.0 + Math.sqrt(5.0)) / 2.0;

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
            size: 144, // Two 4x4 matrices (128 bytes) + light position (16 bytes)
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
            label: "Camera shader",
            code: /*wgsl*/`
                struct Uniforms {
                    viewMatrix: mat4x4f,
                    projectionMatrix: mat4x4f,
                    lightPosition: vec3f,
                }
                @binding(0) @group(0) var<uniform> uniforms: Uniforms;

                struct VertexOutput {
                    @builtin(position) position: vec4f,
                    @location(0) color: vec3f,
                    @location(1) worldPos: vec3f,
                    @location(2) normal: vec3f,
                }

                fn calculateTriangleNormal(p1: vec3f, p2: vec3f, p3: vec3f) -> vec3f {
                    let v1 = p2 - p1;
                    let v2 = p3 - p1;
                    return normalize(cross(v1, v2));
                }

                @vertex
                fn vertexMain(
                    @builtin(vertex_index) vertexIndex: u32,
                    @builtin(instance_index) instanceIndex: u32,
                    @location(0) instancePosition: vec3f
                ) -> VertexOutput {
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
                    let triangleIndex = vertexIndex / 3u;
                    let idx = indices[vertexIndex];
                    
                    // Get the three vertices of the current triangle
                    let p1 = positions[indices[triangleIndex * 3u]];
                    let p2 = positions[indices[triangleIndex * 3u + 1u]];
                    let p3 = positions[indices[triangleIndex * 3u + 2u]];
                    
                    // Calculate triangle normal
                    let triangleNormal = calculateTriangleNormal(p1, p2, p3);
                    
                    var worldPos = positions[idx];
                    // Normalize and scale the position to create a small unit icosahedron
                    worldPos = normalize(worldPos) * 0.2;
                    // Offset by instance position
                    worldPos = worldPos + instancePosition;
                    
                    output.worldPos = worldPos;
                    output.normal = triangleNormal;
                    var viewPos = uniforms.viewMatrix * vec4f(worldPos, 1.0);
                    output.position = uniforms.projectionMatrix * viewPos;
                    output.color = vec3f(1.0,1.0, 1.0);//colors[idx];
                    return output;
                }

                @fragment
                fn fragmentMain(
                    @location(0) color: vec3f,
                    @location(1) worldPos: vec3f,
                    @location(2) normal: vec3f
                ) -> @location(0) vec4f {
                    let lightDir = normalize(uniforms.lightPosition - worldPos);
                    let ambient = 0.2;
                    let diffuse = max(dot(normal, lightDir), 0.0);
                    let lighting = ambient + diffuse;
                    return vec4f(color * lighting, 1.0);
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
        WebGPU.device.queue.writeBuffer(this.uniformBuffer, 0, PlayerController.translationMatrix);
        WebGPU.device.queue.writeBuffer(this.uniformBuffer, 64, PlayerController.projectionMatrix);
        WebGPU.device.queue.writeBuffer(this.uniformBuffer, 128, this.lightPosition);

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
        renderPass.draw(60, this.NUM_INSTANCES, 0, 0); // 20 triangles * 3 vertices = 60 vertices
        
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
