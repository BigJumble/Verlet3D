import { SharedData } from "../shaderData";
import { WebGPU } from "../../webgpu";
import { PlayerController } from "../../playerController";

export class RenderSpheres {
    static pipeline: GPURenderPipeline;
    static bindGroup: GPUBindGroup;
    static bindGroupLayout: GPUBindGroupLayout;
    static uniformBuffer: GPUBuffer;

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
        
        // this.resize();
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
    @location(2) @interpolate(flat) right: vec3f,
    @location(3) @interpolate(flat) adjustedUp: vec3f,
    @location(4) @interpolate(flat) toCamera: vec3f,
    @location(5) @interpolate(flat) worldPos: vec3f,
    @location(6) @interpolate(flat) transformedCenter: vec3f
}

const colorPalette = array<vec3f, 16>(
    vec3f(1.0, 1.0, 1.0),  // White
    vec3f(0.0, 1.0, 0.0),  // Vibrant Green
    vec3f(0.0, 0.0, 1.0),  // Vibrant Blue
    vec3f(1.0, 1.0, 0.0),  // Vibrant Yellow
    vec3f(1.0, 0.5, 0.0),  // Orange
    vec3f(0.2, 1.0, 1.0),  // Cyan
    vec3f(1.0, 0.0, 1.0),  // Magenta
    vec3f(0.8, 0.8, 0.8),  // Light Gray
    vec3f(0.5, 0.5, 0.5),  // Medium Gray
    vec3f(0.3, 0.3, 0.3),  // Dark Gray
    vec3f(1.0, 0.0, 0.0),  // Bright Red
    vec3f(0.8, 0.0, 0.0),  // Medium Red
    vec3f(0.6, 0.0, 0.0),  // Dark Red
    vec3f(0.4, 0.0, 0.0),  // Darker Red
    vec3f(0.2, 0.0, 0.0),  // Very Dark Red
    vec3f(0.0, 0.0, 0.0)   // Black
);                    struct FragmentOutput {
    @location(0) color: vec4f,
    // @builtin(frag_depth) depth: f32
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
        // depth
    );
}`
        });

    }


    static tick( renderPass:GPURenderPassEncoder) {
        WebGPU.device.queue.writeBuffer(this.uniformBuffer, 0, new Float32Array(PlayerController.translationMatrix.values()));
        WebGPU.device.queue.writeBuffer(this.uniformBuffer, 64, new Float32Array(PlayerController.rotationMatrix.values()));
        WebGPU.device.queue.writeBuffer(this.uniformBuffer, 128, new Float32Array(PlayerController.projectionMatrix.values()));
        WebGPU.device.queue.writeBuffer(this.uniformBuffer, 192, new Float32Array(SharedData.lightDirection.values()));


        renderPass.setPipeline(this.pipeline);
        renderPass.setBindGroup(0, this.bindGroup);
        renderPass.setVertexBuffer(0, SharedData.spheresBuffer);
        renderPass.setVertexBuffer(1, SharedData.colorIndexBuffer);

        renderPass.draw(3, SharedData.NUM_SPHERES, 0, 0); 
        // renderPass.end();


    }
}