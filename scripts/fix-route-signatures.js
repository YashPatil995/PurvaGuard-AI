const fs = require('fs')
const path = require('path')

const files = [
  'src/app/api/admin/news/route.ts',
  'src/app/api/admin/news/[id]/route.ts',
  'src/app/api/admin/facilities/route.ts',
  'src/app/api/admin/facilities/[id]/route.ts',
  'src/app/api/admin/regions/route.ts',
  'src/app/api/admin/regions/[id]/route.ts',
  'src/app/api/admin/volunteers/route.ts',
  'src/app/api/admin/settings/route.ts',
  'src/app/api/admin/translations/route.ts',
  'src/app/api/ops/alerts/route.ts',
  'src/app/api/ops/alerts/[id]/route.ts',
  'src/app/api/ops/incidents/[id]/route.ts',
]

for (const rel of files) {
  const fullPath = path.resolve(__dirname, '..', rel)
  if (!fs.existsSync(fullPath)) continue
  let content = fs.readFileSync(fullPath, 'utf8')

  content = content.replace(/(export async function GET\s*\(\s*request:\s*Request\s*\)\s*\{[\s\S]*?requireAdmin\()(\w+)(\))/g, '$1request$3')
  content = content.replace(/(export async function DELETE\s*\(\s*_req:\s*Request[\s\S]*?requireAdmin\()(\w+)(\))/g, '$1_req$3')

  fs.writeFileSync(fullPath, content, 'utf8')
  console.log(`Verified parameter names in: ${rel}`)
}
