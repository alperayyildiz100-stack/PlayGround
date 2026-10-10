// ZekaKod AI — app.js
let editor = null, files = [], activeFile = 0;

const $ = id => document.getElementById(id);
const chatBox = () => $("chat");

const DEFAULT_FILES = [
  { name: "ornek.js", lang: "javascript", code: `// ZekaKod AI'ya hoş geldin! 👋\n// Sağdaki panele sor, soldaki butonlarla kodu işlet.\n\nfunction fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nconst sonuc = Array.from({length: 10}, (_, i) => fibonacci(i));\nconsole.log("Fibonacci:", sonuc);\n\n// Dene: "Bu kodu açıkla" ya da "Bunu optimize et" yaz.` },
  { name: "index.html", lang: "html", code: `<!DOCTYPE html>\n<html lang="tr">\n<head><meta charset="UTF-8"><style>\nbody{font-family:system-ui;background:#0b0e14;color:#fff;display:grid;place-items:center;height:100vh;margin:0}\n.card{background:linear-gradient(135deg,#6c7bff,#22d3ee);padding:32px 48px;border-radius:20px;text-align:center}\nbutton{padding:10px 20px;border-radius:999px;border:none;font-weight:700;cursor:pointer}\n</style></head>\n<body>\n<div class="card">\n<h1>Merhaba ZekaKod 🚀</h1>\n<p id="sayac">Tık: 0</p>\n<button onclick="document.getElementById('sayac').textContent='Tık: '+(++window.n||(window.n=1))">Tıkla</button>\n</div>\n</body>\n</html>` },
  { name: "algoritma.py", lang: "python", code: `# Quicksort örneği\ndef quicksort(arr):\n    if len(arr) <= 1:\n        return arr\n    pivot = arr[len(arr)//2]\n    left = [x for x in arr if x < pivot]\n    mid = [x for x in arr if x == pivot]\n    right = [x for x in arr if x > pivot]\n    return quicksort(left) + mid + quicksort(right)\n\nprint(quicksort([3,6,1,8,2,9,4]))` }
];

