window.addEventListener('load', function() {
var W=WORDS,mastered,masteredLog,today,ci,stage,fl,sel,choices,typedResult,done;
var TAB=0;

function save(){try{localStorage.setItem('wm999_m',JSON.stringify([...mastered]));localStorage.setItem('wm999_log',JSON.stringify(masteredLog));}catch(e){}}
function load(){try{var m=JSON.parse(localStorage.getItem('wm999_m')||'[]');mastered=new Set(m);masteredLog=JSON.parse(localStorage.getItem('wm999_log')||'[]');}catch(e){mastered=new Set();masteredLog=[];}}

function avail(){return W.filter(function(w){return !mastered.has(w.en);});}
function shuffle(a){a=[...a];for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}
function wrongs(w,field){return shuffle(W.filter(function(x){return x.en!==w.en;})).slice(0,3).map(function(x){return x[field]||'?';});}

function setChoices(){
  if(!today||today.length===0)return;
  var w=today[ci];
  if(stage===1){choices=shuffle([w.ko].concat(wrongs(w,'ko')));}
  else if(stage===2){choices=shuffle([w.en].concat(wrongs(w,'en')));}
  sel=null;typedResult=null;
}

function initToday(){
  today=shuffle(avail()).slice(0,20);
  ci=0;stage=0;fl=false;sel=null;typedResult=null;done=false;
  setChoices();
}

function playAudio(word){
  var safe=word.replace(/ /g,'_');
  var audio=new Audio('audio/'+safe+'.mp3');
  audio.onerror=function(){
    if(window.speechSynthesis){
      var u=new SpeechSynthesisUtterance(word);
      u.lang='en-US';u.rate=0.85;
      speechSynthesis.cancel();speechSynthesis.speak(u);
    }
  };
  audio.play().catch(function(){
    if(window.speechSynthesis){
      var u=new SpeechSynthesisUtterance(word);
      u.lang='en-US';u.rate=0.85;
      speechSynthesis.cancel();speechSynthesis.speak(u);
    }
  });
}

function next(){
  if(stage<3){stage++;setChoices();}
  else{
    ci++;
    if(ci>=today.length){done=true;}
    else{stage=0;fl=false;setChoices();}
  }
  render();
}

function doMaster(){
  var w=today[ci];
  if(!mastered.has(w.en)){
    mastered.add(w.en);
    var d=new Date();
    var ds=d.getFullYear()+'-'+(d.getMonth()+1).toString().padStart(2,'0')+'-'+d.getDate().toString().padStart(2,'0');
    masteredLog.push({en:w.en,ko:w.ko,date:ds});
    save();
  }
  ci++;
  if(ci>=today.length){done=true;}
  else{stage=0;fl=false;setChoices();}
  render();
}

function checkChoice(v){
  if(sel!==null)return;
  sel=v;
  setTimeout(next,900);
  render();
}

function checkType(){
  if(typedResult!==null)return;
  var inp=document.getElementById('ti');
  if(!inp)return;
  var val=inp.value.trim().toLowerCase();
  var w=today[ci];
  typedResult=(val===w.en.toLowerCase())?'ok':'ng';
  render();
}

function setTab(n){TAB=n;render();}

function resetAll(){
  if(!confirm('모든 암기 기록을 초기화할까요?'))return;
  mastered=new Set();masteredLog=[];save();
  initToday();render();
}

function dlTxt(){
  var lines=masteredLog.map(function(it){return it.en+'\t'+it.ko;});
  var blob=new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='mastered_words.txt';a.click();
}
function dlCsv(){
  var lines=['영어,한국어,날짜'].concat(masteredLog.map(function(it){return it.en+','+it.ko+','+it.date;}));
  var blob=new Blob([lines.join('\n')],{type:'text/csv;charset=utf-8'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='mastered_words.csv';a.click();
}

function addMastered(en,ko){
  if(!mastered.has(en)){
    mastered.add(en);
    var d=new Date();
    var ds=d.getFullYear()+'-'+(d.getMonth()+1).toString().padStart(2,'0')+'-'+d.getDate().toString().padStart(2,'0');
    masteredLog.push({en:en,ko:ko,date:ds});
    save();
  }
  render();
}
function delMastered(en){
  mastered.delete(en);
  save();
  render();
}

function render(){
  var app=document.getElementById('app');
  if(!app)return;
  var av=avail().length;
  var tot=W.length;
  var mc=mastered.size;

  var h='';
  h+='<div class="hd"><div class="tl">📘 Word Master <span style="font-size:14px;color:#93c5fd">(중급)</span></div>';
  h+='<div class="hr"><span class="bg">전체 '+tot+'</span><span class="bg g">암기 '+mc+'</span><span class="bg">남은 '+av+'</span></div></div>';

  var pw=Math.round((mc/tot)*100);
  h+='<div class="pw"><div class="pb" style="width:'+pw+'%"></div></div>';
  h+='<div class="pi"><span>전체 진도</span><span>'+pw+'%</span></div>';

  h+='<div class="nv">';
  h+='<button class="nb'+(TAB===0?' on':'')+'" onclick="setTab(0)">오늘의 단어</button>';
  h+='<button class="nb'+(TAB===1?' on':'')+'" onclick="setTab(1)">학습</button>';
  h+='<button class="nb'+(TAB===2?' on':'')+'" onclick="setTab(2)">암기기록</button>';
  h+='</div>';

  if(TAB===0){
    var stg_labels=['단어 보기','한글 선택','영어 선택','영어 쓰기'];
    h+='<div class="sts">';
    stg_labels.forEach(function(l,i){h+='<span class="st'+(stage===i?' on':'')+'">'+l+'</span>';});
    h+='<button class="sk" onclick="initToday();render()">새 단어 20개</button>';
    h+='</div>';
    h+='<div class="list">';
    today.forEach(function(w){
      var isDone=mastered.has(w.en);
      var enE=w.en.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
      var koE=w.ko.replace(/'/g,"\\'");
      h+='<div class="wr'+(isDone?' dn':'')+'">';
      h+='<div class="we">'+w.en+'</div>';
      h+='<div class="wk">'+w.ko+'</div>';
      h+='<button class="spk" onclick="playAudio(\''+enE+'\')">🔊</button>';
      if(!isDone){
        h+='<button class="mc" onclick="addMastered(\''+enE+'\',\''+koE+'\')">암기</button>';
      } else {
        h+='<button class="mc" onclick="delMastered(\''+enE+'\')">✅</button>';
      }
      h+='</div>';
    });
    h+='</div>';

  } else if(TAB===1){
    if(av===0){
      h+='<div class="cel"><div class="ct">🎉 모든 단어 암기 완료!</div>';
      h+='<div class="cs">'+tot+'개 단어를 모두 학습했습니다.</div>';
      h+='<button class="btn r" style="margin-top:12px" onclick="resetAll()">처음부터 다시</button></div>';
    } else if(done){
      h+='<div class="cel"><div class="ct">✅ 오늘 세션 완료!</div>';
      h+='<div class="cs">수고하셨습니다.<br>새 단어 20개로 계속하세요.</div>';
      h+='<button class="btn" style="margin-top:12px" onclick="initToday();render()">다음 20개 →</button></div>';
    } else {
      var w=today[ci];
      var enE=w.en.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
      var stg_labels2=['1단계: 단어 보기','2단계: 한글 선택','3단계: 영어 선택','4단계: 영어 쓰기'];
      h+='<div class="sts">';
      stg_labels2.forEach(function(l,i){h+='<span class="st'+(stage===i?' on':'')+'">'+l+'</span>';});
      h+='</div>';
      h+='<div class="mr"><span style="color:#64748b;font-size:12px">'+(ci+1)+' / '+today.length+'</span></div>';
      h+='<div class="cw">';

      if(stage===0){
        h+='<div class="card'+(fl?' fl':'')+'" onclick="fl=!fl;render()">';
        h+='<div class="ci">';
        if(!fl){
          h+='<div class="ce">'+w.en+'</div>';
          h+='<div class="hn">카드를 탭하면 뜻이 보입니다</div>';
        } else {
          h+='<div class="ck">'+w.ko+'</div>';
          if(w.syn){h+='<div style="color:#64748b;font-size:12px;margin-top:4px">'+w.syn+'</div>';}
        }
        h+='</div></div>';
        h+='<button class="spk" onclick="event.stopPropagation();playAudio(\''+enE+'\')">🔊 발음듣기</button>';
        h+='<div class="br">';
        h+='<button class="btn gy" onclick="doMaster()">✅ 암기완료</button>';
        h+='<button class="btn" onclick="next()">다음 →</button>';
        h+='</div>';

      } else if(stage===1){
        h+='<div class="qc">';
        h+='<div style="font-size:20px;font-weight:800;color:#38bdf8;margin-bottom:6px">'+w.en+'</div>';
        h+='<button class="spk" onclick="playAudio(\''+enE+'\')">🔊</button>';
        h+='<div class="qq">한국어 뜻을 고르세요</div>';
        h+='<div class="cg">';
        choices.forEach(function(c){
          var cls='cb';
          if(sel!==null){cls+=(c===w.ko?' ok':' ng');}
          var cE=c.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
          h+='<button class="'+cls+'" '+(sel!==null?'disabled':'')+' onclick="checkChoice(\''+cE+'\')">'+c+'</button>';
        });
        h+='</div></div>';

      } else if(stage===2){
        h+='<div class="qc">';
        h+='<div style="font-size:20px;font-weight:800;color:#4ade80;margin-bottom:6px">'+w.ko+'</div>';
        h+='<div class="qq">영어 단어를 고르세요</div>';
        h+='<div class="cg">';
        choices.forEach(function(c){
          var cls='cb';
          if(sel!==null){cls+=(c===w.en?' ok':' ng');}
          var cE=c.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
          h+='<button class="'+cls+'" '+(sel!==null?'disabled':'')+' onclick="checkChoice(\''+cE+'\')">'+c+'</button>';
        });
        h+='</div></div>';

      } else if(stage===3){
        h+='<div class="qc">';
        h+='<div style="font-size:20px;font-weight:800;color:#4ade80;margin-bottom:6px">'+w.ko+'</div>';
        if(w.syn){h+='<div style="color:#64748b;font-size:12px;margin-bottom:8px">힌트: '+w.syn+'</div>';}
        h+='<div class="qq">영어 단어를 직접 입력하세요</div>';
        h+='<input class="ti" id="ti" placeholder="영어 단어 입력..."'+(typedResult!==null?' disabled':'')+' onkeydown="if(event.key===\'Enter\')checkType()">';
        if(typedResult===null){
          h+='<button class="btn" onclick="checkType()">확인</button>';
        } else {
          if(typedResult==='ok'){h+='<div class="rok">✅ 정답!&nbsp;&nbsp;<em>'+w.en+'</em></div>';}
          else{h+='<div class="rng">❌ 오답 — 정답: <strong>'+w.en+'</strong></div>';}
          h+='<button class="btn" onclick="next()" style="margin-top:8px">다음 →</button>';
        }
        h+='<div style="display:flex;justify-content:flex-end;margin-top:8px"><button class="btn g sm" onclick="doMaster()">✅ 암기완료</button></div>';
        h+='</div>';
      }
      h+='</div>';
    }

  } else {
    h+='<div class="exb">';
    if(masteredLog.length===0){
      h+='<div style="color:#64748b;text-align:center;padding:24px">아직 암기 완료한 단어가 없습니다.</div>';
    } else {
      h+='<div class="ex-title">✨ 암기 완료 단어 ('+mastered.size+'개)</div>';
      var byDate={};
      masteredLog.forEach(function(it){if(!byDate[it.date])byDate[it.date]=[];byDate[it.date].push(it);});
      Object.keys(byDate).sort().reverse().forEach(function(d){
        h+='<div class="dt-head">'+d+'</div>';
        byDate[d].forEach(function(it){h+='<span class="ml-item"><span class="ml-en">'+it.en+'</span><span class="ml-ko">'+it.ko+'</span></span>';});
      });
      h+='<div class="exbt">'
        +'<button class="btn gy sm" onclick="dlTxt()">📄 TXT 다운로드</button>'
        +'<button class="btn gy sm" onclick="dlCsv()">📊 CSV 다운로드</button>'
        +'<button class="btn r sm" onclick="resetAll()">🗑 초기화</button>'
        +'</div>';
    }
    h+='</div>';
  }

  app.innerHTML=h;

  if(TAB===1&&!done&&stage===3&&today[ci]){
    var inp=document.getElementById('ti');
    if(inp)setTimeout(function(){try{inp.focus();}catch(e){}},60);
  }
}

function initApp(){
  load();
  initToday();
  render();
}

  initApp();
});
