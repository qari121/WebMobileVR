import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { DeviceOrientationControls } from 'three/examples/jsm/controls/DeviceOrientationControls.js';
import videoSource from './assets/s25invitevideo.mp4';
import React from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import icon from '/tilt.png';
import './App.css';

function App() {
  const mountRef = useRef(null);
  const [hasGyroPermission, setHasGyroPermission] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const controlsRef = useRef(null);
  const cameraRef = useRef(null);
  const [showIcon, setShowIcon] = useState(true);

  const initGyroControls = () => {
    if (cameraRef.current) {
      controlsRef.current = new DeviceOrientationControls(cameraRef.current);

      setHasGyroPermission(true);
      setShowButtons(true);

    }
  };

  const onDeviceOrientation = () => {
    console.log('onDeviceOrientation');
    if (cameraRef.current) {


      if (controlsRef.current) {
        console.log(cameraRef.current.rotation);
        controlsRef.current.update();
      }
    }
  };

  const requestGyroPermission = async () => {
    if (!DeviceOrientationEvent) {
      setError(new Error('Device orientation event is not supported by your browser'));
      return false;
    }

    if (
      DeviceOrientationEvent.requestPermission
      && typeof DeviceMotionEvent.requestPermission === 'function'
    ) {
      let permission;
      try {
        permission = await DeviceOrientationEvent.requestPermission();
      } catch (err) {
        setError(err);
        return false;
      }
      if (permission !== 'granted') {
        setError(new Error('Request to access the device orientation was rejected'));
        return false;
      }
    }
    initGyroControls();
    cameraRef.current.position.set(0, 0, 8);
    cameraRef.current.rotation.set(0, 0, 0);
    window.addEventListener('deviceorientation', onDeviceOrientation);

    return true;
  };

  useEffect(() => {
    const scene = new THREE.Scene();
    cameraRef.current = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    cameraRef.current.position.set(0, 0, 0);

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


    let time = 0;
    const slowDownFactor = 0.2;

    function animate() {
      requestAnimationFrame(animate);

      if (cameraRef.current) {

        //diamonds rotation
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

    // Load GLB models
    const gltfLoader = new GLTFLoader();
    gltfLoader.load('./Text1.glb', (gltf) => {
      const model = gltf.scene;
      model.position.set(0, 1.5, 5); // Adjust position as needed
      model.scale.set(.5, .5, .5); // Adjust the scale as needed
      model.rotation.set(0, 80.1, 0); // Adjust the rotation as needed
      scene.add(model);
    });

    gltfLoader.load('./Text2.glb', (gltf) => {
      const model = gltf.scene;
      model.position.set(0, -1.5, 4); // Adjust position as needed
      model.scale.set(.7, .7, .7); // Adjust the scale as needed
      model.rotation.set(0, 80.1, 0); // Adjust the rotation as needed
      scene.add(model);
    });

    const timer = setTimeout(() => {
      setShowIcon(false);
    }, 4000);

    return () => {
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      mountRef.current.removeChild(renderer.domElement);
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div ref={mountRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'hidden' }}>
      {showIcon && (
        <div className="rotate-icon">
          <img src={icon} alt="Rotate your phone" />
        </div>
      )}
      {!hasGyroPermission 
      && (

        
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
                fontFamily: 'Texas Clean, sans-serif', // Changed to Texas Clean font
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
          fontFamily: 'Texas Clean, sans-serif', // Changed to Texas Clean font
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
          fontFamily: 'Texas Clean, sans-serif', // Changed to Texas Clean font
          fontWeight: 400 // Regular weight
        }}>
          2024 Recap
        </a>
      )}

    </div>
  );
}

export default App;