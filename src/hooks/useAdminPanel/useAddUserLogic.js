import { useState, useEffect, useMemo, useCallback } from 'react'
import { useLookup } from '@/context/LookupContext'
import useUserManager from '@/hooks/useUserManager'
import { createUser, updateUser } from '@/services/userService'
import { supabase } from '@/utils/supabase'

export default function useAddUserLogic() {
  const [searchQuery, setSearchQuery] = useState('')
  const { roles, departments, sites, loading: lookupsLoading } = useLookup()
  
  const [formMessage, setFormMessage] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false)
  const [pageMessage, setPageMessage] = useState('')
  const [pageError, setPageError] = useState('')
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
      setPageMessage(`Created user "${result.authUser.email}" successfully.`)
      setPageError('')
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
      setPageError('')
      await deleteItem(userToDelete.id)
      setPageMessage(`Deleted user "${displayName}" successfully.`)
    } catch (err) {
      console.error('Delete user error:', err)
      setPageError('This user could not be deleted. Please try again.')
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
      setPageMessage(`Updated user "${editingUser.firstName} ${editingUser.lastName}" successfully.`)
      setPageError('')
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
        user.employee_no,
        roleName,
        departmentName,
      ].join(' ').toLowerCase()
      return haystack.includes(search)
    })
  }, [adminUsers, searchQuery, roleNameById, departmentNameById])

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
      reloadUsers,
      openAddUserModal,
      usersLoading,
      usersError,
      filteredUsers,
      usersTableProps,
      addUserModalProps,
      editUserModalProps,
      confirmDialogProps,
      pageMessage,
      pageError
    }
}
