import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { DeviceOrientationControls } from 'three/examples/jsm/controls/DeviceOrientationControls.js';
import videoSource from './assets/s25invitevideo.mp4';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { GUI } from 'dat.gui';

function App() {
  const mountRef = useRef(null);
  const [hasGyroPermission, setHasGyroPermission] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const controlsRef = useRef(null);
  const cameraRef = useRef(null);
  const [cameraYPosition, setCameraYPosition] = useState(0);
  const [lookAtX, setLookAtX] = useState(0);
  let textMesh; // Declare textMesh in a higher scope
  let textMesh1; // Declare textMesh1 in a higher scope

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const mobileCheck = /iPhone|iPad|iPod|Android/i.test(userAgent);
    setIsMobile(mobileCheck);
  }, []);

  useEffect(() => {
    cameraRef.current = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    cameraRef.current.position.set(0, 0, 0);
    cameraRef.current.lookAt(45, 0, 0);
    // Check if the device is Android and rotate the camera
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
     // cameraRef.current.rotation.z = THREE.MathUtils.degToRad(-90); // Rotate camera by 45 degrees
      console.log('Camera rotated by 45 degrees on Android device');
    }
  }, []);

  const initGyroControls = () => {
    if (cameraRef.current) {
      controlsRef.current = new DeviceOrientationControls(cameraRef.current);
      setHasGyroPermission(true);
      setShowButtons(true);
      // cameraRef.current.lookAt(0, 45, 0);
    }
  };

  const requestGyroPermission = async () => {
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission === 'granted') {
          initGyroControls();
        }
      } catch (error) {
        console.error('Error requesting device orientation permission:', error);
      }
    } else if (window.DeviceOrientationEvent) {
      initGyroControls();
    }
  };

  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = cameraRef.current;

    const video = document.createElement('video');
    video.src = videoSource;
    video.loop = true;
    video.muted = true;
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');

    video.addEventListener('loadeddata', () => {
      setIsLoading(false);
      video.play().catch((error) => {
        console.error('Error playing video:', error);
      });
    });

    const playVideo = () => {
      video.play().catch((error) => {
        console.error('Error playing video:', error);
      });
    };

    if (isMobile) {
      window.addEventListener('touchstart', playVideo, { once: true });
      window.addEventListener('click', playVideo, { once: true });
    } else {
      video.play();
    }

    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBFormat;

    const skyboxGeometry = new THREE.SphereGeometry(100, 32, 32);
    const skyboxMaterial = new THREE.MeshBasicMaterial({
      map: videoTexture,
      side: THREE.BackSide
    });
    const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
    scene.add(skybox);

    camera.position.set(0, 0, 8);

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    const handleResize = () => {
      const newAspectRatio = window.innerWidth / window.innerHeight;
      camera.aspect = newAspectRatio;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);

      // Log the camera's position and aspect ratio on resize
      console.log('Camera Position on Resize:', camera.position);
      console.log('Camera Aspect Ratio on Resize:', camera.aspect);
    };

    window.addEventListener('resize', handleResize);

    const diamondGroup = new THREE.Group();
    scene.add(diamondGroup);

    const numRings = 17;
    const diamondsPerRing = 15;
    const numLayers = 8;
    const maxRadius = 8;
    const diamonds = [];
    const initialPositions = [];

    for (let layer = 0; layer < numLayers; layer++) {
      const layerRadius = (layer + 1) * (maxRadius / numLayers);

      for (let ring = 0; ring < numRings; ring++) {
        const phi = Math.PI * (ring / (numRings - 1));

        for (let i = 0; i < diamondsPerRing; i++) {
          const theta = (i / diamondsPerRing) * Math.PI * 2;

          const geometry = new THREE.OctahedronGeometry(0.3);
          const diamondMaterial = new THREE.MeshBasicMaterial({ map: videoTexture });
          const diamond = new THREE.Mesh(geometry, diamondMaterial);

          const x = layerRadius * Math.sin(phi) * Math.cos(theta);
          const y = layerRadius * Math.sin(phi) * Math.sin(theta);
          const z = layerRadius * Math.cos(phi);

          diamond.position.set(x, y, z);
          initialPositions.push({ x, y, z });

          diamond.rotation.x = Math.random() * Math.PI;
          diamond.rotation.y = Math.random() * Math.PI;
          diamond.rotation.z = Math.random() * Math.PI;

          diamondGroup.add(diamond);
          diamonds.push(diamond);
        }
      }
    }

    // Set up lights
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight.position.set(0, 0, 1).normalize();
    dirLight.castShadow = true;
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xffffff, 4.5, 0, 0);
    pointLight.position.set(0, 100, 90);
    pointLight.castShadow = true;
    scene.add(pointLight);

    // Ground plane to receive shadows
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(10000, 10000),
      new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.5, transparent: true })
    );
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    scene.add(plane);

    // Load font and create text meshes
    const fontLoader = new FontLoader();
    fontLoader.load(
      '/texas.json',
      (font) => {
        const textGeometry = new TextGeometry("It's not what you \nlook at that matters:", {
          font,
          size: 0.8,
          height: 0.3,
          curveSegments: 4,
        });
        const textGeometry1 = new TextGeometry("it's what you see", {
          font,
          size: 1,
          height: 0.3,
          curveSegments: 12,
        });

        const textMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
        textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh1 = new THREE.Mesh(textGeometry1, textMaterial);

        // Enable shadow casting for both text meshes
        textMesh.castShadow = true;
        textMesh1.castShadow = true;

        textMesh.position.set(-4, 1, 10);
        textMesh.rotation.y = Math.PI / 2;
        scene.add(textMesh);

        textMesh1.position.set(3, 1, -1);
        textMesh1.rotation.y = -Math.PI / 2.6;
        scene.add(textMesh1);
      },
      undefined,
      (error) => {
        console.error('Error loading font:', error);
      }
    );

    let time = 0;
    const slowDownFactor = 0.2;

    function animate() {
      requestAnimationFrame(animate);

      if (cameraRef.current) {
        // Log the camera's position
        console.log('Camera Position:', cameraRef.current.position);
        console.log('Camera Rotation:', cameraRef.current.rotation);

        if (controlsRef.current) {
          controlsRef.current.update();

          const { alpha, beta, gamma } = controlsRef.current.deviceOrientation;

          // cameraRef.current.lookAt.x = -gamma / 90;
          // cameraRef.current.lookAt.y = beta / 90;
          // cameraRef.current.lookAt.z = -90;

          // setCameraYPosition(cameraRef.current.position.y);
          // setLookAtX(cameraRef.current.lookAt.x);
        }

        if (textMesh) {
          textMesh.position.y = 2 + Math.sin(time * 2) * 1;
          textMesh.position.z = 12 + Math.cos(time * 2) * 1;
        }

        if (textMesh1) {
          textMesh1.position.y = 2 + Math.sin(time * 2) * 1;
          textMesh1.position.z = -1 + Math.cos(time * 2) * 1;
        }

        diamonds.forEach((diamond, index) => {
          const initialPos = initialPositions[index];
          const layerIndex = Math.floor(index / (diamondsPerRing * numRings));

          const layerDelay = layerIndex * 0.5;
          const convergence = Math.max(0, Math.sin(time * 1.5 - layerDelay) * 0.9);
          const convergenceScale = 1 - convergence;

          const rotatedX = initialPos.x * Math.cos(time * 0.5) - initialPos.y * Math.sin(time * 0.5);
          const rotatedY = initialPos.x * Math.sin(time * 0.5) + initialPos.y * Math.cos(time * 0.5);
          const rotatedZ = initialPos.z;

          diamond.position.x = rotatedX * convergenceScale;
          diamond.position.y = rotatedY * convergenceScale;
          diamond.position.z = rotatedZ * convergenceScale;

          const scale = 0.9 + convergence * 0.2;
          diamond.scale.set(scale, scale, scale);
        });

        renderer.render(scene, cameraRef.current);
      }
      
      time += 0.01 * slowDownFactor;
    }
    animate();

    // Initialize GUI
    const gui = new GUI();
    const cameraFolder = gui.addFolder('Camera Controls');
    const cameraPosition = { x: 0, y: 0, z: 8 };
    const cameraRotation = { x: 0, y: 0, z: 0 };

    cameraFolder.add(cameraPosition, 'x', -10, 10).onChange(() => {
      cameraRef.current.position.x = cameraPosition.x;
    });
    cameraFolder.add(cameraPosition, 'y', -10, 10).onChange(() => {
      cameraRef.current.position.y = cameraPosition.y;
    });
    cameraFolder.add(cameraPosition, 'z', 0, 20).onChange(() => {
      cameraRef.current.position.z = cameraPosition.z;
    });
    cameraFolder.add(cameraRotation, 'x', -Math.PI, Math.PI).onChange(() => {
      cameraRef.current.rotation.x = cameraRotation.x;
    });
    cameraFolder.add(cameraRotation, 'y', -Math.PI, Math.PI).onChange(() => {
      cameraRef.current.rotation.y = cameraRotation.y;
    });
    cameraFolder.add(cameraRotation, 'z', -Math.PI, Math.PI).onChange(() => {
      cameraRef.current.rotation.z = cameraRotation.z;
    });
    cameraFolder.open();

    return () => {
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      mountRef.current.removeChild(renderer.domElement);
      window.removeEventListener('resize', handleResize);
      gui.destroy(); // Clean up GUI on unmount
    };
  }, []);

  return (
    <div ref={mountRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'hidden' }}>
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '40%',
          left: '40%',
          transform: 'translate(-50%, -50%)',
          fontSize: '24px',
          color: 'white',
          textAlign: 'center'
        }}>
          Loading...
        </div>
      )}
      {!hasGyroPermission && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          opacity: 0.8
        }}>
          <div 
            style={{ 
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              backgroundColor: '#f38f2e',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
            <a 
              onClick={requestGyroPermission} 
              style={{ 
                position: 'relative',
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                backgroundColor: 'transparent',
                color: 'white',
                textDecoration: 'none',
                textAlign: 'center',
                lineHeight: 'normal',
                fontSize: '17px',
                transition: 'background-color 0.3s, transform 0.3s',
                fontFamily: 'Source Sans Pro, sans-serif',
                fontWeight: 500,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
              <span style={{ marginBottom: '2px' }}>Enable</span>
              <span>360° Rotation</span>
            </a>
            <div 
              style={{ 
                position: 'absolute',
                width: '130%',
                height: '130%',
                borderRadius: '50%',
                border: '2px solid orange',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: -1
              }} 
            />
          </div>
        </div>
      )}
      
      {/* RSVP Button */}
      {showButtons && (
        <a href="https://slopes.events-liontree.com/i/preview/rsvp" target="_blank" rel="noopener noreferrer" style={{ 
          position: 'absolute', 
          bottom: '50px', 
          left: '50%', 
          transform: 'translateX(-50%)', 
          display: 'inline-block', 
          width: '200px', // Same width as other buttons
          padding: '10px 0', // Same padding
          borderRadius: '20px', // Same border radius
          backgroundColor: '#00A9E4', 
          color: 'white', 
          textDecoration: 'none', 
          textAlign: 'center', 
          boxShadow: 'none', // Same shadow effect
          transition: 'background-color 0.3s, transform 0.3s', 
          fontFamily: 'Source Sans Pro, sans-serif', // Use Source Sans Pro font
          fontWeight: 400 // Regular weight
        }}>
          Confirm Details
        </a>
      )}

      {/* 2024 Recap Button */}
      {showButtons && (
        <a href="https://vimeo.com/alexhoxie/review/920675397/6133175eb0" target="_blank" rel="noopener noreferrer" style={{ 
          position: 'absolute', 
          bottom: '100px', 
          left: '50%', 
          transform: 'translateX(-50%)', 
          display: 'inline-block', 
          width: '200px', // Same width as other buttons
          padding: '10px 0', // Same padding
          borderRadius: '20px', // Same border radius
          backgroundColor: '#f38f2e', 
          color: 'white', 
          textDecoration: 'none', 
          textAlign: 'center', 
          boxShadow: 'none', // Same shadow effect
          transition: 'background-color 0.3s, transform 0.3s', 
          fontFamily: 'Source Sans Pro, sans-serif', // Use Source Sans Pro font
          fontWeight: 400 // Regular weight
        }}>
          2024 Recap
        </a>
      )}

      {/* Display camera position and lookAtX */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        color: 'white',
        fontSize: '16px',
        zIndex: 10
      }}>
        <div>Camera Y Position: {cameraYPosition.toFixed(2)}</div>
        <div>Look At X: {lookAtX.toFixed(2)}</div>
      </div>
    </div>
  );
}

export default App;