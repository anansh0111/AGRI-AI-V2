import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import * as THREE from 'three'

function Terrain({ zones = [] }) {
  const mesh = useRef()
  const N    = 32

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(6, 6, N - 1, N - 1)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i)
      pos.setZ(i, 0.1 * Math.sin(x * 1.5) * Math.cos(y * 1.5) + 0.05 * Math.random())
    }
    geo.computeVertexNormals()
    return geo
  }, [])

  const colorArray = useMemo(() => {
    const pos    = geometry.attributes.position
    const colors = new Float32Array(pos.count * 3)
    const base   = new THREE.Color('#16a34a')
    const warn   = new THREE.Color('#f97316')
    const crit   = new THREE.Color('#ef4444')
    for (let i = 0; i < pos.count; i++) {
      const x = (pos.getX(i) + 3) / 6
      const y = (pos.getY(i) + 3) / 6
      let c = base.clone()
      for (const z of zones) {
        const d = Math.sqrt((x - z.cx) ** 2 + (y - z.cy) ** 2)
        if (d < z.radius) c = c.clone().lerp(z.severity === 'critical' ? crit : warn, (1 - d / z.radius) * 0.85)
      }
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b
    }
    return colors
  }, [geometry, zones])

  geometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3))
  useFrame(() => { if (mesh.current) mesh.current.rotation.z += 0.0003 })

  return (
    <mesh ref={mesh} geometry={geometry} rotation={[-Math.PI / 2.4, 0, 0]}>
      <meshStandardMaterial vertexColors roughness={0.8} />
    </mesh>
  )
}

export default function FieldTerrain3D({
  zones = [{ cx: 0.3, cy: 0.7, radius: 0.15, severity: 'warning' }],
  height = 280,
}) {
  return (
    <div style={{ width: '100%', height }}>
      <Canvas camera={{ position: [0, 5, 7], fov: 50 }}
        gl={{ antialias: true, alpha: true }} style={{ background: 'transparent' }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 8, 5]} intensity={1.4} />
        <pointLight position={[-4, 4, -4]} intensity={0.6} color="#22c55e" />
        <Terrain zones={zones} />
        <Grid position={[0, -0.05, 0]} args={[8, 8]} cellSize={0.5} cellThickness={0.3}
          cellColor="#22c55e" sectionSize={2} sectionThickness={0.8} sectionColor="#16a34a"
          fadeDistance={14} fadeStrength={1} infiniteGrid />
        <OrbitControls enableZoom enablePan={false}
          minPolarAngle={Math.PI / 6} maxPolarAngle={Math.PI / 2.2}
          autoRotate autoRotateSpeed={0.5} />
      </Canvas>
    </div>
  )
}
