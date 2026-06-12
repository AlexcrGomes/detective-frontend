import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { api } from '../services/api'

export function Home() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [playerCount, setPlayerCount] = useState(4)
  const [loading, setLoading] = useState(false)

  async function handleCreateGame() {
    try {
      setLoading(true)

      const response = await api.post('/games', {
        name,
        playerCount
      })

      navigate(`/setup/${response.data.id}`)
    } catch (error) {
      console.error(error)
      alert('Erro ao criar partida')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Sistema Detetive</h1>

      <div>
        <label>Nome da Partida</label>

        <br />

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <br />

      <div>
        <label>Quantidade de Jogadores</label>

        <br />

        <select
          value={playerCount}
          onChange={(e) => setPlayerCount(Number(e.target.value))}
        >
          <option value={3}>3</option>
          <option value={4}>4</option>
          <option value={5}>5</option>
          <option value={6}>6</option>
        </select>
      </div>

      <br />

      <button
        onClick={handleCreateGame}
        disabled={loading}
      >
        {loading ? 'Criando...' : 'Criar Partida'}
      </button>
    </div>
  )
}