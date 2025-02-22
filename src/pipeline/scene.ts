import { cube } from "../models/cube";
import { GameObject } from "./gameobject";
import { SharedData } from "./shaderData";
import { mat4 } from "gl-matrix";
export class Scene
{
    static objects: GameObject[] = [];

    static loadScene0(){

        // let transform = MatrixUtils.identity();
        // transform = MatrixUtils.multiply(transform, MatrixUtils.rotationY(Math.PI/2));
        // transform = MatrixUtils.multiply(transform, MatrixUtils.translation(10,0,0));

        for (let x = -5; x <= 5; x++) {
            for (let y = -5; y <= 5; y++) {
                for (let z = -5; z <= 5; z++) {
                    this.objects.push(new GameObject(cube, mat4.fromTranslation(mat4.create(), [x*10, y*10, z*10])));
                }
            }
        }

    

    }
}