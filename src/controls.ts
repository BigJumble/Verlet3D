export class Controls {
    static pressedKeys: Set<string> = new Set();
    static keysPressedThisFrame: Set<string> = new Set();
    static keysReleasedThisFrame: Set<string> = new Set();
    static mousePosition: { x: number, y: number } = { x: 0, y: 0 };
    static mouseDelta: { x: number, y: number } = { x: 0, y: 0 };

    static init(): void {
        // Keyboard events
        window.addEventListener('keydown', (event) => {
            if (!Controls.pressedKeys.has(event.code)) {
                Controls.keysPressedThisFrame.add(event.code);
            }
            Controls.pressedKeys.add(event.code);
        });

        window.addEventListener('keyup', (event) => {
            Controls.pressedKeys.delete(event.code);
            Controls.keysReleasedThisFrame.add(event.code);
        });

        // Mouse events
        window.addEventListener('mousemove', (event) => {
            Controls.mouseDelta.x = event.movementX;
            Controls.mouseDelta.y = event.movementY;
            Controls.mousePosition.x = event.clientX;
            Controls.mousePosition.y = event.clientY;
        });

        
        window.addEventListener('mousedown', (event) => {
            const mouseKey = `Mouse${event.button}`;
            if (!Controls.pressedKeys.has(mouseKey)) {
                Controls.keysPressedThisFrame.add(mouseKey);
            }
            Controls.pressedKeys.add(mouseKey);
        });


        window.addEventListener('mouseup', (event) => {
            const mouseKey = `Mouse${event.button}`;
            Controls.pressedKeys.delete(mouseKey);
            Controls.keysReleasedThisFrame.add(mouseKey);
        });
    }

    static clearUpdate(): void {
        // Clear the frame-specific input states
        Controls.keysPressedThisFrame.clear();
        Controls.keysReleasedThisFrame.clear();
        Controls.mouseDelta.x = 0;
        Controls.mouseDelta.y = 0;
    }



    static getMousePosition(): { x: number, y: number } {
        return { ...this.mousePosition };
    }

    // Unity-like input methods
    static getKeyDown(key: string): boolean {
        return Controls.keysPressedThisFrame.has(key);
    }

    static getKeyUp(key: string): boolean {
        return Controls.keysReleasedThisFrame.has(key);
    }

    static getKey(key: string): boolean {
        return Controls.pressedKeys.has(key);
    }
}
