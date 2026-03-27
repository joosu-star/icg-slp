const firebaseConfig={
  apiKey:"AIzaSyAh7...",
  authDomain:"icg-slp.firebaseapp.com",
  projectId:"icg-slp"
};

firebase.initializeApp(firebaseConfig);
const db=firebase.firestore();

let currentTab="ranking";
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
  let placeholder="¿Qué quieres decir?";
  if(currentTab==="profesores") placeholder="Opina sobre un profesor…";
  if(currentTab==="experiencias") placeholder="Cuenta tu experiencia…";
  if(currentTab==="quejas") placeholder="Describe la situación…";
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

// TAB
function switchTab(tab){
  currentTab=tab;
  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
  if(tab==="ranking") document.getElementById("tab-trending").classList.add("active");
  else if(tab==="fama") document.getElementById("tab-fame").classList.add("active");
  else if(tab==="info") document.getElementById("tab-info").classList.add("active");
  else document.getElementById("tab-channels").classList.add("active");
  render();
}

// DROPDOWN
function toggleChannels(){
  const dd=document.getElementById("channelsDropdown");
  dd.classList.toggle("show");
}

// CHANNEL ITEM CLICK
document.querySelectorAll(".channel-item").forEach(item=>{
  item.addEventListener("click", ()=>{
    let tab=item.dataset.tab;
    currentTab=tab;
    document.getElementById("channelsDropdown").classList.remove("show");
    render();
  });
});

// RENDER
function render(){
  let c=document.getElementById("content");
  let search=document.getElementById("searchInput").value.toLowerCase();

  // mostrar nombre de canal y color
  const channelColors={
    general:"#3498db",
    profesores:"#2ecc71",
    experiencias:"#9b59b6",
    quejas:"#e74c3c",
    ranking:"#6a00ff",
    fama:"#f1c40f",
    info:"#95a5a6"
  };

  const channelNames={
    general:"💬 General",
    profesores:"👨‍🏫 Profesores",
    experiencias:"🧠 Experiencias",
    quejas:"⚠️ Quejas",
    ranking:"🔥 Tendencias",
    fama:"🏆 Salón",
    info:"ℹ️ Info"
  };

  document.getElementById("currentChannelName").innerText=channelNames[currentTab]||"";
  document.getElementById("currentChannelName").style.color=channelColors[currentTab]||"white";

  // borde oleaje en contenido
  c.style.border="3px solid";
  c.style.borderColor=channelColors[currentTab]||"white";
  c.style.borderRadius="15px";
  c.style.animation="waveBorder 3s infinite";

  db.collection("mensajes").onSnapshot(snap=>{
    c.innerHTML="";
    let arr=[];
    snap.forEach(d=>arr.push({id:d.id,...d.data()}));

    arr=arr.filter(m=>m.text.toLowerCase().includes(search));

    // INFO
    if(currentTab==="info"){
      c.innerHTML=`
      <div class="info-box">
        🕶️ Whispr<br>
        Plataforma digital enfocada en la expresión anónima dentro de comunidades.<br><br>
        🎯 Misión<br>
        Permitir que las personas compartan experiencias, opiniones y situaciones sin miedo.<br><br>
        🔒 Privacidad<br>
        No almacenamos identidad real. Sistema completamente anónimo.<br><br>
        ⚖️ Normas<br>
        No amenazas reales. No datos personales. No contenido ilegal.<br><br>
        📌 Nota<br>
        Whispr es una plataforma independiente creada con fines sociales y de expresión.
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
    let channelIcons={
      general:"💬",
      profesores:"👨‍🏫",
      experiencias:"🧠",
      quejas:"⚠️"
    };
    html+=`
      <div class="fame-card ${i===0?"fame-top":""}" style="border-color:${m.categoria==='quejas'?'#e74c3c':'gold'}">
        ${i===0?"👑":""}
        <div>${m.text}</div>
        <div>${channelIcons[m.categoria]||""} ${m.categoria}</div>
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

  const colors={
    general:"#3498db",
    profesores:"#2ecc71",
    experiencias:"#9b59b6",
    quejas:"#e74c3c"
  };

  div.className="message "+(isOwner?"owner":"");
  div.style.border="2px solid";
  div.style.borderColor=colors[m.categoria]||"#ffffff";
  div.style.animation="waveBorder 3s infinite";

  div.innerHTML=`
    ${isOwner?`<span class="owner-name">👑 Owner</span>`:""}
    <br>${m.text}
    <br><small>${timeAgo(m.timestamp)}</small>
    <br>${m.categoria==='quejas'?'⚠️ ':''}${m.categoria==='profesores'?'👨‍🏫 ':''}${m.categoria==='experiencias'?'🧠 ':''}${m.categoria==='general'?'💬 ':''} ${m.categoria}
    <br>❤️ ${m.likes}
    <br>
    <button onclick="like('${m.id}')">❤️</button>
    ${(m.user===getUserId()||isAdmin)?`<button onclick="deleteMessage('${m.id}')">🗑️</button>`:""}
  `;

  document.getElementById("content").appendChild(div);
}

render();
