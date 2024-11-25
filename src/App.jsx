import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { DeviceOrientationControls } from 'three/examples/jsm/controls/DeviceOrientationControls.js';
import videoSource from './assets/footage.mp4';

function App() {
  const mountRef = useRef(null);
  const [hasGyroPermission, setHasGyroPermission] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const controlsRef = useRef(null);
  const cameraRef = useRef(null);
  const videoPlaneRef = useRef(null); // Reference for the video plane
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
    cameraRef.current.position.set(0, 0, 10); // Adjusted for better visibility
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

    // Calculate the aspect ratio
    const aspectRatio = window.innerWidth / window.innerHeight;

    // Set a fixed height for the plane
    const height = 2; // You can adjust this value as needed
    const width = aspectRatio * height; // Calculate width based on aspect ratio

    // Commenting out the video texture for the plane
    // const planeMaterial = new THREE.MeshBasicMaterial({ 
    //   map: videoTexture, // Use video texture
    //   side: THREE.DoubleSide 
    // });
    const planeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }); // Set plane color to white

    // Create the plane geometry based on the aspect ratio
    const planeGeometry = new THREE.PlaneGeometry(width * 12, height * 20);
    const videoPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    videoPlane.position.z = -5; // Position it further back to ensure visibility
    scene.add(videoPlane);
    videoPlaneRef.current = videoPlane; // Store reference to the video plane

    // Set the camera's aspect ratio
    cameraRef.current.aspect = aspectRatio;
    cameraRef.current.updateProjectionMatrix();

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    // Handle window resize
    const handleResize = () => {
      const newAspectRatio = window.innerWidth / window.innerHeight;
      cameraRef.current.aspect = newAspectRatio;
      cameraRef.current.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Load the font and create text geometry
    const loader = new FontLoader();
    loader.load('node_modules/three/examples/fonts/helvetiker_regular.typeface.json', function (font) {
      const textGeometry = new TextGeometry('Hello three.js!', {
        font: font,
        size: 10, // Increase size for better visibility
        height: 0.1,
        curveSegments: 12,
        bevelEnabled: false,
      });

      const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const textMesh = new THREE.Mesh(textGeometry, textMaterial);
      textMesh.position.set(-2, 0, 9); // Position the text in front of the video plane
      scene.add(textMesh); // Add the text mesh to the scene
      console.log('Text mesh added to the scene:', textMesh); // Debug log to confirm text display
    });

    // Commenting out the diamond creation and animation logic

    // Create a blue cube instead
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1); // Create a cube geometry
    const cubeMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x0000ff // Set cube color to blue
    });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial); // Create the cube mesh

    // Position the cube in the scene
    cube.position.set(0, 0, -5); // Adjust position as needed
    scene.add(cube); // Add the cube to the scene

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
          cameraRef.current.position.x = -gamma / 90; // Update x position based on gamma
          cameraRef.current.position.y = beta / 90;   // Update y position based on beta
          cameraRef.current.position.z = 8; // Update z position
          cameraRef.current.lookAt.x = -gamma / 90; // Update lookAt.x based on gamma
          cameraRef.current.lookAt.y = beta / 90;   // Update lookAt.y based on beta

          // Log lookAt.x value
          console.log('lookAt.x:', cameraRef.current.lookAt.x); // Debug log for lookAt.x

          // Update the state with the camera's y position for the debug log
          setCameraYPosition(cameraRef.current.position.y); // Update state with y position
          setLookAtX(cameraRef.current.lookAt.x); // Update state with lookAt.x
        }

        // Render the scene
        renderer.render(scene, cameraRef.current);
      }
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
        Camera Y Position: {cameraYPosition.toFixed(2)}<br />
        LookAt X Position: {lookAtX.toFixed(2)} {/* Display lookAt.x value */}
      </div>
    </div>
  );
}

export default App;