const Anthropic = require('@anthropic-ai/sdk')
const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()
const PORT = 3000
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

// Middleware
app.use(cors())
app.use(express.json())

// In-memory storage for conversations
const conversations = new Map()

// Store user preferences
const userPreferences = new Map()

// Helper function to detect mood from text - IMPROVED
function analyzeMood(text) {
  const lower = text.toLowerCase()
  
  // CRISIS LEVEL (1) - Immediate danger or severe trauma
  if (lower.match(/suicide|suicidal|kill myself|end my life|want to die|going to die|overdose|jump off|hanging myself/)) return 1
  if (lower.match(/raped|rape|sexual assault|molested|abused sexually/)) return 1
  if (lower.match(/self harm|cut myself|cutting myself|hurt myself|burning myself/)) return 1
  if (lower.match(/can't take it anymore|don't want to live|no reason to live/)) return 1
  
  // SEVERE DISTRESS (2) - Extreme emotional pain
  if (lower.match(/depressed|severe depression|major depression|clinical depression/)) return 2
  if (lower.match(/hopeless|worthless|no hope|pointless|meaningless/)) return 2
  if (lower.match(/can't go on|give up|giving up|lost all hope/)) return 2
  if (lower.match(/abuse|abusive|domestic violence|violence|attacked|assault/)) return 2
  if (lower.match(/trauma|traumatic|ptsd|flashback|nightmare/)) return 2
  
  // HIGH DISTRESS (3) - Serious emotional struggle
  if (lower.match(/terrible|awful|horrible|worst day|worst time|unbearable/)) return 3
  if (lower.match(/hate myself|hate my life|hate everything/)) return 3
  if (lower.match(/panic attack|severe anxiety|breakdown|breaking down/)) return 3
  if (lower.match(/crying|sobbing|can't stop crying/)) return 3
  
  // MODERATE DISTRESS (4) - Significant stress
  if (lower.match(/very stressed|really stressed|extremely anxious|so anxious/)) return 4
  if (lower.match(/worried|overthinking|can't sleep|insomnia/)) return 4
  if (lower.match(/overwhelmed|too much|can't handle|can't cope/)) return 4
  if (lower.match(/exhausted|burned out|drained|worn out/)) return 4
  
  // MILD CONCERN (5) - Noticeable but manageable distress
  if (lower.match(/stressed|anxious|nervous|uneasy/)) return 5
  if (lower.match(/sad|down|blue|unhappy|low/)) return 5
  if (lower.match(/lonely|alone|isolated|empty/)) return 5
  if (lower.match(/bad day|rough day|tough day|struggling/)) return 5
  if (lower.match(/tired|fatigued|weary/)) return 5
  
  // NEUTRAL/OKAY (6) - Stable but not great
  if (lower.match(/okay|ok|fine|alright|so-so/)) return 6
  if (lower.match(/managing|coping|hanging in|getting by/)) return 6
  if (lower.match(/meh|whatever|decent|not bad/)) return 6
  
  // DOING BETTER (7) - Positive shift
  if (lower.match(/better|improved|improving|feeling better/)) return 7
  if (lower.match(/good|pretty good|doing good|nice/)) return 7
  if (lower.match(/relieved|calmer|peaceful/)) return 7
  
  // GOOD (8) - Clear positive mood
  if (lower.match(/great|really good|doing great|wonderful/)) return 8
  if (lower.match(/happy|joyful|cheerful|content/)) return 8
  if (lower.match(/excited|energized|motivated/)) return 8
  if (lower.match(/pleased|satisfied|grateful|thankful/)) return 8
  
  // VERY GOOD (9) - Strong positive
  if (lower.match(/amazing|awesome|fantastic|excellent/)) return 9
  if (lower.match(/love|loving life|best day|brilliant/)) return 9
  if (lower.match(/elated|ecstatic|overjoyed/)) return 9
  
  // EXCELLENT (10) - Peak positive
  if (lower.match(/perfect|incredible|phenomenal|outstanding/)) return 10
  if (lower.match(/blessed|thriving|living my best|on top of the world/)) return 10
  
  // Default neutral
  return 5
}

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Mental Health Companion API is running! 💙' })
})

// Create new session
app.post('/api/session/new', (req, res) => {
  const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  conversations.set(sessionId, [])
  
  res.json({ 
    sessionId,
    message: 'New session created! Ready to chat.' 
  })
})

// Update user name
app.post('/api/preferences/:sessionId', (req, res) => {
  const { sessionId } = req.params
  const { name } = req.body
  
  if (!userPreferences.has(sessionId)) {
    userPreferences.set(sessionId, {})
  }
  
  const prefs = userPreferences.get(sessionId)
  if (name) prefs.name = name
  
  userPreferences.set(sessionId, prefs)
  
  res.json({ message: 'Name saved', name: name })
})

// Chat endpoint with conversation history
app.post('/api/chat', async (req, res) => {
  try {
    const { message, stressLevel, sessionId } = req.body
    
    if (!message || !sessionId) {
      return res.status(400).json({ 
        error: 'Please provide both message and sessionId' 
      })
    }
    
    if (!conversations.has(sessionId)) {
      conversations.set(sessionId, [])
    }
    
    let history = conversations.get(sessionId)
    
    history.push({
      role: 'user',
      content: message
    })
    
    if (history.length > 20) {
      history = history.slice(-20)
    }
    
    // Get user name if exists
    const prefs = userPreferences.get(sessionId) || {}
    const userName = prefs.name || ''

    // Create conversation context
    let recentContext = ''
    if (history.length >= 4) {
      const lastFewMessages = history.slice(-6)
      recentContext = `\n\nRECENT CONVERSATION CONTEXT:\n`
      lastFewMessages.forEach(msg => {
        recentContext += `${msg.role === 'user' ? userName || 'User' : 'You'}: ${msg.content}\n`
      })
    }

    let systemPrompt = `You are a close, supportive friend - NOT a therapist, counselor, or mental health professional.

YOUR PERSONALITY:
- Talk exactly like you're texting a friend you deeply care about
- Use natural, casual language with contractions
- Sprinkle in emojis genuinely (💙😊🫂) but don't overdo it
- Share brief personal-ish thoughts like "I get that, I've felt similar before"
- Use validation: "That sounds really tough" "I hear you" "That makes total sense"
- Ask follow-up 1 - 2 questions that show you're listening 
- Keep responses 2-3 sentences usually (don't write essays)
- Remember small details they share
- You are a chill friend that everyone feels like they can talk to

CONVERSATION STYLE:
- Use slang words like yo, homie, gang, dawg, bro
- Use cursed words where seems appropriate
- If they're venting: Listen, validate, don't try to "fix" immediately
- If they ask for advice: Share thoughts gently, not prescriptively
- If they're doing better: Celebrate with them genuinely
- Mirror their energy somewhat (if calm, be calm; if distressed, be gentle)
- Use their name occasionally: ${userName ? userName : 'friend'}

CRITICAL BOUNDARIES:
- If they mention suicide, self-harm, sexual assault, rape, abuse, violence, or severe crisis:
  * Express IMMEDIATE care and deep concern
  * Validate their trauma: "I'm so sorry this happened to you. This is not your fault."
  * Ask directly: "Are you safe right now? Are you in immediate danger?"
  * Provide some resources WITHOUT being preachy:
    - National Suicide Prevention Lifeline: 988
    - Crisis Text Line: Text HOME to 741741
    - RAINN Sexual Assault Hotline: 1-800-656-4673
    - Domestic Violence Hotline: 1-800-799-7233
    - International: findahelpline.com
  * STRONGLY encourage reaching out to emergency services, a therapist, or trusted person
  * Stay supportive, non-judgmental, and acknowledge the severity
  * Make it CLEAR this is beyond friend-level support and they need professional help NOW

CURRENT CONTEXT:
- Stress level detected: ${stressLevel || 'unknown'}
`
    
    // Adjust based on stress
    if (stressLevel === 'high') {
      systemPrompt += `\n\n🚨 HIGH STRESS MODE:
They're really struggling right now. 
- Lead with empathy: "I can hear how hard this is for you"
- Keep responses SHORT (2-3 sentences max)
- Offer simple grounding: "Want to try taking three deep breaths with me?"
- Don't overwhelm with questions or suggestions
- Be a calming, steady presence
- Check if they're safe if context suggests crisis`
    } else if (stressLevel === 'moderate') {
      systemPrompt += `\n\n😟 MODERATE STRESS MODE:
They're going through something tough but managing.
- Validate their feelings first
- Ask caring questions to understand better
- Offer support without being pushy
- 3-4 sentence responses are good
- It's okay to share brief relatable thoughts`
    } else {
      systemPrompt += `\n\n😌 CALM MODE:
They seem relatively okay.
- Be warm and conversational
- You can be a bit more playful/lighter
- Still caring, but can match their more relaxed energy
- Ask about their day, what's on their mind
- 3-5 sentence responses work here`
    }
    
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: history
    })
    
    const aiReply = response.content[0].text
    
    history.push({
      role: 'assistant',
      content: aiReply
    })
    
    conversations.set(sessionId, history)
    
    res.json({
      reply: aiReply,
      stressLevel: stressLevel || 'unknown',
      sessionId: sessionId
    })
    
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ 
      error: 'I had trouble responding. Can you try again?' 
    })
  }
})

