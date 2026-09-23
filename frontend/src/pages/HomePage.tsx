import { useEffect, useState } from 'react'
import { api } from '../api'

function HomePage() {
  const [status, setStatus] = useState('checking...')

  useEffect(() => {
    api
      .get<{ status: string }>('/health')
      .then((res) => setStatus(res.data.status))
      .catch(() => setStatus('unreachable'))
  }, [])

  return (
    <p>
      Backend status: <strong>{status}</strong>
    </p>
  )
}

export default HomePage
