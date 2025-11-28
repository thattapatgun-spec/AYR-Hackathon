// app.js
const API_URL = 'http://localhost:3000'
let sessionId = null
let isRecordingVoice = false
let currentStream = null

// DOM elements
const onboarding = document.getElementById('onboarding')
const chatScreen = document.getElementById('chatScreen')
const startBtn = document.getElementById('startBtn')
const messageInput = document.getElementById('messageInput')
const sendBtn = document.getElementById('sendBtn')
const voiceBtn = document.getElementById('voiceBtn')
const chatMessages = document.getElementById('chatMessages')
const stressDisplay = document.getElementById('stressDisplay')

// Start chat - complete onboarding
startBtn.addEventListener('click', async () => {
    const name = document.getElementById('userName').value.trim()
    
    if (!name) {
        alert('Please enter your name!')
        return
    }
    
    try {
        // Create session
        const sessionRes = await fetch(`${API_URL}/api/session/new`, {
            method: 'POST'
        })
        const sessionData = await sessionRes.json()
        sessionId = sessionData.sessionId
        
        // Save name
        await fetch(`${API_URL}/api/preferences/${sessionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        })
        
        // Switch to chat
        onboarding.classList.remove('active')
        chatScreen.classList.add('active')
        
        // Welcome message
        addAIMessage(`Hey ${name}! 👋 I'm really glad you're here. How are you doing today?`)
        
    } catch (error) {
        console.error('Error starting:', error)
        alert('Could not connect to server. Make sure backend is running!')
    }
})

// Send text message
sendBtn.addEventListener('click', () => sendMessage())
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage()
})

async function sendMessage() {
    const message = messageInput.value.trim()
    if (!message || !sessionId) return
    
    // Disable input
    messageInput.disabled = true
    sendBtn.disabled = true
    sendBtn.textContent = '⏳'
    
    // Add to UI
    addUserMessage(message)
    messageInput.value = ''
    scrollToBottom()
    
    // Typing indicator
    const typingMsg = addAIMessage('Thinking', true)
    
    const stressLevel = 'moderate'
    
    try {
        const response = await fetch(`${API_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, message, stressLevel })
        })
        
        const data = await response.json()
        
        typingMsg.remove()
        addAIMessage(data.reply)
        scrollToBottom()
        updateStressDisplay(data.stressLevel)
        
    } catch (error) {
        console.error('Error:', error)
        typingMsg.remove()
        addAIMessage("Sorry, I'm having trouble connecting. Can you try again?")
        scrollToBottom()
    } finally {
        messageInput.disabled = false
        sendBtn.disabled = false
        sendBtn.textContent = 'Send'
        messageInput.focus()
    }
}

// Voice button
voiceBtn.addEventListener('click', toggleVoiceRecording)

async function toggleVoiceRecording() {
    if (isRecordingVoice) {
        stopVoiceRecording()
        voiceBtn.classList.remove('recording')
        voiceBtn.textContent = '🎤'
        isRecordingVoice = false
        
        const stressLevel = getStressLevel()
        alert(`Stress detected: ${stressLevel.toUpperCase()}\n\nNow type your message.`)
        updateStressDisplay(stressLevel)
        
        messageInput.placeholder = 'Type your message...'
        messageInput.focus()
        
    } else {
        currentStream = await startVoiceRecording()
        if (currentStream) {
            voiceBtn.classList.add('recording')
            voiceBtn.textContent = '⏹️'
            isRecordingVoice = true
            messageInput.placeholder = '🎤 Recording... Click mic when done'
        }
    }
}

// UI Functions
function addUserMessage(text) {
    const msgDiv = document.createElement('div')
    msgDiv.className = 'message user'
    msgDiv.textContent = text
    chatMessages.appendChild(msgDiv)
    scrollToBottom()
}

function addAIMessage(text, isTyping = false) {
    const msgDiv = document.createElement('div')
    msgDiv.className = 'message ai'
    if (isTyping) msgDiv.classList.add('typing')
    msgDiv.textContent = text
    chatMessages.appendChild(msgDiv)
    scrollToBottom()
    return msgDiv
}

function scrollToBottom() {
    setTimeout(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight
    }, 100)
}

function updateStressDisplay(level) {
    const displays = {
        'high': 'High Stress 😰',
        'moderate': 'Moderate 😕',
        'low': 'Calm 😌',
        'unknown': 'Checking...'
    }
    stressDisplay.textContent = displays[level] || displays['unknown']
}

// Modal and button handlers
const historyBtn = document.getElementById('historyBtn')
const exportBtn = document.getElementById('exportBtn')
const statsBtn = document.getElementById('statsBtn')
const modal = document.getElementById('modal')
const modalTitle = document.getElementById('modalTitle')
const modalBody = document.getElementById('modalBody')
const closeModal = document.getElementById('closeModal')

// Close modal handlers
closeModal.addEventListener('click', () => {
    modal.classList.remove('show')
})

modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.remove('show')
    }
})

