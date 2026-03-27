const firebaseConfig={
  apiKey:"AIzaSyAh7...",
  authDomain:"icg-slp.firebaseapp.com",
  projectId:"icg-slp"
};

firebase.initializeApp(firebaseConfig);
const db=firebase.firestore();

let currentTab="ranking";
let currentCategory=null;
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
  document.getElementById("modal").classList.remove("hidden");

  const ph = {
    general:"¿Qué quieres decir?",
    profesores:"Opina sobre un profesor…",
    experiencias:"Cuenta tu experiencia…",
    quejas:"Describe la situación…"
  };
  document.getElementById("newMsg").placeholder = ph[currentCategory] || "¿Qué quieres decir?";
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
    categoria:currentCategory || "general"
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
  currentCategory=null;
  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
  document.querySelectorAll(".channel-item").forEach(t=>t.classList.remove("active"));
  event.target.classList.add("active");
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
      <h3>🕶️ Whispr</h3>
      <p>Plataforma digital enfocada en la expresión anónima dentro de comunidades.</p>
      <h4>🎯 Misión</h4>
      <p>Permitir que las personas compartan experiencias, opiniones y situaciones sin miedo.</p>
      <h4>🔒 Privacidad</h4>
      <p>No almacenamos identidad real. Sistema completamente anónimo.</p>
      <h4>⚖️ Normas</h4>
      <p>No amenazas reales. No datos personales. No contenido ilegal.</p>
      <p>📌 Nota: Whispr es una plataforma independiente creada con fines sociales y de expresión.</p>
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

    if(currentTab==="channels" && currentCategory){
      arr=arr.filter(m=>m.categoria===currentCategory);
    }

    if(currentTab!=="ranking" && currentTab!=="fama" && currentTab!=="info" && currentTab!=="channels"){
      arr=arr.filter(m=>m.categoria===currentTab);
    }

    // Tendencias = todo
    if(currentTab==="ranking"){
      arr.sort((a,b)=>score(b)-score(a));
    } else {
      arr.sort((a,b)=>score(b)-score(a));
    }

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
        <div style="font-size:12px;">${m.categoria ? categoryIcon(m.categoria)+" "+capitalize(m.categoria) : ""}</div>
        <div>❤️ ${m.likes}</div>
      </div>
    `;
  });

  html+="</div></div>";
  return html;
}

// ICONOS CATEGORIAS
function categoryIcon(cat){
  switch(cat){
    case "general": return "💬";
    case "profesores": return "👨‍🏫";
    case "experiencias": return "🧠";
    case "quejas": return "⚠️";
    default: return "";
  }
}

function capitalize(str){return str.charAt(0).toUpperCase()+str.slice(1);}

// UI
function createMessage(m){
  let div=document.createElement("div");
  let isOwner=m.user===getOwner();

  div.className="message "+(isOwner?"owner":"")+(m.categoria?` ${m.categoria}`:"");

  div.innerHTML=`
    ${isOwner?`<span class="owner-name">👑 Owner</span><br>`:""}
    ${m.text}<br>
    <small>${timeAgo(m.timestamp)}</small>
    <br>${m.categoria ? categoryIcon(m.categoria)+" "+capitalize(m.categoria) : ""}
    <br>❤️ ${m.likes}
    <br>
    <button onclick="like('${m.id}')">❤️</button>
    ${(m.user===getUserId()||isAdmin)?`<button onclick="deleteMessage('${m.id}')">🗑️</button>`:""}
  `;

  document.getElementById("content").appendChild(div);
}

// DROPDOWN CANALES
function toggleChannels(){
  const dropdown = document.getElementById("channelsDropdown");
  const tab = document.getElementById("tab-channels");

  if(dropdown.classList.contains("show")){
    dropdown.classList.remove("show");
    tab.classList.remove("active");
  } else {
    dropdown.classList.add("show");
    tab.classList.add("active");
  }
}

function switchCategory(cat){
  currentCategory = cat;
  currentTab = "channels";

  const dropdown = document.getElementById("channelsDropdown");
  dropdown.classList.remove("show");

  document.getElementById("tab-channels").classList.remove("active");

  render();
}

render();
