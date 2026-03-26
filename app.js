const firebaseConfig={
  apiKey:"AIzaSyAh7...",
  authDomain:"icg-slp.firebaseapp.com",
  projectId:"icg-slp"
};

firebase.initializeApp(firebaseConfig);
const db=firebase.firestore();

let currentTab="ranking";
let lastTime=0;

// 🔐 ADMIN
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
  return (m.likes||0)+(m.replies?.length||0)*2+(m.pinned?1000:0);
}

// ADD
async function addMessage(){
  let text=document.getElementById("newMsg").value.trim();
  if(!text)return;

  if(Date.now()-lastTime<4000){
    alert("Espera unos segundos");
    return;
  }

  // comandos
  if(text.startsWith("/")){
    let cmd=text.split(" ");
    if(cmd[0]==="/delete" && isAdmin){ deleteMessage(cmd[1]); return; }
    if(cmd[0]==="/pin" && isAdmin){ togglePin(cmd[1]); return; }
  }

  await db.collection("mensajes").add({
    text,
    user:getUserId(),
    likes:0,
    likedBy:[],
    replies:[],
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

// PIN
async function togglePin(id){
  let ref=db.collection("mensajes").doc(id);
  let doc=await ref.get();
  await ref.update({pinned:!doc.data().pinned});
}

// TAB
function switchTab(tab){
  currentTab=tab;
  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
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

    if(currentTab!=="ranking"){
      arr=arr.filter(m=>m.categoria===currentTab);
    }

    arr.sort((a,b)=>score(b)-score(a));

    arr.forEach(createMessage);
  });
}

// UI MENSAJE
function createMessage(m){
  let div=document.createElement("div");

  let owner=getOwner();
  let isOwner=m.user===owner;
  let verified=m.likes>5;

  div.className="message "+(isOwner?"owner":"");

  div.innerHTML=`
    ${isOwner?`<span class="owner-name">👑 Owner</span>`:""}
    ${verified?`<span class="verified"> ✔</span>`:""}
    <br>${m.text}
    <br><small>${timeAgo(m.timestamp)}</small>
    <br>❤️ ${m.likes}

    <br>
    <button onclick="like('${m.id}')">❤️</button>
    ${(m.user===getUserId()||isAdmin)?`<button onclick="deleteMessage('${m.id}')">🗑️</button>`:""}
    ${isAdmin?`<button onclick="togglePin('${m.id}')">📌</button>`:""}
  `;

  document.getElementById("content").appendChild(div);
}

render();
