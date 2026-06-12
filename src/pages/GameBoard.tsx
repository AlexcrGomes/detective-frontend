import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { api } from '../services/api'

interface BoardPlayer {
  id: string
  name: string
  isMe: boolean
}

interface PlayerNote {
  noteId: string
  playerId: string
  status: 'HAS' | 'DOES_NOT_HAVE' | 'UNKNOWN'
  observation: string | null
}

interface BoardCard {
  cardId: string
  cardName: string
  cardType: 'SUSPECT' | 'WEAPON' | 'ROOM'
  players: PlayerNote[]
}

interface BoardResponse {
  gameId: string
  players: BoardPlayer[]
  cards: BoardCard[]
}

interface SuggestionResponse {
  id: string
  gameId: string
  askedByPlayerId: string
  suspectCardId: string
  weaponCardId: string
  roomCardId: string
  responderId: string | null
  createdAt: string
}

export function GameBoard() {
  const { gameId } = useParams()
  const navigate = useNavigate()

  const [board, setBoard] = useState<BoardResponse | null>(null)
  const [loading, setLoading] = useState(true)

  // Estado para feedbacks e avisos na tela
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Estados da sugestão
  const [showSuggestion, setShowSuggestion] = useState(false)
  const [askingPlayerId, setAskingPlayerId] = useState('')
  const [suspectId, setSuspectId] = useState('')
  const [weaponId, setWeaponId] = useState('')
  const [roomId, setRoomId] = useState('')
  const [answers, setAnswers] = useState<
    Record<string, 'HAS' | 'DOES_NOT_HAVE' | 'UNKNOWN'>
  >({})

  // Estado para armazenar qual carta o jogador específico mostrou
  const [shownCards, setShownCards] = useState<Record<string, string>>({})

  useEffect(() => {
    loadBoard()
  }, [])

  // Identifica quem sou eu no jogo
  const me = board?.players.find((p) => p.isMe)
  // Verifica se o jogador que fez a pergunta fui eu
  const isAskedByMe = askingPlayerId === me?.id

  // Lista de jogadores que devem responder (todos MENOS quem perguntou)
  const playersToAnswer = board
    ? board.players.filter((player) => player.id !== askingPlayerId)
    : []

  // Efeito para definir 'Não respondeu' (UNKNOWN) como padrão para os jogadores que vão responder
  useEffect(() => {
    if (askingPlayerId && board) {
      const defaultAnswers: Record<string, 'UNKNOWN'> = {}
      
      playersToAnswer.forEach((player) => {
        defaultAnswers[player.id] = 'UNKNOWN'
      })

      setAnswers(defaultAnswers)
      setShownCards({}) 
    } else {
      setAnswers({})
      setShownCards({})
    }
  }, [askingPlayerId])

  async function loadBoard() {
    try {
      const response = await api.get(`/games/${gameId}/board`)
      setBoard(response.data)
    } catch (error) {
      console.error(error)
      setMessage({ text: 'Erro ao carregar quadro do jogo.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // Função para finalizar a partida e retornar para a Home
  function handleFinishGame() {
    setMessage({ text: 'Jogo encerrado com sucesso! Redirecionando...', type: 'success' })
    
    setTimeout(() => {
      navigate('/')
    }, 5000)
  }

  // Função para enviar a sugestão e atualizar a tela
  async function handleConfirmSuggestion() {
    if (!askingPlayerId || !suspectId || !weaponId || !roomId) {
      setMessage({ text: 'Por favor, preencha todos os campos da sugestão.', type: 'error' })
      return
    }

    if (isAskedByMe) {
      const missingCardSelection = playersToAnswer.some(
        (p) => answers[p.id] === 'HAS' && !shownCards[p.id]
      )
      if (missingCardSelection) {
        setMessage({ text: 'Por favor, selecione qual carta o jogador te mostrou.', type: 'error' })
        return
      }
    }

    const checks = playersToAnswer
      .filter((player) => {
        const answer = answers[player.id] || 'UNKNOWN'
        return answer !== 'UNKNOWN'
      })
      .map((player) => {
        const answer = answers[player.id]
        return {
          playerId: player.id,
          responded: answer === 'HAS',
        }
      })

    const payload = {
      askedByPlayerId: askingPlayerId,
      suspectCardId: suspectId,
      weaponCardId: weaponId,
      roomCardId: roomId,
      checks,
    }

    try {
      setLoading(true)
      
      await api.post<SuggestionResponse>(`/games/${gameId}/suggestions`, payload)

      if (isAskedByMe) {
        const patchPromises = Object.entries(shownCards)
          .filter(([playerId, cardId]) => answers[playerId] === 'HAS' && cardId)
          .map(([playerId, cardId]) => {
            return api.patch(`/games/${gameId}/notes`, {
              playerId, 
              cardId,   
              status: 'HAS',
              observation: 'Mostrou a carta na sugestão',
            })
          })

        if (patchPromises.length > 0) {
          await Promise.all(patchPromises)
        }
      }
      
      setMessage({ text: 'Sugestão e notas registradas com sucesso!', type: 'success' })

      setShowSuggestion(false)
      setAskingPlayerId('')
      setSuspectId('')
      setWeaponId('')
      setRoomId('')
      setAnswers({})
      setShownCards({})

      setTimeout(() => setMessage(null), 5000)

      // Pequena pausa estratégica para o banco consolidar e então recarrega
      await new Promise((resolve) => setTimeout(resolve, 300))
      await loadBoard()
    } catch (error) {
      console.error(error)
      setMessage({ text: 'Erro ao confirmar sugestão de jogo.', type: 'error' })
      setLoading(false)
    }
  }

  function getStatusSymbol(status?: 'HAS' | 'DOES_NOT_HAVE' | 'UNKNOWN') {
    switch (status) {
      case 'HAS':
        return '✅'
      case 'DOES_NOT_HAVE':
        return '❌'
      default:
        return '❓'
    }
  }

  function getStatusColor(status?: 'HAS' | 'DOES_NOT_HAVE' | 'UNKNOWN') {
    switch (status) {
      case 'HAS':
        return '#d4edda'
      case 'DOES_NOT_HAVE':
        return '#f8d7da'
      default:
        return '#f1f3f5'
    }
  }

  if (loading) {
    return <div style={{ padding: '24px' }}>Carregando...</div>
  }

  if (!board) {
    return <div style={{ padding: '24px' }}>Não foi possível carregar a partida.</div>
  }

  const suspects = board.cards.filter((card) => card.cardType === 'SUSPECT')
  const weapons = board.cards.filter((card) => card.cardType === 'WEAPON')
  const rooms = board.cards.filter((card) => card.cardType === 'ROOM')

  const currentSuspect = suspects.find((c) => c.cardId === suspectId)
  const currentWeapon = weapons.find((c) => c.cardId === weaponId)
  const currentRoom = rooms.find((c) => c.cardId === roomId)

  function renderSection(title: string, cards: BoardCard[]) {
    return (
      <div style={{ marginBottom: '40px' }}>
        <h2>{title}</h2>

        <div
          style={{
            overflowX: 'auto',
            border: '1px solid #ddd',
            borderRadius: '8px',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: '700px',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>
                  Carta
                </th>

                {board?.players?.map((player) => (
                  <th key={player.id} style={{ padding: '12px', border: '1px solid #ddd' }}>
                    {player.name}
                    {player.isMe && (
                      <div style={{ fontSize: '12px', color: '#1971c2' }}>Você</div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {cards.map((card) => (
                <tr key={card.cardId}>
                  <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 500 }}>
                    {card.cardName}
                  </td>

                  {/* SOLUÇÃO DO ALINHAMENTO DO QUADRO: 
                      Percorremos a ordem fixa dos jogadores (board.players) e procuramos a nota correta daquele jogador específica nesta carta */}
                  {board?.players?.map((player) => {
                    const playerNote = card.players.find((note) => note.playerId === player.id)
                    
                    return (
                      <td
                        key={player.id}
                        style={{
                          textAlign: 'center',
                          padding: '10px',
                          border: '1px solid #ddd',
                          backgroundColor: getStatusColor(playerNote?.status),
                          fontSize: '20px',
                        }}
                      >
                        {getStatusSymbol(playerNote?.status)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>🎲 Quadro do Detetive</h1>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => navigate(`/games/${gameId}/suggestions`)}
            style={{
              padding: '10px 16px',
              backgroundColor: '#495057',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            📋 Ver Histórico
          </button>

          <button
            onClick={() => setShowSuggestion(!showSuggestion)}
            style={{ padding: '10px 16px', cursor: 'pointer' }}
          >
            Fazer Sugestão
          </button>

          <button
            onClick={handleFinishGame}
            style={{
              padding: '10px 16px',
              backgroundColor: '#dc3545',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Finalizar Jogo
          </button>
        </div>
      </div>

      {message && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '20px',
            fontWeight: 500,
            backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
            color: message.type === 'success' ? '#155724' : '#721c24',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
          }}
        >
          {message.text}
        </div>
      )}

      <div style={{ backgroundColor: '#f8f9fa', padding: '16px', borderRadius: '8px', marginBottom: '32px' }}>
        <strong>Resumo:</strong>
        <div style={{ marginTop: '8px' }}>👥 Jogadores: {board.players.length}</div>
        <div>🕵️ Suspeitos: {suspects.length}</div>
        <div>🔪 Armas: {weapons.length}</div>
        <div>🏠 Locais: {rooms.length}</div>
      </div>

      {showSuggestion && (
        <div style={{ marginBottom: '32px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fafafa' }}>
          <h2>Fazer Sugestão</h2>

          <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
            <div>
              <label>Jogador que perguntou</label>
              <select
                value={askingPlayerId}
                onChange={(e) => setAskingPlayerId(e.target.value)}
                style={{ display: 'block', marginTop: '4px', padding: '6px', width: '100%', maxWidth: '300px' }}
              >
                <option value="">Selecione</option>
                {board.players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name} {player.isMe ? '(Você)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Suspeito</label>
              <select
                value={suspectId}
                onChange={(e) => setSuspectId(e.target.value)}
                style={{ display: 'block', marginTop: '4px', padding: '6px', width: '100%', maxWidth: '300px' }}
              >
                <option value="">Selecione</option>
                {suspects.map((card) => (
                  <option key={card.cardId} value={card.cardId}>
                    {card.cardName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Arma</label>
              <select
                value={weaponId}
                onChange={(e) => setWeaponId(e.target.value)}
                style={{ display: 'block', marginTop: '4px', padding: '6px', width: '100%', maxWidth: '300px' }}
              >
                <option value="">Selecione</option>
                {weapons.map((card) => (
                  <option key={card.cardId} value={card.cardId}>
                    {card.cardName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Local</label>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                style={{ display: 'block', marginTop: '4px', padding: '6px', width: '100%', maxWidth: '300px' }}
              >
                <option value="">Selecione</option>
                {rooms.map((card) => (
                  <option key={card.cardId} value={card.cardId}>
                    {card.cardName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {askingPlayerId && (
            <>
              <h3>Respostas dos jogadores</h3>

              {playersToAnswer.map((player) => (
                <div key={player.id} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                  <strong style={{ minWidth: '120px' }}>
                    {player.name} {player.isMe ? '(Você)' : ''}
                  </strong>

                  <label style={{ cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name={player.id}
                      checked={answers[player.id] === 'DOES_NOT_HAVE'}
                      onChange={() => setAnswers((prev) => ({ ...prev, [player.id]: 'DOES_NOT_HAVE' }))}
                    />
                    Não tem
                  </label>

                  <label style={{ cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name={player.id}
                      checked={answers[player.id] === 'HAS'}
                      onChange={() => setAnswers((prev) => ({ ...prev, [player.id]: 'HAS' }))}
                    />
                    Tem
                  </label>

                  <label style={{ cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name={player.id}
                      checked={answers[player.id] === 'UNKNOWN'}
                      onChange={() => setAnswers((prev) => ({ ...prev, [player.id]: 'UNKNOWN' }))}
                    />
                    Não respondeu
                  </label>

                  {isAskedByMe && answers[player.id] === 'HAS' && (
                    <div style={{ marginLeft: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px', color: '#555' }}>Qual carta mostrou?</span>
                      <select
                        value={shownCards[player.id] || ''}
                        onChange={(e) => setShownCards((prev) => ({ ...prev, [player.id]: e.target.value }))}
                        style={{ padding: '4px', borderRadius: '4px', border: '1px solid #ccc' }}
                      >
                        <option value="">Selecione...</option>
                        {suspectId && <option value={suspectId}>{currentSuspect?.cardName || 'Suspeito Selecionado'}</option>}
                        {weaponId && <option value={weaponId}>{currentWeapon?.cardName || 'Arma Selecionada'}</option>}
                        {roomId && <option value={roomId}>{currentRoom?.cardName || 'Local Selecionado'}</option>}
                      </select>
                    </div>
                  )}
                </div>
              ))}

              <button
                onClick={handleConfirmSuggestion}
                style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }}
              >
                Confirmar Sugestão
              </button>
            </>
          )}
        </div>
      )}

      {renderSection('🕵️ Suspeitos', suspects)}
      {renderSection('🔪 Armas', weapons)}
      {renderSection('🏠 Locais', rooms)}
    </div>
  )
}