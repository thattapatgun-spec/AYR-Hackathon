// voice.js - Voice stress detection
let audioContext = null
let analyser = null
let microphone = null
let isRecording = false
 
// Simple stress detection based on voice characteristics
function analyzeVoiceStress(dataArray) {
    // Calculate average frequency energy
    let sum = 0
    for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i]
    }
    let average = sum / dataArray.length
   
    // Simple stress level determination
    // High frequency/energy = more stress
    if (average > 150) {
        return 'high'
    } else if (average > 100) {
        return 'moderate'
    } else {
        return 'low'
    }
}
 
async function startVoiceRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
       
        audioContext = new (window.AudioContext || window.webkitAudioContext)()
        analyser = audioContext.createAnalyser()
        microphone = audioContext.createMediaStreamSource(stream)
       
        analyser.fftSize = 256
        microphone.connect(analyser)
       
        isRecording = true
       
        return stream
       
    } catch (error) {
        console.error('Microphone access denied:', error)
        alert('Please allow microphone access to use voice input')
        return null
    }
}
 
function getStressLevel() {
    if (!analyser) return 'low'
   
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyser.getByteFrequencyData(dataArray)
   
    return analyzeVoiceStress(dataArray)
}
 
function stopVoiceRecording() {
    if (microphone) {
        microphone.disconnect()
        microphone = null
    }
    if (audioContext) {
        audioContext.close()
        audioContext = null
    }
    analyser = null
    isRecording = false
}
 
