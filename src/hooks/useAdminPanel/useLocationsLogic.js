import useAdminCategorySetup from './useAdminCategorySetup'
import {
  loadLocations as loadLocationsController,
  createLocation as createLocationController,
  deleteLocation as deleteLocationController,
  updateLocation as updateLocationController
} from '@/services/locationService'

export default function useLocationsLogic() {
  return useAdminCategorySetup({
    loadFn: loadLocationsController,
    createFn: createLocationController,
    updateFn: updateLocationController,
    deleteFn: deleteLocationController,
    labelKey: 'location_name',
    entityName: 'Location',
    placeholderText: 'Enter location name',
    helperTextText: 'Create a location entry that will be available in the NCR report modal.'
  })
}
