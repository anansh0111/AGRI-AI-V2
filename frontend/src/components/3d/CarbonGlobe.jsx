import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Sphere, Ring, OrbitControls, MeshDistortMaterial } from '@react-three/drei'
import * as THREE from 'three'

function Globe({ value = 0 }) {
  const mesh = useRef(), r1 = useRef(), r2 = useRef()
  const u    = Math.min(value / 5000, 1)

  const color = useMemo(() => {
    const g = new THREE.Color('#22c55e')
    const y = new THREE.Color('#fbbf24')
    const r = new THREE.Color('#ef4444')
    const c = new THREE.Color()
    return u < 0.5 ? c.lerpColors(g, y, u * 2) : c.lerpColors(y, r, (u - 0.5) * 2)
  }, [u])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (mesh.current) {
      mesh.current.rotation.y += 0.005
      mesh.current.rotation.x = Math.sin(t * 0.3) * 0.1
    }
    if (r1.current) {
      r1.current.rotation.z += 0.012
      r1.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.4) * 0.2
    }
    if (r2.current) r2.current.rotation.z -= 0.008
  })

  return (
    <group>
      <Sphere ref={mesh} args={[1, 64, 64]}>
        <MeshDistortMaterial color={color} emissive={color}
          emissiveIntensity={0.2 + u * 0.4} roughness={0.3} metalness={0.6}
          distort={0.15 + u * 0.2} speed={1.5} />
      </Sphere>
      <Sphere args={[0.93, 32, 32]}>
        <meshBasicMaterial color={color} transparent opacity={0.07} />
      </Sphere>
      <Ring ref={r1} args={[1.35, 1.45, 64]}>
        <meshBasicMaterial color={color} transparent opacity={0.35} side={THREE.DoubleSide} />
      </Ring>
      <Ring ref={r2} args={[1.62, 1.67, 64]}>
        <meshBasicMaterial color={color} transparent opacity={0.15} side={THREE.DoubleSide} />
      </Ring>
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 4, 3]} intensity={1.2} />
      <pointLight position={[-3, -2, -3]} intensity={0.6} color={color} />
    </group>
  )
}

export default function CarbonGlobe({ value = 0, size = 220 }) {
  return (
    <div style={{ width: size, height: size }}>
      <Canvas camera={{ position: [0, 0, 3], fov: 45 }}
        gl={{ antialias: true, alpha: true }} style={{ background: 'transparent' }}>
        <Globe value={value} />
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
    </div>
  )
}
