import { MatrixUtils } from "../matrix.js";
import { cube } from "../models/cube.js";
import { GameObject } from "./gameobject.js";
export class Scene {
    static loadScene0() {
        // let transform = MatrixUtils.identity();
        // transform = MatrixUtils.multiply(transform, MatrixUtils.rotationY(Math.PI/2));
        // transform = MatrixUtils.multiply(transform, MatrixUtils.translation(10,0,0));
        for (let x = -5; x <= 5; x++) {
            for (let y = -5; y <= 5; y++) {
                for (let z = -5; z <= 5; z++) {
                    this.objects.push(new GameObject(cube, MatrixUtils.translation(x * 10, y * 10, z * 10)));
                }
            }
        }
    }
}
Scene.objects = [];
