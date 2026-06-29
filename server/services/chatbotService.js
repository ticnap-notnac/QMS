import { supabase } from '../lib/supabase.js'
import fs from 'fs'

export async function processChatbotRequest(message, actorAuthId) {
  try {
    const openRouterKey = process.env.OPENROUTER_API_KEY
    const geminiKey = process.env.GEMINI_API_KEY

    if (!openRouterKey && !geminiKey) {
      throw new Error('No AI API Key is configured. Please add OPENROUTER_API_KEY or GEMINI_API_KEY.')
    }

    // 1. Fetch user context for RLS
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
    const isAnalytical = message.toLowerCase().includes('ncr') || message.toLowerCase().includes('report')

    let contextData = ''

    if (isAnalytical) {
      // Fetch NCR reports. 
      // Important: RLS is typically applied automatically if we pass the auth token to supabase,
      // but since we are using the service_role key in the backend `utils/supabase.js`,
      // we must manually enforce visibility rules for the backend query!
      // Admin/DCC see all, regular users see only their department/site.

      let query = supabase.from('ncr_reports').select('reference_no, description, status, issue_type, severity, created_at')

      if (roleName !== 'admin' && roleName !== 'dcc') {
        query = query.eq('department_id', user.department_id).eq('site_id', user.site_id)
      }

      // Limit to recent 20 for context size
      const { data: ncrs, error: ncrError } = await query.order('created_at', { ascending: false }).limit(20)

      if (!ncrError && ncrs && ncrs.length > 0) {
        contextData = 'Here are the recent NCR Reports the user has access to:\n'
        ncrs.forEach(n => {
          contextData += `- NCR ${n.reference_no} (${n.status}, ${n.severity} severity): ${n.issue_type}. Details: ${n.description}\n`
        })
      } else {
        contextData = 'There are no recent NCR reports available for this user.'
      }
    }

    // 3. Build Prompt
    const systemPrompt = `
You are the QFLOW Assistant, an AI built into the QFLOW Quality Management System.
The user asking the question is ${user.first_name} ${user.last_name} (Role: ${roleName || 'Employee'}).
Your job is to answer questions about navigating the system, writing reports, or summarizing system data.
Use Markdown formatting to make your responses clean and readable. Do NOT reveal sensitive system passwords or architecture details.

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
