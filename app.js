// 🔥 CONFIGURA FIREBASE
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_DOMINIO",
  projectId: "TU_PROJECT_ID",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let currentTab = "ranking";

// 🔐 ADMIN
const ADMIN_PASSWORD = "1234";
let isAdmin = false;

function activarAdmin() {
  let pass = prompt("Contraseña:");
  if (pass === ADMIN_PASSWORD) {
    isAdmin = true;
    alert("Admin activado");
    render();
  }
}

// 👤 USUARIO (ID anónimo)
function getUserId() {
  let id = localStorage.getItem("user_id");
  if (!id) {
    id = "user_" + Math.random().toString(36).substr(2,9);
    localStorage.setItem("user_id", id);
  }
  return id;
}

// ⏳ TIEMPO
function timeAgo(t) {
  let diff = (Date.now() - t)/1000;
  if (diff<60) return "hace "+Math.floor(diff)+"s";
  if (diff<3600) return "hace "+Math.floor(diff/60)+" min";
  if (diff<86400) return "hace "+Math.floor(diff/3600)+" h";
  return "hace "+Math.floor(diff/86400)+" días";
}

// 🔥 VIRALIDAD
function calcularViralidad(m){
  let score = m.likes + (m.replies?.length||0)*2;
  let horas = (Date.now()-m.timestamp)/(1000*60*60);
  if(horas<24) score+=5;
  return score;
}

// 🛡️ ANTI-SPAM
let lastMessageTime = 0;
let lastMessageText = "";

// ➕ MENSAJE
async function addMessage(){
  let text = document.getElementById("newMsg").value.trim();
  const user = getUserId();

  if (!text) return alert("Escribe algo");

  let now = Date.now();

  // ⏳ 10 segundos entre mensajes
  if (now - lastMessageTime < 10000) {
    return alert("Espera 10 segundos");
  }

  // 🚫 mensaje repetido
  if (text === lastMessageText) {
    return alert("No repitas el mismo mensaje");
  }

  await db.collection("mensajes").add({
    text,
    userId: user,
    categoria: currentTab,
    likes: 0,
    replies: [],
    pinned: false,
    timestamp: now
  });

  lastMessageTime = now;
  lastMessageText = text;

  document.getElementById("newMsg").value = "";
}

// ❤️ LIKE
async function like(id){
  const user=getUserId();
  const likeRef=db.collection("likes").doc(id+"_"+user);

  let doc=await likeRef.get();
  if(!doc.exists){
    await likeRef.set({});
    await db.collection("mensajes").doc(id).update({
      likes: firebase.firestore.FieldValue.increment(1)
    });
  }
}

// 💬 RESPUESTA
async function reply(id){
  let text=prompt("Respuesta:");
  if(!text) return;

  let ref=db.collection("mensajes").doc(id);
  let doc=await ref.get();
  let replies=doc.data().replies||[];
  replies.push(text);

  await ref.update({replies});
}

// 🗑️ BORRAR SOLO AUTOR
async function deleteMessage(id){
  if (!confirm("¿Borrar mensaje?")) return;
  await db.collection("mensajes").doc(id).delete();
}

// 📌 PIN
async function togglePin(id,current){
  await db.collection("mensajes").doc(id).update({
    pinned: !current
  });
}

// 🧱 MENSAJE UI
function createMessage(m){
  let div=document.createElement("div");
  div.className="message";

  const user = getUserId();

  div.innerHTML=`
    <div>${m.pinned?"📌":""} ${calcularViralidad(m)>10?"🔥":""} ${m.text}</div>
    <small>${timeAgo(m.timestamp)}</small>
    <div>❤️ ${m.likes}</div>

    <button class="like" onclick="like('${m.id}')">Like</button>
    <button class="reply" onclick="reply('${m.id}')">Responder</button>
    ${isAdmin?`<button onclick="togglePin('${m.id}',${m.pinned})">📌</button>`:""}
    ${m.userId === user ? `<button onclick="deleteMessage('${m.id}')">🗑️</button>` : ""}

    ${(m.replies||[]).map(r=>`<div>↳ ${r}</div>`).join("")}
  `;
  document.getElementById("content").appendChild(div);
}

// 🔄 TAB
function switchTab(tab){
  currentTab=tab;
  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
  event.target.classList.add("active");
  render();
}

// 🏆 TOPS
function esHoy(t){
  let d=new Date(t);
  let now=new Date();
  return d.toDateString()===now.toDateString();
}

function esSemana(t){
  let d=new Date(t);
  let now=new Date();
  let diff=(now-d)/(1000*60*60*24);
  return diff<=7;
}

// 🎯 RENDER
function render(){
  let c=document.getElementById("content");
  c.innerHTML="";

  let search=document.getElementById("searchInput")?.value.toLowerCase()||"";

  if(currentTab==="autores"){
    c.innerHTML=`<div class="message">
    Página creada por un alumno.<br><br>
    Para entretenimiento, historias y denuncias anónimas.
    </div>`;
    return;
  }

  db.collection("mensajes").onSnapshot(snap=>{
    c.innerHTML="";
    let arr=[];
    snap.forEach(doc=>arr.push({id:doc.id,...doc.data()}));

    arr=arr.filter(m=>m.text.toLowerCase().includes(search));

    arr.sort((a,b)=>{
      if(a.pinned&&!b.pinned)return -1;
      if(!a.pinned&&b.pinned)return 1;
      return calcularViralidad(b)-calcularViralidad(a);
    });

    if(currentTab==="ranking"){
      c.innerHTML+="<h2>🔥 Top Hoy</h2>";
      arr.filter(m=>esHoy(m.timestamp)).slice(0,5).forEach(createMessage);

      c.innerHTML+="<h2>🏆 Top Semana</h2>";
      arr.filter(m=>esSemana(m.timestamp)).slice(0,5).forEach(createMessage);
      return;
    }

    arr.filter(m=>m.categoria===currentTab).forEach(createMessage);

    c.innerHTML+=`
      <textarea id="newMsg"></textarea>
      <button onclick="addMessage()">Enviar</button>
    `;
  });
}

render();
