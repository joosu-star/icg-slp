const firebaseConfig = {
  apiKey: "AIzaSyAh7d5vljRjEaF7gCGDEmpI2D270_RFFEA",
  authDomain: "icg-slp.firebaseapp.com",
  projectId: "icg-slp"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let currentTab = "ranking";

// 🔐 ADMIN OFUSCADO
const _A="MzAxOTE1MzE=";
let isAdmin=false;

function _D(x){ return atob(x); }

function activarAdmin(){
  let p=prompt("...");
  if(p===_D(_A)){
    isAdmin=true;
    localStorage.setItem("owner_id",getUserId());
    alert("✔ admin");
    render();
  }
}

function getUserId(){
  let id=localStorage.getItem("user_id");
  if(!id){
    id="anon_"+Math.random().toString(36).substr(2,9);
    localStorage.setItem("user_id",id);
  }
  return id;
}

function getOwner(){
  return localStorage.getItem("owner_id");
}

function timeAgo(t){
  let d=(Date.now()-t)/1000;
  if(d<60) return Math.floor(d)+"s";
  if(d<3600) return Math.floor(d/60)+"m";
  if(d<86400) return Math.floor(d/3600)+"h";
  return Math.floor(d/86400)+"d";
}

function score(m){
  return (m.pinned?1000:0)+m.likes+(m.replies?.length||0)*2;
}

function openModal(){document.getElementById("modal").classList.remove("hidden");}
function closeModal(){document.getElementById("modal").classList.add("hidden");}

let lastTime=0;

async function addMessage(){
  let text=document.getElementById("newMsg").value.trim();
  if(!text) return;

  if(Date.now()-lastTime<5000) return alert("Espera 5s");

  // comandos
  if(text.startsWith("/")){
    const cmd=text.split(" ");
    if(cmd[0]==="/delete" && isAdmin){ deleteMessage(cmd[1]); return; }
    if(cmd[0]==="/pin" && isAdmin){ togglePin(cmd[1]); return; }
    if(cmd[0]==="/say" && isAdmin){ text=cmd.slice(1).join(" "); }
  }

  await db.collection("mensajes").add({
    text,
    userId:getUserId(),
    categoria:currentTab,
    likes:0,
    likedBy:[],
    replies:[],
    pinned:false,
    timestamp:Date.now()
  });

  lastTime=Date.now();
  document.getElementById("newMsg").value="";
  closeModal();
}

async function like(id){
  let ref=db.collection("mensajes").doc(id);
  let doc=await ref.get();
  let data=doc.data();
  let user=getUserId();

  if(data.likedBy?.includes(user)) return;

  await ref.update({
    likes:data.likes+1,
    likedBy:[...(data.likedBy||[]),user]
  });
}

async function sendReply(id){
  let input=document.getElementById("reply-"+id);
  let text=input.value.trim();
  if(!text) return;

  let ref=db.collection("mensajes").doc(id);
  let doc=await ref.get();
  let replies=doc.data().replies||[];

  replies.push({text,user:getUserId(),time:Date.now()});

  await ref.update({replies});
  input.value="";
}

async function deleteMessage(id){
  await db.collection("mensajes").doc(id).delete();
}

async function togglePin(id){
  let ref=db.collection("mensajes").doc(id);
  let doc=await ref.get();
  await ref.update({pinned:!doc.data().pinned});
}

function switchTab(tab){
  currentTab=tab;
  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
  event.target.classList.add("active");
  render();
}

function render(){
  let c=document.getElementById("content");
  let search=document.getElementById("searchInput").value.toLowerCase();

  db.collection("mensajes").onSnapshot(snap=>{
    c.innerHTML="";
    let arr=[];
    snap.forEach(doc=>arr.push({id:doc.id,...doc.data()}));

    arr=arr.filter(m=>m.text.toLowerCase().includes(search));

    if(currentTab!=="ranking"){
      arr=arr.filter(m=>m.categoria===currentTab);
    }

    arr.sort((a,b)=>score(b)-score(a));

    arr.forEach(createMessage);
  });
}

function createMessage(m){
  let div=document.createElement("div");

  const user=getUserId();
  const owner=getOwner();

  const isOwner=m.userId===owner;
  const verified=m.likes>5;

  div.className="message "+(isOwner?"owner":"");

  div.innerHTML=`
    <div>
      ${isOwner?`<span class="owner-name">👑 Owner</span>`:""}
      ${verified?`<span class="verified"> ✔</span>`:""}
      <br>${m.text}
    </div>

    <small>${timeAgo(m.timestamp)}</small>
    <div>❤️ ${m.likes}</div>

    <div class="actions">
      <button onclick="like('${m.id}')">❤️</button>
      ${(m.userId===user||isAdmin)?`<button onclick="deleteMessage('${m.id}')">🗑️</button>`:""}
      ${isAdmin?`<button onclick="togglePin('${m.id}')">📌</button>`:""}
    </div>

    ${(m.replies||[]).map(r=>`
      <div class="reply">
        ${r.user===owner?`<span class="owner-name">👑</span>`:""}
        ${r.text} (${timeAgo(r.time)})
      </div>
    `).join("")}

    <div class="reply-box">
      <input id="reply-${m.id}" placeholder="Responder...">
      <button onclick="sendReply('${m.id}')">➤</button>
    </div>
  `;

  document.getElementById("content").appendChild(div);
}

render();
