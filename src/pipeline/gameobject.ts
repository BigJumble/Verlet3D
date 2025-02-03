class GameObject
{
    // buffer of positions
    // buffer of colors
    // 6 buffers of connection constraints

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