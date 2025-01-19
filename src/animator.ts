export class Animator {
    static animationFrameId: number;
    static animationCallbacks: ((deltaTime: number) => void)[] = [];
    static lastTimestamp: number = 0;
    static fpsCounter = document.getElementById('fps-counter');
    static frameCount: number = 0;
    static totalFps: number = 0;
    
    static startAnimation(renderCallback: (deltaTime: number) => void) {
        this.animationCallbacks.push(renderCallback);
        
        if (!this.animationFrameId) {
            
            const animate = (timestamp: number) => {
                const deltaTime = (timestamp - this.lastTimestamp) / 1000; // Convert to seconds
                this.lastTimestamp = timestamp;

                // Calculate FPS and add to total
                const fps = 1 / deltaTime;
                this.totalFps += fps;
                this.frameCount++;

                // Calculate average FPS every 10 frames
                if (this.frameCount >= 10) {
                    const avgFps = this.totalFps / 10;
                    if (this.fpsCounter) {
                        this.fpsCounter.textContent = `FPS: ${Math.round(avgFps)}`;
                    }
                    this.frameCount = 0;
                    this.totalFps = 0;
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

    static stopAnimation(renderCallback: (deltaTime: number) => void) {
        if (this.animationFrameId) {
            const index = this.animationCallbacks.indexOf(renderCallback);
            if (index > -1) {
                this.animationCallbacks.splice(index, 1);
            }

            if (this.animationCallbacks.length === 0) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = 0;
                this.frameCount = 0;
                this.totalFps = 0;
            }
        }
    }
}
