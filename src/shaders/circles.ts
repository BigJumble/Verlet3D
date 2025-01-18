import { WebGPU } from "../webgpu.js";
import { PlayerController } from "../playerController.js";

export class CameraShader {
    static pipeline: GPURenderPipeline;
    static bindGroup: GPUBindGroup;
    static bindGroupLayout: GPUBindGroupLayout;
    static uniformBuffer: GPUBuffer;
    static depthTexture: GPUTexture;
    static lightDirection: Float32Array = new Float32Array([0.0, -1.0, 0.0]); // Light direction in world space
    static instanceBuffer: GPUBuffer;
    static NUM_INSTANCES = 10000000;

    static init(): void {

        // Create instance buffer with random positions
        const instanceData = new Float32Array(this.NUM_INSTANCES * 3); // xyz for each instance
        for (let i = 0; i < this.NUM_INSTANCES; i++) {
            instanceData[i * 3] = (Math.random() - 0.5) * 2000; // x
            instanceData[i * 3 + 1] = (Math.random() - 0.5) * 2000; // y
            instanceData[i * 3 + 2] = (Math.random() - 0.5) * 2000; // z
        }

        this.instanceBuffer = WebGPU.device.createBuffer({
            size: instanceData.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Float32Array(this.instanceBuffer.getMappedRange()).set(instanceData);
        this.instanceBuffer.unmap();

        this.uniformBuffer = WebGPU.device.createBuffer({
            size: (4*4*3+4)*4,
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
                translationMatrix: mat4x4f,
                rotationMatrix: mat4x4f,
                projectionMatrix: mat4x4f,
                lightDirection: vec4f,
            }
            @binding(0) @group(0) var<uniform> uniforms: Uniforms;
            
            struct VertexOutput {
                @builtin(position) position: vec4f,
                @location(0) color: vec3f,
                @location(1) uv: vec2f,
                @location(2) worldPosition: vec3f, // Pass world position to the fragment shader
            }
            
            @vertex
            fn vertexMain(
                @builtin(vertex_index) vertexIndex: u32,
                @builtin(instance_index) instanceIndex: u32,
                @location(0) instancePosition: vec3f
            ) -> VertexOutput {
                var positions = array<vec2f, 3>(
                    vec2<f32>(0.0, 0.577350),           // Top vertex: (0, 1/√3)
                    vec2<f32>(-0.5, -0.288675),         // Bottom left: (-1/2, -1/(2√3))
                    vec2<f32>(0.5, -0.288675)           // Bottom right: (1/2, -1/(2√3))
                );
                
                // UV coordinates for triangle vertices
                var uvs = array<vec2f, 3>(
                    vec2<f32>(0.0, 0.577350),           // Top vertex: (0, 1/√3)
                    vec2<f32>(-0.5, -0.288675),         // Bottom left: (-1/2, -1/(2√3))
                    vec2<f32>(0.5, -0.288675)           // Bottom right: (1/2, -1/(2√3))
                );
            
                var output: VertexOutput;
                var localPos = vec3f(positions[vertexIndex], 0.0);
                // Calculate direction from instance position to camera position
                let cameraPos = -uniforms.translationMatrix[3].xyz;
                let toCamera = normalize(cameraPos - instancePosition);
                
                // Create rotation matrix to face camera
                let up = vec3f(0.0, 1.0, 0.0);
                let right = normalize(cross(up, toCamera));
                let adjustedUp = normalize(cross(toCamera, right));
                
                localPos = localPos * 1; // Scale manually as needed
                
                // Apply billboard rotation to local position
                localPos = right * localPos.x + adjustedUp * localPos.y + toCamera * localPos.z;
            
                // Apply translation
                var worldPos = localPos + instancePosition;
            
                // Apply view transform
                var viewPos = uniforms.translationMatrix * vec4f(worldPos, 1.0);
            
                // Apply rotation
                var rotatedPos = uniforms.rotationMatrix * viewPos;
            
                // Apply projection
                output.position = uniforms.projectionMatrix * rotatedPos;
                output.color = vec3f(1.0, 1.0, 1.0); // Base color
                output.uv = uvs[vertexIndex];
                output.worldPosition = worldPos; // Pass world position to fragment shader
                return output;
            }
            
            @fragment
            fn fragmentMain(
                @location(0) color: vec3f,
                @location(1) uv: vec2f,
                @location(2) worldPosition: vec3f
            ) -> @location(0) vec4f {
                // Calculate distance from center of triangle
                let center = vec2f(0.0, 0.0);
                let dist = distance(uv, center);
                
                // Create circle
                let radius = 0.288675; // Distance from center to edge of the triangle
                if (dist > radius) {
                    discard;
                }
            
                // Calculate normal for sphere shading in local space
                //NORMALS STILL NOT EXACTLY CORRECT
                let localNormal = normalize(vec3f(-uv.x, -uv.y, sqrt(max(0.0, 1.0 - dist * dist / (radius * radius))) * radius));
                
                // Transform normal to world space
                // Calculate world normal based on camera-to-object direction
                let toObject = normalize(worldPosition - (-uniforms.translationMatrix[3].xyz));
                let worldUp = vec3f(0.0, 1.0, 0.0);
                let worldRight = normalize(cross(worldUp, toObject));
                let worldAdjustedUp = normalize(cross(toObject, worldRight));
                
                // Transform local normal using the calculated basis vectors
                let worldNormal = normalize(
                    worldRight * localNormal.x + 
                    worldAdjustedUp * localNormal.y + 
                    toObject * localNormal.z
                );
                // let worldNormal = normalize((uniforms.rotationMatrix * vec4f(localNormal, 0.0)).xyz);
                
                // Light direction in world space
                let lightDir = normalize(uniforms.lightDirection.xyz);
                
                // Calculate diffuse lighting
                let diffuse = max(dot(worldNormal, lightDir), 0.0);
                
                // Add ambient light to avoid completely dark areas
                let ambient = 0.2;
                
                // Combine lighting with base color
                let litColor = color * (diffuse + ambient);
                
                return vec4f(litColor, 1.0);
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
        // WebGPU.device.queue.writeBuffer(this.uniformBuffer, 64, PlayerController.scaleMatrix);
        WebGPU.device.queue.writeBuffer(this.uniformBuffer, 64, PlayerController.rotationMatrix);
        WebGPU.device.queue.writeBuffer(this.uniformBuffer, 128, PlayerController.projectionMatrix);
        WebGPU.device.queue.writeBuffer(this.uniformBuffer, 192, this.lightDirection);

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
