import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../services/api'

interface SuggestionCheck {
  playerId: string
  responded: boolean
}

interface SuggestionHistoryItem {
  id: string
  gameId: string
  askedByPlayerId: string
  suspectCardId: string
  weaponCardId: string
  roomCardId: string
  responderId: string | null
  createdAt: string
  checks: SuggestionCheck[]
}

interface BoardPlayer {
  id: string
  name: string
  isMe: boolean
}

interface BoardCard {
  cardId: string
  cardName: string
}

interface BoardData {
  players: BoardPlayer[]
  cards: BoardCard[]
}

export function SuggestionHistory() {
  const { gameId } = useParams()
  const navigate = useNavigate()

  const [suggestions, setSuggestions] = useState<SuggestionHistoryItem[]>([])
  const [boardData, setBoardData] = useState<BoardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadHistoryData() {
      try {
        const [suggestionsResponse, boardResponse] = await Promise.all([
          api.get<SuggestionHistoryItem[]>(`/games/${gameId}/suggestions`),
          api.get<BoardData>(`/games/${gameId}/board`)
        ])

        const sortedSuggestions = suggestionsResponse.data.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )

        setSuggestions(sortedSuggestions)
        setBoardData(boardResponse.data)
      } catch (error) {
        console.error('Erro ao carregar histórico de sugestões:', error)
      } finally {
        setLoading(false)
      }
    }

    loadHistoryData()
  }, [gameId])

  function getPlayerName(playerId: string) {
    const player = boardData?.players.find((p) => p.id === playerId)
    if (!player) return 'Jogador Desconhecido'
    return player.isMe ? `${player.name} (Você)` : player.name
  }

  function getCardName(cardId: string) {
    const card = boardData?.cards.find((c) => c.cardId === cardId)
    return card ? card.cardName : cardId.replace(/_/g, ' ')
  }

  function formatDateTime(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    })
  }

  if (loading) {
    return <div style={{ padding: '24px' }}>Carregando histórico...</div>
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <button 
          onClick={() => navigate(`/games/${gameId}`)}
          style={{
            padding: '10px 16px',
            cursor: 'pointer',
            backgroundColor: '#495057', 
            color: '#ffffff',           
            border: 'none',
            borderRadius: '4px',
            fontWeight: '600',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
        >
          ⬅ Voltar para o Quadro
        </button>
        <h1 style={{ margin: 0, fontSize: '24px' }}>📋 Histórico de Sugestões</h1>
      </div>

      {suggestions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#868e96', border: '2px dashed #dee2e6', borderRadius: '8px' }}>
          Nenhuma sugestão foi realizada nesta partida ainda.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {suggestions.map((suggestion, index) => {
            const sequenceNumber = suggestions.length - index 

            return (
              <div 
                key={suggestion.id}
                style={{
                  border: '1px solid #dee2e6',
                  borderRadius: '8px',
                  backgroundColor: '#fff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  overflow: 'hidden'
                }}
              >
                <div style={{ 
                  backgroundColor: '#f8f9fa', 
                  padding: '12px 16px', 
                  borderBottom: '1px solid #dee2e6',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontWeight: 'bold', color: '#495057' }}>
                    Sugestão #{sequenceNumber}
                  </span>
                  <span style={{ fontSize: '13px', color: '#868e96' }}>
                    🕒 {formatDateTime(suggestion.createdAt)}
                  </span>
                </div>

                <div style={{ padding: '16px' }}>
                  <p style={{ margin: '0 0 12px 0', fontSize: '16px' }}>
                    <strong>{getPlayerName(suggestion.askedByPlayerId)}</strong> perguntou sobre:
                  </p>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    <span style={{ backgroundColor: '#fff3bf', color: '#66a80f', padding: '6px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: 500, border: '1px solid #fab005' }}>
                      🕵️ {getCardName(suggestion.suspectCardId)}
                    </span>
                    <span style={{ backgroundColor: '#ffe3e3', color: '#c92a2a', padding: '6px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: 500, border: '1px solid #ffc9c9' }}>
                      🔪 {getCardName(suggestion.weaponCardId)}
                    </span>
                    <span style={{ backgroundColor: '#e3fafc', color: '#0b7285', padding: '6px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: 500, border: '1px solid #99e9f2' }}>
                      🏠 {getCardName(suggestion.roomCardId)}
                    </span>
                  </div>

                  <div style={{ borderTop: '1px solid #f1f3f5', paddingTop: '12px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#868e96', display: 'block', marginBottom: '8px' }}>
                      RESPOSTAS DOS JOGADORES:
                    </span>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {suggestion.checks.map((check) => (
                        <div 
                          key={check.playerId} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            fontSize: '14px' 
                          }}
                        >
                          <span>{check.responded ? '✅' : '❌'}</span>
                          <span style={{ fontWeight: check.responded ? 500 : 400 }}>
                            {getPlayerName(check.playerId)}: 
                            <span style={{ 
                              marginLeft: '4px', 
                              color: check.responded ? '#2b8a3e' : '#c92a2a',
                              fontWeight: 'bold'
                            }}>
                              {check.responded ? ' Provou que TEM uma carta' : ' Não tem nenhuma das cartas'}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}