import { WebGPU } from "../webgpu.js";
export class SpheresShader {
    static init() {
        // Create shader module
        const shaderModule = WebGPU.device.createShaderModule({
            label: "Spheres shader",
            code: /*wgsl*/ `
                struct VertexOutput {
                    @builtin(position) position: vec4f,
                    @location(0) uv: vec2f,
                }

                @vertex
                fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
                    // Create a fullscreen triangle
                    var pos = array<vec2f, 3>(
                        vec2f(-1.0, -1.0),
                        vec2f( 3.0, -1.0),
                        vec2f(-1.0,  3.0)
                    );

                    var uv = array<vec2f, 3>(
                        vec2f(0.0, 0.0),
                        vec2f(2.0, 0.0),
                        vec2f(0.0, 2.0)
                    );

                    var output: VertexOutput;
                    output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
                    output.uv = uv[vertexIndex];
                    return output;
                }

                @fragment
                fn fragmentMain(@location(0) uv: vec2f) -> @location(0) vec4f {
                    // Normalize UV coordinates to [-1, 1]
                    let p = uv * 2.0 - 1.0;
                    
                    // Ray origin and direction for ray-sphere intersection
                    let ro = vec3f(0.0, 0.0, -2.0);
                    let rd = normalize(vec3f(p, 1.0));
                    
                    // Sphere parameters
                    let sphereCenter = vec3f(0.0, 0.0, 0.0);
                    let sphereRadius = 1.0;
                    
                    // Ray-sphere intersection
                    let oc = ro - sphereCenter;
                    let b = dot(rd, oc);
                    let c = dot(oc, oc) - sphereRadius * sphereRadius;
                    let h = b * b - c;
                    
                    if (h < 0.0) {
                        // No intersection
                        return vec4f(0.0, 0.0, 0.0, 1.0);
                    }
                    
                    // Calculate intersection point and normal
                    let t = -b - sqrt(h);
                    let pos = ro + t * rd;
                    let normal = normalize(pos - sphereCenter);
                    
                    // Simple lighting
                    let lightDir = normalize(vec3f(1.0, 1.0, -1.0));
                    let diffuse = max(dot(normal, lightDir), 0.0);
                    
                    return vec4f(vec3f(diffuse), 1.0);
                }
            `
        });
        // Create render pipeline
        this.pipeline = WebGPU.device.createRenderPipeline({
            label: "Spheres pipeline",
            layout: "auto",
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
            }
        });
    }
    static update() {
        const commandEncoder = WebGPU.device.createCommandEncoder();
        const view = WebGPU.context.getCurrentTexture().createView();
        const renderPass = commandEncoder.beginRenderPass({
            colorAttachments: [{
                    view: view,
                    clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                    loadOp: "clear",
                    storeOp: "store"
                }]
        });
        renderPass.setPipeline(this.pipeline);
        renderPass.draw(3); // Draw fullscreen triangle
        renderPass.end();
        WebGPU.device.queue.submit([commandEncoder.finish()]);
    }
}
