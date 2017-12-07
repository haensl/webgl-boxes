(() => {
  'use strict';
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

  const dependencies = [
    'THREE',
    'WEBGL_CUBES.Cube',
    'WEBGL_CUBES.World',
    'WEBGL_CUBES.Room'
  ];

  WEBGL_CUBES.boot(dependencies,
    (THREE, Cube, World, Room) => {
      Math.rand = (min, max) =>
        Math.random() * (max - min) + min;

      const container = document.getElementById('cubes-container');
      const dimensions = setView(container);
      const scene = new THREE.Scene();
      scene.name = 'scene';
      const aspectRatio = dimensions.width / dimensions.height;
      const camera = new THREE.PerspectiveCamera(
        45, // field of view
        aspectRatio, // aspect ratio
        -5, // near
        10 // far
      );
      camera.position.z = 17.1;
      camera.rotation.y = 0.22
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
      const world = new World(scene);
      const cubes = [0xff0000].map((color) =>
        new Cube({
          //position: new THREE.Vector3(Math.rand(-6, 6), Math.rand(-4, 4), Math.rand(-4, 4)),
          color
        }));
      const room = new Room();
      world.add(room);
      cubes.forEach((cube) => {
        world.add(cube);
      });

      const point = new THREE.PointLight(0xffffff, 1, 5, 2);
      point.castShadow = true;
      point.penumbra = 0.2;
      point.decay = 2;
      point.distance = 100;
      point.name = 'pointlight';

      world.add(point);

      console.log(world);

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

      container.appendChild(renderer.domElement);
      animate();

      window.addEventListener('resize', setView.bind(container, camera, renderer), false);
      window.THREE = THREE;
      window.scene = scene;
    });
})();
