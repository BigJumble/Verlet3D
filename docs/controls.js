export class Controls {
    static init() {
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
    static clearUpdate() {
        // Clear the frame-specific input states
        Controls.keysPressedThisFrame.clear();
        Controls.keysReleasedThisFrame.clear();
        Controls.mouseDelta.x = 0;
        Controls.mouseDelta.y = 0;
    }
    static getMousePosition() {
        return { ...this.mousePosition };
    }
    // Unity-like input methods
    static getKeyDown(key) {
        return Controls.keysPressedThisFrame.has(key);
    }
    static getKeyUp(key) {
        return Controls.keysReleasedThisFrame.has(key);
    }
    static getKey(key) {
        return Controls.pressedKeys.has(key);
    }
}
Controls.pressedKeys = new Set();
Controls.keysPressedThisFrame = new Set();
Controls.keysReleasedThisFrame = new Set();
Controls.mousePosition = { x: 0, y: 0 };
Controls.mouseDelta = { x: 0, y: 0 };
