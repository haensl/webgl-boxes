(() => {
  const boot = () =>
    new Promise((resolve, reject) => {
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
      const width = container.clientWidth || parseInt(container.style.width, 10);
      const height = container.clientHeight || parseInt(container.style.height, 10);
      if (typeof width === 'undefined'
        || isNaN(width)
        || typeof height === 'undefined'
        || isNaN(height)) {
        throw new Error('Unable to determine container dimensions.');
      }
      
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        45, // field of view
        width / height, // aspect ratio
        0.1, // near
        1000 // far
      );
      camera.position.z = 5;
      const renderer = new THREE.WebGLRenderer();
      renderer.setSize(width, height);
      const spot = new THREE.SpotLight(0xffffff);
      spot.position.set(0, 0.5, 1);
      spot.castShadow = true;

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
        color: 0x000000,
        lineWidth: 2
      });
      const wireframe = new THREE.LineSegments(edges, edgesMaterial);

      const cubeGroup = new THREE.Object3D();
      cubeGroup.add(cube);
      cubeGroup.add(wireframe);
      
      const animate = () => {
        window.requestAnimationFrame(animate);
        cubeGroup.rotation.x += 0.01;
        cubeGroup.rotation.y += 0.01;
        renderer.render(scene, camera);
      };

      scene.add(spot);
      scene.add(cubeGroup);
      container.appendChild(renderer.domElement);
      animate();
    });
})();