// View conversation history
historyBtn.addEventListener('click', async () => {
    if (!sessionId) {
        alert('No active session')
        return
    }
    
    try {
        const response = await fetch(`${API_URL}/api/conversation/${sessionId}`)
        const data = await response.json()
        
        modalTitle.textContent = '📋 Conversation History'
        modalBody.innerHTML = `
            <div style="font-size: 14px; color: #666; margin-bottom: 20px;">
                Total messages: ${data.history.length}
            </div>
        `
        
        data.history.forEach(msg => {
            const speaker = msg.role === 'user' ? 'You' : 'Friend'
            const bgColor = msg.role === 'user' ? '#f0f0ff' : '#f9f9f9'
            modalBody.innerHTML += `
                <div style="margin-bottom: 15px; padding: 12px; background: ${bgColor}; border-radius: 8px;">
                    <strong style="color: #667eea;">${speaker}:</strong><br>
                    <span style="color: #333; line-height: 1.5;">${msg.content}</span>
                </div>
            `
        })
        
        modal.classList.add('show')
        
    } catch (error) {
        console.error('Error loading history:', error)
        alert('Could not load conversation history')
    }
})

// Export conversation
exportBtn.addEventListener('click', () => {
    if (!sessionId) {
        alert('No active session')
        return
    }
    
    window.open(`${API_URL}/api/export/${sessionId}`, '_blank')
})

// View stats with mood graph
statsBtn.addEventListener('click', async () => {
    if (!sessionId) {
        alert('No active session')
        return
    }
    
    try {
        const response = await fetch(`${API_URL}/api/stats/${sessionId}`)
        const data = await response.json()
        
        console.log('Stats data received:', data) // DEBUG - check browser console
        
        modalTitle.textContent = '📊 Your Mental State Over Time'
        
        let graphHTML = ''
        
        if (data.moodTimeline && data.moodTimeline.length > 0) {
            graphHTML += '<div style="margin-bottom: 30px;"><h3 style="color: #667eea; margin-bottom: 15px;">Mood Timeline</h3>'
            
            // Create bar chart
            graphHTML += '<div style="background: #f9f9f9; padding: 20px; border-radius: 12px; min-height: 150px; display: flex; align-items: flex-end; gap: 5px;">'
            
            data.moodTimeline.forEach((point) => {
                const barHeight = point.moodScore * 15 // 15-150px height
                const color = point.moodScore <= 3 ? '#e74c3c' : 
                             point.moodScore <= 5 ? '#f39c12' : 
                             point.moodScore <= 7 ? '#3498db' : '#2ecc71'
                
                const mood = point.moodScore <= 3 ? '😰 Distressed' :
                            point.moodScore <= 5 ? '😕 Stressed' :
                            point.moodScore <= 7 ? '😊 Better' : '😄 Great'
                
                graphHTML += `
                    <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end;">
                        <div style="
                            background: ${color}; 
                            width: 100%;
                            height: ${barHeight}px; 
                            border-radius: 4px 4px 0 0;
                            transition: all 0.3s;
                        " title="Message ${point.messageNumber}: ${mood}"></div>
                        <div style="font-size: 10px; color: #999; margin-top: 5px; white-space: nowrap;">Msg ${point.messageNumber}</div>
                    </div>
                `
            })
            
            graphHTML += '</div>'
            
            // Legend
            graphHTML += `
                <div style="margin-top: 20px; padding: 15px; background: #f0f0f0; border-radius: 8px;">
                    <div style="font-weight: 600; margin-bottom: 10px;">Mood Scale:</div>
                    <div style="display: flex; gap: 15px; flex-wrap: wrap; font-size: 14px;">
                        <div><span style="color: #e74c3c; font-size: 18px;">●</span> Distressed (1-3)</div>
                        <div><span style="color: #f39c12; font-size: 18px;">●</span> Stressed (4-5)</div>
                        <div><span style="color: #3498db; font-size: 18px;">●</span> Better (6-7)</div>
                        <div><span style="color: #2ecc71; font-size: 18px;">●</span> Great (8-10)</div>
                    </div>
                </div>
            `
            
            // Insights
            const avgMood = data.moodTimeline.reduce((sum, p) => sum + p.moodScore, 0) / data.moodTimeline.length
            const firstMood = data.moodTimeline[0].moodScore
            const lastMood = data.moodTimeline[data.moodTimeline.length - 1].moodScore
            const trend = data.moodTimeline.length >= 2 ? lastMood - firstMood : 0
            
            graphHTML += `
                <div style="margin-top: 20px; padding: 15px; background: #e8f4f8; border-radius: 8px; border-left: 4px solid #667eea;">
                    <div style="font-weight: 600; color: #667eea; margin-bottom: 8px;">💡 Insights:</div>
                    <div style="color: #555; line-height: 1.6;">
                        Average mood: <strong>${avgMood.toFixed(1)}/10</strong><br>
                        ${trend > 1 ? '📈 Your mood has been improving! Keep going!' : 
                          trend < -1 ? '📉 You seem to be going through a tough time. I\'m here for you.' : 
                          '➡️ Your mood has been relatively stable'}
                    </div>
                </div>
            `
            
            graphHTML += '</div>'
        } else {
            graphHTML += `
                <div style="text-align: center; padding: 40px;">
                    <div style="font-size: 48px; margin-bottom: 15px;">📊</div>
                    <p style="color: #999; font-size: 16px;">Not enough data yet.</p>
                    <p style="color: #666; font-size: 14px;">Keep chatting to see your mood timeline!</p>
                </div>
            `
        }
        
        modalBody.innerHTML = graphHTML
        modal.classList.add('show')
        
    } catch (error) {
        console.error('Error loading stats:', error)
        alert('Could not load statistics')
    }
})