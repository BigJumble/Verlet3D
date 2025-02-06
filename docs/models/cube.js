export const cube = {
    points: [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]],
    colorIDs: [0, 1, 2, 3, 4, 5, 6, 7],
    connectionIDsBuffers: [
        [[0, 4], [1, 5], [2, 6], [3, 7]],
        [[0, 1], [4, 5], [2, 3], [6, 7]],
        [[0, 2], [1, 3], [4, 6], [5, 7]],
        [[0, 7], [6, 1], [3, 4], [7, 0]], //diagonal
    ],
    connectionDistancesBuffers: [
        [1, 1, 1, 1],
        [1, 1, 1, 1],
        [1, 1, 1, 1],
        [Math.sqrt(3), Math.sqrt(3), Math.sqrt(3), Math.sqrt(3)],
    ]
};
