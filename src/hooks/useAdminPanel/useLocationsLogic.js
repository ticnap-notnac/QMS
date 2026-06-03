import useAdminCategorySetup from './useAdminCategorySetup'
import {
  loadLocations as loadLocationsController,
  createLocation as createLocationController,
  deleteLocation as deleteLocationController
} from '@/services/locationService'

export default function useLocationsLogic() {
  return useAdminCategorySetup({
    loadFn: loadLocationsController,
    createFn: createLocationController,
    deleteFn: deleteLocationController,
    labelKey: 'location_name',
    entityName: 'Location',
    placeholderText: 'Enter location name',
    helperTextText: 'Create a location entry that will be available in the NCR report modal.'
  })
}
