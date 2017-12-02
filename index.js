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
        const material = new THREE.MeshPhongMaterial({
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
          const mesh = new THREE.Mesh(geometry, material.clone());
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
          cube.userData.speed = options.speed || Math.rand(1, 2);
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
          Array.from(world.userData.physicsBodies
            .reduce((c, body, index, physicsBodies) => {
              if (c.has(body)) {
                return c;
              }

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
              }

              for (let i = 0, otherBody; i < physicsBodies.length; i++) {
                otherBody = physicsBodies[i];
                if (otherBody === body || c.has(otherBody)) {
                  continue;
                }

                if ((otherBody.userData.collisionMask & body.userData.collisionMask)
                  && body.userData.boundingBoxWorld.intersectsBox(otherBody.userData.boundingBoxWorld)) {
                  body.userData.direction = body.userData.direction.reflect(body.userData.direction.projectOnVector(otherBody.userData.direction)).normalize();
                  otherBody.userData.direction = otherBody.userData.direction.reflect(otherBody.userData.direction.projectOnVector(body.userData.direction)).normalize();
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

        return (options = {
          width: 10,
          height: 5,
          depth: 5,
          objects: [],
          color: 0x333333
        }) => {
          const geometry = new THREE.BoxGeometry(options.width, options.height, options.depth);
          geometry.computeBoundingBox();
          const material = new THREE.MeshStandardMaterial({
            color: options.color,
            //wireframe: true,
            dithering: true,
            flatShading: true,
            side: THREE.DoubleSide
          });
          const world = new THREE.Mesh(geometry, material);
          world.addObject = addObject.bind(null, world);
          world.update = update.bind(null, world);
          world.handleCollisions = handleCollisions.bind(null, world);
          world.userData.physicsBodies = [];
          world.receiveShadow = true;
          world.planes = [
            new THREE.Plane(new THREE.Vector3(1, 0, 0), options.width / 2),
            new THREE.Plane(new THREE.Vector3(-1, 0, 0), options.width / 2),
            new THREE.Plane(new THREE.Vector3(0, 1, 0), options.height / 2),
            new THREE.Plane(new THREE.Vector3(0, -1, 0), options.height / 2),
            new THREE.Plane(new THREE.Vector3(0, 0, 1), options.depth / 2),
            new THREE.Plane(new THREE.Vector3(0, 0, -1), options.depth / 2)
          ];
          options.objects.forEach((o) => {
            world.addObject(o);
          });
          return world;
        }
      })();

      const Spot = (targetPosition = new THREE.Vector3(0, 0, 0)) => {
        const light = new THREE.SpotLight(
          0xffffff, // color
          2, // intensity
          //aspectRatio * 10, // distance from the light where intensity is 0
          //2 // decay
        );
        light.castShadow = true;
        light.angle = 1.2;
        light.penumbra = 0.2;
        light.decay = 2;
        light.distance = 50;

        return light;
      };
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
      renderer.gammaInput = true;
      renderer.gammaOutput = true;

      const cubes = [0xff0000, 0x00ff00, 0x0000ff].map((color) =>
        Cube({
          position: new THREE.Vector3(Math.rand(-4, 4), Math.rand(-4, 4), Math.rand(-4, 4)),
          color
        }));

      /**
      const spots = [
        new THREE.Vector3(0, 0, 5),
        new THREE.Vector3(0, 0, -5),
        new THREE.Vector3(0, 5, 0),
        new THREE.Vector3(0, -5, 0),
        new THREE.Vector3(aspectRatio * 10 / 2, 0, 0),
        new THREE.Vector3(aspectRatio * 10 / -2, 0, 0)
      ].map((targetPosition) => Spot(targetPosition));
      */

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

      /**
      spots.forEach((spot) => {
        objects.push(spot.target);
        objects.push(spot.light);
      });*/
      const spotTop = Spot();
      spotTop.position.set(0, 5, 0);
      const spotBottom = Spot();
      spotBottom.position.set(0, -5, 0);
      objects = cubes.concat([spotTop, spotBottom]);
      const world = World({
        width: aspectRatio * 10,
        height: 10,
        depth: 10,
        objects,
        color: 0x333333
      });

      scene.add(world);
      /**
      spots.forEach((spot) => {
        spot.light.target = spot.target
      });*/
      console.log(world);
      
      container.appendChild(renderer.domElement);
      animate();

      window.addEventListener('resize', setView.bind(container, camera, renderer), false);
    });
})();
