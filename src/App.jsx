import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { DeviceOrientationControls } from 'three/examples/jsm/controls/DeviceOrientationControls.js';
import videoSource from './assets/s25.mp4';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import './fonts/fonts.css';

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

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const mobileCheck = /iPhone|iPad|iPod|Android/i.test(userAgent);
    setIsMobile(mobileCheck);
  }, []);

  useEffect(() => {
    cameraRef.current = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    cameraRef.current.position.set(0, 0, 0);
  }, []);

  const initGyroControls = () => {
    if (cameraRef.current) {
      controlsRef.current = new DeviceOrientationControls(cameraRef.current);
      setHasGyroPermission(true);
      setShowButtons(true);
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
    mountRef.current.appendChild(renderer.domElement);

    const handleResize = () => {
      const newAspectRatio = window.innerWidth / window.innerHeight;
      camera.aspect = newAspectRatio;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    const diamondGroup = new THREE.Group();
    scene.add(diamondGroup);

    const numRings = 16;
    const diamondsPerRing = 24;
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

    let textMesh;
    let textMesh1;
    const fontLoader = new FontLoader();
    fontLoader.load(
      'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json',
      (font) => {
        const textGeometry = new TextGeometry('Shifting your perspective', {
          font,
          size: 0.5,
          height: 0.2,
          curveSegments: 12,
        });
        const textGeometry1 = new TextGeometry('reveals hidden messages', {
          font,
          size: 0.5,
          height: 0.2,
          curveSegments: 12,
        });

        const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        textMesh = new THREE.Mesh(textGeometry, textMaterial);

        const textMaterial1 = new THREE.MeshBasicMaterial({ color: 0xffffff });
        textMesh1 = new THREE.Mesh(textGeometry1, textMaterial1);

        textMesh1.position.set(2, 3, -3);
        textMesh1.rotation.y = -Math.PI / 4;

        textMesh.position.set(-7, 3, 3);
        textMesh.rotation.y = Math.PI / 4;
        scene.add(textMesh1);
        scene.add(textMesh);
      }
    );

    let time = 0;

    function animate() {
      requestAnimationFrame(animate);

      if (cameraRef.current) {
        if (controlsRef.current) {
          controlsRef.current.update();

          const { alpha, beta, gamma } = controlsRef.current.deviceOrientation;

          cameraRef.current.lookAt.x = -gamma / 90;
          cameraRef.current.lookAt.y = beta / 90;
          cameraRef.current.lookAt.z = 8;

          setCameraYPosition(cameraRef.current.position.y);
          setLookAtX(cameraRef.current.lookAt.x);
        }

        if (textMesh) {
          textMesh.position.y = 3 + Math.sin(time * 2) * 0.5;
          textMesh.position.z = 3 + Math.cos(time * 2) * 0.5;
        }

        if (textMesh1) {
          textMesh1.position.y = 1 + Math.sin(time * 2) * 0.5;
          textMesh1.position.z = 1 + Math.cos(time * 2) * 0.5;
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
      time += 0.01;
    }
    animate();

    return () => {
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      mountRef.current.removeChild(renderer.domElement);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div ref={mountRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'hidden' }}>
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '24px',
          color: 'white',
          textAlign: 'center'
        }}>
          Loading...
        </div>
      )}
      {!hasGyroPermission && (
        <a onClick={requestGyroPermission} style={{ 
          position: 'absolute', 
          bottom: '20px', 
          left: '50%', 
          transform: 'translateX(-50%)', 
          display: 'inline-block', 
          width: '100px', 
          height: '100px', 
          padding: '0', 
          borderRadius: '50%', 
          backgroundColor: '#f38f2e', 
          color: 'white', 
          textDecoration: 'none', 
          textAlign: 'center', 
          lineHeight: '100px', 
          fontSize: '16px', 
          transition: 'background-color 0.3s, transform 0.3s', 
          fontFamily: 'Source Sans Pro, sans-serif', 
          fontWeight: 400, 
          boxShadow: 'none' 
        }}>
          Enable Rotation
        </a>
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
          color: 'black', 
          textDecoration: 'none', 
          textAlign: 'center', 
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)', // Same shadow effect
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
          color: 'black', 
          textDecoration: 'none', 
          textAlign: 'center', 
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)', // Same shadow effect
          transition: 'background-color 0.3s, transform 0.3s', 
          fontFamily: 'Source Sans Pro, sans-serif', // Use Source Sans Pro font
          fontWeight: 400 // Regular weight
        }}>
          2024 Recap
        </a>
      )}
    </div>
  );
}

export default App;