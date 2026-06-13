import { getMyTasks } from '@/app/utils/actions/tasks'
import TasksClient from './TasksClient'

export default async function TasksPage() {
  const { tasks } = await getMyTasks('all', 200)

  return <TasksClient initialTasks={tasks} />
}
