import { BrowserRouter, Routes, Route } from 'react-router-dom'

import { Home } from '../pages/Home'
import { SetupGame } from '../pages/SetupGame'
import { GameBoard } from '../pages/GameBoard'
import { SuggestionHistory } from '../pages/SuggestionHistory'


export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/setup/:gameId" element={<SetupGame />} />
        <Route path="/games/:gameId" element={<GameBoard />} />
        <Route path="/games/:gameId/suggestions" element={<SuggestionHistory />} />        
      </Routes>
    </BrowserRouter>
  )
}