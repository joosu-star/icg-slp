const firebaseConfig={
  apiKey:"AIzaSyAh7...",
  authDomain:"icg-slp.firebaseapp.com",
  projectId:"icg-slp"
};

firebase.initializeApp(firebaseConfig);
const db=firebase.firestore();

let currentTab="trending";
let lastTime=0;
let channelColors={
  general:"#007bff",
  profesores:"#28a745",
  experiencias:"#6f42c1",
  quejas:"#dc3545"
};

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
  const placeholders={
    general:"¿Qué quieres decir?",
    profesores:"Opina sobre un profesor…",
    experiencias:"Cuenta tu experiencia…",
    quejas:"Describe la situación…"
  };
  document.getElementById("newMsg").placeholder=placeholders[currentTab]||"¿Qué quieres decir?";
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

// TAB
function switchTab(tab){
  currentTab=tab;
  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
  document.querySelectorAll(".channel").forEach(c=>c.classList.remove("active"));
  if(tab==="trending") document.querySelector(".tab:nth-child(1)").classList.add("active");
  else if(tab==="fama") document.querySelector(".tab:nth-child(3)").classList.add("active");
  else if(tab==="info") document.querySelector(".tab:nth-child(4)").classList.add("active");
  else{
    document.querySelector(".dropdown-btn").classList.add("active");
    document.querySelector(`.channel[onclick*="${tab}"]`).classList.add("active");
  }
  closeDropdown();
  render();
}

// DROPDOWN
function toggleChannels(){
  document.getElementById("channelsDropdown").classList.toggle("show");
}

function closeDropdown(){
  document.getElementById("channelsDropdown").classList.remove("show");
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
      Plataforma digital enfocada en la expresión anónima.<br><br>
      🎯 Misión: Permitir que las personas compartan experiencias y opiniones sin miedo.<br>
      🔒 Privacidad: No almacenamos identidad real.<br>
      ⚖️ Normas: No amenazas, no contenido ilegal.<br>
      📌 Nota: Plataforma independiente con fines sociales.
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

    if(currentTab!=="trending"){
      arr=arr.filter(m=>m.categoria===currentTab);
    }

    arr.sort((a,b)=>score(b)-score(a));

    arr.forEach(createMessage);
  });

  // Fondo dinámico según canal
  const body=document.body;
  let colors={
    general:"#0a0a20",
    profesores:"#0a2010",
    experiencias:"#200a20",
    quejas:"#200a10",
    trending:"#0a0a0a",
    fama:"#0a0a0a",
    info:"#0a0a0a"
  };
  body.style.background=colors[currentTab] || "#0a0a0a";
}

// SALON
function crearSeccion(titulo,data){
  if(data.length===0){
    return `<div class="info-box">Sin mensajes aún</div>`;
  }

  let html=`<div class="fame-section"><div class="fame-title">${titulo}</div><div class="fame-grid">`;

  data.forEach((m,i)=>{
    let icon="";
    if(m.categoria==="general") icon="💬";
    else if(m.categoria==="profesores") icon="👨‍🏫";
    else if(m.categoria==="experiencias") icon="🧠";
    else if(m.categoria==="quejas") icon="⚠️";

    html+=`
      <div class="fame-card ${i===0?"fame-top":""}">
        ${i===0?"👑":""}
        <div>${m.text}</div>
        <div>${icon} ${m.categoria.charAt(0).toUpperCase() + m.categoria.slice(1)}</div>
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

  let colorClass="";
  if(m.categoria==="general") colorClass="channel-general";
  else if(m.categoria==="profesores") colorClass="channel-profesores";
  else if(m.categoria==="experiencias") colorClass="channel-experiencias";
  else if(m.categoria==="quejas") colorClass="channel-quejas";

  let icon="";
  if(m.categoria==="general") icon="💬";
  else if(m.categoria==="profesores") icon="👨‍🏫";
  else if(m.categoria==="experiencias") icon="🧠";
  else if(m.categoria==="quejas") icon="⚠️";

  div.className="message "+(isOwner?"owner":"")+" "+colorClass;

  div.innerHTML=`
    ${isOwner?`<span class="owner-name">👑 Owner</span><br>`:""}
    <span class="category-badge">${icon} ${m.categoria.charAt(0).toUpperCase() + m.categoria.slice(1)}</span>
    ${m.text}
    <br><small>${timeAgo(m.timestamp)}</small>
    <br>❤️ ${m.likes}
    <br>
    <button onclick="like('${m.id}')">❤️</button>
    ${(m.user===getUserId()||isAdmin)?`<button onclick="deleteMessage('${m.id}')">🗑️</button>`:""}
  `;

  document.getElementById("content").appendChild(div);
}

render();
