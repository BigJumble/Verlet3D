import { WebGPU } from "../webgpu.js";
export class ExampleShader {
    static pipeline: GPURenderPipeline;
    static bindGroup: GPUBindGroup;

    static init(): void {
        // Create shader module
        const shaderModule = WebGPU.device.createShaderModule({
            label: "Example shader",
            code: /*wgsl*/`
                @vertex
                fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
                    var pos = array<vec2f, 3>(
                        vec2f( 0.0,  0.5),
                        vec2f(-0.5, -0.5),
                        vec2f( 0.5, -0.5)
                    );
                    return vec4f(pos[vertexIndex], 0.0, 1.0);
                }

                @fragment
                fn fragmentMain() -> @location(0) vec4f {
                    return vec4f(1.0, 0.0, 0.0, 1.0);
                }
            `
        });

        // Create render pipeline
        this.pipeline = WebGPU.device.createRenderPipeline({
            label: "Example pipeline",
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

        // Create bind group if needed
        // this.bindGroup = device.createBindGroup({
        //     label: "Example bind group",
        //     layout: this.pipeline.getBindGroupLayout(0),
        //     entries: []
        // });
    }

    static update(): void {
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

        renderPass.setPipeline(ExampleShader.pipeline);
        // renderPass.setBindGroup(0, ExampleShader.bindGroup);
        renderPass.draw(3);
        renderPass.end();

        WebGPU.device.queue.submit([commandEncoder.finish()]);
    }
}
