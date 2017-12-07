(() => {
  'use strict';
  if (typeof WEBGL_CUBES.Cube !== 'undefined') {
    return;
  }

  WEBGL_CUBES.boot(['THREE', 'WEBGL_CUBES.World'],
    (THREE, World) => {
      WEBGL_CUBES.Cube = class extends THREE.Object3D {
        constructor(options = {
          color: 0x00ff00,
          opacity: 0.8,
          emissiveIntensity: 0.3,
          speed: Math.rand(0.5, 1)
        }) {
          super();
          const material = new THREE.MeshStandardMaterial({
            color: options.color,
            opacity: options.opacity,
            emissive: options.color,
            emissiveIntensity: options.emissiveIntensity,
            lights: true,
          });
          this.geometry = new THREE.BoxGeometry(1, 1, 1);
          const edges = new THREE.EdgesGeometry(this.geometry);
          const edgesMaterial = new THREE.LineBasicMaterial({
            color: options.color
          });
          const mesh = new THREE.Mesh(this.geometry, material);
          const wireframe = new THREE.LineSegments(edges, edgesMaterial);
          this.add(mesh);
          this.add(wireframe);
          this.castShadow = true;
          this.receiveShadow = true;

          if (options.position) {
            this.position.add(options.position);
          }

          this.userData.direction = new THREE.Vector3(
            Math.random(),
            Math.random(),
            Math.random
          ).normalize();
          this.userData.speed = options.speed;
          this.userData.collisionMask = World.bitmasks.cube | World.bitmasks.room;
          this.updateBoundingBox();
        }

        updateBoundingBox() {
          if (!this.geometry.boundingBox) {
            this.geometry.computeBoundingBox();
          }

          this.userData.boundingBox = new THREE.Box3(
            this.position.clone().add(this.geometry.boundingBox.min),
            this.position.clone().add(this.geometry.boundingBox.max)
          );
        }

        update(dt) {
          const distance = dt * this.userData.speed;
          this.position.add(this.userData.direction.clone().multiplyScalar(distance));
          this.updateBoundingBox();
        }
      }
    });
})();
