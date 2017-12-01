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

      const Cube = (() => {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshPhongMaterial({
          color: 0x00ff00,
          opacity: 0.3,
          transparent: true,
          emissive: 0x00ff00,
          emissiveIntensity: 0.3
        });
        const edges = new THREE.EdgesGeometry(geometry);
        const edgesMaterial = new THREE.LineBasicMaterial({
          color: 0x00ff00
        });

        return (options = {}) => {
          const cube = new THREE.Object3D();
          const mesh = new THREE.Mesh(geometry, material.clone());
          const wireframe = new THREE.LineSegments(edges, edgesMaterial.clone());
          cube.add(mesh);
          cube.add(wireframe);

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

          cube.direction = new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize();
          cube.speed = Math.random();
          cube.update = ((cube, dt) => {
            const distance = dt * cube.speed;
            cube.position = cube.position.add(cube.direction.clone().multiplyScalar(distance));
          }).bind(null, cube);

          return cube;
        };
      })();

      const World = (() => {
        return (options = {
          width: 10,
          height: 5,
          depth: 5,
          objects: []
        }) => {
          const geometry = new THREE.BoxGeometry(options.width, options.height, options.depth);
          const material = new THREE.MeshBasicMaterial({
            wireframe: true
          });
          const world = new THREE.Mesh(geometry, material);
          options.objects.forEach((o) => {
            world.add(o);
          });
          world.objects = options.objects;
          world.update = ((world, dt) => {
            world.objects.forEach((object) => {
              if (typeof object.update === 'function') {
                object.update(dt);
              }
            })
          }).bind(null, world);
          return world;
        }
      })();
      const container = document.getElementById('cubes-container');
      const dimensions = setView(container);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        45, // field of view
        dimensions.width / dimensions.height, // aspect ratio
        0.1, // near
        1000 // far
      );
      camera.position.x = -10;
      camera.position.z = 20;
      camera.rotation.y = (camera.fov / 2) * Math.PI / 180 * -1;
      const renderer = new THREE.WebGLRenderer({
        antialias: true
      });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(dimensions.width, dimensions.height);
      const spot = new THREE.SpotLight(0xffffff);
      spot.position.set(0, 0.5, 1);

      const cubes = [0xff0000, 0x00ff00, 0x0000ff].map((color) =>
        Cube({
          position: new THREE.Vector3(Math.rand(-5, 5), Math.rand(-5, 5), Math.rand(-5, 5)),
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

      const objects = cubes.slice();
      objects.push(spot);
      const world = World({
        width: 20,
        height: 10,
        depth: 10,
        objects
      });

      scene.add(world);
      
      container.appendChild(renderer.domElement);
      animate();

      window.addEventListener('resize', setView.bind(container, camera, renderer), false);
    });
})();
