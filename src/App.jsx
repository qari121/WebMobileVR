import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { DeviceOrientationControls } from 'three/examples/jsm/controls/DeviceOrientationControls.js';
import videoSource from './assets/footage.mp4';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

function App() {
  const mountRef = useRef(null);
  const [hasGyroPermission, setHasGyroPermission] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const controlsRef = useRef(null);
  const cameraRef = useRef(null);
  const [cameraYPosition, setCameraYPosition] = useState(0);
  const [lookAtX, setLookAtX] = useState(0); // State to hold lookAt.x value

  // Check if the user is on a mobile device
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const mobileCheck = /iPhone|iPad|iPod|Android/i.test(userAgent);
    setIsMobile(mobileCheck);
  }, []);

  // Initialize camera only once
  useEffect(() => {
    cameraRef.current = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    cameraRef.current.position.set(0, 0, 0); // Position the camera at the center
  }, []); // Empty dependency array ensures this runs only once

  const initGyroControls = () => {
    if (cameraRef.current) {
      controlsRef.current = new DeviceOrientationControls(cameraRef.current);
      setHasGyroPermission(true);
      cameraRef.current.lookAt(0, 0, 0);
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

    // Create video element and texture
    const video = document.createElement('video');
    video.src = videoSource;
    video.loop = true;
    video.muted = true; // Required for autoplay to work on iOS
    video.setAttribute('playsinline', 'true'); // Ensure the video plays inline on iOS
    video.setAttribute('webkit-playsinline', 'true'); // For older iOS versions

    // Play video after user interaction (iOS compatibility)
    const playVideo = () => {
      video.play().catch((error) => {
        console.error('Error playing video:', error);
      });
    };

    if (isMobile) {
      // Add a listener for user interaction
      window.addEventListener('touchstart', playVideo, { once: true });
      window.addEventListener('click', playVideo, { once: true });
    } else {
      // For non-mobile devices, autoplay works without interaction
      video.play();
    }

    // Create video texture
    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBFormat;

    // Create a skybox using a cube geometry
    const skyboxGeometry = new THREE.BoxGeometry(100, 100, 100); // Large cube to encompass the scene
    const skyboxMaterial = new THREE.MeshBasicMaterial({
      map: videoTexture,
      side: THREE.BackSide // Render the inside of the cube
    });
    const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
    scene.add(skybox); // Add the skybox to the scene

    // Set the camera's position
    camera.position.set(0, 0, 8); // Position the camera at the center of the skybox

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    // Handle window resize
    const handleResize = () => {
      const newAspectRatio = window.innerWidth / window.innerHeight;
      camera.aspect = newAspectRatio;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Diamond creation and animation logic
    const diamondGroup = new THREE.Group();
    scene.add(diamondGroup);

    const numRings = 16;        // Vertical rings
    const diamondsPerRing = 24; // Diamonds around each ring
    const numLayers = 8;        // Radial layers (depth of sphere)
    const maxRadius = 8;        // Sphere radius
    const diamonds = [];
    const initialPositions = [];

    // Create spherical formation of diamonds
    for (let layer = 0; layer < numLayers; layer++) {
      const layerRadius = (layer + 1) * (maxRadius / numLayers);
      
      for (let ring = 0; ring < numRings; ring++) {
        const phi = Math.PI * (ring / (numRings - 1));  // Vertical angle
        
        for (let i = 0; i < diamondsPerRing; i++) {
          const theta = (i / diamondsPerRing) * Math.PI * 2;  // Horizontal angle
          
          const geometry = new THREE.OctahedronGeometry(0.3);  // Smaller diamonds
          const diamondMaterial = new THREE.MeshBasicMaterial({ map: videoTexture }); // Use video texture for diamonds
          const diamond = new THREE.Mesh(geometry, diamondMaterial);

          // Calculate spherical coordinates
          const x = layerRadius * Math.sin(phi) * Math.cos(theta);
          const y = layerRadius * Math.sin(phi) * Math.sin(theta);
          const z = layerRadius * Math.cos(phi);

          diamond.position.set(x, y, z);
          initialPositions.push({ x, y, z });

          // Random initial rotation
          diamond.rotation.x = Math.random() * Math.PI;
          diamond.rotation.y = Math.random() * Math.PI;
          diamond.rotation.z = Math.random() * Math.PI;

          diamondGroup.add(diamond);
          diamonds.push(diamond);
        }
      }
    }

    // After creating the diamonds and before the animation loop
    const diamondPositions = diamonds.map(diamond => diamond.position);
    const averagePosition = diamondPositions.reduce((acc, pos) => {
      acc.x += pos.x;
      acc.y += pos.y;
      acc.z += pos.z;
      return acc;
    }, { x: 0, y: 0, z: 0 });

    averagePosition.x /= diamonds.length;
    averagePosition.y /= diamonds.length;
    averagePosition.z /= diamonds.length;

    // Load font and create text
    const fontLoader = new FontLoader();
    fontLoader.load('node_modules/three/examples/fonts/helvetiker_bold.typeface.json', (font) => {
      const textGeometry = new TextGeometry('Shifting your perspective', {
        font: font,
        size: 10, // Adjust size as needed
        height: 0.1,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 0.1,
        bevelSize: 0.05,
        bevelOffset: 0,
        bevelSegments: 5
      });

      const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const textMesh = new THREE.Mesh(textGeometry, textMaterial);
      
      // Position the text at the average position of the diamonds
      textMesh.position.set(averagePosition.x, averagePosition.y, averagePosition.z + 1); // Adjust Z for visibility
      scene.add(textMesh); // Add the text mesh to the scene
    });
    
    // Animation loop with layer-by-layer convergence
    let time = 0;

    function animate() {
      requestAnimationFrame(animate);
      
      // Check if the camera is initialized before rendering
      if (cameraRef.current) {
        if (controlsRef.current) {
          controlsRef.current.update();

          // Access alpha, beta, and gamma values
          const { alpha, beta, gamma } = controlsRef.current.deviceOrientation;

          // Update camera position based on device orientation
          cameraRef.current.lookAt.x = -gamma / 90; // Update x position based on gamma
          cameraRef.current.lookAt.y = beta / 90;   // Update y position based on beta
          cameraRef.current.lookAt.z = 8; // Update z position
        //  cameraRef.current.lookAt(0, 0, 0);

          // Update the state with the camera's y position for the debug log
          setCameraYPosition(cameraRef.current.position.y); // Update state with y position
          setLookAtX(cameraRef.current.lookAt.x); // Update state with lookAt.x
        }

        // Convergence logic for diamonds
        diamonds.forEach((diamond, index) => {
          const initialPos = initialPositions[index];
          const layerIndex = Math.floor(index / (diamondsPerRing * numRings));
          
          // Adjust convergence logic to layer by layer
          const layerDelay = layerIndex * 0.5; // Delay for each layer
          const convergence = Math.max(0, Math.sin(time * 1.5 - layerDelay) * 0.9);
          const convergenceScale = 1 - convergence;

          // Calculate rotated positions
          const rotatedX = initialPos.x * Math.cos(time * 0.5) - initialPos.y * Math.sin(time * 0.5);
          const rotatedY = initialPos.x * Math.sin(time * 0.5) + initialPos.y * Math.cos(time * 0.5);
          const rotatedZ = initialPos.z;

          // Update diamond positions based on convergence
          diamond.position.x = rotatedX * convergenceScale;
          diamond.position.y = rotatedY * convergenceScale;
          diamond.position.z = rotatedZ * convergenceScale;

          // Scale adjustment
          const scale = 0.9 + convergence * 0.2;  // Reduced scale variation
          diamond.scale.set(scale, scale, scale);
        });

        // Render the scene
        renderer.render(scene, cameraRef.current);
      }
      time += 0.01; // Increment time for animation
    }
    animate();
    
    // Cleanup
    return () => {
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      mountRef.current.removeChild(renderer.domElement);
      window.removeEventListener('resize', handleResize); // Cleanup resize listener
    };
  }, []);

  return (
    <div 
      ref={mountRef} 
      style={{
        position: 'absolute', // Ensure it covers the entire viewport
        top: 0,              // Align to the top
        left: 0,             // Align to the left
        width: '100%',       // Full width
        height: '100%',      // Full height
        overflow: 'hidden'   // Prevent overflow if necessary
      }}
    >
      {!hasGyroPermission && (
        <button 
          onClick={requestGyroPermission}
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 20px',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            zIndex: 1000
          }}
        >
          Enable Device Motion
        </button>
      )}
      {!isMobile && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '10px 20px',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          border: 'none',
          borderRadius: '5px',
          zIndex: 1000,
          fontSize: '18px',
          textAlign: 'center'
        }}>
          For the best experience, please use a mobile device.
        </div>
      )}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        padding: '10px',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        border: '1px solid #000',
        borderRadius: '5px',
        zIndex: 1000,
        fontSize: '16px'
      }}>
        Camera Y Position: {typeof cameraYPosition === 'number' ? cameraYPosition.toFixed(2) : 'N/A'}<br />
        LookAt X Position: {typeof lookAtX === 'number' ? lookAtX.toFixed(2) : 'N/A'} {/* Display lookAt.x value */}
      </div>
    </div>
  );
}

export default App;