import { WebGPU } from "../webgpu.js";
import { PlayerController } from "../playerController.js";
import { MatrixUtils } from "../matrix.js";
import { Controls } from "../controls.js";
export class CameraShader {
    static init() {
        // Create instance buffer with random positions
        const instanceData = new Float32Array(this.NUM_INSTANCES * 3); // xyz for each instance
        for (let i = 0; i < this.NUM_INSTANCES; i++) {
            instanceData[i * 3] = (Math.random() - 0.5) * 3000; // x
            instanceData[i * 3 + 1] = (Math.random() - 0.5) * 2; // y
            instanceData[i * 3 + 2] = (Math.random() - 0.5) * 3000; // z
        }
        // Create color index buffer with random indices
        const colorIndexData = new Uint32Array(this.NUM_INSTANCES);
        for (let i = 0; i < this.NUM_INSTANCES; i++) {
            colorIndexData[i] = i % 6; //Math.floor(Math.random() * 6); // 6 different colors
        }
        this.instanceBuffer = WebGPU.device.createBuffer({
            size: instanceData.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_SRC,
            mappedAtCreation: true
        });
        new Float32Array(this.instanceBuffer.getMappedRange()).set(instanceData);
        this.instanceBuffer.unmap();
        this.stagingBuffer = WebGPU.device.createBuffer({
            size: instanceData.byteLength,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });
        this.colorIndexBuffer = WebGPU.device.createBuffer({
            size: colorIndexData.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Uint32Array(this.colorIndexBuffer.getMappedRange()).set(colorIndexData);
        this.colorIndexBuffer.unmap();
        this.uniformBuffer = WebGPU.device.createBuffer({
            size: (4 * 4 * 3 + 4) * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        // Create compute uniform buffer
        this.computeUniformBuffer = WebGPU.device.createBuffer({
            size: 4, // 3 floats: time, amplitude, frequency
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
            code: /*wgsl*/ `
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
                @location(2) @interpolate(flat) right: vec3f,
                @location(3) @interpolate(flat) adjustedUp: vec3f,
                @location(4) @interpolate(flat) toCamera: vec3f,
                @location(5) @interpolate(flat) worldPos: vec3f,
                @location(6) @interpolate(flat) transformedCenter: vec3f
            }
            
            const colorPalette = array<vec3f, 6>(
                vec3f(1.0, 0.2, 0.2),  // Vibrant Red
                vec3f(0.2, 1.0, 0.2),  // Vibrant Green
                vec3f(0.2, 0.2, 1.0),  // Vibrant Blue
                vec3f(1.0, 1.0, 0.2),  // Vibrant Yellow
                vec3f(1.0, 0.2, 1.0),  // Vibrant Magenta
                vec3f(0.2, 1.0, 1.0)   // Vibrant Cyan
            );

            struct FragmentOutput {
                @location(0) color: vec4f,
                @builtin(frag_depth) depth: f32
            }
            
            @vertex
            fn vertexMain(
                @builtin(vertex_index) vertexIndex: u32,
                @builtin(instance_index) instanceIndex: u32,
                @location(0) instancePosition: vec3f,
                @location(1) colorIndex: u32
            ) -> VertexOutput {
                const positions = array<vec2f, 3>(
                    vec2<f32>(0.0,   0.5773502691896258),           // Top vertex: (0, 1/√3)
                    vec2<f32>(-0.5, -0.2886751345948129),         // Bottom left: (-1/2, -1/(2√3))
                    vec2<f32>(0.5,  -0.2886751345948129)           // Bottom right: (1/2, -1/(2√3))
                );
                
                // UV coordinates for triangle vertices
                const uvs = array<vec2f, 3>(
                    vec2<f32>(0.0,   0.5773502691896258),           // Top vertex: (0, 1/√3)
                    vec2<f32>(-0.5, -0.2886751345948129),         // Bottom left: (-1/2, -1/(2√3))
                    vec2<f32>(0.5,  -0.2886751345948129)           // Bottom right: (1/2, -1/(2√3))
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
                
                localPos = localPos * 3.464101615137754 * 0.5; // Scale manually as needed
                
                // Apply billboard rotation to local position
                localPos = right * localPos.x + adjustedUp * localPos.y + toCamera * localPos.z;
            
                // Apply translation
                var worldPos = localPos + instancePosition;
            
                // Apply view transform
                var viewPos = uniforms.translationMatrix * vec4f(worldPos, 1.0);
            
                // Apply rotation
                var rotatedPos = uniforms.rotationMatrix * viewPos;
            
                let pos = uniforms.projectionMatrix * rotatedPos;
                output.transformedCenter = (uniforms.projectionMatrix *
                                            uniforms.rotationMatrix *
                                            uniforms.translationMatrix * 
                                            vec4f(instancePosition, 1.0)).xyz;
                // Apply projection
                output.position = pos;
                output.color = colorPalette[colorIndex]; // Use color from palette
                output.uv = uvs[vertexIndex];
                
                // Pass billboard basis vectors to fragment shader
                output.right = right;
                output.adjustedUp = adjustedUp;
                output.toCamera = toCamera;
                output.worldPos = worldPos;
                // output.fragmentPos = pos.xyz;
                return output;
            }
            
            @fragment
            fn fragmentMain(
                @location(0) @interpolate(flat) color: vec3f,
                @location(1) uv: vec2f,
                @location(2) @interpolate(flat) right: vec3f,
                @location(3) @interpolate(flat) adjustedUp: vec3f,
                @location(4) @interpolate(flat) toCamera: vec3f,
                @location(5) @interpolate(flat) worldPos: vec3f,
                @location(6) @interpolate(flat) transformedCenter: vec3f 
            ) -> FragmentOutput {
                // Calculate distance from center of triangle
                const center = vec2f(0.0, 0.0);
                let dist = distance(uv, center);
                
                // Create circle mask
                const radius = 0.2886751345948129; // Distance from center to edge of the triangle
                if (dist > radius) {
                    discard;
                }
                const inverseRadius = 3.464101615137754; // 1.0 / radius
                
                // Calculate local normal for sphere shading
                let localz = sqrt(1.0 - dist * dist * inverseRadius * inverseRadius);
                let localNormal = vec3f(uv.x * inverseRadius, uv.y * inverseRadius, localz);
                
                // Transform local normal to world space
                let worldNormal =
                    right * localNormal.x + 
                    adjustedUp * localNormal.y + 
                    toCamera * localNormal.z;

                // Light direction in world space
                let lightDir = normalize(uniforms.lightDirection.xyz);
                let diffuse = max(dot(worldNormal, -lightDir), 0.0);
                let ambient = 0.2;
                let litColor = color * (diffuse + ambient);

                // Correct depth calculation
                let sphereOffset = localz * 3.464101615137754 * 0.25; // Offset from the sphere center in world units
                let actualZ = transformedCenter.z - sphereOffset; // Adjust depth based on sphere surface position
                
                // Normalize depth to clip space (0-1) using near/far planes
                const near = 0.1;
                const far = 3000.0;
                let depth = (actualZ - near) / (far - near);

                return FragmentOutput(
                    vec4f(litColor, 1.0),
                    depth
                );
            }

                `
        });
        // Create compute shader for bobbing animation
        const computeShaderCode = /*wgsl*/ `
            struct Uniforms {
                time: f32,
            }
        
            @group(0) @binding(0) var<uniform> uniforms: Uniforms;
            @group(0) @binding(1) var<storage, read_write> positions: array<f32>;
        
            @compute @workgroup_size(256)
            fn computeMain(@builtin(global_invocation_id) global_id: vec3<u32>) {
                let sphereID = u32(global_id.x);
                if (global_id.x >= arrayLength(&positions)) {
                    return;
                }

                // var pos = positions[index];
                // Apply sinusoidal bobbing motion
                // pos.x = 0;
                // pos.y = f32(id.x); //sin(uniforms.time);   
                // pos.z = 0;
                // positions[sphereID*3] = f32(0);
                positions[sphereID*3+1] = 6* f32(sin(uniforms.time+f32(sphereID%100)/0.127));
                // positions[sphereID*3+2] = f32(0) ;
            }
        `;
        // Create compute pipeline
        const computeModule = WebGPU.device.createShaderModule({
            label: "Bobbing compute shader",
            code: computeShaderCode
        });
        this.computePipeline = WebGPU.device.createComputePipeline({
            label: "Bobbing compute pipeline",
            layout: WebGPU.device.createPipelineLayout({
                bindGroupLayouts: [
                    WebGPU.device.createBindGroupLayout({
                        entries: [
                            {
                                binding: 0,
                                visibility: GPUShaderStage.COMPUTE,
                                buffer: { type: "uniform" }
                            },
                            {
                                binding: 1,
                                visibility: GPUShaderStage.COMPUTE,
                                buffer: { type: "storage" }
                            }
                        ]
                    })
                ]
            }),
            compute: {
                module: computeModule,
                entryPoint: "computeMain"
            }
        });
        // Create compute bind group
        this.computeBindGroup = WebGPU.device.createBindGroup({
            layout: this.computePipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.computeUniformBuffer }
                },
                {
                    binding: 1,
                    resource: { buffer: this.instanceBuffer }
                }
            ]
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
    static resize() {
        // console.log('a');
        if (this.depthTexture) {
            this.depthTexture.destroy();
        }
        this.depthTexture = WebGPU.device.createTexture({
            size: [WebGPU.canvas.width, WebGPU.canvas.height],
            format: "depth24plus",
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
    }
    static async update() {
        WebGPU.device.queue.writeBuffer(this.uniformBuffer, 0, PlayerController.translationMatrix);
        // WebGPU.device.queue.writeBuffer(this.uniformBuffer, 64, PlayerController.scaleMatrix);
        WebGPU.device.queue.writeBuffer(this.uniformBuffer, 64, PlayerController.rotationMatrix);
        WebGPU.device.queue.writeBuffer(this.uniformBuffer, 128, PlayerController.projectionMatrix);
        WebGPU.device.queue.writeBuffer(this.uniformBuffer, 192, this.lightDirection);
        WebGPU.device.queue.writeBuffer(this.computeUniformBuffer, 0, new Float32Array([
            performance.now() / 1000,
        ]));
        const commandEncoder = WebGPU.device.createCommandEncoder();
        // Compute pass
        const computePass = commandEncoder.beginComputePass();
        computePass.setPipeline(this.computePipeline);
        computePass.setBindGroup(0, this.computeBindGroup);
        computePass.dispatchWorkgroups(Math.ceil(this.NUM_INSTANCES / 256));
        computePass.end();
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
        renderPass.setVertexBuffer(1, this.colorIndexBuffer);
        // Draw all triangles of the icosahedron for each instance
        renderPass.draw(3, this.NUM_INSTANCES, 0, 0); // 20 triangles * 3 vertices = 60 vertices
        renderPass.end();
        if (Controls.getKeyDown("KeyF")) {
            // Map the staging buffer and read the data
            commandEncoder.copyBufferToBuffer(this.instanceBuffer, // source buffer
            0, // source offset
            this.stagingBuffer, // destination buffer
            0, // destination offset
            this.NUM_INSTANCES * 3 * 4 // size to copy
            );
            WebGPU.device.queue.submit([commandEncoder.finish()]);
            await this.stagingBuffer.mapAsync(GPUMapMode.READ);
            const copyArrayBuffer = this.stagingBuffer.getMappedRange();
            const data = new Float32Array(copyArrayBuffer);
            // Use the data as needed
            console.log(data);
        }
        else {
            WebGPU.device.queue.submit([commandEncoder.finish()]);
        }
    } // Add cleanup method
    static cleanup() {
        this.depthTexture.destroy();
        this.uniformBuffer.destroy();
        this.instanceBuffer.destroy();
        this.colorIndexBuffer.destroy();
    }
}
CameraShader.lightDirection = MatrixUtils.normalize(new Float32Array([0.0, -1.0, 0.5])); // Light direction in world space
CameraShader.NUM_INSTANCES = 11000000;
