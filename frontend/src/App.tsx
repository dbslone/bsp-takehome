import { useEffect, useState } from 'react'
import { api } from './api'

function App() {
  const [status, setStatus] = useState('checking...')

  useEffect(() => {
    api
      .get<{ status: string }>('/health')
      .then((res) => setStatus(res.data.status))
      .catch(() => setStatus('unreachable'))
  }, [])

  return (
    <main>
      <h1>BSP Takehome</h1>
      <p>
        Backend status: <strong>{status}</strong>
      </p>
    </main>
  )
}

export default App
