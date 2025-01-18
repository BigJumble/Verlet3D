import { WebGPU } from "./webgpu.js";
import { Controls } from "./controls.js";
import { MatrixUtils } from "./matrix.js";

export class PlayerController {
    static translationMatrix = MatrixUtils.identity();
    static rotationMatrix = MatrixUtils.identity();
    // static scaleMatrix = MatrixUtils.identity();
    static projectionMatrix = new Float32Array(16);
    // Scene rotation angles
    static yaw = 0;
    static pitch = 0;
    static position = new Float32Array([0, 0, 0]); // Scene offset x, y, z

    static lastMouseX = 0;
    static lastMouseY = 0;

    static init(): void {
        // Set initial mouse position
        this.lastMouseX = Controls.mousePosition.x;
        this.lastMouseY = Controls.mousePosition.y;

        // Update projection matrix initially
        this.updateProjectionMatrix();
    }

    static updateProjectionMatrix(): void {
        const aspect = WebGPU.canvas.width / WebGPU.canvas.height;
        const fov = Math.PI / 4;
        const near = 0.1;
        const far = 3000.0;
        
        this.projectionMatrix = MatrixUtils.perspective(fov, aspect, near, far);
    }

    static update(deltaTime: number): void {
        // Handle mouse movement for rotation
        const mouseSensitivity = 0.002;
        
        if (document.pointerLockElement) {
            this.yaw += Controls.mouseDelta.x * mouseSensitivity;
            this.pitch += Controls.mouseDelta.y * mouseSensitivity;
            
            // Clamp pitch to prevent scene flipping
            this.pitch = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, this.pitch));
        }

        // Calculate movement direction in world space
        const moveSpeed = 50 * deltaTime;
        // Update position based on key input and rotation
        if (Controls.getKey('KeyW')) {
            this.position[0] -= moveSpeed * Math.sin(-this.yaw);
            this.position[2] -= moveSpeed * Math.cos(-this.yaw);
        }
        if (Controls.getKey('KeyS')) {
            this.position[0] += moveSpeed * Math.sin(-this.yaw);
            this.position[2] += moveSpeed * Math.cos(-this.yaw);
        }
        if (Controls.getKey('KeyA')) {
            this.position[0] -= moveSpeed * Math.cos(-this.yaw);
            this.position[2] += moveSpeed * Math.sin(-this.yaw);
        }
        if (Controls.getKey('KeyD')) {
            this.position[0] += moveSpeed * Math.cos(-this.yaw);
            this.position[2] -= moveSpeed * Math.sin(-this.yaw);
        }
        if (Controls.getKey('Space')) {
            this.position[1] += moveSpeed; // Up
        }
        if (Controls.getKey('ShiftLeft')) {
            this.position[1] -= moveSpeed; // Down
        }
        if (Controls.getKeyDown('Mouse0')) {
            document.body.requestPointerLock();
        }
        if (Controls.getKeyDown('Escape')) {
            document.exitPointerLock();
        }

        // Create rotation matrices
        const rotationX = MatrixUtils.rotationX(this.pitch);
        const rotationY = MatrixUtils.rotationY(this.yaw);
        this.translationMatrix = MatrixUtils.translation(-this.position[0], -this.position[1], -this.position[2]);

        // Combine rotations and translation
        // this.viewMatrix = MatrixUtils.multiply(this.viewMatrix, translation);
        this.rotationMatrix = MatrixUtils.multiply(rotationY, rotationX);
        // this.scaleMatrix = MatrixUtils.scale(30, 30, 30);
        //  = MatrixUtils.multiply(this.rotationMatrix, translation);
        // this.translationMatrix = MatrixUtils.multiply( this.translationMatrix, this.rotationMatrix);
    }
}
