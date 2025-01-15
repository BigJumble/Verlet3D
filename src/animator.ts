export class Animator {
    static animationFrameId: number;
    static animationCallbacks: ((deltaTime: number) => void)[] = [];
    static lastTimestamp: number = 0;

    static startAnimation(renderCallback: (deltaTime: number) => void) {
        this.animationCallbacks.push(renderCallback);
        
        if (!this.animationFrameId) {
            
            const animate = (timestamp: number) => {
                const deltaTime = (timestamp - this.lastTimestamp) / 1000; // Convert to seconds
                this.lastTimestamp = timestamp;

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
            }
        }
    }
}
