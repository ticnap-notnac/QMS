import { useState } from 'react'
import { fetchTemplates } from '@/services/auditChecklistService'

export function useISOTemplates({ currentAuthId, setToast }) {
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false)
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)

  const fetchAndOpenTemplates = async () => {
    setIsTemplatesModalOpen(true)
    setLoadingTemplates(true)
    try {
      // Pass the authId so it filters properly per site if backend requires
      const data = await fetchTemplates(currentAuthId)
      setTemplates(data || [])
    } catch (error) {
      console.error('Failed to fetch templates:', error)
      setToast?.({ message: 'Failed to load ISO templates.', type: 'error' })
    } finally {
      setLoadingTemplates(false)
    }
  }

  const closeTemplatesModal = () => {
    setIsTemplatesModalOpen(false)
    setTimeout(() => {
      setSelectedTemplate(null)
    }, 200) // slight delay to prevent flicker during closing animation
  }

  return {
    isTemplatesModalOpen,
    loadingTemplates,
    templates,
    selectedTemplate,
    setSelectedTemplate,
    fetchAndOpenTemplates,
    closeTemplatesModal
  }
}
