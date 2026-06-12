import axios from 'axios'

export const api = axios.create({
  baseURL: 'https://detective-backend-o3ba.onrender.com'
})