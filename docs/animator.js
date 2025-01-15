export class Animator {
    static startAnimation(renderCallback) {
        this.animationCallbacks.push(renderCallback);
        if (!this.animationFrameId) {
            const animate = () => {
                for (const callback of this.animationCallbacks) {
                    callback();
                }
                this.animationFrameId = requestAnimationFrame(animate);
            };
            animate();
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
