import { useState } from 'react'

const RECENTLY_VIEWED_KEY = 'dcc_recently_viewed'
const RECENTLY_VIEWED_LIMIT = 10

function loadPersistedRecentlyViewed() {
  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function persistRecentlyViewed(list) {
  try {
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(list))
  } catch {
    // silent fail
  }
}

export function useDCCFolderNav() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [recentlyViewed, setRecentlyViewed] = useState(loadPersistedRecentlyViewed)
  const [selectedTaskFolder, setSelectedTaskFolder] = useState(null)

  function addRecentlyViewed(item) {
    const entry = {
      id: item.id,
      label: item.label,
      path: item.path ?? null,
      when: new Date().toISOString(),
    }
    setRecentlyViewed((prev) => {
      const next = [entry, ...prev.filter((p) => p.id !== entry.id)].slice(
        0,
        RECENTLY_VIEWED_LIMIT,
      )
      persistRecentlyViewed(next)
      return next
    })
  }

  function openFolder(item, clearStatesCallback) {
    setSelectedFolder(item)
    setSelectedTaskFolder(null)
    setSearchQuery('')
    if (clearStatesCallback) clearStatesCallback()
    addRecentlyViewed(item)
  }

  function closeFolder(clearStatesCallback) {
    setSelectedFolder(null)
    setSelectedTaskFolder(null)
    setSearchQuery('')
    if (clearStatesCallback) clearStatesCallback()
  }

  function openTaskFolder(item, loadReportsCallback) {
    setSelectedTaskFolder(item)
    setSearchQuery('')
    if (loadReportsCallback) loadReportsCallback(item)
  }

  function closeTaskFolder(clearReportsCallback) {
    setSelectedTaskFolder(null)
    setSearchQuery('')
    if (clearReportsCallback) clearReportsCallback()
  }

  return {
    searchQuery,
    setSearchQuery,
    selectedFolder,
    setSelectedFolder,
    recentlyViewed,
    selectedTaskFolder,
    setSelectedTaskFolder,
    openFolder,
    closeFolder,
    openTaskFolder,
    closeTaskFolder
  }
}
