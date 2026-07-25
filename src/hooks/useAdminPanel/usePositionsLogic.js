import useAdminCategorySetup from './useAdminCategorySetup'
import {
  loadPositions as loadPositionsController,
  createPosition as createPositionController,
  deletePosition as deletePositionController,
  updatePosition as updatePositionController
} from '@/services/positionService'

export default function usePositionsLogic() {
  return useAdminCategorySetup({
    loadFn: loadPositionsController,
    createFn: createPositionController,
    updateFn: updatePositionController,
    deleteFn: deletePositionController,
    labelKey: 'position_name',
    entityName: 'Position',
    placeholderText: 'Enter position title',
    helperTextText: 'Create a position entry that will be available in the system.'
  })
}
