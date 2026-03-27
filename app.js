const firebaseConfig={
  apiKey:"AIzaSyAh7...",
  authDomain:"icg-slp.firebaseapp.com",
  projectId:"icg-slp"
};

firebase.initializeApp(firebaseConfig);
const db=firebase.firestore();

let currentTab="general";
let lastTime=0;

// ADMIN
const A="MzAxOTE1MzE=";
let isAdmin=false;

function activarAdmin(){
  let p=prompt("...");
  if(p===atob(A)){
    isAdmin=true;
    localStorage.setItem("owner",getUserId());
    alert("Admin activado");
    render();
  }
}

// USER
function getUserId(){
  let id=localStorage.getItem("uid");
  if(!id){
    id="u_"+Math.random().toString(36).substr(2,9);
    localStorage.setItem("uid",id);
  }
  return id;
}

function getOwner(){
  return localStorage.getItem("owner");
}

// MODAL
function openModal(){
  if(currentTab==="info" || currentTab==="fama"){
    alert("No puedes publicar aquí");
    return;
  }
  let placeholder="";
  switch(currentTab){
    case "general": placeholder="¿Qué quieres decir?"; break;
    case "profesores": placeholder="Opina sobre un profesor..."; break;
    case "experiencias": placeholder="Cuenta tu experiencia..."; break;
    case "quejas": placeholder="Describe la situación..."; break;
  }
  document.getElementById("newMsg").placeholder=placeholder;
  document.getElementById("modal").classList.remove("hidden");
}

function closeModal(){
  document.getElementById("modal").classList.add("hidden");
}

// TIEMPO
function timeAgo(t){
  let d=(Date.now()-t)/1000;
  if(d<60) return Math.floor(d)+"s";
  if(d<3600) return Math.floor(d/60)+"m";
  if(d<86400) return Math.floor(d/3600)+"h";
  return Math.floor(d/86400)+"d";
}

// SCORE
function score(m){
  return (m.likes||0)+(m.pinned?1000:0);
}

// ADD
async function addMessage(){
  let text=document.getElementById("newMsg").value.trim();
  if(!text)return;

  if(Date.now()-lastTime<4000){
    alert("Espera unos segundos");
    return;
  }

  await db.collection("mensajes").add({
    text,
    user:getUserId(),
    likes:0,
    likedBy:[],
    pinned:false,
    timestamp:Date.now(),
    categoria:currentTab
  });

  lastTime=Date.now();
  document.getElementById("newMsg").value="";
  closeModal();
}

// LIKE
async function like(id){
  let ref=db.collection("mensajes").doc(id);
  let doc=await ref.get();
  let data=doc.data();
  let user=getUserId();

  if(data.likedBy?.includes(user)) return;

  await ref.update({
    likes:(data.likes||0)+1,
    likedBy:[...(data.likedBy||[]),user]
  });
}

// DELETE
async function deleteMessage(id){
  await db.collection("mensajes").doc(id).delete();
}

// TABS
function switchTab(tab){
  currentTab=tab;
  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
  if(tab==="ranking") document.getElementById("tab-trending").classList.add("active");
  if(tab==="fama") document.querySelectorAll(".tab")[2].classList.add("active");
  if(tab==="info") document.querySelectorAll(".tab")[3].classList.add("active");
  render();
}

// CANALES
function toggleChannels(){
  document.getElementById("channels-dropdown").classList.toggle("show");
}

function selectChannel(tab){
  currentTab=tab;
  document.getElementById("channels-dropdown").classList.remove("show");

  // Actualizar highlight de tab principal
  document.getElementById("tab-channels").classList.add("active");
  document.getElementById("tab-trending").classList.remove("active");
  document.querySelectorAll(".tab")[2].classList.remove("active"); // Salón
  document.querySelectorAll(".tab")[3].classList.remove("active"); // Info

  // Oleaje en bordes y nombre canal
  document.body.classList.remove("channel-general","channel-profesores","channel-experiencias","channel-quejas");
  let channelName="General";
  if(tab==="general") { document.body.classList.add("channel-general"); channelName="General"; }
  if(tab==="profesores") { document.body.classList.add("channel-profesores"); channelName="Profesores"; }
  if(tab==="experiencias") { document.body.classList.add("channel-experiencias"); channelName="Experiencias"; }
  if(tab==="quejas") { document.body.classList.add("channel-quejas"); channelName="Quejas"; }

  document.getElementById("current-channel").innerText = "Canal: " + channelName;
  render();
}

