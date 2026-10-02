
function initApp() {
  var mastered = new Set();
  var masteredLog = [];
  var todaySeed = null;
  var today = [];
  var ci = 0, stage = 0, fl = false;
  var choices = [], sel = null, tr = null, sdone = false;
  var view = 'today';

  // 저장 불러오기
  try {
    var saved = JSON.parse(localStorage.getItem('vm10') || 'null');
    if (saved) {
      mastered = new Set(saved.m || []);
      masteredLog = saved.ml || [];
      todaySeed = saved.ts || null;
    }
  } catch(e) {}

  function save() {
    try {
      localStorage.setItem('vm10', JSON.stringify({
        m: Array.from(mastered),
        ml: masteredLog,
        ts: todaySeed
      }));
    } catch(e) {}
  }

  // 음성
  var _voice = null;
  function initVoice() {
    var all = window.speechSynthesis.getVoices();
    if (!all || !all.length) return;
    var names = ['Samantha','Alex','Daniel','Karen',
      'Google US English','Google UK English Female',
      'Microsoft Aria Online (Natural)','Microsoft Jenny Online (Natural)',
      'Microsoft Aria','Microsoft Jenny','Microsoft David','Microsoft Zira'];
    for (var i = 0; i < names.length; i++) {
      for (var j = 0; j < all.length; j++) {
        if (all[j].name === names[i]) { _voice = all[j]; return; }
      }
    }
    for (var k = 0; k < all.length; k++) {
      if (all[k].lang === 'en-US' && all[k].name.indexOf('Korean') < 0) {
        _voice = all[k]; return;
      }
    }
  }
  initVoice();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = initVoice;
  }

  function speak(en) {
    var mp3 = new Audio('audio/' + en.replace(/[^a-zA-Z0-9-]/g, '') + '.mp3');
    mp3.onerror = function() { doTts(en); };
    mp3.oncanplaythrough = function() { mp3.play().catch(function() { doTts(en); }); };
    mp3.load();
  }
  function doTts(en) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(en);
    u.lang = 'en-US'; u.rate = 0.82;
    if (_voice) u.voice = _voice;
    setTimeout(function() { window.speechSynthesis.speak(u); }, 50);
  }

  // 유틸
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }
  function avail() {
    var r = [];
    for (var i = 0; i < WORDS.length; i++) {
      if (!mastered.has(WORDS[i][0])) r.push(WORDS[i]);
    }
    return r;
  }
  function getWrong(w, idx, n) {
    var pool = [];
    for (var i = 0; i < WORDS.length; i++) {
      if (WORDS[i][idx] !== w[idx]) pool.push(WORDS[i][idx]);
    }
    return shuffle(pool).slice(0, n);
  }
  function esc(s) {
    return String(s)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;');
  }

  function initToday() {
    var dk = new Date().toDateString();
    if (todaySeed === dk && today.length > 0) return;
    todaySeed = dk;
    today = shuffle(avail()).slice(0, 20);
    ci = 0; stage = 0; fl = false;
    sel = null; tr = null; sdone = false;
    save();
  }
  function setChoices() {
    if (!today[ci]) return;
    var w = today[ci];
    if (stage === 1) choices = shuffle([w[1]].concat(getWrong(w, 1, 3)));
    if (stage === 2) choices = shuffle([w[0]].concat(getWrong(w, 0, 3)));
  }
  function doMaster(en) {
    if (mastered.has(en)) return;
    mastered.add(en);
    var ko = '';
    for (var i = 0; i < WORDS.length; i++) {
      if (WORDS[i][0] === en) { ko = WORDS[i][1]; break; }
    }
    masteredLog.push({en:en, ko:ko, date:new Date().toLocaleDateString('ko-KR')});
    save();
  }
  function removeMaster(en) {
    mastered.delete(en);
    var nl = [];
    for (var i = 0; i < masteredLog.length; i++) {
      if (masteredLog[i].en !== en) nl.push(masteredLog[i]);
    }
    masteredLog = nl;
    save();
  }

  var app = document.getElementById('app');

  function render() {
    var av = avail();
    var h = header(av) + nav();
    if (view === 'today') h += pageToday();
    else if (view === 'study') h += pageStudy();
    else h += pageRecords();
    app.innerHTML = h;
    bindEvents();
  }

  function header(av) {
    return '<div class="hd">'
      + '<div class="tl">📚 단어 마스터 2000</div>'
      + '<div class="hr">'
      + '<span class="bg g">완성 ' + mastered.size + '개</span>'
      + '<span class="bg">남은 ' + av.length + '개</span>'
      + '</div></div>';
  }
  function nav() {
    return '<div class="nv">'
      + '<button class="nb' + (view==='today'?' on':'') + '" id="n1">📋 오늘의 단어</button>'
      + '<button class="nb' + (view==='study'?' on':'') + '" id="n2">📖 학습하기</button>'
      + '<button class="nb' + (view==='records'?' on':'') + '" id="n3">📁 암기기록</button>'
      + '</div>';
  }

  function pageToday() {
    initToday();
    var av = avail();
    if (av.length === 0) {
      return '<div class="cel"><div style="font-size:52px">🎉</div>'
        + '<div class="ct">모든 단어 완료!</div>'
        + '<div class="cs">총 ' + mastered.size + '개 마스터!</div>'
        + '<button class="btn" id="restart-all">처음부터</button></div>';
    }
    var rows = '';
    for (var i = 0; i < today.length; i++) {
      var w = today[i];
      var dn = mastered.has(w[0]);
      rows += '<div class="wr' + (dn?' dn':'') + '">'
        + '<div class="we">' + esc(w[0]) + '</div>'
        + '<div class="wk">' + esc(w[1]) + '</div>'
        + '<button class="spk" data-en="' + esc(w[0]) + '">🔊</button>'
        + '<button class="mc" data-en="' + esc(w[0]) + '">' + (dn?'✅ 완료':'암기완료') + '</button>'
        + '</div>';
    }
    var nd = 0;
    for (var j = 0; j < today.length; j++) {
      if (!mastered.has(today[j][0])) nd++;
    }
    return '<div class="list">' + rows + '</div>'
      + '<div class="sbw">'
      + (nd === 0
        ? '<p style="color:#4ade80;font-weight:700;text-align:center">🎉 오늘의 단어를 모두 암기했습니다!</p>'
        : '<button class="btn" id="go-study">📖 모르는 ' + nd + '개 학습하기 →</button>')
      + '</div>';
  }

  function pageStudy() {
    if (sdone) {
      return '<div class="cel"><div style="font-size:52px">✅</div>'
        + '<div class="ct">학습 완료!</div>'
        + '<div class="cs">수고하셨습니다!</div>'
        + '<div class="br"><button class="btn" id="go-today">오늘의 단어로</button>'
        + '<button class="btn gy" id="do-restart">다시 학습</button></div></div>';
    }
    var w = today[ci];
    if (!w) { sdone = true; return pageStudy(); }
    var prog = Math.round(((ci+1)/today.length)*100);
    var SL = ['📖 카드','🔤 영→한','🇰🇷 한→영','✏️ 주관식','📝 예문'];
    var tabs = '';
    for (var i = 0; i < SL.length; i++) {
      var c = 'st'; if(i<stage)c+=' d2'; else if(i===stage)c+=' on';
      tabs += '<div class="' + c + '">' + SL[i] + '</div>';
    }
    var h = '<div class="sts">' + tabs
      + (stage < 4 ? '<button class="sk" id="do-skip">다음 단계 ⏭</button>' : '')
      + '</div>'
      + '<div class="pw"><div class="pb" style="width:'+prog+'%"></div></div>'
      + '<div class="pi"><span>'+(ci+1)+'/'+today.length+'단어</span>'
      + '<span style="color:#0284c7">단계 '+(stage+1)+'/5</span></div>';

    if (stage === 0) {
      h += '<div class="cw">'
        + '<div class="card' + (fl?' fl':'') + '" id="card">'
        + (fl
          ? '<div class="ci"><div class="ck">' + esc(w[1]) + '</div>'
            + '<button class="sb" id="spk-card" data-en="'+esc(w[0])+'">🔊 발음 듣기</button></div>'
          : '<div class="ci"><div class="ce">' + esc(w[0]) + '</div>'
            + '<div class="hn">👆 클릭하면 뜻이 나와요 🔊</div></div>')
        + '</div>'
        + '<div class="br">'
        + '<button class="btn g" id="do-mn">✅ 암기완료 &amp; 다음</button>'
        + '<button class="btn" id="do-adv">다음 →</button>'
        + '</div></div>';
    } else if (stage === 1 || stage === 2) {
      var cor = stage === 1 ? w[1] : w[0];
      var cbs = '';
      for (var ci2 = 0; ci2 < choices.length; ci2++) {
        var c2 = choices[ci2];
        var cl = 'cb';
        if (sel === c2) cl += (c2 === cor ? ' ok' : ' ng');
        else if (sel !== null && c2 === cor) cl += ' ok';
        cbs += '<button class="' + cl + '" data-c="' + esc(c2) + '" data-cor="' + esc(cor) + '"'
          + (sel !== null ? ' disabled' : '') + '>' + esc(c2) + '</button>';
      }
      h += '<div class="cw"><div class="qc">'
        + '<div style="text-align:center;width:100%">'
        + (stage === 1
          ? '<div class="ce">'+esc(w[0])+'</div><div class="qq">이 단어의 한국어 뜻은?</div>'
            + '<button class="ss" id="spk-q" data-en="'+esc(w[0])+'">🔊 발음</button>'
          : '<div class="ck">'+esc(w[1])+'</div><div class="qq">이 뜻에 해당하는 영어 단어는?</div>')
        + '</div><div class="cg">' + cbs + '</div>'
        + (sel !== null
          ? '<div class="br" style="margin-top:10px">'
            + '<button class="btn g" id="do-mn">✅ 암기완료 &amp; 다음</button>'
            + '<button class="btn" id="do-adv">다음 →</button></div>' : '')
        + '</div>'
        + '<div class="mr"><button class="btn g sm" id="do-mn2">✅ 암기완료</button></div></div>';
    } else if (stage === 3) {
      h += '<div class="cw"><div class="qc">'
        + '<div class="ck" style="font-size:24px">'+esc(w[1])+'</div>'
        + '<div class="qq">영어 단어를 직접 입력하세요</div>'
        + '<input class="ti" id="ti" placeholder="영어 단어 입력..."' + (tr!==null?' disabled':'') + '>'
        + (tr === null
          ? '<button class="btn" id="do-chk">확인</button>'
          : '<div class="' + (tr==='ok'?'rok':'rng') + '">'
            + (tr==='ok' ? '✅ 정답! <em>'+esc(w[0])+'</em>' : '❌ 오답 — 정답: <strong>'+esc(w[0])+'</strong>')
            + '</div><div class="br" style="margin-top:8px">'
            + '<button class="btn g" id="do-mn">✅ 암기완료 &amp; 다음</button>'
            + '<button class="btn" id="do-adv">다음 →</button></div>')
        + '</div>'
        + '<div class="mr"><button class="btn g sm" id="do-mn2">✅ 암기완료</button></div></div>';
    } else if (stage === 4) {
      var VT = ['We must {w} every single day.',
        'It is wise to {w} when necessary.',
        'She decided to {w} carefully.',
        'He chose to {w} without hesitation.'];
      var NT = ['The concept of {w} is very important.',
        'Everyone needs to understand {w}.',
        'True {w} requires great effort.',
        'His {w} surprised the whole team.'];
      var VB = 'abandon accompany adopt affect aggravate alter approve assimilate boost clarify comfort comprehend condemn construct curtail delude demolish eliminate embrace expose extend flourish generate halt illuminate integrate intimidate invoke negotiate perceive persist prescribe preserve proclaim prohibit reassure reflect release replace resolve retaliate scrutinize synthesize transcend transform visualize wither';
      var isV = (' ' + VB + ' ').indexOf(' ' + w[0] + ' ') >= 0;
      var tmpl = isV ? VT : NT;
      var ex = tmpl[(w[0].charCodeAt(0) + w[0].length) % tmpl.length].replace('{w}', w[0]);
      h += '<div class="cw"><div class="qc">'
        + '<div class="ce">'+esc(w[0])+'</div>'
        + '<div class="ck">'+esc(w[1])+'</div>'
        + '<div class="eb"><div class="es">&ldquo;'+esc(ex)+'&rdquo;</div>'
        + '<button class="ss" id="spk-w" data-en="'+esc(w[0])+'">🔊 단어</button>'
        + '<button class="ss" id="spk-ex" data-ex="'+esc(ex)+'" style="margin-left:5px">🔊 예문</button>'
        + '</div><div class="br" style="margin-top:12px">'
        + '<button class="btn g" id="do-mn">✅ 암기완료 &amp; 다음</button>'
        + '<button class="btn" id="do-adv">다음 →</button>'
        + '</div></div>'
        + '<div class="mr"><button class="btn g sm" id="do-mn2">✅ 암기완료</button></div></div>';
    }
    return h;
  }

  function pageRecords() {
    if (masteredLog.length === 0) {
      return '<div class="cel" style="min-height:40vh">'
        + '<div style="font-size:44px">📂</div>'
        + '<div class="ct" style="font-size:17px">아직 암기 완료한 단어가 없습니다</div>'
        + '<div class="cs">✅ 암기완료를 누르면 여기에 쌓입니다</div></div>';
    }
    var bd = {};
    for (var i = 0; i < masteredLog.length; i++) {
      var x = masteredLog[i];
      if (!bd[x.date]) bd[x.date] = [];
      bd[x.date].push(x);
    }
    var dates = Object.keys(bd).reverse();
    var grp = '';
    for (var di = 0; di < dates.length; di++) {
      var dt = dates[di]; var list = bd[dt]; var items = '';
      for (var li = 0; li < list.length; li++) {
        var xl = list[li];
        items += '<span class="ml-item">'
          + '<span class="ml-en">'+esc(xl.en)+'</span>'
          + '<span class="ml-ko">'+esc(xl.ko)+'</span></span>';
      }
      grp += '<div style="margin-bottom:12px">'
        + '<div class="dt-head">📅 '+dt+' ('+list.length+'개)</div>'
        + '<div style="display:flex;flex-wrap:wrap">'+items+'</div></div>';
    }
    return '<div class="exb">'
      + '<div class="ex-title">총 '+masteredLog.length+'개 암기 완료</div>'
      + grp
      + '<div class="exbt">'
      + '<button class="btn sm" id="dl-txt">📄 TXT</button>'
      + '<button class="btn sm" id="dl-csv">📊 엑셀</button>'
      + '<button class="btn sm r" id="do-reset">🗑 초기화</button>'
      + '</div></div>';
  }

  function adv() {
    sel = null; tr = null; fl = false;
    if (ci < today.length - 1) { ci++; }
    else {
      if (stage < 4) { stage++; ci = 0; }
      else { sdone = true; render(); return; }
    }
    setChoices(); render();
  }

  function bindEvents() {
    function on(id, fn) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('click', fn);
    }
    // 탭
    on('n1', function() { view='today'; render(); });
    on('n2', function() {
      initToday();
      var nd = [];
      for (var i = 0; i < today.length; i++) {
        if (!mastered.has(today[i][0])) nd.push(today[i]);
      }
      if (nd.length === 0) { view='today'; render(); return; }
      today = nd; ci=0; stage=0; fl=false; sel=null; tr=null; sdone=false;
      setChoices(); view='study'; render();
    });
    on('n3', function() { view='records'; render(); });

    // 오늘의 단어
    on('restart-all', function() {
      mastered=new Set(); masteredLog=[]; save(); today=[]; initToday(); render();
    });
    on('go-study', function() {
      var nd = [];
      for (var i = 0; i < today.length; i++) {
        if (!mastered.has(today[i][0])) nd.push(today[i]);
      }
      if (nd.length === 0) { view='today'; render(); return; }
      today = nd; ci=0; stage=0; fl=false; sel=null; tr=null; sdone=false;
      setChoices(); view='study'; render();
    });

    // 발음/암기 버튼 (오늘의 단어)
    var spks = document.querySelectorAll('.spk');
    for (var i = 0; i < spks.length; i++) {
      (function(el) {
        el.addEventListener('click', function() { speak(el.getAttribute('data-en')); });
      })(spks[i]);
    }
    var mcs = document.querySelectorAll('.mc');
    for (var j = 0; j < mcs.length; j++) {
      (function(el) {
        el.addEventListener('click', function() {
          var en = el.getAttribute('data-en');
          if (mastered.has(en)) removeMaster(en);
          else doMaster(en);
          render();
        });
      })(mcs[j]);
    }

    // 학습
    on('card', function() { fl=!fl; if(fl) speak(today[ci][0]); render(); });
    on('spk-card', function(e) { e.stopPropagation(); speak(today[ci][0]); });
    on('spk-q', function() { speak(today[ci][0]); });
    on('spk-w', function() { speak(today[ci][0]); });
    on('spk-ex', function() {
      var el = document.getElementById('spk-ex');
      if (el) doTts(el.getAttribute('data-ex'));
    });

    // 선택지
    var cbs = document.querySelectorAll('.cb');
    for (var k = 0; k < cbs.length; k++) {
      (function(el) {
        el.addEventListener('click', function() {
          if (sel !== null) return;
          var c = el.getAttribute('data-c');
          var cor = el.getAttribute('data-cor');
          sel = c;
          if (c === cor) speak(today[ci][0]);
          render();
        });
      })(cbs[k]);
    }

    // 주관식
    on('do-chk', function() {
      var t = document.getElementById('ti');
      if (!t) return;
      var v = t.value.trim();
      if (!v) return;
      var ok = v.toLowerCase() === today[ci][0].toLowerCase();
      tr = ok ? 'ok' : 'ng';
      if (ok) speak(today[ci][0]);
      render();
    });
    var ti = document.getElementById('ti');
    if (ti) {
      ti.focus();
      ti.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') document.getElementById('do-chk') && document.getElementById('do-chk').click();
      });
    }

    // 암기완료/다음
    on('do-mn', function() { doMaster(today[ci][0]); adv(); });
    on('do-mn2', function() { doMaster(today[ci][0]); adv(); });
    on('do-adv', adv);
    on('do-skip', function() {
      if (stage >= 4) { sdone=true; render(); return; }
      stage++; ci=0; sel=null; tr=null; fl=false; setChoices(); render();
    });
    on('go-today', function() { view='today'; today=[]; initToday(); render(); });
    on('do-restart', function() {
      ci=0; stage=0; fl=false; sel=null; tr=null; sdone=false;
      today = shuffle(avail()).slice(0, 20);
      setChoices(); render();
    });

    // 기록
    on('dl-txt', function() {
      var lines = ['\uFEFF영단어\t한국어뜻\t암기날짜'];
      for (var i = 0; i < masteredLog.length; i++)
        lines.push(masteredLog[i].en+'\t'+masteredLog[i].ko+'\t'+masteredLog[i].date);
      dlFile(lines.join('\n'), 'mastered.txt', 'text/plain');
    });
    on('dl-csv', function() {
      var lines = ['\uFEFF영단어,한국어뜻,암기날짜'];
      for (var i = 0; i < masteredLog.length; i++)
        lines.push(masteredLog[i].en+','+masteredLog[i].ko+','+masteredLog[i].date);
      dlFile(lines.join('\n'), 'mastered.csv', 'text/csv');
    });
    on('do-reset', function() {
      if (window.confirm('모든 기록을 초기화할까요?')) {
        mastered=new Set(); masteredLog=[]; save(); render();
      }
    });
  }

  function dlFile(content, filename, type) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], {type: type}));
    a.download = filename;
    a.click();
  }

  initToday();
  render();
}

initApp();
