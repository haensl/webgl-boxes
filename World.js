(() => {
  'use strict';
  if (typeof WEBGL_CUBES.World !== 'undefined') {
    return;
  }

  WEBGL_CUBES.boot(['THREE'],
    (THREE) => {
      const bitmasks = {
        room: 1,  // 001
        cube: 2   // 010
      };

      const updateFrequencyCollision = 0.0001;

      WEBGL_CUBES.World = class {
        constructor(scene) {
          this.scene = scene;
          this.physicsBodies = [];
        }

        static get bitmasks() {
          return bitmasks;
        }

        add(object) {
          this.scene.add(object);
          if (object.userData.collisionMask) {
            this.physicsBodies.push(object);
          }
        }

        handleCollisions() {
          return Array.from(this.physicsBodies.reduce((collisions, body, index, physicsBodies) => {
            if (collisions.has(body)) {
              return collisions;
            }

            const planes = this.physicsBodies.filter((body) => /room/.test(body.name));
            for (let i = 0, plane; i < planes.length; i++) {
              plane = planes[i];
              if ((body.userData.collisionMask & bitMasks.room)
                && (body.userData.boundingBox.intersectsBox(plane.userData.boundingBox))) {
                body.userData.direction.reflect(plane.userData.normal).normalize();
                while(body.userData.boundingBox.intersectsBox(plane.userData.boundingBox)) {
                  body.userData.update(updateFrequencyCollision);
                }

                collisions.add(body);
                return collisions;
              }
            }

            for (let i = 0, otherBody; i < this.physicsBodies.length; i++) {
              otherBody = this.physicsBodies[i];
              if (otherBody === body || collisions.has(otherBody)) {
                continue;
              }

              if ((otherBody.userData.collisionMask & body.userData.collisionMask)) {
                const bodyDirection = body.userData.direction.clone();
                body.userData.direction.reflect(body.userData.direction.projectOnVector(otherBody.userData.direction)).normalize();
                otherBody.userData.direction.reflect(otherBody.userData.direction.projectOnVector(bodyDirection)).normalize();

                while(body.userData.boundingBox.intersectsBox(otherBody.userData.boundingBox)) {
                  body.userData.update(updateFrequencyCollision);
                  otherBody.userData.update(updateFrequencyCollision);
                }

                collisions.add(body);
                collisions.add(otherBody);
              }
            }

            return collisions;
          }, new Set()));
        }

        update(dt) {
          this.scene.children.forEach((object) => {
            if (typeof object.userData.update === 'function') {
              object.userData.update(dt);
            }
          });
          this.handleCollisions();
        }
      }
    });
})();
