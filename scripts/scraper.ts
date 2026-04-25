/**
 * Scrapes ACR clinical practice guidelines from rheumatology.org
 * and stores them in Supabase.
 *
 * Usage: npm run scrape
 */

import * as cheerio from 'cheerio'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const BASE_URL = 'https://rheumatology.org'
const GUIDELINES_URL = 'https://rheumatology.org/clinical-practice-guidelines'
const DELAY_MS = 2000

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; RheumBoardPrep/1.0; educational use)',
      'Accept': 'text/html,application/xhtml+xml',
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.text()
}

function extractYear(text: string): number | null {
  const match = text.match(/20\d{2}/)
  return match ? parseInt(match[0]) : null
}

function cleanText(html: string): string {
  const $ = cheerio.load(html)
  // Remove navigation, footer, scripts, styles
  $('nav, footer, header, script, style, .menu, .sidebar, .nav, .footer, .header, iframe, form').remove()
  // Get the main content area
  const main = $('main, article, .content, .entry-content, #content, .field-items').first()
  const text = (main.length ? main : $('body')).text()
  return text.replace(/\s+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

interface GuidelineLink {
  title: string
  url: string
  disease_area: string
  year: number | null
}

async function discoverGuidelines(): Promise<GuidelineLink[]> {
  console.log('Fetching ACR guidelines index...')
  const html = await fetchHtml(GUIDELINES_URL)
  const $ = cheerio.load(html)
  const guidelines: GuidelineLink[] = []
  const seen = new Set<string>()

  // ACR page groups guidelines by condition/disease area
  // Each section heading is a disease area; links under it are guidelines
  let currentArea = 'General'

  // Try to find structured content
  $('h2, h3, h4, a').each((_, el) => {
    const tag = el.type === 'tag' ? el.tagName.toLowerCase() : ''
    if (['h2', 'h3', 'h4'].includes(tag)) {
      const text = $(el).text().trim()
      if (text && text.length < 80) currentArea = text
    } else if (tag === 'a') {
      const href = $(el).attr('href') ?? ''
      const text = $(el).text().trim()

      // Only grab links that look like guideline pages
      if (
        href &&
        text.length > 10 &&
        (href.includes('guideline') || href.includes('recommendation') || href.includes('rheumatology.org')) &&
        !seen.has(href)
      ) {
        const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`
        seen.add(href)
        guidelines.push({
          title: text,
          url: fullUrl,
          disease_area: currentArea,
          year: extractYear(text),
        })
      }
    }
  })

  // Fallback: grab all internal links that look like guideline pages
  if (guidelines.length === 0) {
    $('a[href*="guideline"], a[href*="recommendation"]').each((_, el) => {
      const href = $(el).attr('href') ?? ''
      const text = $(el).text().trim()
      if (!href || seen.has(href) || text.length < 5) return
      const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`
      seen.add(href)
      guidelines.push({
        title: text,
        url: fullUrl,
        disease_area: 'ACR Guidelines',
        year: extractYear(text),
      })
    })
  }

  console.log(`Discovered ${guidelines.length} guideline links`)
  return guidelines
}

async function scrapeGuidelinePage(link: GuidelineLink): Promise<string | null> {
  try {
    const html = await fetchHtml(link.url)
    const $ = cheerio.load(html)

    // Check for PDF links
    const pdfLink = $('a[href$=".pdf"]').first().attr('href')
    if (pdfLink) {
      console.log(`  Found PDF link: ${pdfLink} — skipping PDF content for now`)
      // Return a placeholder; PDF parsing can be added with pdf-parse if needed
      return `[PDF content available at: ${pdfLink}]\n\nTitle: ${link.title}\nDisease Area: ${link.disease_area}`
    }

    return cleanText(html)
  } catch (err) {
    console.error(`  Failed to scrape ${link.url}:`, err)
    return null
  }
}

async function main() {
  console.log('=== ACR Guidelines Scraper ===\n')

  const guidelines = await discoverGuidelines()

  if (guidelines.length === 0) {
    console.error('No guidelines found. The page structure may have changed.')
    process.exit(1)
  }

  let saved = 0
  let skipped = 0

  for (const link of guidelines) {
    console.log(`\nScraping: ${link.title}`)
    console.log(`  Area: ${link.disease_area} | Year: ${link.year ?? 'unknown'}`)
    console.log(`  URL: ${link.url}`)

    // Skip if already in DB
    const { data: existing } = await supabase
      .from('guidelines')
      .select('id')
      .eq('url', link.url)
      .single()

    if (existing) {
      console.log('  Already in database — skipping')
      skipped++
      await sleep(DELAY_MS)
      continue
    }

    const rawText = await scrapeGuidelinePage(link)

    if (!rawText || rawText.length < 100) {
      console.log('  Content too short or empty — skipping')
      skipped++
      await sleep(DELAY_MS)
      continue
    }

    const { error } = await supabase.from('guidelines').insert({
      disease_area: link.disease_area,
      title: link.title,
      year: link.year,
      url: link.url,
      raw_text: rawText,
    })

    if (error) {
      console.error('  DB error:', error.message)
    } else {
      console.log(`  Saved (${rawText.length.toLocaleString()} chars)`)
      saved++
    }

    await sleep(DELAY_MS)
  }

  console.log(`\n=== Done: ${saved} saved, ${skipped} skipped ===`)
}

main().catch(err => { console.error(err); process.exit(1) })