// Get conversation history
app.get('/api/conversation/:sessionId', (req, res) => {
  const { sessionId } = req.params
  
  if (!conversations.has(sessionId)) {
    return res.status(404).json({ error: 'Session not found' })
  }
  
  res.json({
    sessionId,
    history: conversations.get(sessionId)
  })
})

// Export conversation as text file
app.get('/api/export/:sessionId', (req, res) => {
  const { sessionId } = req.params
  
  if (!conversations.has(sessionId)) {
    return res.status(404).json({ error: 'Session not found' })
  }
  
  const history = conversations.get(sessionId)
  const prefs = userPreferences.get(sessionId) || {}
  
  // Format conversation as readable text
  let exportText = `Mental Health Companion - Conversation Export\n`
  exportText += `Date: ${new Date().toLocaleDateString()}\n`
  if (prefs.name) exportText += `User: ${prefs.name}\n`
  exportText += `\n${'='.repeat(50)}\n\n`
  
  history.forEach(msg => {
    const speaker = msg.role === 'user' ? (prefs.name || 'You') : 'Friend'
    exportText += `${speaker}:\n${msg.content}\n\n`
  })
  
  exportText += `${'='.repeat(50)}\n`
  exportText += `End of conversation\n`
  
  // Set headers for file download
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="conversation.txt"')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.send(exportText)
})