// RENDER
function render(){
  let c=document.getElementById("content");
  let search=document.getElementById("searchInput").value.toLowerCase();

  db.collection("mensajes").onSnapshot(snap=>{
    c.innerHTML="";
    let arr=[];
    snap.forEach(d=>arr.push({id:d.id,...d.data()}));

    arr=arr.filter(m=>m.text.toLowerCase().includes(search));

    // INFO
    if(currentTab==="info"){
      c.innerHTML=`<div class="info-box">
        🕶️ Whispr<br><br>
        Plataforma digital enfocada en la expresión anónima dentro de comunidades.<br><br>
        🎯 <b>Misión</b><br>
        Permitir que las personas compartan experiencias, opiniones y situaciones sin miedo.<br><br>
        🔒 <b>Privacidad</b><br>
        No almacenamos identidad real. Sistema completamente anónimo.<br><br>
        ⚖️ <b>Normas</b><br>
        No amenazas reales. No datos personales. No contenido ilegal.<br><br>
        📌 Nota: Whispr es una plataforma independiente creada con fines sociales y de expresión.
      </div>`;
      return;
    }

    // SALON
    if(currentTab==="fama"){
      let hoy=Date.now()-86400000;
      let semana=Date.now()-604800000;

      let topDia=arr.filter(m=>m.timestamp>hoy).sort((a,b)=>score(b)-score(a)).slice(0,6);
      let topSemana=arr.filter(m=>m.timestamp>semana).sort((a,b)=>score(b)-score(a)).slice(0,6);
      let topGlobal=arr.sort((a,b)=>score(b)-score(a)).slice(0,6);

      c.innerHTML+=crearSeccion("🔥 Hoy",topDia);
      c.innerHTML+=crearSeccion("🏆 Semana",topSemana);
      c.innerHTML+=crearSeccion("💎 Historia",topGlobal);
      return;
    }

    if(currentTab!=="ranking"){
      arr=arr.filter(m=>m.categoria===currentTab);
    }

    arr.sort((a,b)=>score(b)-score(a));
    arr.forEach(createMessage);
  });
}

// SALON
function crearSeccion(titulo,data){
  if(data.length===0){
    return `<div class="info-box">Sin mensajes aún</div>`;
  }

  let html=`<div class="fame-section"><div class="fame-title">${titulo}</div><div class="fame-grid">`;

  data.forEach((m,i)=>{
    html+=`
      <div class="fame-card ${i===0?"fame-top":""}">
        ${i===0?"👑":""}
        <div>${m.text}</div>
        <div>${m.categoria ? m.categoria.toUpperCase() : ''}</div>
        <div>❤️ ${m.likes}</div>
      </div>
    `;
  });

  html+="</div></div>";
  return html;
}

// UI
function createMessage(m){
  let div=document.createElement("div");
  let isOwner=m.user===getOwner();

  div.className="message "+(isOwner?"owner":"");

  // COLOR DEL BADGE
  let color="", icon="";
  switch(m.categoria){
    case "general": color="#007bff"; icon="💬"; break;
    case "profesores": color="#28a745"; icon="👨‍🏫"; break;
    case "experiencias": color="#6f42c1"; icon="🧠"; break;
    case "quejas": color="#dc3545"; icon="⚠️"; break;
    default: color="#888"; icon="";
  }

  div.innerHTML=`
    ${isOwner?`<span class="owner-name">👑 Owner</span><br>`:""}
    <div>${m.text}</div>
    <div style="color:${color}; font-weight:bold;">${icon} ${m.categoria ? m.categoria.toUpperCase() : ''}</div>
    <small>${timeAgo(m.timestamp)}</small>
    <br>❤️ ${m.likes}
    <br>
    <button onclick="like('${m.id}')">❤️</button>
    ${(m.user===getUserId()||isAdmin)?`<button onclick="deleteMessage('${m.id}')">🗑️</button>`:""}
  `;

  document.getElementById("content").appendChild(div);
}

render();
