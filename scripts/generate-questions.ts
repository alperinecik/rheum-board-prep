/**
 * Generates MCQs from scraped ACR guidelines using a local Ollama model.
 * No API key required — runs entirely on your machine.
 *
 * Setup: install Ollama from https://ollama.com then run: ollama pull llama3.1:8b
 *
 * Usage: npm run generate
 *        npm run generate -- --guideline-id <uuid>
 *        npm run generate -- --disease-area "Lupus"
 *        npm run generate -- --model llama3:8b   (override model)
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434'
const CHUNK_SIZE = 3000
const QUESTIONS_PER_CHUNK = 5
const DELAY_MS = 500

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function chunkText(text: string, size: number): string[] {
  const chunks: string[] = []
  let i = 0
  while (i < text.length) {
    let end = Math.min(i + size, text.length)
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end)
      if (lastPeriod > i + size * 0.5) end = lastPeriod + 1
    }
    chunks.push(text.slice(i, end).trim())
    i = end
  }
  return chunks.filter(c => c.length > 200)
}

async function getLatestPrompt(): Promise<string> {
  const { data } = await supabase
    .from('generation_prompts')
    .select('system_prompt')
    .order('version', { ascending: false })
    .limit(1)
    .single()

  if (!data) throw new Error('No generation prompt found. Did you run the SQL migration?')
  return data.system_prompt
}

async function getLatestPromptVersion(): Promise<number> {
  const { data } = await supabase
    .from('generation_prompts')
    .select('version')
    .order('version', { ascending: false })
    .limit(1)
    .single()
  return data?.version ?? 1
}

interface GeneratedQuestion {
  question: string
  options: { key: string; text: string }[]
  correct_answer: string
  explanation: string
}

async function checkOllama(model: string): Promise<void> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`)
    if (!res.ok) throw new Error()
    const data: any = await res.json()
    const available = (data.models ?? []).map((m: any) => m.name as string)
    if (!available.some((n: string) => n.startsWith(model.split(':')[0]))) {
      console.error(`Model "${model}" not found in Ollama.`)
      console.error(`Available: ${available.join(', ') || 'none'}`)
      console.error(`Run: ollama pull ${model}`)
      process.exit(1)
    }
  } catch {
    console.error(`Cannot reach Ollama at ${OLLAMA_URL}`)
    console.error('Make sure Ollama is running: https://ollama.com')
    process.exit(1)
  }
}

async function generateQuestionsForChunk(
  chunk: string,
  guideline: { title: string; year: number | null; disease_area: string },
  systemPrompt: string,
  model: string
): Promise<GeneratedQuestion[]> {
  const userMessage = `Guideline: ${guideline.title}${guideline.year ? ` (${guideline.year})` : ''}
Disease Area: ${guideline.disease_area}

Generate exactly ${QUESTIONS_PER_CHUNK} board exam questions from the following content.
Respond ONLY with the JSON array, no other text.

${chunk}`

  const res = await fetch(`${OLLAMA_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      stream: false,
    }),
  })

  if (!res.ok) throw new Error(`Ollama error: ${res.status} ${await res.text()}`)

  const data: any = await res.json()
  const text: string = data.choices?.[0]?.message?.content ?? ''

  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error(`No JSON array in response. Got:\n${text.slice(0, 300)}`)

  const questions: GeneratedQuestion[] = JSON.parse(jsonMatch[0])
  return questions.filter(q =>
    q.question && Array.isArray(q.options) && q.options.length === 4 && q.correct_answer && q.explanation
  )
}

async function main() {
  console.log('=== Question Generator (Ollama) ===\n')

  const args = process.argv.slice(2)
  const guidelineIdArg = args[args.indexOf('--guideline-id') + 1]
  const diseaseAreaArg = args[args.indexOf('--disease-area') + 1]
  const modelIdx = args.indexOf('--model')
  const model = modelIdx !== -1 ? args[modelIdx + 1] : 'llama3.1:8b'

  console.log(`Model: ${model}`)
  await checkOllama(model)

  const systemPrompt = await getLatestPrompt()
  const promptVersion = await getLatestPromptVersion()
  console.log(`Prompt version: ${promptVersion}\n`)

  let query = supabase.from('guidelines').select('*').not('raw_text', 'is', null)
  if (guidelineIdArg) query = query.eq('id', guidelineIdArg)
  if (diseaseAreaArg) query = query.eq('disease_area', diseaseAreaArg)

  const { data: guidelines, error } = await query
  if (error) throw error
  if (!guidelines || guidelines.length === 0) {
    console.log('No guidelines found. Run npm run scrape first.')
    return
  }

  console.log(`Processing ${guidelines.length} guideline(s)`)

  let totalGenerated = 0

  for (const guideline of guidelines) {
    console.log(`\n→ ${guideline.title} (${guideline.disease_area})`)
    if (!guideline.raw_text) { console.log('  No text — skipping'); continue }

    const chunks = chunkText(guideline.raw_text, CHUNK_SIZE)
    console.log(`  ${chunks.length} chunk(s)`)

    for (let i = 0; i < chunks.length; i++) {
      process.stdout.write(`  Chunk ${i + 1}/${chunks.length}... `)

      try {
        const questions = await generateQuestionsForChunk(chunks[i], guideline, systemPrompt, model)
        console.log(`${questions.length} questions`)

        for (const q of questions) {
          const { error: insertErr } = await supabase.from('questions').insert({
            guideline_id: guideline.id,
            disease_area: guideline.disease_area,
            question_text: q.question,
            options: q.options,
            correct_answer: q.correct_answer,
            explanation: q.explanation,
            prompt_version: promptVersion,
          })
          if (insertErr) console.error('  Insert error:', insertErr.message)
          else totalGenerated++
        }
      } catch (err) {
        console.error(`failed — ${err}`)
      }

      await sleep(DELAY_MS)
    }
  }

  console.log(`\n=== Done: ${totalGenerated} questions generated ===`)
}

main().catch(err => { console.error(err); process.exit(1) })
