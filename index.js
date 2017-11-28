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
      const container = document.getElementById('cubes-container');
      const dimensions = setView(container);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        45, // field of view
        dimensions.width / dimensions.height, // aspect ratio
        0.1, // near
        1000 // far
      );
      camera.position.z = 5;
      const renderer = new THREE.WebGLRenderer({
        antialias: true
      });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(dimensions.width, dimensions.height);
      const spot = new THREE.SpotLight(0xffffff);
      spot.position.set(0, 0.5, 1);

      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshPhongMaterial({
        color: 0x00ff00,
        opacity: 0.3,
        transparent: true,
        emissive: 0xfff81a,
        emissiveIntensity: 0.3
      });
      const cube = new THREE.Mesh(geometry, material);

      const edges = new THREE.EdgesGeometry(geometry);
      const edgesMaterial = new THREE.LineBasicMaterial({
        color: 0x00ff00,
        lineWidth: 2
      });
      const wireframe = new THREE.LineSegments(edges, edgesMaterial);

      const cubeGroup = new THREE.Object3D();
      cubeGroup.add(cube);
      cubeGroup.add(wireframe);

      let lastIteration;
      const animate = (timestamp) => {
        if (typeof lastIteration === 'number') {
          const dt = (timestamp - lastIteration) / 1000;
          const rotation = dt / 1.6;
          cubeGroup.rotation.x += rotation;
          cubeGroup.rotation.y += rotation;
          renderer.render(scene, camera);
        }

        lastIteration = timestamp;
        window.requestAnimationFrame(animate);
      };

      scene.add(spot);
      scene.add(cubeGroup);
      container.appendChild(renderer.domElement);
      animate();

      window.addEventListener('resize', setView.bind(container, camera, renderer), false);
    });
})();
