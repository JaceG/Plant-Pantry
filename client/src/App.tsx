import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [health, setHealth] = useState<string>('Checking...');

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setHealth(data.message))
      .catch(() => setHealth('API connection failed'));
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>🌱 Plant Pantry</h1>
        <p>Your plant management application</p>
        <p className="status">Server Status: {health}</p>
      </header>
    </div>
  )
}

export default App
