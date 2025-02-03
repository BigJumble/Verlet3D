class GameObject
{
        numPoints:number;     // buffer of positions
        positionsBuffer: GPUBuffer | null;    
    
        // buffer of colors
        colorsBuffer: GPUBuffer | null;
    
        // 10 buffers of connection constraints
        connectionConstraintBuffers: GPUBuffer[] | null;    
        // current center position
        centerPosition: { x: number; y: number; z: number };
    
        // current min_xyz | bounding box min
        boundingBoxMin: { x: number; y: number; z: number };
    
        // current max_xyz | bounding box max
        boundingBoxMax: { x: number; y: number; z: number };
    
        // isactive bool | in the scene? / near player?
        isActive: boolean;
    
        constructor(){
            this.numPoints = 0;
            this.positionsBuffer = null;
            this.colorsBuffer = null;
            this.connectionConstraintBuffers = null;
            this.centerPosition = { x: 0, y: 0, z: 0 };
            this.boundingBoxMin = { x: 0, y: 0, z: 0 };
            this.boundingBoxMax = { x: 0, y: 0, z: 0 };
            this.isActive = false;
        }
    // buffer of positions
    // buffer of colors
    // 10 buffers of connection constraints

    // current center position
    // current min_xyz | bounding box min
    // current max_xyz | bounding box max

    // isactive bool | in the scene? / near player?
}


// "obtaining center and bounding edges":
// step 1: concatenate active positions using buffer to buffer copy.
// step 2: run parallel reduction compute shader.
// step 3: get positions back to objects.
// these steps make sure that position buffers don't leave gpu.