import { useState, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { DeviceOrientationControls } from 'three/examples/jsm/controls/DeviceOrientationControls.js'
import videoSource from './assets/footage.mp4'

function App() {
  const mountRef = useRef(null)
  const [hasGyroPermission, setHasGyroPermission] = useState(false)
  const controlsRef = useRef(null)
  const cameraRef = useRef(null)

  // Initialize camera outside useEffect
  if (!cameraRef.current) {
    cameraRef.current = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    cameraRef.current.position.z = 10
  }

  const initGyroControls = () => {
    if (cameraRef.current) {
      controlsRef.current = new DeviceOrientationControls(cameraRef.current)
      setHasGyroPermission(true)
    }
  }

  const requestGyroPermission = async () => {
    if (typeof DeviceOrientationEvent !== 'undefined' && 
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission()
        if (permission === 'granted') {
          initGyroControls()
        }
      } catch (error) {
        console.error('Error requesting device orientation permission:', error)
      }
    } else if (window.DeviceOrientationEvent) {
      initGyroControls()
    }
  }

  useEffect(() => {
    const scene = new THREE.Scene()
    const camera = cameraRef.current

    // Create video element and texture
    const video = document.createElement('video')
    video.src = videoSource
    video.loop = true
    video.muted = true
    video.play()

    // Create video texture
    const videoTexture = new THREE.VideoTexture(video)
    videoTexture.minFilter = THREE.LinearFilter
    videoTexture.magFilter = THREE.LinearFilter
    videoTexture.format = THREE.RGBFormat

    // Calculate plane dimensions first
    const fov = 75
    const distance = 15  // Same as the plane's z-position
    const vFov = (fov * Math.PI) / 180

    // Create video plane with calculated dimensions
    const planeGeometry = new THREE.PlaneGeometry(85, 90)
    const planeMaterial = new THREE.MeshBasicMaterial({ 
        map: videoTexture,
        side: THREE.DoubleSide 
    })
    const videoPlane = new THREE.Mesh(planeGeometry, planeMaterial)
    videoPlane.position.z = -15
    scene.add(videoPlane)

    // Add window resize handler
    const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
        renderer.setSize(window.innerWidth, window.innerHeight)
        
        // Update plane size on resize
        const newPlaneHeight = 2 * Math.tan(vFov / 2) * distance
        const newPlaneWidth = newPlaneHeight * (window.innerWidth / window.innerHeight)
        videoPlane.geometry = new THREE.PlaneGeometry(newPlaneWidth, newPlaneHeight)
    }

    window.addEventListener('resize', handleResize)

    const renderer = new THREE.WebGLRenderer()
    renderer.setSize(window.innerWidth, window.innerHeight)
    mountRef.current.appendChild(renderer.domElement)

    // Create group for diamonds
    const diamondGroup = new THREE.Group()
    scene.add(diamondGroup)

    // Modified parameters for sphere formation
    const numRings = 16        // Vertical rings
    const diamondsPerRing = 24 // Diamonds around each ring
    const numLayers = 8        // Radial layers (depth of sphere)
    const maxRadius = 8        // Sphere radius
    const diamonds = []
    const initialPositions = []

    // Add this after initialPositions array declaration
    const layerRotationSpeeds = Array(numLayers).fill(0).map(() => 
        0.3 + Math.random() * 0.5  // Random speed between 0.3 and 0.8
    )

    // Create spherical formation of diamonds
    for (let layer = 0; layer < numLayers; layer++) {
        const layerRadius = (layer + 1) * (maxRadius / numLayers)
        
        for (let ring = 0; ring < numRings; ring++) {
            const phi = Math.PI * (ring / (numRings - 1))  // Vertical angle
            
            for (let i = 0; i < diamondsPerRing; i++) {
                const theta = (i / diamondsPerRing) * Math.PI * 2  // Horizontal angle
                
                const geometry = new THREE.OctahedronGeometry(0.3)  // Smaller diamonds
                const material = new THREE.MeshBasicMaterial({ map: videoTexture })
                const diamond = new THREE.Mesh(geometry, material)

                // Calculate spherical coordinates
                const x = layerRadius * Math.sin(phi) * Math.cos(theta)
                const y = layerRadius * Math.sin(phi) * Math.sin(theta)
                const z = layerRadius * Math.cos(phi)

                diamond.position.set(x, y, z)
                initialPositions.push({ x, y, z })

                // Random initial rotation
                diamond.rotation.x = Math.random() * Math.PI
                diamond.rotation.y = Math.random() * Math.PI
                diamond.rotation.z = Math.random() * Math.PI

                diamondGroup.add(diamond)
                diamonds.push(diamond)
            }
        }
    }

    // Animation loop with kaleidoscopic movement
    let time = 0

    function animate() {
        requestAnimationFrame(animate)
        time += 0.01

        if (controlsRef.current) {
          controlsRef.current.update()
        }

        diamonds.forEach((diamond, index) => {
            const initialPos = initialPositions[index]
            const layerIndex = Math.floor(index / (diamondsPerRing * numRings))
            
            // Faster convergence cycle with shorter delays
            const layerDelay = layerIndex * 0.8
            const convergence = Math.max(0, Math.sin(time * 1.5 - layerDelay) * 0.9)
            const convergenceScale = 1 - convergence

            // Different rotation speed for each layer
            const layerSpeed = layerRotationSpeeds[layerIndex]
            const rotationAngle = time * layerSpeed

            // Maintain relative positions during convergence
            const rotatedX = initialPos.x * Math.cos(rotationAngle) - initialPos.y * Math.sin(rotationAngle)
            const rotatedY = initialPos.x * Math.sin(rotationAngle) + initialPos.y * Math.cos(rotationAngle)
            const rotatedZ = initialPos.z

            // Apply scaled position while maintaining structure
            diamond.position.x = rotatedX * convergenceScale
            diamond.position.y = rotatedY * convergenceScale
            diamond.position.z = rotatedZ * convergenceScale

            // Individual diamond rotation
            const rotationSpeed = 0.02 + (layerIndex * 0.003)
            diamond.rotation.x += rotationSpeed
            diamond.rotation.y += rotationSpeed
            diamond.rotation.z += rotationSpeed

            // Scale changes during convergence (reduced to minimize overlap)
            const scale = 0.9 + convergence * 0.2  // Reduced scale variation
            diamond.scale.set(scale, scale, scale)
        })

        renderer.render(scene, camera)
    }
    animate()

    // Cleanup
    return () => {
        if (controlsRef.current) {
          controlsRef.current.dispose()
        }
        window.removeEventListener('resize', handleResize)
        mountRef.current.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div ref={mountRef}>
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
    </div>
  )
}

export default App