// ---------- Monaco ----------
function initEditor() {
  if (window.require) {
    require.config({ paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs" } });
    require(["vs/editor/editor.main"], () => {
      editor = monaco.editor.create($("editor"), {
        value: files[activeFile].code, language: files[activeFile].lang,
        theme: "vs-dark", fontSize: 14, fontFamily: "JetBrains Mono, monospace",
        minimap: { enabled: false }, automaticLayout: true, padding: { top: 14 }
      });
      editor.onDidChangeModelContent(() => files[activeFile].code = editor.getValue());
    });
  } else {
    $("editor").innerHTML = "<textarea id='fallback' style='width:100%;height:100%;background:#0a0d16;color:#fff;border:none;padding:12px;font-family:monospace'></textarea>";
    const f = $("fallback"); f.value = files[activeFile].code;
    f.oninput = () => files[activeFile].code = f.value;
    editor = { getValue: () => $("fallback").value, setValue: v => $("fallback").value = v };
  }
}
function setLanguage(lang) {
  files[activeFile].lang = lang;
  if (editor && window.monaco) {
    const m = editor.getModel();
    monaco.editor.setModelLanguage(m, lang === "csharp" ? "csharp" : lang);
  }
}

// ---------- Dosyalar / Tablar ----------
function renderFiles() {
  $("fileList").innerHTML = "";
  $("tabs").innerHTML = "";
  files.forEach((f, i) => {
    const d = document.createElement("div");
    d.className = "file-item" + (i === activeFile ? " active" : "");
    d.innerHTML = `<span>${i === activeFile ? "● " : "○ "}${f.name}</span>`;
    d.onclick = () => switchFile(i);
    $("fileList").appendChild(d);
    const t = document.createElement("div");
    t.className = "tab" + (i === activeFile ? " active" : "");
    t.textContent = f.name;
    t.onclick = () => switchFile(i);
    $("tabs").appendChild(t);
  });
  const sel = $("langSelect");
  if (sel) sel.value = files[activeFile]?.lang || "javascript";
}
function switchFile(i) {
  files[activeFile].code = getCode();
  activeFile = i;
  setCode(files[i].code); setLanguage(files[i].lang); renderFiles(); save();
}
function getCode() {
  try { return editor.getValue(); } catch { return files[activeFile]?.code || ""; }
}
function setCode(v) {
  try { editor.setValue(v); } catch {}
  files[activeFile].code = v;
}

// ---------- Chat ----------
function addMsg(role, html, isHTML = false) {
  const div = document.createElement("div");
  div.className = "msg " + role;
  div.innerHTML = `<span class="role">${role === "user" ? "Sen" : "🤖 ZekaKod AI"}</span>` + (isHTML ? html : escapeHtml(html));
  chatBox().appendChild(div);
  chatBox().scrollTop = chatBox().scrollHeight;
  return div;
}
function escapeHtml(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function mdToHtml(text) {
  // mini markdown: ```kod``` blokları + satır
  return escapeHtml(text).replace(/```(\w*)\n([\s\S]*?)```/g, (_m, l, c) =>
    `<pre><code>${c.replace(/^\n+|\n+$/g, "")}</code></pre>`)
    .replace(/\n/g, "<br>");
}
function typewriter(el, fullText, done) {
  let i = 0; const speed = 8;
  const body = document.createElement("div"); el.appendChild(body);
  (function tick() {
    i += 6;
    body.innerHTML = mdToHtml(fullText.slice(0, i));
    chatBox().scrollTop = chatBox().scrollHeight;
    if (i < fullText.length) setTimeout(tick, speed); else done && done();
  })();
}

// ---------- Yerel Demo AI motoru ----------
function localAI(prompt, code, action) {
  const p = (prompt + " " + (action || "")).toLowerCase();
  const lang = files[activeFile].lang;
  if (action === "explain" || p.includes("açıkla"))
    return `Bu ${lang} kodunun analizi:\n\n1. **Yapı:** Kod ${code.split("\n").length} satırdan oluşuyor.\n2. **Mantık:** ${code.includes("function") || code.includes("def") ? "Fonksiyonlar tanımlanmış, modüler bir yapı var." : "Sıralı çalışan bir akış var."}\n3. **Karmaşıklık:** ${code.length > 800 ? "Orta-yüksek, refaktör önerilir." : "Düşük, okunabilirlik iyi."}\n\n\`\`\`${lang}\n${code.slice(0, 600)}\n\`\`\`\n\nİyileştirme istersen "Refaktör et" butonuna bas! 🚀`;
  if (action === "fix" || p.includes("hata") || p.includes("düzelt"))
    return `Kodu inceledim, olası sorunlar:\n\n- **Null/undefined kontrolü eksik olabilir** — girişleri validate et.\n- **Sonsuz döngü / recursion riski** — fibonacci gibi özyinelemeli fonksiyonlarda memoization kullan.\n\nÖnerilen düzeltme:\n\n\`\`\`javascript\nconst memo = {};\nfunction fibonacci(n) {\n  if (n <= 1) return n;\n  if (memo[n]) return memo[n];\n  return memo[n] = fibonacci(n-1) + fibonacci(n-2);\n}\n\`\`\`\n\nBu haliyle 40+ değerlerde bile hızlı çalışır. ⚡`;
  if (action === "refactor" || p.includes("refakt"))
    return `Refaktör önerisi (temiz kod):\n\n- Fonksiyonları küçük tut, tek sorumluluk ver.\n- Magic number yerine sabit kullan.\n- Erken return ile iç içe if'leri azalt.\n\n\`\`\`javascript\n// Önce: iç içe, okunması zor\n// Sonra: sade ve test edilebilir\nconst fib = (n, m = {}) => n <= 1 ? n : (m[n] ??= fib(n-1, m) + fib(n-2, m));\nconsole.log(Array.from({length:10},(_,i)=>fib(i)));\n\`\`\``;
  if (action === "test" || p.includes("test"))
    return `Bu kod için örnek testler:\n\n\`\`\`javascript\n// Mini test (console.assert)\nconsole.assert(fibonacci(0) === 0, "fib(0) = 0 olmalı");\nconsole.assert(fibonacci(7) === 13, "fib(7) = 13 olmalı");\nconsole.assert(Array.isArray(sonuc), "sonuç dizi olmalı");\nconsole.log("Tüm testler geçti ✅");\n\`\`\``;
  if (action === "comment" || p.includes("yorum"))
    return `Koduna Türkçe yorumlar ekledim — editöre uygula:\n\n\`\`\`${lang}\n// Girdi kontrolü: negatif değerleri engelle\n// Ana döngü: her eleman için işlem yap\n// Çıktı: sonucu konsola yazdır\n${code.slice(0, 400)}\n\`\`\``;
  if (p.includes("todo")) return `Modern Todo uygulaması hazır:\n\n\`\`\`javascript\nconst todos = [];\nconst ekle = t => todos.push({id: Date.now(), text: t, done: false});\nconst toggle = id => todos.find(t => t.id === id).done ^= 1;\nconst filtrele = (f="all") => todos.filter(t => f==="all" || (f==="done")===t.done);\nekle("ZekaKod ile kod yaz 🚀");\nconsole.log(todos);\n\`\`\`\n\nİstersen HTML arayüzünü de üreteyim mi?`;
  if (p.includes("hesap")) return `\`\`\`javascript\nconst hesap = {\n  topla:(a,b)=>a+b, cikar:(a,b)=>a-b,\n  carp:(a,b)=>a*b, bol:(a,b)=>b!==0?a/b:"Sıfıra bölünemez!"\n};\nconsole.log(hesap.topla(5,3)); // 8\n\`\`\``;
  if (p.includes("fetch")) return `\`\`\`javascript\nasync function veriGetir(url) {\n  try {\n    const res = await fetch(url);\n    if (!res.ok) throw new Error("HTTP " + res.status);\n    return await res.json();\n  } catch(e){ console.error("Hata:", e.message); }\n}\nveriGetir("https://jsonplaceholder.typicode.com/todos/1").then(console.log);\n\`\`\``;
  if (p.includes("quicksort") || p.includes("sıralama")) return `\`\`\`python\ndef quicksort(arr):\n    if len(arr) <= 1: return arr\n    pivot = arr[len(arr)//2]\n    return quicksort([x for x in arr if x < pivot]) + [x for x in arr if x == pivot] + quicksort([x for x in arr if x > pivot])\nprint(quicksort([3,6,1,8,2,9,4]))\n\`\`\`\n\nKarmaşıklık: ortalama O(n log n).`;
  if (p.includes("navbar")) return `\`\`\`html\n<nav style="display:flex;gap:16px;background:#121624;padding:14px 20px;border-radius:12px">\n<a href="#" style="color:#fff;font-weight:700">Logo</a>\n<a href="#" style="color:#8b93b0">Anasayfa</a>\n<a href="#" style="color:#8b93b0">Projeler</a>\n<button style="margin-left:auto;background:#6c7bff;color:#fff;border:none;padding:8px 16px;border-radius:999px">Başla</button>\n</nav>\n\`\`\``;
  // genel üretim
  if (action === "generate" || p.includes("yaz") || p.includes("üret") || p.includes("oluştur") || prompt.length > 3)
    return `"${prompt}" isteğine göre ${lang} kodu ürettim:\n\n\`\`\`${lang}\n// ${prompt}\nfunction cozum(girdi) {\n  // 1. Girdiyi doğrula\n  if (!girdi) throw new Error("Girdi boş olamaz");\n  // 2. İşle\n  const sonuc = typeof girdi === "string" ? girdi.trim().toUpperCase() : girdi;\n  // 3. Döndür\n  return sonuc;\n}\nconsole.log(cozum(" merhaba zekakod "));\n\`\`\`\n\nDetay istersen "Açıkla" butonuna bas. 💡\n\n> Not: Gerçek sınırsız üretim için sağ üstten 🔑 API Anahtarı ekle.`;
  return `Merhaba! 👋 Ben ZekaKod. Sana nasıl yardım edeyim?\n\n- Kod **üret**abilirim ("todo uygulaması yaz")\n- Kodu **açıklar**, **düzeltir**, **refaktör** ederim\n- Soldaki çiplere basman yeterli!`;
}

// ---------- Gerçek API çağrısı ----------
async function callCloudAPI(prompt, code) {
  const endpoint = localStorage.getItem("zk_endpoint");
  const key = localStorage.getItem("zk_key");
  const model = localStorage.getItem("zk_model") || "gpt-4o-mini";
  if (!key) return null;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
    body: JSON.stringify({ model, messages: [
      { role: "system", content: "Sen Türkçe konuşan uzman bir kod asistanısın. Kısa, net, kod örnekli cevap ver." },
      { role: "user", content: `Dil: ${files[activeFile].lang}\nKod:\n${code}\n\nSoru: ${prompt}` }
    ], temperature: 0.6 })
  });
  if (!res.ok) throw new Error("API hatası: " + res.status);
  const j = await res.json();
  return j.choices?.[0]?.message?.content || "Boş yanıt.";
}

// ---------- Akış ----------
async function ask(prompt, action) {
  const code = getCode();
  addMsg("user", action ? `[${action}] ${prompt}` : prompt);
  const bubble = addMsg("ai", "Düşünüyorum…");
  bubble.innerHTML = `<span class="role">🤖 ZekaKod AI</span><div>⏳ Düşünüyorum…</div>`;
  try {
    let answer;
    if ($("modelSelect").value === "gpt" && localStorage.getItem("zk_key")) {
      answer = await callCloudAPI(prompt, code);
    } else {
      await new Promise(r => setTimeout(r, 500)); // his
      answer = localAI(prompt, code, action);
    }
    bubble.innerHTML = `<span class="role">🤖 ZekaKod AI</span>`;
    typewriter(bubble, answer);
    // kod bloğu varsa editöre uygula teklifi
    const m = answer.match(/```\w*\n([\s\S]*?)```/);
    if (m && (action === "generate" || /yaz|üret|oluştur|refakt|düzelt|fix/i.test(prompt))) {
      const btn = document.createElement("button");
      btn.className = "btn primary small"; btn.style.marginTop = "8px";
      btn.textContent = "⬆ Kodu Editöre Uygula";
      btn.onclick = () => { setCode(m[1].trim()); addMsg("ai", "Kod editöre uygulandı ✅"); };
      bubble.appendChild(btn);
    }
  } catch (e) {
    bubble.innerHTML = `<span class="role">🤖 ZekaKod AI</span>❌ Hata: ${escapeHtml(e.message)}<br>API ayarlarını kontrol et ya da Yerel Demo AI'ya geç.`;
  }
}

// ---------- Çalıştır ----------
function runCode() {
  const code = getCode(), lang = files[activeFile].lang;
  const out = $("consoleOut"), frame = $("previewFrame");
  $("runStatus").textContent = "Çalışıyor…";
  if (lang === "html") {
    document.querySelector('[data-tab="preview"]').click();
    frame.srcdoc = code;
    out.textContent = "> HTML önizlemeye render edildi (Önizleme sekmesi).";
  } else if (lang === "javascript" || lang === "typescript") {
    document.querySelector('[data-tab="console"]').click();
    const logs = [];
    const fake = { log: (...a) => logs.push(a.map(String).join(" ")), error: (...a) => logs.push("❌ " + a.join(" ")), warn: (...a) => logs.push("⚠ " + a.join(" ")) };
    try {
      const fn = new Function("console", code);
      fn(fake);
      out.textContent = logs.length ? logs.join("\n") : "> Kod çalıştı, çıktı yok.";
    } catch (e) { out.textContent = "❌ Hata: " + e.message; }
  } else {
    out.textContent = `> ${lang} tarayıcıda doğrudan çalıştırılamaz.\n> İpucu: "Açıkla" ile mantığı öğren, "Dile Çevir → JavaScript" ile çalıştırılabilir hale getir.`;
    ask(`Bu ${lang} kodunu JavaScript'e çevir ve kısaca açıkla`, "translate");
  }
  $("runStatus").textContent = "Hazır ●";
}

// ---------- Persist ----------
function save() { try { localStorage.setItem("zk_files", JSON.stringify(files)); } catch {} }
function load() {
  try {
    const s = localStorage.getItem("zk_files");
    files = s ? JSON.parse(s) : structuredClone(DEFAULT_FILES);
  } catch { files = structuredClone(DEFAULT_FILES); }
}

// ---------- Init ----------
window.addEventListener("DOMContentLoaded", () => {
  load(); renderFiles(); initEditor();
  addMsg("ai", "Merhaba! 👋 Ben **ZekaKod AI**.\n\nSoldan hazır prompt seç, yukarıdan ✨ Üret / 📖 Açıkla / 🛠 Düzelt'e bas, ya da aşağıya yaz. JavaScript kodlarını ▶ Çalıştır ile anında deneyebilirsin.");
  if (localStorage.getItem("zk_key")) {
    $("modelSelect").value = "gpt";
    $("aiStatus").className = "ai-status cloud";
    $("aiStatus").innerHTML = "<span class='dot'></span> Bulut LLM bağlı";
  }
  // olaylar
  $("sendBtn").onclick = () => { const v = $("chatInput").value.trim(); if (v) { $("chatInput").value = ""; ask(v); } };
  $("chatInput").addEventListener("keydown", e => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") $("sendBtn").click(); });
  document.querySelectorAll("[data-act]").forEach(b => b.onclick = () => {
    const act = b.dataset.act;
    const map = { generate: "Bu isteğe göre kod üret", explain: "Bu kodu satır satır açıkla", fix: "Bu koddaki hataları bul ve düzelt", refactor: "Bu kodu refaktör et", test: "Bu kod için test yaz", comment: "Bu koda yorum satırı ekle", translate: "Bu kodu JavaScript'e çevir" };
    ask(map[act] || act, act);
  });
  document.querySelectorAll("[data-prompt]").forEach(b => b.onclick = () => ask(b.dataset.prompt, "generate"));
  $("runBtn").onclick = runCode;
  $("copyBtn").onclick = () => { navigator.clipboard.writeText(getCode()); addMsg("ai", "Kod panoya kopyalandı 📋"); };
  $("downloadBtn").onclick = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([getCode()], { type: "text/plain" }));
    a.download = files[activeFile].name; a.click();
  };
  $("clearBtn").onclick = () => { setCode(""); };
  $("clearChat").onclick = () => { $("chat").innerHTML = ""; };
  $("newFileBtn").onclick = () => {
    const n = prompt("Dosya adı:", "yeni-" + (files.length + 1) + ".js");
    if (n) { files.push({ name: n, lang: "javascript", code: "// yeni dosya\n" }); switchFile(files.length - 1); }
  };
  $("langSelect").onchange = e => setLanguage(e.target.value);
  $("modelSelect").onchange = e => {
    const cloud = e.target.value === "gpt";
    $("aiStatus").className = "ai-status" + (cloud ? " cloud" : " local");
    $("aiStatus").innerHTML = cloud ? "<span class='dot'></span> Bulut LLM modu" : "<span class='dot'></span> Yerel Demo AI aktif";
    if (cloud && !localStorage.getItem("zk_key")) $("apiDialog").showModal();
  };
  $("apiBtn").onclick = () => $("apiDialog").showModal();
  $("saveApi").onclick = () => {
    localStorage.setItem("zk_endpoint", $("apiEndpoint").value);
    localStorage.setItem("zk_key", $("apiKey").value);
    localStorage.setItem("zk_model", $("apiModel").value);
  };
  if (localStorage.getItem("zk_endpoint")) $("apiEndpoint").value = localStorage.getItem("zk_endpoint");
  if (localStorage.getItem("zk_model")) $("apiModel").value = localStorage.getItem("zk_model");
  $("themeBtn").onclick = () => document.body.classList.toggle("light");
  document.querySelectorAll(".otab").forEach(t => t.onclick = () => {
    document.querySelectorAll(".otab").forEach(x => x.classList.remove("active"));
    t.classList.add("active");
    const preview = t.dataset.tab === "preview";
    $("previewFrame").classList.toggle("hidden", !preview);
    $("consoleOut").classList.toggle("hidden", preview);
  });
});
