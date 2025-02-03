interface Model{
    
}
export default {
    points: new Float32Array([0,0,0, 1,0,0, 0,1,0, 1,1,0, 0,0,1, 1,0,1, 0,1,1, 1,1,1]),
    colorIds: new Int32Array([0,1,2,3,4,5,6,7]),
    connectionIDsBuffers: [ 
        new Int32Array([0,1, 2,3 ]),
        new Int32Array([0,1, 2,3 ]),
        new Int32Array([0,1, 2,3 ]),
        new Int32Array([0,1, 2,3 ]),
        new Int32Array([0,1, 2,3 ]),
        new Int32Array([0,1, 2,3 ]),
        new Int32Array([0,1, 2,3 ]),
        new Int32Array([0,1, 2,3 ]),
        new Int32Array([0,1, 2,3 ]),
        new Int32Array([0,1, 2,3 ])],

    connectionDistancesBuffers:[ 
        new Float32Array([1,1]),
        new Float32Array([1,1]),
        new Float32Array([1,1]),
        new Float32Array([1,1]),
        new Float32Array([1,1]),
        new Float32Array([1,1]),
        new Float32Array([1,1]),
        new Float32Array([1,1]),
        new Float32Array([1,1]),
        new Float32Array([1,1]),]
}
