(() => {
  'use strict';
  if (typeof window.WEBGL_CUBES === 'undefined') {
    window.WEBGL_CUBES = {
      boot: (dependencies = []) =>
        new Promise((resolve) => {
          const waitForDependencies = () => {
            if (dependencies.every((dependency) => {
              if (dependency.indexOf('.') > -1) {
                const contexts = dependency.split('.');
                return typeof root[contexts[0]] !== 'undefined'
                  && waitForDependencies(dependencies.slice(1))
                    .then(() => resolve());
                ;
              } else if (root[dependency]) {
                return resolve();
              }
            }

            window.setTimeout(waitForDependencies, 10);
          };

          window.setTimeout(waitForDependencies);
        })
    };
  }

  WEBGL_CUBES.boot(['THREE'])
    .then((THREE) => {
      WEBGL_CUBES.Cube = class extends THREE.Object3D {
        constructor(options = {
          color: 0x00ff00,
          opacity: 0.8,
          emissiveIntensity: 0.3
        }) {
          super();
          const material = new THREE.MeshStandardMaterial({
            color: options.color,
            opacity: options.opacity,
            emissive: options.color,
            emissiveIntensity: options.emissiveIntensity,
            lights: true,
            speed: Math.rand(0.5, 1)
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
          this.userData.collisionMask = World.bitmaks.cube | World.bitmasks.room;
          this.updateBoundingBox();

          return this;
        }

        updateBoundingBox() {
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
