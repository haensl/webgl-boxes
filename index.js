(() => {
  const setView = (container, camera, renderer) => {
    const width = container.clientWidth || parseInt(container.style.width, 10);
    const height = container.clientHeight || parseInt(container.style.height, 10);
    if (typeof width === 'undefined'
      || isNaN(width)
      || typeof height === 'undefined'
      || isNaN(height)) {
      throw new Error('Unable to determine container dimensions.');
    }

    if (typeof camera !== 'undefined') {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    if (typeof renderer !== 'undefined') {
      renderer.setSize(width, height);
    }

    return {
      width,
      height
    };
  };

  const boot = () =>
    new Promise((resolve) => {
      const waitForThreeJS = () => {
        if (window.THREE) {
          return resolve(window.THREE);
        }

        window.setTimeout(waitForThreeJS, 25);
      };

      window.setTimeout(waitForThreeJS);
    });

  boot()
    .then((THREE) => {
      Math.rand = (min, max) =>
        Math.random() * (max - min) + min;
      const bitMasks = {
        world:  1, // 001
        cube:   2 // 010
      };

      const Cube = (() => {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({
          color: 0x00ff00,
          opacity: 0.9,
          transparent: true,
          emissive: 0x00ff00,
          emissiveIntensity: 0.3,
          lights: true
        });
        const edges = new THREE.EdgesGeometry(geometry);
        const edgesMaterial = new THREE.LineBasicMaterial({
          color: 0x00ff00
        });
        const update = (cube, dt) => {
          const distance = dt * cube.userData.speed;
          cube.position = cube.position.add(cube.userData.direction.clone().multiplyScalar(distance));
          cube.userData.updateBoundingBoxWorld();
          //console.log(cube.userData.boundingBoxWorld);
        };
        const updateBoundingBoxWorld = (cube) => {
          cube.userData.boundingBoxWorld = new THREE.Box3(
            new THREE.Vector3(
              cube.position.x + cube.geometry.boundingBox.min.x,
              cube.position.y + cube.geometry.boundingBox.min.y,
              cube.position.z + cube.geometry.boundingBox.min.z
            ),
            new THREE.Vector3(
              cube.position.x + cube.geometry.boundingBox.max.x,
              cube.position.y + cube.geometry.boundingBox.max.y,
              cube.position.z + cube.geometry.boundingBox.max.z
            )
          );
        };

        return (options = {}) => {
          const cube = new THREE.Object3D();
          const m = new THREE.MeshNormalMaterial();
          const mesh = new THREE.Mesh(geometry.clone(), m); // material.clone()
          const wireframe = new THREE.LineSegments(edges, edgesMaterial.clone());
          cube.add(mesh);
          cube.add(wireframe);
          cube.geometry = geometry;
          geometry.computeBoundingBox();
          cube.castShadow = true;
          cube.receiveShadow = true;

          if (options.position) {
            cube.position.add(options.position);
          }

          if (options.color) {
            mesh.material.setValues({
              emissive: options.color,
              color: options.color
            });
            wireframe.material.setValues({
              color: options.color
            });
          }

          cube.userData.direction = new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize();
          cube.userData.speed = options.speed || Math.rand(0.5, 1);
          cube.userData.collisionMask = bitMasks.cube | bitMasks.world;
          cube.userData.update = update.bind(null, cube);
          cube.userData.updateBoundingBoxWorld = updateBoundingBoxWorld.bind(null, cube);
          cube.userData.updateBoundingBoxWorld();
          return cube;
        };
      })();

      const World = (() => {
        const addObject = (world, object) => {
          world.add(object);
          if (object.userData.collisionMask) {
            world.userData.physicsBodies.push(object);
          }
        };
        const handleCollisions = (world) =>
          Array.from((world.userData.physicsBodies || [])
            .reduce((c, body, index, physicsBodies) => {
              if (c.has(body)) {
                return c;
              }

              for (let i = 0, plane; i < world.userData.planes.length; i++) {
                plane = world.userData.planes[i];
                if ((body.userData.collisionMask & bitMasks.world)
                  && (body.userData.boundingBoxWorld.intersectsBox(plane.userData.boundingBox))) {
                    console.log('cube hit plane', plane.name, plane.userData.normal);
                    console.log('direction before reflection', body.userData.direction);
                    console.log('position', body.position);
                    // body.userData.direction = 
                    body.userData.direction.reflect(plane.userData.normal).normalize();
                    console.log('direction after reflection', body.userData.direction);
                    while (body.userData.boundingBoxWorld.intersectsBox(plane.userData.boundingBox)) {
                      body.userData.update(0.0001);
                    }

                    c.add(body);
                    return c;
                  }
              }

              /**
              if ((body.userData.collisionMask & bitMasks.world)
                  && !world.geometry.boundingBox.containsBox(body.userData.boundingBoxWorld)) {
                const closestPlane = world.planes.map((plane) => ({
                  plane: plane,
                  distance: plane.distanceToPoint(body.position)
                })).sort((planeA, planeB) => planeA.distance < planeB.distance ? -1 : 1)[0];
                body.userData.direction = body.userData.direction.reflect(closestPlane.plane.normal).normalize();
                while (!world.geometry.boundingBox.containsBox(body.userData.boundingBoxWorld)) {
                  body.userData.update(0.0001);
                }

                c.add(body);
                return c;
              }*/

              for (let i = 0, otherBody; i < physicsBodies.length; i++) {
                otherBody = physicsBodies[i];
                if (otherBody === body || c.has(otherBody)) {
                  continue;
                }

                if ((otherBody.userData.collisionMask & body.userData.collisionMask)
                  && body.userData.boundingBoxWorld.intersectsBox(otherBody.userData.boundingBoxWorld)) {
                  // body.userData.direction = 
                  body.userData.direction.reflect(body.userData.direction.projectOnVector(otherBody.userData.direction)).normalize();
                  // otherBody.userData.direction = 
                  otherBody.userData.direction.reflect(otherBody.userData.direction.projectOnVector(body.userData.direction)).normalize();
                  while(body.userData.boundingBoxWorld.intersectsBox(otherBody.userData.boundingBoxWorld)) {
                    body.userData.update(0.0001);
                    otherBody.userData.update(0.0001);
                  }

                  c.add(body);
                  c.add(otherBody);
                }
              }

              return c;
            }, new Set()));
        const update = (world, dt) => {
          world.children.forEach((object) => {
            if (typeof object.userData.update === 'function') {
              object.userData.update(dt);
            }
          });
          
          world.handleCollisions();
        };
        const material = new THREE.MeshStandardMaterial({
          color: 0x333333
        });
        const normals = {
          left: new THREE.Vector3(1, 0, 0),
          right: new THREE.Vector3(-1, 0, 0),
          bottom: new THREE.Vector3(0, 1, 0),
          top: new THREE.Vector3(0, -1, 0),
          back: new THREE.Vector3(0, 0, 1),
          front: new THREE.Vector3(0, 0, -1)
        };

        return (options = {
          width: 10,
          height: 5,
          depth: 5,
          objects: [],
          color: 0x333333
        }) => {
          const planes = [
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
          ].map((normal) => {
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
          })).map((plane) => {
            const normal = plane.userData.normal
            if (normal.equals(normals.top)) {
              plane.position.y = options.height / 2;
              plane.rotation.x = 1.5708;
              plane.userData.boundingBox = new THREE.Box3(
                new THREE.Vector3(options.width / -2, options.height / 2, options.depth / -2),
                new THREE.Vector3(options.width / 2, options.height / 2, options.depth / 2)
              );
              plane.name = 'world.top';
            } else if (normal.equals(normals.bottom)) {
              plane.position.y = options.height / -2;
              plane.name = 'world.bottom';
              plane.rotation.x = 1.5708;
              plane.userData.boundingBox = new THREE.Box3(
                new THREE.Vector3(options.width / -2, options.height / -2, options.depth / -2),
                new THREE.Vector3(options.width / 2, options.height / -2, options.depth / 2)
              );
            } else if (normal.equals(normals.left)) {
              plane.rotation.y = 1.5708;
              plane.position.x = options.width / -2;
              plane.name = 'world.left';
              plane.userData.boundingBox = new THREE.Box3(
                new THREE.Vector3(options.width / -2, options.height / -2, options.depth / -2),
                new THREE.Vector3(options.width / -2, options.height / 2, options.depth / 2)
              );
            } else if (normal.equals(normals.right)) {
              plane.rotation.y = -1.5708;
              plane.position.x = options.width / 2;
              plane.name = 'world.right';
              plane.userData.boundingBox = new THREE.Box3(
                new THREE.Vector3(options.width / 2, options.height / -2, options.depth / -2),
                new THREE.Vector3(options.width / 2, options.height / 2, options.depth / 2)
              );
            } else if (normal.equals(normals.back)) {
              plane.position.z = options.depth / -2;
              plane.name = 'world.back';
              plane.userData.boundingBox = new THREE.Box3(
                new THREE.Vector3(options.width / -2, options.height / -2, options.depth / -2),
                new THREE.Vector3(options.width / 2, options.height / 2, options.depth / -2)
              );
            } else if (normal.equals(normals.front)) {
              plane.position.z = options.depth / 2;
              //plane.material.transparent = true;
              //plane.material.opacity = 0;
              plane.name = 'world.front';
              plane.userData.boundingBox = new THREE.Box3(
                new THREE.Vector3(options.width / -2, options.height / -2, options.depth / 2),
                new THREE.Vector3(options.width / 2, options.height / 2, options.depth / 2)
              );
            }
            
            return plane;
          });

          const world = new THREE.Object3D();
          world.userData.planes = planes;
          world.update = update.bind(null, world);
          world.handleCollisions = handleCollisions.bind(null, world);
          world.userData.physicsBodies = [];
          world.addObject = addObject.bind(null, world);

          planes.forEach((plane) => {
            world.add(plane);
          });
          /**
          options.objects.forEach((o) => {
            scene.add(o);
            //world.addObject(o);
          });*/
          return world;
        }
      })();

      const container = document.getElementById('cubes-container');
      const dimensions = setView(container);
      const scene = new THREE.Scene();
      const aspectRatio = dimensions.width / dimensions.height;
      const camera = new THREE.PerspectiveCamera(
        45, // field of view
        aspectRatio, // aspect ratio
        -5, // near
        10 // far
      );
      camera.position.z = 17.1;
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
      });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(dimensions.width, dimensions.height);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      //renderer.sortObjects = false;
      renderer.gammaInput = true;
      renderer.gammaOutput = true;

      //0x00ff00, 0x0000ff
      const cubes = [0xff0000].map((color) =>
        Cube({
          //position: new THREE.Vector3(Math.rand(-6, 6), Math.rand(-4, 4), Math.rand(-4, 4)),
          color
        }));

      let lastIteration;
      const animate = (timestamp) => {
        if (typeof lastIteration === 'number') {
          const dt = (timestamp - lastIteration) / 1000;
          world.update(dt);
          renderer.render(scene, camera);
        }

        lastIteration = timestamp;
        window.requestAnimationFrame(animate);
      };

      const point = new THREE.PointLight(0xffffff, 1, 5, 2);
      point.castShadow = true;
      point.penumbra = 0.2;
      point.decay = 2;
      point.distance = 100;
      const objects = cubes.concat([point]);
      const world = World({
        width: aspectRatio * 10,
        height: 10,
        depth: 10,
        objects: cubes,
        color: 0x111111
      });

      scene.add(world);
      scene.add(point);
      cubes.forEach((c) => scene.add(c));
      console.log(world);
      
      container.appendChild(renderer.domElement);
      animate();

      window.addEventListener('resize', setView.bind(container, camera, renderer), false);
      window.THREE = THREE;
      window.scene = scene;
    });
})();
