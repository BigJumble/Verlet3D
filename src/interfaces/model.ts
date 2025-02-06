export interface Model {
    points: number[][], // [point][xyz]
    colorIDs: number[], // [point's color id]
    connectionIDsBuffers: number[][][], // [buffer][point pair ids][id 1,id 2]
    connectionDistancesBuffers: number[][] // [buffer][point pair distance]
}