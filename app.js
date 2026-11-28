const $=id=>document.getElementById(id);
const names=["Üst sol dış referans noktasının merkezi","Üst sağ dış referans noktasının merkezi","Alt sol dış referans noktasının merkezi","Alt sağ dış referans noktasının merkezi","Aparatın üst orta dairesel merkez işareti","Kişinin SAĞ göz bebeğinin merkezi (fotoğrafın solu)","Kişinin SOL göz bebeğinin merkezi (fotoğrafın sağı)","SAĞ camın alt kenarı, göz bebeğinin tam altı","SOL camın alt kenarı, göz bebeğinin tam altı"];
const canvas=$("view"),ctx=canvas.getContext("2d");let img=null,pts=[],zoom=1,pan={x:0,y:0},drag=-1,pointerStart=null,lastPinch=null,fitScale=1,viewW=0,viewH=0;
function load(file){if(!file)return;const u=URL.createObjectURL(file);const im=new Image();im.onload=()=>{img=im;pts=[];zoom=1;pan={x:0,y:0};$("work").classList.remove("hidden");$("results").classList.add("hidden");resize();$("detect").disabled=false;$("cameraCheck").textContent="Fotoğraf yüklendi. Önce dört köşe ve üst orta referans noktasını manuel işaretleyin; ardından otomatik iris tespitini çalıştırın."};im.src=u;}
$("camera").onchange=e=>load(e.target.files[0]);$("gallery").onchange=e=>load(e.target.files[0]);

let faceTask=null, visionFileset=null;
async function detectPupils(){
  const button=$("detect"),status=$("cameraCheck");
  if(!img)return;
  button.disabled=true;button.textContent="Yüz analiz ediliyor…";
  status.className="camera-check";status.textContent="Yüz ve iris noktaları aranıyor. Fotoğraf cihazda işleniyor.";
  try{
    if(!faceTask){
      const vision=await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm");
      visionFileset=await vision.FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
      faceTask=await vision.FaceLandmarker.createFromOptions(visionFileset,{
        baseOptions:{modelAssetPath:"https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",delegate:"CPU"},
        runningMode:"IMAGE",numFaces:1,
        outputFaceBlendshapes:false,outputFacialTransformationMatrixes:false
      });
    }
    const result=faceTask.detect(img);
    if(!result.faceLandmarks||!result.faceLandmarks.length)throw Error("Yüz bulunamadı. Yüz kameraya dönük, net ve yeterince aydınlık olsun.");
    const lm=result.faceLandmarks[0];
    if(lm.length<478)throw Error("İris noktaları algılanamadı. Gözlük camındaki yansıma veya bulanıklık engel olmuş olabilir.");
    const center=ids=>({x:ids.reduce((a,i)=>a+lm[i].x,0)/ids.length*img.width,y:ids.reduce((a,i)=>a+lm[i].y,0)/ids.length*img.height});
    const right=center([468,469,470,471,472]),left=center([473,474,475,476,477]);
    // Image-left iris is the patient's right eye.
    if(pts.length<5)throw Error("Önce dört köşe referansını ve üst orta merkez işaretini manuel işaretleyin.");
    pts[5]=right;pts[6]=left;
    const eyeMid={x:(lm[33].x+lm[263].x)/2,y:(lm[33].y+lm[263].y)/2};
    const eyeDx=(lm[263].x-lm[33].x)*img.width;
    const eyeDy=(lm[263].y-lm[33].y)*img.height;
    const roll=Math.abs(Math.atan2(eyeDy,eyeDx)*180/Math.PI);
    const eyeSpan=Math.max(1,Math.abs(eyeDx));
    const yawOffset=Math.abs((lm[1].x-eyeMid.x)*img.width)/eyeSpan;
    let messages=[];
    if(roll>4)messages.push(`Baş eğikliği yaklaşık ${roll.toFixed(1)}°: başı düz tutarak yeniden çekin.`);
    if(yawOffset>0.09)messages.push("Yüz tam karşıya dönük görünmüyor; kişiyi kameraya tam karşı çevirin.");
    if(roll<=4&&yawOffset<=0.09)messages.push("Yüzün yatay hizası ve karşıya bakışı uygun görünüyor.");
    messages.push("Bu yalnızca 2B yüz hizası ön kontrolüdür; kamera yüksekliği/derinlik kaynaklı paralaksı ölçmez.");
    status.className="camera-check "+(roll>4||yawOffset>0.09?"warn":"good");
    status.textContent=messages.join(" ");
    draw();update();
  }catch(e){
    status.className="camera-check bad";status.textContent=e.message||"Otomatik göz tespiti başarısız.";
  }finally{button.disabled=false;button.textContent="✨ Göz bebeklerini otomatik bul";}
}
$("detect").onclick=detectPupils;

