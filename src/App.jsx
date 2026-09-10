import Scene3D from './components/Scene3D'
import './App.css'

function App() {
  return (
    <section id="center">
      <h1>Prueba Three.js</h1>
      <p>
        Escena 3D con <code>three</code>, <code>@react-three/fiber</code> y{' '}
        <code>@react-three/drei</code>. Arrastra para orbitar.
      </p>
      <Scene3D />
    </section>
  )
}

export default App
