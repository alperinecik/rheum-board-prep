/**
 * Analyzes question reports and uses Claude to evolve the generation prompt.
 * Saves a new prompt version to Supabase.
 *
 * Usage: npm run update-prompt
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)
const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434'
const MODEL = 'llama3.1:8b'

const MIN_REPORTS = 5  // Only update prompt if enough reports have accumulated

async function main() {
  console.log('=== Prompt Update from Feedback ===\n')

  // Load recent unresolved reports
  const { data: reports } = await supabase
    .from('question_reports')
    .select('category, notes, questions(question_text, explanation, disease_area)')
    .order('created_at', { ascending: false })
    .limit(50)

  if (!reports || reports.length < MIN_REPORTS) {
    console.log(`Only ${reports?.length ?? 0} reports found (minimum ${MIN_REPORTS} required). No update needed.`)
    return
  }

  console.log(`Analyzing ${reports.length} reports...`)

  // Load current prompt
  const { data: promptRow } = await supabase
    .from('generation_prompts')
    .select('version, system_prompt')
    .order('version', { ascending: false })
    .limit(1)
    .single()

  if (!promptRow) throw new Error('No prompt in database')

  // Summarize reports for Claude
  const reportSummary = reports.map((r: any) => ({
    category: r.category,
    notes: r.notes,
    disease_area: r.questions?.disease_area,
    question_preview: r.questions?.question_text?.slice(0, 120),
  }))

  const res = await fetch(`${OLLAMA_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert in medical education and rheumatology board exam preparation. You will analyze user feedback on generated questions and improve the question generation prompt.',
        },
        {
          role: 'user',
          content: `Current question generation prompt:\n---\n${promptRow.system_prompt}\n---\n\nUser feedback on generated questions (${reports.length} reports):\n${JSON.stringify(reportSummary, null, 2)}\n\nBased on this feedback, write an improved version of the system prompt. Return ONLY the new system prompt text, nothing else.`,
        },
      ],
      stream: false,
    }),
  })

  if (!res.ok) throw new Error(`Ollama error: ${res.status}`)
  const data: any = await res.json()
  const newPrompt = data.choices?.[0]?.message?.content?.trim() ?? null
  if (!newPrompt) throw new Error('No prompt returned from model')

  const categories = reports.reduce((acc: Record<string, number>, r: any) => {
    acc[r.category] = (acc[r.category] ?? 0) + 1
    return acc
  }, {})
  const reason = `Auto-updated from ${reports.length} reports: ${JSON.stringify(categories)}`

  const { data: newVersion, error } = await supabase
    .from('generation_prompts')
    .insert({ system_prompt: newPrompt, reason })
    .select('version')
    .single()

  if (error) throw error

  console.log(`\nSaved new prompt version ${newVersion?.version}`)
  console.log(`Reason: ${reason}`)
  console.log('\nNew questions generated with npm run generate will use this improved prompt.')
}

main().catch(err => { console.error(err); process.exit(1) })
