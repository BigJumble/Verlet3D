import { WebGPU } from "./webgpu";
import { Controls } from "./controls";
import { mat4, vec3 } from 'gl-matrix';

export enum GravityMode {
    None = 0,
    Center = 1,
    Shell = 2,
    Donut = 3
}

export class PlayerController {
    static translationMatrix = mat4.create();
    static rotationMatrix = mat4.create();
    static projectionMatrix = mat4.create();
    // static scaleMatrix = MatrixUtils.identity();
    
    // Scene rotation angles
    static yaw = 0;
    static pitch = 0;
    static position = vec3.fromValues(0, 0, 200); // Scene offset x, y, z

    static lastMouseX = 0;
    static lastMouseY = 0;
    static paused = false;

    static viewMatrix = mat4.create();

    static gravityMode: GravityMode = GravityMode.Center;

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

        mat4.perspective(this.projectionMatrix, fov, aspect, near, far);
    }

    static update(deltaTime: number): void {
        // Handle mouse movement for rotation
        const mouseSensitivity = 0.002;

        if (document.pointerLockElement) {
            this.yaw += Controls.mouseDelta.x * mouseSensitivity;
            this.pitch += Controls.mouseDelta.y * mouseSensitivity;

            // Clamp pitch to prevent scene flipping
            this.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.pitch));
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
            // console.log(Controls.pressedKeys);
        }
        if (Controls.getKey('ShiftLeft')) {
            this.position[1] -= moveSpeed; // Down
        }
        if (Controls.getKeyDown('Mouse0')) {
            document.body.requestPointerLock();
            this.paused = false;
        }
        if (Controls.getKeyDown('KeyP')) {
            this.paused = true;
            document.exitPointerLock();
        }
        if (Controls.getKeyDown("Digit1")) {
            this.gravityMode = GravityMode.None;
        }
        if (Controls.getKeyDown("Digit2")) {
            this.gravityMode = GravityMode.Center;
        }
        if (Controls.getKeyDown("Digit3")) {
            this.gravityMode = GravityMode.Shell;
        }
        if (Controls.getKeyDown("Digit4")) {
            this.gravityMode = GravityMode.Donut;
        }

        // Create rotation matrices
        mat4.identity(this.rotationMatrix);
        mat4.rotateX(this.rotationMatrix, this.rotationMatrix, this.pitch);
        mat4.rotateY(this.rotationMatrix, this.rotationMatrix, this.yaw);
        
        mat4.identity(this.translationMatrix);
        mat4.translate(this.translationMatrix, this.translationMatrix, vec3.fromValues(-this.position[0], -this.position[1], -this.position[2]));

        // Combine rotations and translation
        mat4.identity(this.viewMatrix);
        mat4.multiply(this.viewMatrix, this.translationMatrix, this.rotationMatrix);
        mat4.multiply(this.viewMatrix, this.viewMatrix, this.projectionMatrix);
    }
}
