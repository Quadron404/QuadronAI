let voices=[]
let selectedVoice=0

window.speechSynthesis.onvoiceschanged=()=>{
voices=speechSynthesis.getVoices()
}

function selectVoice(v){

selectedVoice=v

document.querySelectorAll(".voice-card")
.forEach(v=>v.classList.remove("active"))

document.getElementById("voice"+v).classList.add("active")

}

function speak(text){

let speech=new SpeechSynthesisUtterance(text)

speech.voice=voices[selectedVoice]

speech.lang="hi-IN"

speech.rate=1
speech.pitch=1

animateVoice()

speechSynthesis.speak(speech)

}

function animateVoice(){

let orb=document.getElementById("voiceOrb")

orb.classList.add("speaking")

setTimeout(()=>{
orb.classList.remove("speaking")
},3000)

}