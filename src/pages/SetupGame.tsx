import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { api } from '../services/api'

interface Card {
  id: string
  name: string
  type: 'SUSPECT' | 'WEAPON' | 'ROOM'
}

interface Player {
  name: string
  isMe: boolean
  cardCount: number
}

export function SetupGame() {
  const { gameId } = useParams()
  const navigate = useNavigate()

  const [cards, setCards] = useState<Card[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(false)

  const [gameName, setGameName] = useState('')
  const [playerCount, setPlayerCount] = useState(0)

  const [myCards, setMyCards] = useState<string[]>([])

  const TOTAL_GAME_CARDS = 24

  useEffect(() => {
    loadCards()
    loadGame()
  }, [])

  async function loadCards() {
    try {
      const response = await api.get('/cards')
      setCards(response.data)
    } catch (error) {
      console.error(error)
      alert('Erro ao carregar cartas')
    }
  }

  async function loadGame() {
    try {
      const response = await api.get(`/games/${gameId}`)
      const count = response.data.playerCount

      setGameName(response.data.name)
      setPlayerCount(count)
      generatePlayers(count)
    } catch (error) {
      console.error(error)
      alert('Erro ao carregar partida')
    }
  }

  function generatePlayers(count: number) {
    const baseCards = Math.floor(TOTAL_GAME_CARDS / count)
    const remainder = TOTAL_GAME_CARDS % count

    const initialPlayers: Player[] = Array.from(
      { length: count },
      (_, index) => ({
        name: '',
        isMe: index === 0,
        cardCount: index < remainder ? baseCards + 1 : baseCards,
      })
    )

    setPlayers(initialPlayers)
  }

  function updatePlayer(
    index: number,
    field: keyof Player,
    value: string | boolean | number
  ) {
    const updated = [...players]

    updated[index] = {
      ...updated[index],
      [field]: value,
    }

    setPlayers(updated)
  }

  function toggleCard(cardId: string) {
    const me = players.find((player) => player.isMe)

    if (!me) {
      return
    }

    if (myCards.includes(cardId)) {
      setMyCards(myCards.filter((card) => card !== cardId))
      return
    }

    if (myCards.length >= me.cardCount) {
      alert(`Você informou possuir apenas ${me.cardCount} cartas.`)
      return
    }

    setMyCards([...myCards, cardId])
  }

  async function handleSubmit() {
    const totalDistributedCards = players.reduce(
      (sum, player) => sum + player.cardCount,
      0
    )

    if (totalDistributedCards !== TOTAL_GAME_CARDS) {
      alert(
        `A soma das cartas dos jogadores deve ser ${TOTAL_GAME_CARDS}. Atualmente está ${totalDistributedCards}.`
      )
      return
    }

    const me = players.find((player) => player.isMe)

    if (me && myCards.length !== me.cardCount) {
      alert(
        `Você informou possuir ${me.cardCount} cartas, mas marcou ${myCards.length}.`
      )
      return
    }

    try {
      setLoading(true)

      await api.post(`/games/${gameId}/setup`, {
        players,
        myCards,
      })

      navigate(`/games/${gameId}`)
    } catch (error) {
      console.error(error)
      alert('Erro ao configurar partida')
    } finally {
      setLoading(false)
    }
  }

  const suspects = cards.filter((card) => card.type === 'SUSPECT')
  const weapons = cards.filter((card) => card.type === 'WEAPON')
  const rooms = cards.filter((card) => card.type === 'ROOM')

  const totalDistributedCards = players.reduce(
    (sum, player) => sum + player.cardCount,
    0
  )

  const me = players.find((player) => player.isMe)
  const cardsRemaining = (me?.cardCount || 0) - myCards.length

  return (
    <div
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '24px',
      }}
    >
      <button
        onClick={() => navigate('/')}
        style={{
          padding: '8px 16px',
          marginBottom: '20px',
          cursor: 'pointer',
        }}
      >
        ← Voltar
      </button>

      <h1>Configuração Inicial</h1>

      <p>
        <strong>Partida:</strong> {gameName}
      </p>
      <p>
        <strong>Jogadores:</strong> {playerCount}
      </p>

      <hr style={{ margin: '24px 0' }} />

      <h2>Jogadores</h2>

      {players.map((player, index) => (
        <div
          key={index}
          style={{
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '12px',
          }}
        >
          <h3>Jogador {index + 1}</h3>

          <input
            placeholder="Nome do jogador"
            value={player.name}
            onChange={(e) => updatePlayer(index, 'name', e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              marginBottom: '12px',
              boxSizing: 'border-box',
            }}
          />

          <input
            type="number"
            value={player.cardCount}
            onChange={(e) =>
              updatePlayer(index, 'cardCount', Number(e.target.value))
            }
            style={{
              width: '120px',
              padding: '8px',
              marginRight: '12px',
            }}
          />

          <label>
            <input
              type="radio"
              checked={player.isMe}
              onChange={() => {
                const updated = players.map((p) => ({
                  ...p,
                  isMe: false,
                }))

                updated[index].isMe = true
                setPlayers(updated)
              }}
            />{' '}
            Sou eu
          </label>
        </div>
      ))}

      <hr style={{ margin: '32px 0' }} />

      <h2>Minhas Cartas</h2>

      <p>
        Selecionadas: <strong>{myCards.length}</strong>
        {me && (
          <>
            {' '}
            de <strong>{me.cardCount}</strong>
          </>
        )}
      </p>

      <section style={{ marginBottom: '32px' }}>
        <h3>🕵️ Suspeitos</h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '10px',
          }}
        >
          {suspects.map((card) => (
            <label
              key={card.id}
              style={{
                border: '1px solid #ccc',
                borderRadius: '8px',
                padding: '10px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={myCards.includes(card.id)}
                onChange={() => toggleCard(card.id)}
                style={{
                  marginRight: '8px',
                }}
              />
              {card.name}
            </label>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h3>🔪 Armas</h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '10px',
          }}
        >
          {weapons.map((card) => (
            <label
              key={card.id}
              style={{
                border: '1px solid #ccc',
                borderRadius: '8px',
                padding: '10px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={myCards.includes(card.id)}
                onChange={() => toggleCard(card.id)}
                style={{
                  marginRight: '8px',
                }}
              />
              {card.name}
            </label>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h3>🏠 Locais</h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '10px',
          }}
        >
          {rooms.map((card) => (
            <label
              key={card.id}
              style={{
                border: '1px solid #ccc',
                borderRadius: '8px',
                padding: '10px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={myCards.includes(card.id)}
                onChange={() => toggleCard(card.id)}
                style={{
                  marginRight: '8px',
                }}
              />
              {card.name}
            </label>
          ))}
        </div>
      </section>

      <div
        style={{
          padding: '16px',
          marginBottom: '24px',
          borderRadius: '8px',
          backgroundColor:
            totalDistributedCards === TOTAL_GAME_CARDS && cardsRemaining === 0
              ? '#e8f5e9'
              : '#ffebee',
        }}
      >
        <p>
          <strong>Cartas distribuídas:</strong> {totalDistributedCards} /{' '}
          {TOTAL_GAME_CARDS}
        </p>

        {totalDistributedCards !== TOTAL_GAME_CARDS && (
          <p>⚠️ A soma das cartas dos jogadores deve ser 24.</p>
        )}

        {cardsRemaining !== 0 && (
          <p>⚠️ Você precisa selecionar exatamente {me?.cardCount} cartas.</p>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          cursor: 'pointer',
        }}
      >
        {loading ? 'Salvando...' : 'Iniciar Partida'}
      </button>
    </div>
  )
}