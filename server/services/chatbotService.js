import { supabase } from '../lib/supabase.js'
import fs from 'fs'

import { createClient } from '@supabase/supabase-js'

export async function processChatbotRequest(message, actorAuthId, jwt) {
  try {
    const openRouterKey = process.env.OPENROUTER_API_KEY
    const geminiKey = process.env.GEMINI_API_KEY

    if (!openRouterKey && !geminiKey) {
      throw new Error('No AI API Key is configured. Please add OPENROUTER_API_KEY or GEMINI_API_KEY.')
    }

    // Initialize user-scoped Supabase client for strict RLS enforcement
    let userSupabase = supabase
    if (jwt) {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
      const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
      if (supabaseUrl && supabaseKey) {
        userSupabase = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: `Bearer ${jwt}` } }
        })
      }
    }

    // 1. Fetch user context
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, first_name, last_name, role_id, department_id, site_id, roles(role_name)')
      .eq('auth_id', actorAuthId)
      .single()

    if (userError || !user) {
      throw new Error('User not found.')
    }

    const roleName = user.roles?.role_name?.toLowerCase() || ''

    // 2. Simple Intent Parsing
    const analyticalKeywords = ['ncr', 'report', 'car', 'audit', 'qddr', 'summary', 'how many', 'what are', 'show me', 'list']
    const isAnalytical = analyticalKeywords.some(keyword => message.toLowerCase().includes(keyword))

    let contextData = ''

    if (isAnalytical) {
      // Calculate date 3 months ago
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
      const dateString = threeMonthsAgo.toISOString()

      // Execute parallel queries using the RLS-protected userSupabase client!
      const [ncrsResult, carsResult, auditsResult] = await Promise.all([
        userSupabase.from('ncr_reports')
          .select('reference_no, description, status, issue_type, severity, created_at')
          .gte('created_at', dateString)
          .order('created_at', { ascending: false })
          .limit(100),
        userSupabase.from('car_reports')
          .select('reference_no, status, created_at, details_of_nonconformance, root_cause_analysis, corrective_action')
          .gte('created_at', dateString)
          .order('created_at', { ascending: false })
          .limit(100),
        userSupabase.from('audit_schedules')
          .select('title, scheduled_date, status, created_at')
          .gte('created_at', dateString)
          .order('created_at', { ascending: false })
          .limit(100)
      ])

      let summary = []

      // Determine permissions
      const canViewCarContent = ['admin', 'dcc', 'auditor'].includes(roleName)

      if (ncrsResult.data?.length > 0) {
        summary.push(`### NCR Reports (Last 3 Months) ###\n` + ncrsResult.data.map(n => 
          `- NCR ${n.reference_no} (${n.status}, ${n.severity} severity): ${n.issue_type}. Details: ${n.description}`
        ).join('\n'))
      }

      if (carsResult.data?.length > 0) {
        if (canViewCarContent) {
          summary.push(`### CAR Reports (Last 3 Months) ###\n` + carsResult.data.map(c => 
            `- CAR ${c.reference_no} (${c.status}): ${c.details_of_nonconformance?.slice(0, 100)}... RCA: ${c.root_cause_analysis ? 'Yes' : 'No'}, CA: ${c.corrective_action ? 'Yes' : 'No'}`
          ).join('\n'))
        } else {
          // Restrict content for non-authorized roles
          summary.push(`### CAR Reports (Last 3 Months) ###\nTotal CARs: ${carsResult.data.length}\n*Note: The user does not have permission to view the content or details of these CARs.*`)
        }
      }

      if (auditsResult.data?.length > 0) {
        summary.push(`### Audit Schedules (Last 3 Months) ###\n` + auditsResult.data.map(a => 
          `- Audit: ${a.title} (Status: ${a.status}, Date: ${a.scheduled_date})`
        ).join('\n'))
      }

      if (summary.length > 0) {
        contextData = "Here is the raw database summary the user is authorized to see:\n\n" + summary.join('\n\n')
      } else {
        contextData = 'There are no recent NCRs, CARs, or Audits available for this user.'
      }
    }

    // 3. Build Prompt
    const systemPrompt = `
You are the QFLOW Assistant, an AI built into the QFLOW Quality Management System.
The user asking the question is ${user.first_name} ${user.last_name} (Role: ${roleName || 'Employee'}).
Your job is to answer questions about navigating the system, writing reports, or summarizing system data.
Use Markdown formatting to make your responses clean and readable. Do NOT reveal sensitive system passwords or architecture details.

IMPORTANT INSTRUCTIONS FOR DATA QUESTIONS:
- If the user asks about system data (e.g., "how many CARs", "summarize my audits"), you MUST base your entire answer on the SYSTEM DATA CONTEXT provided below.
- Do NOT guess or hallucinate numbers. Do NOT just give the user instructions on where to find the data. Answer their question directly using the provided context.
- If the SYSTEM DATA CONTEXT says there is no data, explicitly say "You currently have 0 CARs, Audits, or NCRs from the last 3 months."

${contextData ? '\n### SYSTEM DATA CONTEXT ###\n' + contextData + '\n' : ''}
    `.trim()

    // 4. Call AI API
    let text = 'I am sorry, I cannot answer that right now.'

    if (openRouterKey) {
      // Use OpenRouter (Preferred because of stability and multiple models)
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.CLIENT_URL || 'https://qms-jade.vercel.app', // Dynamic referer
          'X-Title': 'QFLOW Assistant',
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini', // Much faster, more stable on OpenRouter
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ]
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenRouter API call failed: ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      text = data.choices?.[0]?.message?.content || text

    } else {
      // Fallback to Direct Gemini API
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: systemPrompt + "\n\nUser Question: " + message }
              ]
            }
          ]
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Gemini API call failed: ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      text = data.candidates?.[0]?.content?.parts?.[0]?.text || text
    }

    return { success: true, reply: text }
  } catch (error) {
    fs.writeFileSync('chatbot_error_log.txt', String(error.stack || error))
    console.error('Chatbot processing error:', error)
    return { success: false, error: error.message }
  }
}
