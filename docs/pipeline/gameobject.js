"use strict";
class GameObject {
    constructor() {
        this.numPoints = 0;
        this.positionsBuffer = null;
        this.colorsBuffer = null;
        this.connectionConstraintBuffers = null;
        this.centerPosition = { x: 0, y: 0, z: 0 };
        this.boundingBoxMin = { x: 0, y: 0, z: 0 };
        this.boundingBoxMax = { x: 0, y: 0, z: 0 };
        this.isActive = false;
    }
}
// "obtaining center and bounding edges":
// step 1: concatenate active positions using buffer to buffer copy.
// step 2: run parallel reduction compute shader.
// step 3: get positions back to objects.
// these steps make sure that position buffers don't leave gpu.
