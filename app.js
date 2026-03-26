const firebaseConfig={
  apiKey:"AIzaSyAh7...",
  authDomain:"icg-slp.firebaseapp.com",
  projectId:"icg-slp"
};

firebase.initializeApp(firebaseConfig);
const db=firebase.firestore();

let lastTime=0;

// TERMS FIX
function acceptTerms(){
  localStorage.setItem("terms","yes");
  document.getElementById("terms").style.display="none";
}

// 🔥 IMPORTANTE
window.onload = () => {
  if(localStorage.getItem("terms")){
    document.getElementById("terms").style.display="none";
  }
}

// MODAL
function openModal(){
  document.getElementById("modal").classList.remove("hidden");
}

function closeModal(){
  document.getElementById("modal").classList.add("hidden");
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

// ADD MESSAGE
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
    timestamp:Date.now()
  });

  lastTime=Date.now();
  document.getElementById("newMsg").value="";
  closeModal();
}

// RENDER
function render(){
  let c=document.getElementById("content");

  db.collection("mensajes").onSnapshot(snap=>{
    c.innerHTML="";
    snap.forEach(doc=>{
      let m=doc.data();

      let div=document.createElement("div");
      div.className="message";
      div.innerHTML=`
        ${m.text}<br>
        ❤️ ${m.likes}
      `;
      c.appendChild(div);
    });
  });
}

render();
