import { useState, useEffect, useMemo, useCallback } from 'react'
import { useLookup } from '@/context/LookupContext'
import useUserManager from '@/hooks/useUserManager'
import { createUser, updateUser } from '@/services/userService'
import { supabase } from '@/utils/supabase'

export default function useAddUserLogic() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL') // 'ALL', 'ACTIVE', 'INACTIVE', 'DEACTIVATED'
  const { roles, departments, sites, loading: lookupsLoading } = useLookup()
  
  const [formMessage, setFormMessage] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [userToDelete, setUserToDelete] = useState(null)
  
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [editFormError, setEditFormError] = useState('')
  const [editFormMessage, setEditFormMessage] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)
  
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    userName: '',
    contactNumber: '',
    roleId: '',
    departmentId: '',
    siteId: '',
  })

  // useUserManager orchestrates the DB interface
  const { 
    items: adminUsers, 
    loading: usersLoading, 
    error: usersError, 
    deletingId: deletingUserId, 
    reload: reloadUsers, 
    createItem: createUserItem, 
    deleteItem 
  } = useUserManager({ createFn: createUser })

  useEffect(() => {
    reloadUsers()
  }, [reloadUsers])

  const handleUserFieldChange = (event) => {
    const { name, value } = event.target
    setNewUser((current) => ({ ...current, [name]: value }))
  }

  const openAddUserModal = () => {
    setFormError('')
    setFormMessage('')
    setNewUser({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      userName: '',
      contactNumber: '',
      roleId: '',
      departmentId: '',
      siteId: '',
    })
    setIsAddUserModalOpen(true)
  }

  const closeAddUserModal = () => {
    if (!submitting) setIsAddUserModalOpen(false)
  }

  const handleSubmitNewUser = async (event) => {
    event.preventDefault()
    try {
      setSubmitting(true)
      setFormError('')
      setFormMessage('')

      if (/\d/.test(newUser.firstName) || /\d/.test(newUser.lastName)) {
        setFormError('Names cannot contain numbers.')
        setSubmitting(false)
        return
      }

      const result = await createUserItem({
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        password: newUser.password,
        userName: newUser.userName,
        contactNumber: newUser.contactNumber,
        roleId: newUser.roleId || null,
        departmentId: newUser.departmentId || null,
        siteId: newUser.siteId || null,
      })

      setFormMessage(`Created ${result.authUser.email} successfully.`)
      setToast({ message: `Created user "${result.authUser.email}" successfully.`, type: 'success' })
      setNewUser({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        userName: '',
        contactNumber: '',
        roleId: '',
        departmentId: '',
        siteId: '',
      })
      await reloadUsers()
      setIsAddUserModalOpen(false)
    } catch (err) {
      setFormError('The user could not be added. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteUser = (user) => {
    setUserToDelete(user)
  }

  const confirmDeleteUser = async () => {
    if (!userToDelete) return
    const displayName = `${userToDelete.first_name || ''} ${userToDelete.last_name || ''}`.trim() || userToDelete.user_name || userToDelete.email
    try {
      setToast(null)
      await deleteItem(userToDelete.id)
      setToast({ message: `Deleted user "${displayName}" successfully.`, type: 'success' })
    } catch (err) {
      console.error('Delete user error:', err)
      setToast({ message: 'This user could not be deleted. Please try again.', type: 'error' })
    } finally {
      setUserToDelete(null)
    }
  }

  const cancelDeleteUser = () => {
    setUserToDelete(null)
  }

  const openEditUserModal = (user) => {
    setEditFormError('')
    setEditFormMessage('')
    setEditingUser({
      id: user.id,
      authId: user.auth_id,
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      email: user.email || '',
      userName: user.user_name || '',
      contactNumber: user.contact_number || '',
      roleId: user.role_id ? String(user.role_id) : '',
      departmentId: user.department_id ? String(user.department_id) : '',
      siteId: user.site_id ? String(user.site_id) : '',
      status: user.status || 'ACTIVE',
    })
    setIsEditUserModalOpen(true)
  }

  const closeEditUserModal = () => {
    if (!editSubmitting) setIsEditUserModalOpen(false)
    setEditingUser(null)
  }

  const handleEditFieldChange = (event) => {
    const { name, value } = event.target
    setEditingUser((cur) => ({ ...cur, [name]: value }))
  }

  const handleSubmitEditUser = async (e) => {
    e.preventDefault()
    if (!editingUser) return
    try {
      setEditSubmitting(true)
      setEditFormError('')
      setEditFormMessage('')
      
      if (
        (editingUser.firstName && /\d/.test(editingUser.firstName)) ||
        (editingUser.lastName && /\d/.test(editingUser.lastName))
      ) {
        setEditFormError('Names cannot contain numbers.')
        setEditSubmitting(false)
        return
      }

      const payload = {}
      if (editingUser.firstName !== undefined) payload.firstName = editingUser.firstName
      if (editingUser.lastName !== undefined) payload.lastName = editingUser.lastName
      if (editingUser.email !== undefined) payload.email = editingUser.email
      if (editingUser.userName !== undefined) payload.userName = editingUser.userName
      if (editingUser.contactNumber !== undefined) payload.contactNumber = editingUser.contactNumber
      if (editingUser.roleId !== undefined) payload.roleId = editingUser.roleId || null
      if (editingUser.departmentId !== undefined) payload.departmentId = editingUser.departmentId || null
      if (editingUser.siteId !== undefined) payload.siteId = editingUser.siteId || null
      if (editingUser.status !== undefined) payload.status = editingUser.status

      await updateUser(editingUser.id, payload)
      setEditFormMessage('User updated successfully.')
      const displayName = `${editingUser.firstName || ''} ${editingUser.lastName || ''}`.trim()
      setToast({ message: `Updated user "${displayName}" successfully.`, type: 'success' })
      await reloadUsers()

      try {
        const { data: { user: current } } = await supabase.auth.getUser()
        if (current && current.id && editingUser.authId === current.id) {
          window.location.reload()
        }
      } catch (err) {
        // ignore
      }

      setTimeout(() => {
        closeEditUserModal()
      }, 700)
    } catch (err) {
      console.error('Update user error:', err)
      setEditFormError('The user account could not be updated. Please try again.')
    } finally {
      setEditSubmitting(false)
    }
  }

  const roleNameById = useMemo(() => new Map((roles || []).map((role) => [String(role.id), role.role_name])), [roles])
  const departmentNameById = useMemo(() => new Map((departments || []).map((department) => [String(department.id), department.department_name])), [departments])
  const siteNameById = useMemo(() => new Map((sites || []).map((site) => [String(site.id), site.site_name])), [sites])

  const filteredUsers = useMemo(() => {
    return adminUsers.filter((user) => {
      // 1. Status Filter
      if (statusFilter !== 'ALL') {
        const userStatus = (user.status || 'ACTIVE').toUpperCase()
        if (userStatus !== statusFilter) return false
      }

      // 2. Search Query
      const search = searchQuery.trim().toLowerCase()
      if (!search) return true
      const roleName = roleNameById.get(String(user.role_id)) || ''
      const departmentName = departmentNameById.get(String(user.department_id)) || ''
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim()
      const haystack = [
        fullName,
        user.user_name,
        user.email,
        user.contact_number,
        roleName,
        departmentName,
      ].join(' ').toLowerCase()
      return haystack.includes(search)
    })
  }, [adminUsers, searchQuery, statusFilter, roleNameById, departmentNameById])

  const usersTableProps = {
    filteredUsers,
    deletingUserId,
    roleNameById,
    departmentNameById,
    siteNameById,
    onEdit: openEditUserModal,
    onDelete: handleDeleteUser,
  }

  const addUserModalProps = {
    isOpen: isAddUserModalOpen,
    onClose: closeAddUserModal,
    onSubmit: handleSubmitNewUser,
    onChange: handleUserFieldChange,
    formData: newUser,
    availableRoles: roles,
    rolesLoading: lookupsLoading,
    availableDepartments: departments,
    departmentsLoading: lookupsLoading,
    availableSites: sites,
    sitesLoading: lookupsLoading,
    loading: submitting,
    error: formError,
    message: formMessage,
  }

  const editUserModalProps = {
    isOpen: isEditUserModalOpen,
    onClose: closeEditUserModal,
    onSubmit: handleSubmitEditUser,
    onChange: handleEditFieldChange,
    formData: editingUser || {},
    availableRoles: roles,
    rolesLoading: lookupsLoading,
    availableDepartments: departments,
    departmentsLoading: lookupsLoading,
    availableSites: sites,
    sitesLoading: lookupsLoading,
    loading: editSubmitting,
    error: editFormError,
    message: editFormMessage,
  }

    const confirmDialogProps = {
      isOpen: !!userToDelete,
      title: 'Delete User',
      message: userToDelete 
        ? `This will delete ${`${userToDelete.first_name || ''} ${userToDelete.last_name || ''}`.trim() || userToDelete.user_name || userToDelete.email} from the users table.\n\nThis does not remove the Supabase auth account unless you also delete it from Auth separately. Continue?`
        : '',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDestructive: true,
      onConfirm: confirmDeleteUser,
      onCancel: cancelDeleteUser,
    }

    return {
      searchQuery,
      setSearchQuery,
      statusFilter,
      setStatusFilter,
      reloadUsers,
      openAddUserModal,
      usersLoading,
      usersError,
      filteredUsers,
      usersTableProps,
      addUserModalProps,
      editUserModalProps,
      confirmDialogProps,
      isEditUserModalOpen,
      closeEditUserModal,
      toast,
      setToast,
    }
}
