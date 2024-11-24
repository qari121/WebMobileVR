import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { DeviceOrientationControls } from 'three/examples/jsm/controls/DeviceOrientationControls.js'
function GyroscopeScene() {
  const mountRef = useRef(null)
  const [hasGyroPermission, setHasGyroPermission] = useState(false)

  useEffect(() => {
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.z = 15

    // Video setup
    const video = document.createElement('video')
    video.src = videoSource
    video.loop = true
    video.muted = true
    video.play()

    const videoTexture = new THREE.VideoTexture(video)
    videoTexture.minFilter = THREE.LinearFilter
    videoTexture.magFilter = THREE.LinearFilter
    videoTexture.format = THREE.RGBFormat

    // Calculate plane dimensions
    const fov = 75
    const distance = 15
    const vFov = (fov * Math.PI) / 180
    const planeHeight = 2 * Math.tan(vFov / 2) * distance
    const planeWidth = planeHeight * (window.innerWidth / window.innerHeight)

    // Create video plane
    const planeGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight)
    const planeMaterial = new THREE.MeshBasicMaterial({ 
      map: videoTexture,
      side: THREE.DoubleSide 
    })
    const videoPlane = new THREE.Mesh(planeGeometry, planeMaterial)
    videoPlane.position.z = -15
    scene.add(videoPlane)

    // Diamond sphere setup
    const diamondGroup = new THREE.Group()
    scene.add(diamondGroup)

    const numRings = 16
    const diamondsPerRing = 24
    const numLayers = 8
    const maxRadius = 8
    const diamonds = []
    const initialPositions = []
    const layerRotationSpeeds = Array(numLayers).fill(0).map(() => 
      0.3 + Math.random() * 0.5
    )

    // Create diamonds
    for (let layer = 0; layer < numLayers; layer++) {
      const layerRadius = (layer + 1) * (maxRadius / numLayers)
      
      for (let ring = 0; ring < numRings; ring++) {
        const phi = Math.PI * (ring / (numRings - 1))
        
        for (let i = 0; i < diamondsPerRing; i++) {
          const theta = (i / diamondsPerRing) * Math.PI * 2
          
          const geometry = new THREE.OctahedronGeometry(0.3)
          const material = new THREE.MeshBasicMaterial({ map: videoTexture })
          const diamond = new THREE.Mesh(geometry, material)

          const x = layerRadius * Math.sin(phi) * Math.cos(theta)
          const y = layerRadius * Math.sin(phi) * Math.sin(theta)
          const z = layerRadius * Math.cos(phi)

          diamond.position.set(x, y, z)
          initialPositions.push({ x, y, z })

          diamond.rotation.x = Math.random() * Math.PI
          diamond.rotation.y = Math.random() * Math.PI
          diamond.rotation.z = Math.random() * Math.PI

          diamondGroup.add(diamond)
          diamonds.push(diamond)
        }
      }
    }

    // Renderer setup
    const renderer = new THREE.WebGLRenderer()
    renderer.setSize(window.innerWidth, window.innerHeight)
    mountRef.current.appendChild(renderer.domElement)

    // Controls setup
    let controls

    const initGyroControls = () => {
      controls = new DeviceOrientationControls(camera)
      setHasGyroPermission(true)
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

    // Animation
    let time = 0
    function animate() {
      requestAnimationFrame(animate)
      time += 0.02

      if (controls) {
        controls.update()
      }

      diamonds.forEach((diamond, index) => {
        const initialPos = initialPositions[index]
        const layerIndex = Math.floor(index / (diamondsPerRing * numRings))
        
        const layerDelay = layerIndex * 0.8
        const convergence = Math.max(0, Math.sin(time * 1.5 - layerDelay) * 0.9)
        const convergenceScale = 1 - convergence

        const layerSpeed = layerRotationSpeeds[layerIndex]
        const rotationAngle = time * layerSpeed

        const rotatedX = initialPos.x * Math.cos(rotationAngle) - initialPos.y * Math.sin(rotationAngle)
        const rotatedY = initialPos.x * Math.sin(rotationAngle) + initialPos.y * Math.cos(rotationAngle)
        const rotatedZ = initialPos.z

        diamond.position.x = rotatedX * convergenceScale
        diamond.position.y = rotatedY * convergenceScale
        diamond.position.z = rotatedZ * convergenceScale

        const rotationSpeed = 0.02 + (layerIndex * 0.003)
        diamond.rotation.x += rotationSpeed
        diamond.rotation.y += rotationSpeed
        diamond.rotation.z += rotationSpeed

        const scale = 0.9 + convergence * 0.2
        diamond.scale.set(scale, scale, scale)
      })

      renderer.render(scene, camera)
    }
    animate()

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      if (controls) {
        controls.dispose()
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

export default GyroscopeScene 