function resize(){if(!img)return;const w=canvas.clientWidth||800;fitScale=w/img.width;viewW=w;viewH=img.height*fitScale;const dpr=window.devicePixelRatio||1;canvas.width=w*dpr;canvas.height=viewH*dpr;canvas.style.height=viewH+"px";ctx.setTransform(dpr,0,0,dpr,0,0);draw();}
function draw(){if(!img)return;ctx.clearRect(0,0,viewW,viewH);ctx.save();ctx.translate(viewW/2+pan.x,viewH/2+pan.y);ctx.scale(zoom,zoom);ctx.translate(-viewW/2,-viewH/2);ctx.drawImage(img,0,0,viewW,viewH);pts.forEach((p,i)=>{let x=p.x*fitScale,y=p.y*fitScale;let r=3.8;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle="rgba(60,220,200,.13)";ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle=i===4?"#48e3ce":"#ffcb65";ctx.stroke();ctx.beginPath();ctx.moveTo(x-3,y);ctx.lineTo(x+3,y);ctx.moveTo(x,y-3);ctx.lineTo(x,y+3);ctx.stroke();ctx.fillStyle="#fff";ctx.font="11px system-ui";ctx.fillText(String(i+1),x+6,y-5);});ctx.restore();update();}
function screenToImage(e){const r=canvas.getBoundingClientRect();let x=e.clientX-r.left,y=e.clientY-r.top;x=(x-viewW/2-pan.x)/zoom+viewW/2;y=(y-viewH/2-pan.y)/zoom+viewH/2;return{x:x/fitScale,y:y/fitScale};}
function update(){$("step").textContent=`Adım ${pts.length+1} / 9`; $("instruction").textContent=pts.length<9?names[pts.length]:"Tüm noktalar işaretlendi. Hesaplayabilirsiniz."; $("calculate").disabled=pts.length!==9;$("undo").disabled=!pts.length;$("zoomlabel").textContent=`Yakınlaştırma ${Math.round(zoom*100)}%`;}
let activePointers=new Map(), pinchStart=null, movedPointer=false, pressTimer=null, longPressed=false, startPoint=null, panStart=null;
canvas.addEventListener("pointerdown",e=>{
 if(!img)return;
 canvas.setPointerCapture(e.pointerId);
 activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(activePointers.size===2){
   clearTimeout(pressTimer);pressTimer=null;
   const a=[...activePointers.values()];
   pinchStart={dist:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),zoom,pan:{...pan}};
   drag=-1;pointerStart=null;panStart=null;return;
 }
 if(activePointers.size>2)return;
 pointerStart={x:e.clientX,y:e.clientY,t:Date.now()};movedPointer=false;longPressed=false;
 const p=screenToImage(e);startPoint=p;
 const near=pts.map((q,i)=>({i,d:Math.hypot(q.x-p.x,q.y-p.y)})).filter(q=>q.d*fitScale*zoom<16).sort((a,b)=>a.d-b.d)[0];
 drag=near?near.i:-1;
 if(drag>=0){
   // Existing point: hold and drag to reposition it.
   pressTimer=setTimeout(()=>{longPressed=true;pressTimer=null;},350);
 }else{
   // Empty image: long press adds a marker; short drag pans the photo.
   panStart={x:e.clientX,y:e.clientY,base:{...pan}};
   // A simple tap adds a point on release; moving the finger pans the photo.
 }
});
canvas.addEventListener("pointermove",e=>{
 if(!activePointers.has(e.pointerId))return;
 activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(activePointers.size===2&&pinchStart){
   const a=[...activePointers.values()];
   const d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);
   zoom=clamp(pinchStart.zoom*d/Math.max(1,pinchStart.dist),1,8);
   $("zoomlabel").textContent=`Yakınlaştırma ${Math.round(zoom*100)}%`;draw();return;
 }
 if(!pointerStart)return;
 const dx=e.clientX-pointerStart.x,dy=e.clientY-pointerStart.y;
 if(Math.hypot(dx,dy)>8){movedPointer=true;clearTimeout(pressTimer);pressTimer=null;}
 if(drag>=0&&movedPointer){
   let p=screenToImage(e);pts[drag]={x:clamp(p.x,0,img.width),y:clamp(p.y,0,img.height)};draw();
 }else if(drag<0&&panStart&&movedPointer){
   pan={x:panStart.base.x+dx,y:panStart.base.y+dy};draw();
 }
});
function finishPointer(e){
 clearTimeout(pressTimer);pressTimer=null;
 activePointers.delete(e.pointerId);
 if(pinchStart){if(activePointers.size<2)pinchStart=null;pointerStart=null;drag=-1;panStart=null;return;}
 if(drag<0&&!movedPointer&&startPoint&&pts.length<9){
   pts.push({x:clamp(startPoint.x,0,img.width),y:clamp(startPoint.y,0,img.height)});
 }
 pointerStart=null;drag=-1;panStart=null;movedPointer=false;longPressed=false;startPoint=null;draw();
}
canvas.addEventListener("pointerup",finishPointer);
canvas.addEventListener("pointercancel",e=>{clearTimeout(pressTimer);pressTimer=null;activePointers.delete(e.pointerId);pinchStart=null;drag=-1;pointerStart=null;panStart=null;});
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
$("plus").onclick=()=>{zoom=Math.min(zoom*1.25,8);draw();};$("minus").onclick=()=>{zoom=Math.max(zoom/1.25,1);if(zoom===1)pan={x:0,y:0};draw();};$("fit").onclick=()=>{zoom=1;pan={x:0,y:0};draw();};
function movePhoto(dx,dy){if(!img)return;const step=zoom>1?36:24;pan={x:pan.x+dx*step,y:pan.y+dy*step};draw();}
$("panUp").onclick=()=>movePhoto(0,-1);$("panDown").onclick=()=>movePhoto(0,1);$("panLeft").onclick=()=>movePhoto(-1,0);$("panRight").onclick=()=>movePhoto(1,0);
$("undo").onclick=()=>{pts.pop();$("results").classList.add("hidden");draw();};$("reset").onclick=()=>{pts=[];zoom=1;pan={x:0,y:0};$("results").classList.add("hidden");draw();};
function homography(src,dst){let a=Array.from({length:8},()=>Array(9).fill(0));for(let i=0;i<4;i++){let{x,y}=src[i],{x:u,y:v}=dst[i],r=2*i;a[r][0]=x;a[r][1]=y;a[r][2]=1;a[r][6]=-u*x;a[r][7]=-u*y;a[r][8]=u;a[r+1][3]=x;a[r+1][4]=y;a[r+1][5]=1;a[r+1][6]=-v*x;a[r+1][7]=-v*y;a[r+1][8]=v;}for(let c=0;c<8;c++){let p=c;for(let r=c+1;r<8;r++)if(Math.abs(a[r][c])>Math.abs(a[p][c]))p=r;if(Math.abs(a[p][c])<1e-10)throw Error("Referans noktaları uygun değil; dört merkezi yeniden işaretleyin.");[a[c],a[p]]=[a[p],a[c]];let d=a[c][c];for(let j=c;j<9;j++)a[c][j]/=d;for(let r=0;r<8;r++)if(r!==c){let f=a[r][c];for(let j=c;j<9;j++)a[r][j]-=f*a[c][j];}}return [...a.map((r,i)=>r[8]),1];}
function project(h,p){let d=h[6]*p.x+h[7]*p.y+1;if(Math.abs(d)<1e-10)throw Error("Perspektif dönüşümü geçersiz.");return{x:(h[0]*p.x+h[1]*p.y+h[2])/d,y:(h[3]*p.x+h[4]*p.y+h[5])/d};}
$("calculate").onclick=()=>{try{let dst=[{x:0,y:0},{x:170,y:0},{x:0,y:60},{x:170,y:60}],h=homography(pts.slice(0,4),dst),m=pts.map(p=>project(h,p));let vals=[["Sağ monoküler PD",Math.abs(m[4].x-m[5].x)],["Sol monoküler PD",Math.abs(m[6].x-m[4].x)],["Sağ montaj yüksekliği",Math.abs(m[7].y-m[5].y)],["Sol montaj yüksekliği",Math.abs(m[8].y-m[6].y)]];$("values").innerHTML=vals.map(([n,v])=>`<div class="metric"><b>${n}</b><strong>${v.toFixed(1)} mm</strong></div>`).join("");$("results").classList.remove("hidden");$("results").scrollIntoView({behavior:"smooth"});}catch(e){alert(e.message);}};
$("edit").onclick=()=>$("results").classList.add("hidden");
window.addEventListener("resize",resize);
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
