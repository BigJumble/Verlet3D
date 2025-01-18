export class MatrixUtils {
    // Creates an identity matrix
    static identity(): Float32Array {
        return new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    }

    // Multiplies two 4x4 matrices
    static multiply(a: Float32Array, b: Float32Array): Float32Array {
        const result = new Float32Array(16);
        
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                for (let i = 0; i < 4; i++) {
                    result[row * 4 + col] += 
                        a[row * 4 + i] * b[i * 4 + col];
                }
            }
        }
        
        return result;
    }

    // Creates a translation matrix
    static translation(tx: number, ty: number, tz: number): Float32Array {
        return new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            tx, ty, tz, 1
        ]);
    }

    // Creates a scale matrix
    static scale(sx: number, sy: number, sz: number): Float32Array {
        return new Float32Array([
            sx, 0, 0, 0,
            0, sy, 0, 0,
            0, 0, sz, 0,
            0, 0, 0, 1
        ]);
    }

    // Creates a rotation matrix around X axis (angle in radians)
    static rotationX(angle: number): Float32Array {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        return new Float32Array([
            1, 0, 0, 0,
            0, c, s, 0,
            0, -s, c, 0,
            0, 0, 0, 1
        ]);
    }

    // Creates a rotation matrix around Y axis (angle in radians)
    static rotationY(angle: number): Float32Array {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        return new Float32Array([
            c, 0, -s, 0,
            0, 1, 0, 0,
            s, 0, c, 0,
            0, 0, 0, 1
        ]);
    }

    // Creates a rotation matrix around Z axis (angle in radians)
    static rotationZ(angle: number): Float32Array {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        return new Float32Array([
            c, s, 0, 0,
            -s, c, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    }

    // Creates a perspective projection matrix
    static perspective(fovY: number, aspect: number, near: number, far: number): Float32Array {
        const f = 1.0 / Math.tan(fovY / 2);
        const rangeInv = 1 / (near - far);

        return new Float32Array([
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (near + far) * rangeInv, -1,
            0, 0, near * far * rangeInv * 2, 0
        ]);
    }

    // // Creates a look-at view matrix
    // static lookAt(eye: [number, number, number], 
    //              target: [number, number, number], 
    //              up: [number, number, number] = [0, 1, 0]): Float32Array {
    //     const zAxis = normalize(subtractVectors(eye, target));
    //     const xAxis = normalize(cross(up, zAxis));
    //     const yAxis = cross(zAxis, xAxis);

    //     return new Float32Array([
    //         xAxis[0], xAxis[1], xAxis[2], 0,
    //         yAxis[0], yAxis[1], yAxis[2], 0,
    //         zAxis[0], zAxis[1], zAxis[2], 0,
    //         eye[0], eye[1], eye[2], 1
    //     ]);
    // }

    // Transpose a 4x4 matrix
    static transpose(m: Float32Array): Float32Array {
        return new Float32Array([
            m[0], m[4], m[8], m[12],
            m[1], m[5], m[9], m[13],
            m[2], m[6], m[10], m[14],
            m[3], m[7], m[11], m[15]
        ]);
    }

    // Log matrix as a 2D grid
    static log(matrix: Float32Array, label: string = 'Matrix'): void {
        console.log(`\n${label}:`);
        for (let row = 0; row < 4; row++) {
            let rowStr = '|';
            for (let col = 0; col < 4; col++) {
                // Format each number to fixed 6 decimal places and pad for alignment
                const value = matrix[row + col * 4].toFixed(6).padStart(10);
                rowStr += ` ${value}`;
            }
            rowStr += ' |';
            console.log(rowStr);
        }
        console.log('');
    }
}

// Helper functions for vector operations
function subtractVectors(a: number[], b: number[]): Float32Array {
    return new Float32Array([a[0] - b[0], a[1] - b[1], a[2] - b[2]]);
}

function normalize(v: number[]): Float32Array {
    const length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    if (length > 0.00001) {
        return new Float32Array([v[0] / length, v[1] / length, v[2] / length]);
    }
    return new Float32Array([0, 0, 0]);
}

function cross(a: number[], b: number[]): Float32Array {
    return new Float32Array([
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    ]);
}