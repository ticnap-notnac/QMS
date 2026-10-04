import { useState, useEffect, useCallback } from 'react';

export default function useDirtyState(initialData = {}) {
  const [data, setData] = useState(initialData);
  const [originalData, setOriginalData] = useState(initialData);
  const [isDirty, setIsDirty] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    const isDifferent = JSON.stringify(data) !== JSON.stringify(originalData);
    setIsDirty(isDifferent);
  }, [data, originalData]);

  const handleChange = (field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCancel = (onConfirm) => {
    if (isDirty) {
      setShowConfirmModal(true);
    } else {
      if(onConfirm) onConfirm();
    }
  };

  const confirmRevert = () => {
    setData(originalData);
    setIsDirty(false);
    setShowConfirmModal(false);
  };

  const setSavedData = (newData) => {
    setData(newData);
    setOriginalData(newData);
    setIsDirty(false);
  };

  return {
    data,
    setData,
    handleChange,
    isDirty,
    showConfirmModal,
    setShowConfirmModal,
    handleCancel,
    confirmRevert,
    setSavedData,
  };
}