// Get session statistics with mood timeline
app.get('/api/stats/:sessionId', (req, res) => {
  const { sessionId } = req.params
  
  if (!conversations.has(sessionId)) {
    return res.status(404).json({ error: 'Session not found' })
  }
  
  const history = conversations.get(sessionId)
  const prefs = userPreferences.get(sessionId) || {}
  
  const userMessages = history.filter(m => m.role === 'user').length
  const aiMessages = history.filter(m => m.role === 'assistant').length
  
  // Analyze mood over time from user messages
  const moodTimeline = []
  let messageCount = 0
  
  history.forEach((msg, index) => {
    if (msg.role === 'user') {
      messageCount++
      const moodScore = analyzeMood(msg.content)
      
      moodTimeline.push({
        messageNumber: messageCount,
        moodScore: moodScore,
        timestamp: Date.now()
      })
    }
  })
  
  res.json({
    userName: prefs.name || 'Anonymous',
    stats: {
      totalMessages: history.length,
      userMessages,
      aiMessages
    },
    moodTimeline: moodTimeline
  })
})

// Clear conversation (fresh start)
app.delete('/api/conversation/:sessionId', (req, res) => {
  const { sessionId } = req.params
  
  if (conversations.has(sessionId)) {
    conversations.delete(sessionId)
    res.json({ message: 'Conversation cleared', sessionId })
  } else {
    res.status(404).json({ error: 'Session not found' })
  }
})

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   💙 Mental Health Companion API      ║
╚════════════════════════════════════════╝

✅ Server: http://localhost:${PORT}

📊 Endpoints:
   POST /api/session/new
   POST /api/preferences/:id
   POST /api/chat
   GET  /api/export/:id
   GET  /api/stats/:id
   GET  /api/conversation/:id
   DELETE /api/conversation/:id

Ready! 💙
`)
})