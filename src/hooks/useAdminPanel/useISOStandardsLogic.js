import { useState, useEffect, useMemo } from 'react'
import { logAction } from '@/services/logService'
import { supabase } from '@/utils/supabase'

const initialStandardForm = {
  name: '',
  description: '',
  version: '',
}

const initialClauseForm = {
  clauseNumber: '',
  title: '',
  description: '',
}

export default function useISOStandardsLogic({ userName }) {
  const [toast, setToast] = useState(null)
  const [activeSection, setActiveSection] = useState('Add Standard')
  const [clauseMode, setClauseMode] = useState('single')
  
  const [standards, setStandards] = useState([])
  const [loadingStandards, setLoadingStandards] = useState(true)
  
  const [standardForm, setStandardForm] = useState(initialStandardForm)
  const [clauseForm, setClauseForm] = useState(initialClauseForm)
  const [bulkPaste, setBulkPaste] = useState('')
  const [selectedStandardId, setSelectedStandardId] = useState('')
  
  const [savingStandard, setSavingStandard] = useState(false)
  const [savingClause, setSavingClause] = useState(false)
  const [standardError, setStandardError] = useState('')
  const [clauseError, setClauseError] = useState('')
  const [bulkSavedCount, setBulkSavedCount] = useState(null)
  
  const [toggleError, setToggleError] = useState('')
  const [updatingStandardIds, setUpdatingStandardIds] = useState({})
  const [deletingStandardIds, setDeletingStandardIds] = useState({})
  const [updatedStandardId, setUpdatedStandardId] = useState('')
  
  const [clauses, setClauses] = useState([])
  const [loadingClauses, setLoadingClauses] = useState(false)
  const [deletingClauseIds, setDeletingClauseIds] = useState({})
  
  const [standardToDelete, setStandardToDelete] = useState(null)
  const [clauseToDelete, setClauseToDelete] = useState(null)

  const getCurrentAuthId = async () => {
    try {
      const { data } = await supabase.auth.getUser()
      return data?.user?.id || null
    } catch (error) {
      return null
    }
  }

  const logIsoActivity = async (action, details = {}) => {
    await logAction({
      level: 'audit',
      source: 'iso_standards',
      action,
      details: {
        ...details,
        actor: userName || null,
      },
    })
  }

  useEffect(() => {
    const timer = updatedStandardId
      ? window.setTimeout(() => setUpdatedStandardId(''), 1800)
      : null
    return () => {
      if (timer) window.clearTimeout(timer)
    }
  }, [updatedStandardId])

  useEffect(() => {
    const loadStandards = async () => {
      setLoadingStandards(true)
      try {
        const { data, error } = await supabase
          .from('iso_standards')
          .select('id, name, description, version, is_active, created_at')
          .order('created_at', { ascending: false })
        if (error) throw new Error(error.message)
        setStandards(data || [])
        setSelectedStandardId((current) => current || data?.[0]?.id || '')
      } catch (error) {
        setToast({ message: 'We could not load the ISO standards. Please refresh the page.', type: 'error' })
      } finally {
        setLoadingStandards(false)
      }
    }
    loadStandards()
  }, [])

  useEffect(() => {
    if (selectedStandardId && standards.some((standard) => standard.id === selectedStandardId)) return
    setSelectedStandardId(standards[0]?.id || '')
  }, [selectedStandardId, standards])

  const refreshStandards = async () => {
    const { data, error } = await supabase
      .from('iso_standards')
      .select('id, name, description, version, is_active, created_at')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    setStandards(data || [])
    setSelectedStandardId((current) => current || data?.[0]?.id || '')
  }

  const loadClausesForStandard = async (standardId) => {
    setLoadingClauses(true)
    try {
      const { data: groups, error: groupError } = await supabase
        .from('iso_clause_groups')
        .select('id')
        .eq('standard_id', standardId)

      if (groupError) throw new Error(groupError.message)
      if (!groups || groups.length === 0) {
        setClauses([])
        return
      }

      const groupIds = groups.map(g => g.id)
      const { data: clausesData, error: clausesError } = await supabase
        .from('iso_clauses')
        .select('*')
        .in('group_id', groupIds)

      if (clausesError) throw new Error(clausesError.message)

      const sorted = (clausesData || []).sort((a, b) => a.clause_number.localeCompare(b.clause_number, undefined, { numeric: true }))
      setClauses(sorted)
    } catch (err) {
      console.error(err)
      setToast({ message: 'We could not load the ISO clauses. Please try again.', type: 'error' })
    } finally {
      setLoadingClauses(false)
    }
  }

  useEffect(() => {
    if (activeSection === 'Manage Clauses' && selectedStandardId) {
      loadClausesForStandard(selectedStandardId)
    }
  }, [activeSection, selectedStandardId])

  const handleDeleteClause = (clause) => {
    setClauseToDelete(clause)
  }

  const confirmDeleteClause = async () => {
    if (!clauseToDelete) return
    setDeletingClauseIds(prev => ({ ...prev, [clauseToDelete.id]: true }))
    try {
      const { error } = await supabase
        .from('iso_clauses')
        .delete()
        .eq('id', clauseToDelete.id)

      if (error) throw new Error(error.message)

      setClauses(current => current.filter(c => c.id !== clauseToDelete.id))
      setToast({ message: `Clause ${clauseToDelete.clause_number} deleted.`, type: 'success' })
      await logIsoActivity('DELETE_ISO_CLAUSE', { clause_number: clauseToDelete.clause_number, title: clauseToDelete.title })
    } catch (err) {
      console.error(err)
      setToast({ message: 'This clause could not be deleted. Please try again.', type: 'error' })
    } finally {
      setDeletingClauseIds(prev => ({ ...prev, [clauseToDelete.id]: false }))
      setClauseToDelete(null)
    }
  }

  const cancelDeleteClause = () => setClauseToDelete(null)

  const ensureClauseGroup = async (standardId) => {
    const { data: existingGroup, error: groupError } = await supabase
      .from('iso_clause_groups')
      .select('id, title, group_number')
      .eq('standard_id', standardId)
      .order('group_number', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (groupError) throw new Error(groupError.message)
    if (existingGroup?.id) return existingGroup.id
    const standard = standards.find((item) => item.id === standardId)
    const { data: createdGroup, error: createGroupError } = await supabase
      .from('iso_clause_groups')
      .insert({
        standard_id: standardId,
        group_number: '1',
        title: standard?.name ? `${standard.name} Clauses` : 'Clauses',
      })
      .select('id')
      .single()
    if (createGroupError) throw new Error(createGroupError.message)
    return createdGroup.id
  }

  const handleStandardSubmit = async (event) => {
    event.preventDefault()
    const name = standardForm.name.trim()
    const version = standardForm.version.trim()
    if (!name) {
      setStandardError('Name is required.')
      return
    }
    if (!version) {
      setStandardError('Version is required.')
      return
    }
    setSavingStandard(true)
    setStandardError('')
    try {
      const { error } = await supabase
        .from('iso_standards')
        .insert({
          name,
          description: standardForm.description.trim() || null,
          version,
          is_active: true,
        })
        .select('id')
      if (error) throw new Error(error.message)
      await refreshStandards()
      await logIsoActivity('iso_standard_create', {
        name,
        version,
        description: standardForm.description.trim() || null,
      })
      setStandardForm(initialStandardForm)
      setToast({ message: 'ISO standard saved successfully.', type: 'success' })
    } catch (error) {
      setStandardError('The ISO standard could not be saved. Please try again.')
    } finally {
      setSavingStandard(false)
    }
  }

  const handleSingleClauseSubmit = async (event) => {
    event.preventDefault()
    setClauseError('')
    setBulkSavedCount(null)
    const clauseNumber = clauseForm.clauseNumber.trim()
    const title = clauseForm.title.trim()
    if (!selectedStandardId) {
      setClauseError('Select an ISO standard first.')
      return
    }
    if (!clauseNumber) {
      setClauseError('Clause number is required.')
      return
    }
    if (!title) {
      setClauseError('Title is required.')
      return
    }
    setSavingClause(true)
    try {
      const groupId = await ensureClauseGroup(selectedStandardId)
      const payload = {
        group_id: groupId,
        clause_number: clauseNumber,
        title,
        description: clauseForm.description.trim() || null,
        is_active: true,
      }
      const { data: existing, error: findError } = await supabase
        .from('iso_clauses')
        .select('id')
        .eq('group_id', groupId)
        .eq('clause_number', clauseNumber)
        .maybeSingle()
      if (findError) throw new Error(findError.message)
      if (existing?.id) {
        const { error: updateError } = await supabase
          .from('iso_clauses')
          .update({ title: payload.title, description: payload.description, is_active: payload.is_active })
          .eq('id', existing.id)
          .select('id')
        if (updateError) throw new Error(updateError.message)
      } else {
        const { error: insertError } = await supabase
          .from('iso_clauses')
          .insert(payload)
          .select('id')
        if (insertError) throw new Error(insertError.message)
        await logIsoActivity('iso_clause_create', {
          standardId: selectedStandardId,
          clauseNumber,
          title,
          description: clauseForm.description.trim() || null,
        })
      }
      setClauseForm(initialClauseForm)
      setToast({ message: 'Clause saved successfully.', type: 'success' })
    } catch (error) {
      setClauseError(error.message || 'Failed to save clause.')
    } finally {
      setSavingClause(false)
    }
  }

  const handleBulkSubmit = async (event) => {
    event.preventDefault()
    setClauseError('')
    setBulkSavedCount(null)
    if (!selectedStandardId) {
      setClauseError('Select an ISO standard first.')
      return
    }
    const lines = bulkPaste
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    if (!lines.length) {
      setClauseError('Paste at least one clause line.')
      return
    }
    const parsedRows = []
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]
      const separatorIndex = line.indexOf(' ')
      if (separatorIndex === -1) {
        setClauseError(`Line ${index + 1} must include a clause number and title.`)
        return
      }
      const clauseNumber = line.slice(0, separatorIndex).trim()
      const title = line.slice(separatorIndex + 1).trim()
      if (!clauseNumber || !title) {
        setClauseError(`Line ${index + 1} is missing a clause number or title.`)
        return
      }
      parsedRows.push({ clause_number: clauseNumber, title })
    }
    setSavingClause(true)
    try {
      const groupId = await ensureClauseGroup(selectedStandardId)
      const payload = parsedRows.map((row) => ({
        id: crypto.randomUUID(),
        group_id: groupId,
        clause_number: row.clause_number,
        title: row.title,
        description: null,
        is_active: true,
      }))
      const { data, error } = await supabase
        .from('iso_clauses')
        .upsert(payload, { onConflict: 'id' })
        .select('id')
      if (error) throw new Error(error.message)
      const savedCount = data?.length || payload.length
      await logIsoActivity('iso_clause_bulk_create', {
        standardId: selectedStandardId,
        count: savedCount,
        clauses: payload.map((row) => ({ clauseNumber: row.clause_number, title: row.title })),
      })
      setBulkPaste('')
      setBulkSavedCount(savedCount)
      setToast({ message: `${savedCount} clauses saved successfully.`, type: 'success' })
    } catch (error) {
      setClauseError(error.message || 'Failed to save clauses.')
    } finally {
      setSavingClause(false)
    }
  }

  const handleToggleStandard = async (standard) => {
    const nextValue = !standard.is_active
    setToggleError('')
    setUpdatingStandardIds((current) => ({ ...current, [standard.id]: true }))
    try {
      const { error } = await supabase
        .from('iso_standards')
        .update({ is_active: nextValue })
        .eq('id', standard.id)
      if (error) throw new Error(error.message)
      setStandards((current) => current.map((item) => (
        item.id === standard.id ? { ...item, is_active: nextValue } : item
      )))
      setUpdatedStandardId(standard.id)
      setToast({ message: `${standard.name} is now ${nextValue ? 'Active' : 'Inactive'}`, type: 'success' })
    } catch (error) {
      setToggleError('The standard could not be updated. Please try again.')
    } finally {
      setUpdatingStandardIds((current) => ({ ...current, [standard.id]: false }))
    }
  }

  const handleDeleteStandard = (standard) => {
    setStandardToDelete(standard)
  }

  const confirmDeleteStandard = async () => {
    if (!standardToDelete) return
    setToggleError('')
    setDeletingStandardIds((current) => ({ ...current, [standardToDelete.id]: true }))
    try {
      const { error } = await supabase
        .from('iso_standards')
        .delete()
        .eq('id', standardToDelete.id)
      if (error) {
        throw new Error(error.message)
      }
      const standardLabel = `${standardToDelete.name}${standardToDelete.version ? ` - ${standardToDelete.version}` : ''}`
      const performedBy = await getCurrentAuthId()
      await logIsoActivity('DELETE_ISO_STANDARD', {
        entity_type: 'iso_standard',
        entity_id: standardToDelete.id,
        entity_name: standardLabel,
        performed_by: performedBy,
        timestamp: new Date().toISOString(),
        details: `Deleted ISO standard '${standardLabel}' along with all associated clause groups and clauses.`,
      })
      await refreshStandards()
      setToast({ message: `${standardToDelete.name} has been deleted.`, type: 'success' })
    } catch (error) {
      setToast({ message: 'This standard could not be deleted. It may be linked to existing records.', type: 'error' })
    } finally {
      setDeletingStandardIds((current) => ({ ...current, [standardToDelete.id]: false }))
      setStandardToDelete(null)
    }
  }

  const cancelDeleteStandard = () => setStandardToDelete(null)

  const addStandardSectionProps = {
    standardForm,
    setStandardForm,
    handleStandardSubmit,
    savingStandard,
    standardError
  }

  const addClausesSectionProps = {
    clauseMode,
    setClauseMode,
    selectedStandardId,
    setSelectedStandardId,
    loadingStandards,
    standards,
    clauseError,
    handleSingleClauseSubmit,
    clauseForm,
    setClauseForm,
    savingClause,
    handleBulkSubmit,
    bulkPaste,
    setBulkPaste,
    bulkSavedCount
  }

  const manageClausesSectionProps = {
    selectedStandardId,
    setSelectedStandardId,
    loadingStandards,
    standards,
    loadingClauses,
    clauses,
    deletingClauseIds,
    handleDeleteClause
  }

  const toggleStandardsSectionProps = {
    loadingStandards,
    standards,
    toggleError,
    updatingStandardIds,
    deletingStandardIds,
    updatedStandardId,
    handleToggleStandard,
    handleDeleteStandard
  }

  const confirmStandardDialogProps = {
    isOpen: !!standardToDelete,
    title: 'Delete ISO Standard',
    message: standardToDelete ? `Are you sure you want to delete ${standardToDelete.name}? This will also delete all associated clauses and cannot be undone.` : '',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    isDestructive: true,
    onConfirm: confirmDeleteStandard,
    onCancel: cancelDeleteStandard,
  }

  const confirmClauseDialogProps = {
    isOpen: !!clauseToDelete,
    title: 'Delete Clause',
    message: clauseToDelete ? `Are you sure you want to delete clause ${clauseToDelete.clause_number}?` : '',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    isDestructive: true,
    onConfirm: confirmDeleteClause,
    onCancel: cancelDeleteClause,
  }

  return {
    toast,
    setToast,
    activeSection,
    setActiveSection,
    addStandardSectionProps,
    addClausesSectionProps,
    manageClausesSectionProps,
    toggleStandardsSectionProps,
    confirmStandardDialogProps,
    confirmClauseDialogProps
  }
}
