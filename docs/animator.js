export class Animator {
    static startAnimation(renderCallback) {
        this.animationCallbacks.push(renderCallback);
        if (!this.animationFrameId) {
            const animate = (timestamp) => {
                const deltaTime = (timestamp - this.lastTimestamp) / 1000; // Convert to seconds
                this.lastTimestamp = timestamp;
                // Calculate FPS
                const fps = 1 / deltaTime;
                const fpsCounter = document.getElementById('fps-counter');
                if (fpsCounter) {
                    fpsCounter.textContent = `FPS: ${Math.round(fps)}`;
                }
                for (const callback of this.animationCallbacks) {
                    callback(deltaTime);
                }
                this.animationFrameId = requestAnimationFrame(animate);
            };
            this.lastTimestamp = performance.now();
            animate(this.lastTimestamp);
        }
    }
    static stopAnimation(renderCallback) {
        if (this.animationFrameId) {
            const index = this.animationCallbacks.indexOf(renderCallback);
            if (index > -1) {
                this.animationCallbacks.splice(index, 1);
            }
            if (this.animationCallbacks.length === 0) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = 0;
            }
        }
    }
}
Animator.animationCallbacks = [];
Animator.lastTimestamp = 0;
