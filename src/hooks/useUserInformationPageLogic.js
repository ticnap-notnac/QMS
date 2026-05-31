import { useState, useEffect } from 'react'
import { useUserProfile } from '@/hooks/useUserProfile'

export function useUserInformationPageLogic({ authUserId, profileTargetTab = 'User Information' } = {}) {
  const { userProfile, loading, error } = useUserProfile(authUserId)
  const [activeTab, setActiveTab] = useState(profileTargetTab || 'User Information')

  useEffect(() => {
    if (profileTargetTab) setActiveTab(profileTargetTab)
  }, [profileTargetTab])

  return { userProfile, loading, error, activeTab, setActiveTab }
}

export default useUserInformationPageLogic
