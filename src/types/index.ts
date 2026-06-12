export interface Game {
  id: string
  name: string
  playerCount: number
  isSetupComplete: boolean
  createdAt: string
}

export interface Player {
  id: string
  name: string
  isMe: boolean
}

export interface Card {
  id: string
  name: string
  type: string
}

export interface PlayerSetup {
  name: string
  isMe: boolean
  cardCount: number
}