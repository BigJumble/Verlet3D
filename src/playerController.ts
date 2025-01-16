import { WebGPU } from "./webgpu.js";
import { Controls } from "./controls.js";

export class PlayerController {
    static viewMatrix = new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0, 
        0, 0, 1, 0,
        0, 0, -5, 1
    ]);

    static projectionMatrix = new Float32Array(16);

    // Scene rotation angles
    static yaw = 0;
    static pitch = 0;
    static position = new Float32Array([0, 0, 150]); // Scene offset x, y, z

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
        const far = 1000.0;
        const f = 1.0 / Math.tan(fov / 2);
        
        this.projectionMatrix.set([
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (far + near) / (near - far), -1,
            0, 0, (2 * far * near) / (near - far), 0
        ]);
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
        const moveSpeed = 10 * deltaTime;
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

        // Calculate rotation values
        const cosY = Math.cos(this.yaw);
        const sinY = Math.sin(this.yaw);
        const cosP = Math.cos(this.pitch);
        const sinP = Math.sin(this.pitch);

        // Set rotation part of view matrix
        // right vector
        this.viewMatrix[0] = cosY;
        this.viewMatrix[1] = sinY * sinP;
        this.viewMatrix[2] = -sinY * cosP;

        // up vector (keep world up vector consistent)
        this.viewMatrix[4] = 0;
        this.viewMatrix[5] = cosP;
        this.viewMatrix[6] = sinP;

        // forward vector
        this.viewMatrix[8] = sinY;
        this.viewMatrix[9] = -cosY * sinP;
        this.viewMatrix[10] = cosY * cosP;

        // Translation (negative position because view matrix is inverse of camera transform)
        this.viewMatrix[12] = -(this.position[0] * this.viewMatrix[0] + this.position[1] * this.viewMatrix[4] + this.position[2] * this.viewMatrix[8]);
        this.viewMatrix[13] = -(this.position[0] * this.viewMatrix[1] + this.position[1] * this.viewMatrix[5] + this.position[2] * this.viewMatrix[9]);
        this.viewMatrix[14] = -(this.position[0] * this.viewMatrix[2] + this.position[1] * this.viewMatrix[6] + this.position[2] * this.viewMatrix[10]);
    }
}
