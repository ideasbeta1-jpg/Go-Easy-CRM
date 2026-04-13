import { config } from 'dotenv'
config({ path: '.env.local' })
import { getTemplates } from './src/utils/waba'

async function fetch() {
   const templates = await getTemplates()
   console.log(JSON.stringify(templates.find((t: any) => t.name === 'bienvenida_lead'), null, 2))
}
fetch()
