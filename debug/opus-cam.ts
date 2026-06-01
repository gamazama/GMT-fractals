/** Orbit-camera helper for Opus render drivers.
 *  Given distance + azimuth/elevation (degrees) around the origin, returns the
 *  {pos,rot,sceneOffset,targetDistance} the render harness expects, with the
 *  camera placed on a sphere around the world origin and oriented to look at it.
 *
 *  Engine convention (VirtualSpace.applyCameraState): the camera's world
 *  position = sceneOffset.{x,y,z} + sceneOffset.{xL,yL,zL} + cameraPos, and the
 *  camera looks down its local -Z per the quaternion. We put the whole position
 *  in sceneOffset, leave cameraPos at origin, and build a look-at quaternion.
 */
import * as THREE from 'three';

export function orbitCamera(distance: number, azimuthDeg: number, elevationDeg: number) {
    const az = (azimuthDeg * Math.PI) / 180;
    const el = (elevationDeg * Math.PI) / 180;
    const eye = new THREE.Vector3(
        distance * Math.cos(el) * Math.sin(az),
        distance * Math.sin(el),
        distance * Math.cos(el) * Math.cos(az),
    );
    const m = new THREE.Matrix4().lookAt(eye, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0));
    const q = new THREE.Quaternion().setFromRotationMatrix(m);
    return {
        pos: [0, 0, 0] as [number, number, number],
        rot: [q.x, q.y, q.z, q.w] as [number, number, number, number],
        targetDistance: distance,
        sceneOffset: { x: eye.x, y: eye.y, z: eye.z, xL: 0, yL: 0, zL: 0 },
    };
}
