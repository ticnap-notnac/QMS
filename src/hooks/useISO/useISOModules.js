import { useState } from 'react'
import * as isoService from '@/services/isoService'

export function useISOModules({ setToast }) {
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false)
  const [isAuditTaskModalOpen, setIsAuditTaskModalOpen] = useState(false)
  const [isCapaTaskModalOpen, setIsCapaTaskModalOpen] = useState(false)
  const [isDocumentTaskModalOpen, setIsDocumentTaskModalOpen] = useState(false)
  const [isTrainingTaskModalOpen, setIsTrainingTaskModalOpen] = useState(false)

  const [activeModules, setActiveModules] = useState([])
  const [loadingModules, setLoadingModules] = useState(false)
  const [isModulesModalOpen, setIsModulesModalOpen] = useState(false)
  const [selectedModule, setSelectedModule] = useState(null)
  const [clauses, setClauses] = useState([])
  const [loadingClauses, setLoadingClauses] = useState(false)

  const fetchActiveModules = async () => {
    setLoadingModules(true)
    setIsModulesModalOpen(true)
    try {
      const data = await isoService.fetchActiveIsoStandards()
      setActiveModules(data)
    } catch (err) {
      console.error('Error fetching active ISO standards:', err)
      setToast({ message: 'Failed to load active ISO modules.', type: 'error' })
      setIsModulesModalOpen(false)
    } finally {
      setLoadingModules(false)
    }
  }

  const fetchClausesForModule = async (module) => {
    setLoadingClauses(true)
    setSelectedModule(module)
    try {
      const groups = await isoService.fetchClauseGroupsForStandard(module.id)
      if (!groups || groups.length === 0) {
        setClauses([])
        return
      }

      const groupIds = groups.map(g => g.id)
      const clausesData = await isoService.fetchClausesByGroupIds(groupIds)

      const sorted = (clausesData || []).sort((a, b) =>
        a.clause_number.localeCompare(b.clause_number, undefined, { numeric: true })
      )
      setClauses(sorted)
    } catch (err) {
      console.error('Error fetching clauses for ISO standard:', err)
      setToast({ message: 'Failed to load ISO clauses.', type: 'error' })
      setSelectedModule(null)
    } finally {
      setLoadingClauses(false)
    }
  }

  const openAuditTask = () => { setIsSelectionModalOpen(false); setIsAuditTaskModalOpen(true); }
  const openCapaTask = () => { setIsSelectionModalOpen(false); setIsCapaTaskModalOpen(true); }
  const openDocumentTask = () => { setIsSelectionModalOpen(false); setIsDocumentTaskModalOpen(true); }
  const openTrainingTask = () => { setIsSelectionModalOpen(false); setIsTrainingTaskModalOpen(true); }

  const handleTaskCreation = (taskName) => {
    setIsAuditTaskModalOpen(false)
    setIsCapaTaskModalOpen(false)
    setIsDocumentTaskModalOpen(false)
    setIsTrainingTaskModalOpen(false)

    setToast({
      message: `${taskName} was initialized and committed securely!`,
      type: 'success'
    })
  }

  return {
    isSelectionModalOpen,
    setIsSelectionModalOpen,
    isAuditTaskModalOpen,
    setIsAuditTaskModalOpen,
    isCapaTaskModalOpen,
    setIsCapaTaskModalOpen,
    isDocumentTaskModalOpen,
    setIsDocumentTaskModalOpen,
    isTrainingTaskModalOpen,
    setIsTrainingTaskModalOpen,
    activeModules,
    loadingModules,
    isModulesModalOpen,
    setIsModulesModalOpen,
    selectedModule,
    setSelectedModule,
    clauses,
    loadingClauses,
    fetchActiveModules,
    fetchClausesForModule,
    openAuditTask,
    openCapaTask,
    openDocumentTask,
    openTrainingTask,
    handleTaskCreation
  }
}
