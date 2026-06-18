import ResourcePage from '../components/ResourcePage'
import { expenseConfig } from '../config/entityConfigs'

export default function Expenses() {
  return <ResourcePage config={expenseConfig} />
}
