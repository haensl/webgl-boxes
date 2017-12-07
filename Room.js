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
      const normals = {
        left: new THREE.Vector3(1, 0, 0),
        right: new THREE.Vector3(-1, 0, 0),
        bottom: new THREE.Vector3(0, 1, 0),
        top: new THREE.Vector3(0, -1, 0),
        back: new THREE.Vector3(0, 0, 1),
        front: new THREE.Vector3(0, 0, -1)
      };

      WEBGL_CUBES.Room = class extends THREE.Object3D{
        static get normals() {
          return normals;
        }

        constructor(options = {
          width: 10,
          height: 5,
          depth: 5,
          color: 0x333333
        }) {
          super();
          this.planes = [
            normals.left,
            normals.right
          ].map((normal) => {
            const geometry = new THREE.PlaneGeometry(options.height, options.depth);
            const material = new THREE.MeshStandardMaterial({
              color: options.color,
              //wireframe: true,
              lights: true,
              emissive: options.color,
              receivesShadow: true
            });
            const plane = new THREE.Mesh(geometry, material);
            plane.userData.normal = normal.clone();
            return plane;
          }).concat([
            normals.bottom,
            normals.top,
            normals.back,
            normals.front
          ].map((normal => {
            const geometry = new THREE.PlaneGeometry(options.width, options.depth);
            const material = new THREE.MeshStandardMaterial({
              color: options.color,
              //wireframe: true,
              lights: true,
              side: THREE.DoubleSide,
              emissive: options.color,
              receivesShadow: true
            });

            const plane = new THREE.Mesh(geometry, material);
            plane.userData.normal = normal;
            return plane;
          }))).map((plane) => {
            const normal = plane.userData.normal
            if (normal.equals(normals.top)) {
              plane.position.y = options.height / 2;
              plane.rotation.x = 1.5708;
              plane.userData.boundingBox = new THREE.Box3(
                new THREE.Vector3(options.width / -2, options.height / 2, options.depth / -2),
                new THREE.Vector3(options.width / 2, options.height / 2, options.depth / 2)
              );
              plane.name = 'room.top';
            } else if (normal.equals(normals.bottom)) {
              plane.position.y = options.height / -2;
              plane.name = 'room.bottom';
              plane.rotation.x = 1.5708;
              plane.userData.boundingBox = new THREE.Box3(
                new THREE.Vector3(options.width / -2, options.height / -2, options.depth / -2),
                new THREE.Vector3(options.width / 2, options.height / -2, options.depth / 2)
              );
            } else if (normal.equals(normals.left)) {
              plane.rotation.y = 1.5708;
              plane.position.x = options.width / -2;
              plane.name = 'room.left';
              plane.userData.boundingBox = new THREE.Box3(
                new THREE.Vector3(options.width / -2, options.height / -2, options.depth / -2),
                new THREE.Vector3(options.width / -2, options.height / 2, options.depth / 2)
              );
            } else if (normal.equals(normals.right)) {
              plane.rotation.y = -1.5708;
              plane.position.x = options.width / 2;
              plane.name = 'room.right';
              plane.userData.boundingBox = new THREE.Box3(
                new THREE.Vector3(options.width / 2, options.height / -2, options.depth / -2),
                new THREE.Vector3(options.width / 2, options.height / 2, options.depth / 2)
              );
            } else if (normal.equals(normals.back)) {
              plane.position.z = options.depth / -2;
              plane.name = 'room.back';
              plane.userData.boundingBox = new THREE.Box3(
                new THREE.Vector3(options.width / -2, options.height / -2, options.depth / -2),
                new THREE.Vector3(options.width / 2, options.height / 2, options.depth / -2)
              );
            } else if (normal.equals(normals.front)) {
              plane.position.z = options.depth / 2;
              //plane.material.transparent = true;
              //plane.material.opacity = 0;
              plane.name = 'room.front';
              plane.userData.boundingBox = new THREE.Box3(
                new THREE.Vector3(options.width / -2, options.height / -2, options.depth / 2),
                new THREE.Vector3(options.width / 2, options.height / 2, options.depth / 2)
              );
            }
            
            return plane;
          });

          this.planes.forEach((plane) => {
            this.add(plane);
          })

          return this;
        }
      }
  });
})();
