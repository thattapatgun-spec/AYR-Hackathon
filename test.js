const axios = require('axios')
const BASE_URL = 'http://localhost:3000'

async function test() {
  console.log('🧪 Testing Backend\n')
  
  try {
    // Create session
    console.log('1. Creating session...')
    const sessionRes = await axios.post(`${BASE_URL}/api/session/new`)
    const sessionId = sessionRes.data.sessionId
    console.log('✅ Session ID:', sessionId, '\n')
    
    // Set name
    console.log('2. Setting user name...')
    await axios.post(`${BASE_URL}/api/preferences/${sessionId}`, {
      name: 'Alex'
    })
    console.log('✅ Name set\n')
    
    // Test message - high stress
    console.log('3. Testing HIGH stress message...')
    const res1 = await axios.post(`${BASE_URL}/api/chat`, {
      sessionId: sessionId,
      message: "I'm feeling really overwhelmed and anxious right now",
      stressLevel: 'high'
    })
    console.log('💬 AI Response:', res1.data.reply)
    console.log('📊 Stress:', res1.data.stressLevel, '\n')
    
    // Test follow-up - moderate
    console.log('4. Testing MODERATE stress message...')
    const res2 = await axios.post(`${BASE_URL}/api/chat`, {
      sessionId: sessionId,
      message: "Yeah, work has been really stressful lately",
      stressLevel: 'moderate'
    })
    console.log('💬 AI Response:', res2.data.reply, '\n')
    
    // Test calm message
    console.log('5. Testing LOW stress message...')
    const res3 = await axios.post(`${BASE_URL}/api/chat`, {
      sessionId: sessionId,
      message: "Thanks for being here. That actually helped a bit",
      stressLevel: 'low'
    })
    console.log('💬 AI Response:', res3.data.reply, '\n')
    
    console.log('🎉 All tests passed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message)
  }
}

test()