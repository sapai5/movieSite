import { useEffect, useState } from 'react'
import { getLibrary, subscribeLibrary } from '../services/library'

export default function useLibrary() {
  const [library, setLibrary] = useState(getLibrary)
  useEffect(() => subscribeLibrary(() => setLibrary(getLibrary())), [])
  return library
}
