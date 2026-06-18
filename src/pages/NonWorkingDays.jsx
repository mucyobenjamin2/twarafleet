import ResourcePage from '../components/ResourcePage'
import { nonWorkingDayConfig } from '../config/entityConfigs'

export default function NonWorkingDays() {
  return <ResourcePage config={nonWorkingDayConfig} />
}
