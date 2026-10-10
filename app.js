/* ============================================================
   Sohby — Türkçe akıllı sohbet botu (tamamen istemcide çalışır)
   ============================================================ */
"use strict";

const $ = (id) => document.getElementById(id);
const chatScroll = $("chatScroll"), messagesEl = $("messages"), heroEl = $("hero");
const inputEl = $("input"), sendBtn = $("sendBtn"), typingEl = $("typing");
const historyList = $("historyList"), historyCount = $("historyCount");
const chatTitle = $("chatTitle"), toastEl = $("toast");

const LS_KEY = "sohby.conversations.v1";
const LS_THEME = "sohby.theme";
const LS_PERSONA = "sohby.persona";
const LS_VOICE = "sohby.voice";

/* ---------------- state ---------------- */
let conversations = loadConversations();
let activeId = conversations[0]?.id || createConversation(true);
let voiceOn = localStorage.getItem(LS_VOICE) !== "off";
let recog = null, listening = false;

function uid() { return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function loadConversations() {
  try { const a = JSON.parse(localStorage.getItem(LS_KEY) || "[]"); return Array.isArray(a) ? a : []; }
  catch { return []; }
}
function save() { try { localStorage.setItem(LS_KEY, JSON.stringify(conversations.slice(0, 50))); } catch {} }
function active() { return conversations.find(c => c.id === activeId); }
function createConversation(silent) {
  const c = { id: uid(), title: "Yeni Sohbet", created: Date.now(), updated: Date.now(), messages: [] };
  conversations.unshift(c); activeId = c.id; save();
  if (!silent) { renderHistory(); renderMessages(); }
  return c.id;
}

/* ---------------- theme / persona ---------------- */
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem(LS_THEME, t); } catch {}
  const dark = t === "dark";
  $("themeBtn").textContent = dark ? "🌙 Tema" : "☀️ Tema";
  $("themeBtn2").textContent = dark ? "🌙" : "☀️";
}
applyTheme(localStorage.getItem(LS_THEME) || "dark");
$("themeBtn").onclick = $("themeBtn2").onclick = () =>
  applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");

const personaSel = $("personaSelect");
personaSel.value = localStorage.getItem(LS_PERSONA) || "dost";
personaSel.onchange = () => { try { localStorage.setItem(LS_PERSONA, personaSel.value); } catch {} toast("Kişilik: " + personaSel.selectedOptions[0].text); };
const persona = () => localStorage.getItem(LS_PERSONA) || "dost";
const PERSONA_TONE = {
  dost: ["Harika bir soru! 😊", "Tabii ki! 💪", "Anladım seni 👍"],
  profesyonel: ["Sorunuzu değerlendirdim.", "Bilgi notu:", "Özetle:"],
  esprili: ["Ooo, güzel soru, kahvemi aldım geldim ☕😄", "Bunu severim, hadi bakalım! 🎪", "Tam benlik soru! 🤹"],
  bilge: ["Derin bir nefes alalım… 🦉", "Kadim bilgiler der ki… 📜", "Dinle evlat… 🌙"]
};
function tone() { const a = PERSONA_TONE[persona()] || PERSONA_TONE.dost; return a[Math.floor(Math.random() * a.length)]; }

/* ---------------- toast ---------------- */
let toastT;
function toast(msg) {
  toastEl.textContent = msg; toastEl.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove("show"), 2200);
}

/* ---------------- rendering ---------------- */
function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function miniMarkdown(s) {
  let h = escapeHtml(s);
  h = h.replace(/```([\s\S]*?)```/g, "<pre>$1</pre>");
  h = h.replace(/`([^`]+)`/g, "<code>$1</code>");
  h = h.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
  h = h.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener" style="color:var(--brand2)">$1</a>');
  return h.replace(/\n/g, "<br>");
}
function timeStr(ts) {
  return new Date(ts).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}
function scrollBottom() { requestAnimationFrame(() => { chatScroll.scrollTop = chatScroll.scrollHeight; }); }

function addMsg(role, text, ts, skipSave) {
  const c = active(); if (!c) return;
  if (!skipSave) {
    c.messages.push({ role, text, ts: ts || Date.now() });
    c.updated = Date.now();
    if (c.messages.length === 2 || c.title === "Yeni Sohbet") {
      const first = c.messages.find(m => m.role === "user");
      if (first) c.title = first.text.slice(0, 42) + (first.text.length > 42 ? "…" : "");
    }
    save(); renderHistory();
  }
  heroEl.style.display = c.messages.length ? "none" : "";
  const div = document.createElement("div");
  div.className = "msg " + role;
  div.innerHTML =
    `<div class="avatar">${role === "user" ? "🧑" : "🤖"}</div>
     <div style="min-width:0">
       <div class="bubble">${miniMarkdown(text)}</div>
       <div class="msg-meta"><span>${timeStr(ts || Date.now())}</span>
         <button data-act="copy" title="Kopyala">⧉ Kopyala</button>
         ${role === "bot" ? `<button data-act="speak" title="Sesli oku">🔈 Oku</button>` : ""}
       </div>
     </div>`;
  div.querySelector('[data-act="copy"]').onclick = (e) => {
    navigator.clipboard?.writeText(text).then(() => toast("Kopyalandı ✓")).catch(() => toast("Kopyalanamadı"));
  };
  const sp = div.querySelector('[data-act="speak"]');
  if (sp) sp.onclick = () => speak(text);
  messagesEl.appendChild(div);
  scrollBottom();
  chatTitle.textContent = c.title;
}

function renderMessages() {
  messagesEl.innerHTML = "";
  const c = active();
  heroEl.style.display = c && c.messages.length ? "none" : "";
  chatTitle.textContent = c ? c.title : "Yeni Sohbet";
  (c?.messages || []).forEach(m => addMsg(m.role, m.text, m.ts, true));
  scrollBottom();
}

function renderHistory(filter = "") {
  const q = filter.trim().toLocaleLowerCase("tr");
  const list = conversations.filter(c =>
    !q || c.title.toLocaleLowerCase("tr").includes(q) ||
    c.messages.some(m => m.text.toLocaleLowerCase("tr").includes(q)));
  historyCount.textContent = conversations.length;
  historyList.innerHTML = list.length ? "" : `<div class="empty">Henüz sohbet yok.<br>Yukarıdan yeni sohbet başlat ✨</div>`;
  list.forEach(c => {
    const b = document.createElement("div");
    b.className = "history-item" + (c.id === activeId ? " active" : "");
    b.innerHTML = `<div class="row"><b>${escapeHtml(c.title)}</b><button class="del" title="Sil">🗑</button></div>
      <small>${c.messages.length} mesaj • ${new Date(c.updated).toLocaleDateString("tr-TR")}</small>`;
    b.onclick = (e) => {
      if (e.target.classList.contains("del")) {
        conversations = conversations.filter(x => x.id !== c.id);
        if (!conversations.length) createConversation(true);
        if (activeId === c.id) activeId = conversations[0].id;
        save(); renderHistory($("searchInput").value); renderMessages(); toast("Sohbet silindi");
        return;
      }
      activeId = c.id; save(); renderHistory($("searchInput").value); renderMessages(); closeSidebar();
    };
    historyList.appendChild(b);
  });
}

/* ---------------- BOT BRAIN (Türkçe) ---------------- */
const norm = (s) => (" " + s.toLocaleLowerCase("tr-TR") + " ")
  .replace(/[?!.,;:…_*"“”‘'()[\]{}<>\\/|-]+/g, " ")
  .replace(/\s+/g, " ");

const JOKES = [
  "Temel'e sormuşlar: 'En hızlı sayı hangisi?' — 'Koşan sayılar!' 🏃😄",
  "Adamın biri güneşte çok kalmış, ayda bir geliyormuş. 🌞🌙",
  "Bilgisayar neden üşür? Çünkü Windows'u açık kalmış! 🪟❄️😂",
  "Balık neden okula gitmez? Çünkü 'okul' zaten onun evi! 🐟🏫",
  "Matematik kitabıyla Türkçe kitabı kavga etmiş. Matematik demiş ki: 'Senin cümlen bozuk!' 😅",
  "Garson: 'Buyrun, menü!' Temel: 'Yok, ben yemek yemeye geldim.' 🍽️😄",
  "Telefon neden gözlük takar? Çünkü 'akıllı' ama biraz 'miyop'! 🤓📱",
  "Öğrenci: 'Hocam kopya çekenle çekmeyen bir mi?' Hoca: 'Değil.' Öğrenci: 'O zaman niye aynı soruları soruyorsunuz?' 😂"
];
const MOTIVATIONS = [
  "🔥 Unutma: Büyük işler küçük adımlarla başlar. Bugün tek bir adım at, yarın kendine teşekkür edeceksin!",
  "💪 Yorulduğunda dinlen, ama vazgeçme. Mola vermek pes etmek değildir.",
  "🌱 Her usta bir zamanlar acemiydi. Devam et, gelişiyorsun!",
  "⚡ Mükemmel zamanı bekleme; zamanı mükemmel yap. Şimdi başla!",
  "🌟 Başarısızlık son değil, geri bildirimdir. Her 'olmadı' seni doğruya yaklaştırır.",
  "🚀 Disiplin, motivasyonun bittiği yerde başlar. Bugün sözünü tut!"
];
const FACTS = [
  "🍯 Bal asla bozulmaz! Arkeologlar Mısır piramitlerinde 3000 yıllık yenilebilir bal buldu.",
  "🐙 Ahtapotların üç kalbi vardır ve kanları mavidir!",
  "🌍 Dünyanın dönüşü giderek yavaşlıyor; günler her yüzyılda ~1,7 ms uzuyor.",
  "🧠 Beynin günde yaklaşık 6000 düşünce ürettiği tahmin ediliyor.",
  "🐝 Arılar insan yüzlerini tanıyabilir!",
  "⚡ Bir şimşek, Güneş'in yüzeyinden 5 kat daha sıcaktır."
];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function calcReply(raw) {
  let expr = raw.toLocaleLowerCase("tr-TR")
    .replace(/kaç eder\??|kaçtır\??|kaç\??|hesapla|sonucu|sonuç|eşittir|=|\?/g, "")
    .replace(/artı|toplamı|topla/g, "+").replace(/eksi|çıkar|farkı/g, "-")
    .replace(/çarpı|çarp|kere|x|×/g, "*").replace(/bölü|böl/g, "/")
    .replace(/üzeri|kuvvet/g, "**").replace(/yüzde/g, "%")
    .replace(/,/g, ".").replace(/[^0-9+\-*/().% \t]/g, "").trim();
  if (!expr || !/[0-9]/.test(expr) || !/[+\-*/%]/.test(expr)) return null;
  if (/(\*\*){2,}|\/{2,}|[+\-*/%]{3,}/.test(expr.replace(/\s/g, ""))) return null;
  try {
    const val = Function('"use strict";return(' + expr + ")")();
    if (typeof val !== "number" || !isFinite(val)) return null;
    const nice = Math.round(val * 1e10) / 1e10;
    return `🧮 **${expr} = ${nice.toLocaleString("tr-TR")}**`;
  } catch { return null; }
}
function mockWeather(city) {
  const c = (city || "İstanbul").trim() || "İstanbul";
  const conds = ["☀️ Güneşli", "⛅ Parçalı bulutlu", "🌧️ Hafif yağmurlu", "🌤️ Az bulutlu", "💨 Rüzgarlı"];
  const t = 8 + Math.floor(Math.random() * 20), feel = t + (Math.random() > .5 ? 2 : -2);
  const hum = 35 + Math.floor(Math.random() * 50);
  return `🌤️ **${c} hava durumu (tahmini):**\n${pick(conds)} • ${t}°C (hissedilen ${feel}°C)\n💧 Nem %${hum} • 💨 Rüzgar ${5 + Math.floor(Math.random() * 25)} km/s\n\n_Not: Bu demo verisidir, gerçek canlı veri değildir._`;
}

function brain(raw) {
  const t = norm(raw);
  const has = (...ws) => ws.some(w => t.includes(" " + w + " ") || t.includes(" " + w));
  const hasAny = (arr) => arr.some(w => t.includes(w));

  // matematik öncelikli
  if (hasAny(["hesapla", "kaç eder", "kaçtır", "artı", "eksi", "çarpı", "bölü", "kere", "toplam", "*", "/", "+", "x"]) || /[0-9]+\s*[+\-*/x×]\s*[0-9]+/.test(t)) {
    const r = calcReply(raw);
    if (r) return r;
  }
  if (has("merhaba", "selam", "hey", "günaydın", "iyi günler", "iyi akşamlar", "iyi geceler", "naber", "nbr", "selamun aleyküm")) {
    const h = new Date().getHours();
    const g = h < 6 ? "İyi geceler" : h < 12 ? "Günaydın" : h < 18 ? "İyi günler" : "İyi akşamlar";
    return `${g}! 👋 Ben Sohby. Sana nasıl yardımcı olabilirim?\n\n**Deneyebileceklerin:** \`şaka yap\` • \`saat kaç\` • \`hava durumu\` • \`motivasyon\` • \`12*8 kaç?\``;
  }
  if (has("nasılsın", "nabersin", "ne haber", "keyfin nasıl", "iy misin")) return `Ben bir bot olarak her zaman %100 enerjiyim! ⚡ Sen nasılsın? Bugün sana nasıl destek olabilirim? 😊`;
  if (has("adın ne", "ismin ne", "kimsin", "sen kimsin", "adın")) return `Ben **Sohby** 🤖 — Türkçe konuşan, tamamen tarayıcıda çalışan bir sohbet botuyum. Verilerin cihazından çıkmaz. 🔒`;
  if (has("ne yapabilirsin", "neler yapabilirsin", "yardım", "help", "komutlar", "özelliklerin", "yeteneklerin"))
    return `✨ **Neler yapabilirim?**\n• 💬 Sohbet ederim (selamlaşma, hal hatır)\n• 🧮 Hesap yaparım → örn: \`1250 * 36 kaç?\`\n• 🕒 Saat & 📅 tarih söylerim\n• 🌤️ Şehir bazlı demo hava durumu → örn: \`hava durumu Ankara\`\n• 😂 Şaka / fıkra anlatırım\n• 🔥 Motivasyon sözü veririm\n• 🧠 İlginç bilgi paylaşırım → \`bilgi ver\`\n• 🗣️ Beni sesli okutabilirsin (🔈 Oku)`;
  if (has("saat", "saat kaç")) { const s = new Date().toLocaleTimeString("tr-TR"); return `🕒 Şu an saat **${s}**. Zaman su gibi akıyor! ⏳`; }
  if (has("tarih", "bugün ayın kaçı", "günlerden ne", "hangi gündeyiz", "bugün ne")) {
    const d = new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    return `📅 Bugün **${d}**. Güzel bir gün olsun! ☀️`;
  }
  if (has("hava", "hava durumu", "sıcaklık", "yağmur", "kar yağacak")) {
    const m = raw.match(/hava durumu\s+([a-zçğıöşüA-ZÇĞİÖŞÜ\s]+)/i) || raw.match(/hava\s+([a-zçğıöşüA-ZÇĞİÖŞÜ\s]+)/i);
    let city = m ? m[1].replace(/[?!.]+$/, "").trim() : "İstanbul";
    if (city.length > 25 || /durumu|nasıl|bugün/.test(norm(city))) city = "İstanbul";
    return mockWeather(city[0].toLocaleUpperCase("tr") + city.slice(1));
  }
  if (has("şaka", "fıkra", "güldür", "komik", "espri")) return pick(JOKES) + `\n\nBir tane daha ister misin? \`şaka yap\` yazman yeterli 😄`;
  if (has("motivasyon", "motive", "gaz ver", "cesaret", "üzgünüm", "mutsuzum", "yorgunum", "vazgeç")) return pick(MOTIVATIONS);
  if (has("bilgi", "ilginç bilgi", "enteresan", "bana bir şey öğret")) return pick(FACTS) + `\n\nBaşka bilgi için \`bilgi ver\` yaz 💡`;
  if (has("teşekkür", "sağol", "sağ ol", "eyvallah", "thanks")) return `Rica ederim! 😊 Yardımcı olabildiysem ne mutlu. Başka bir şey var mı?`;
  if (has("görüşürüz", "hoşça kal", "bay bay", "güle güle", "kaçtım", "kapat")) return `Görüşürüz! 👋 Her zaman buradayım. Kendine iyi bak! ✨`;
  if (has("seviyorum", "aşk", "evlen", "öp")) return `Bunu duyduğuma sevindim! 🥰 Ben de insanlarla sohbet etmeyi seviyorum. Sana başka nasıl yardımcı olabilirim?`;
  if (has("hava at", "kim daha iyi", "zeki misin", "akıllı mısın")) return `Ben mütevazı bir botum 🤖✨ ama Türkçe'de bayağı iyiyim: hesap, şaka, bilgi, motivasyon… Dene bakalım! \`neler yapabilirsin\` yaz.`;
  if (has("nabıyon", "ne yapıyorsun", "nabiyon")) return `Seninle sohbet ediyorum! 💬 Bunun için tasarlandım. Sen ne yapıyorsun bugün?`;
  if (has("yaşın", "kaç yaşındasın")) return `Ben dijital dünyada yaşlanmam! 👶🤖 Doğum günüm bu sayfayı ilk açtığın gün sayılır. 🎂`;
  if (has("favori", "en sevdiğin", "tuttuğun takım")) return `Benim favorim iyi sorular! 🌟 Takım tutmam ama sohbette hep senin takımındayım. 😄`;
  if (has("kötü", "aptal", "salak", "gerizekalı", "sus", "berbat")) return `Kırıldım… 🥺 Ama yine de buradayım ve sana yardım etmek istiyorum. Sakinleşip tekrar deneyelim mi? Derin bir nefes al. 💙`;
  if (has("allah", "din", "namaz", "oruç")) return `Bu konuda saygılıyım 🙏. Dini soruların için güvenilir kaynaklara (Diyanet, ilmihal) danışmanı öneririm. Ben genel sohbet ve günlük işlerde yardımcı olabilirim.`;
  if (hasAny(["python", "javascript", "kod", "yazılım", "html", "css"]))
    return `💻 **Kod yardımı:**\n\`console.log("Merhaba Sohby")\` gibi sorularını buraya yazabilirsin; temel kavramları açıklayabilirim.\n\nÖrnek: \`fonksiyon nedir\` / \`değişken nedir\` diye sor. Derin kod incelemesi için dosyana bakmam gerekir ama mantığını anlatırım! 🚀`;
  if (has("fonksiyon nedir")) return `📦 **Fonksiyon nedir?**\nTekrar kullanılabilir iş paketi gibidir: girdi alır, iş yapar, çıktı verir.\n\`function topla(a, b) { return a + b; }\`\nÇağrı: \`topla(2,3)\` → \`5\``;
  if (has("değişken nedir")) return `📦 **Değişken nedir?**\nVeriyi saklayan isimli kutudur.\n\`let isim = "Sohby"\` → sonra \`isim\` yazınca \`"Sohby"\` gelir.`;
  if (hasAny(["tamam", "olur", "anladım", "hmm", "evet", "hayır", "ok"]))
    return `${tone()} Başka bir konuda yardımcı olabilir miyim? \`şaka\`, \`bilgi\`, \`motivasyon\` ya da \`hesap\` deneyebilirsin. 😊`;
  if (t.length < 6) return `Hmm, biraz kısa oldu sanki 🤔 Biraz daha açar mısın? Örn: \`saat kaç\`, \`şaka yap\`, \`25*40 kaç?\``;

  const fallbacks = [
    `Bunu tam anlayamadım 🤔 ama öğrenmeye hevesliyim! Şunları deneyebilirsin:\n• \`neler yapabilirsin\` — tüm yetenekler\n• \`şaka yap\` / \`motivasyon\` / \`bilgi ver\`\n• \`hava durumu İzmir\` / \`saat kaç\``,
    `"${raw.slice(0, 60)}" ilginç bir konu! 💭 Bu demo botun bilgi alanı sınırlı; ama hesap, saat, şaka ve motivasyonda iyiyim. Başka bir açıdan sorar mısın?`,
    `Hmm… 🤖 Bilgi bankamda bunun karşılığı yok. İstersen \`yardım\` yaz, sana yapabildiklerimi listeleyeyim.`
  ];
  return tone() + " " + pick(fallbacks);
}

/* ---------------- send flow ---------------- */
let busy = false;
async function handleSend(text) {
  text = (text ?? inputEl.value).trim();
  if (!text || busy) return;
  busy = true; sendBtn.disabled = true;
  addMsg("user", text);
  inputEl.value = ""; autoGrow(); updateCount();
  typingEl.hidden = false; scrollBottom();
  $("statusText").textContent = "Sohby yazıyor…";
  const delay = 600 + Math.min(text.length * 25, 1400) + Math.random() * 400;
  await new Promise(r => setTimeout(r, delay));
  typingEl.hidden = true;
  const reply = brain(text);
  addMsg("bot", reply);
  if (voiceOn) speak(reply.replace(/\*\*/g, "").slice(0, 220));
  $("statusText").textContent = "Sohby çevrimiçi • genelde ~1 sn'de yanıtlar";
  busy = false; sendBtn.disabled = false; inputEl.focus();
}

function speak(text) {
  try {
    if (!voiceOn || !("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/```[\s\S]*?```/g, "kod bloğu").slice(0, 300));
    u.lang = "tr-TR"; u.rate = 1.02;
    speechSynthesis.speak(u);
  } catch {}
}

/* ---------------- composer events ---------------- */
function autoGrow() { inputEl.style.height = "auto"; inputEl.style.height = Math.min(inputEl.scrollHeight, 150) + "px"; }
function updateCount() { $("charCount").textContent = `${inputEl.value.length} / 2000`; }
inputEl.addEventListener("input", () => { autoGrow(); updateCount(); });
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
});
sendBtn.onclick = () => handleSend();
document.querySelectorAll("[data-q]").forEach(b => b.onclick = () => { inputEl.value = b.dataset.q; handleSend(b.dataset.q); });

/* ---------------- toolbar ---------------- */
$("newChatBtn").onclick = () => { createConversation(); renderHistory(); toast("Yeni sohbet açıldı ✨"); inputEl.focus(); closeSidebar(); };
$("searchInput").addEventListener("input", (e) => renderHistory(e.target.value));
$("clearAllBtn").onclick = () => {
  if (!confirm("Tüm sohbetler silinsin mi?")) return;
  conversations = []; save(); createConversation(); renderHistory(); renderMessages(); toast("Tüm geçmiş temizlendi");
};
$("exportBtn").onclick = () => {
  const c = active(); if (!c || !c.messages.length) return toast("Dışa aktarılacak mesaj yok");
  const txt = `Sohby Sohbet — ${c.title}\n${new Date().toLocaleString("tr-TR")}\n${"=".repeat(40)}\n\n` +
    c.messages.map(m => `${m.role === "user" ? "🧑 Sen" : "🤖 Sohby"} [${timeStr(m.ts)}]:\n${m.text}\n`).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([txt], { type: "text/plain;charset=utf-8" }));
  a.download = "sohby-sohbet.txt"; a.click(); URL.revokeObjectURL(a.href); toast("Sohbet indirildi ⤓");
};
$("voiceToggleBtn").onclick = (e) => {
  voiceOn = !voiceOn;
  try { localStorage.setItem(LS_VOICE, voiceOn ? "on" : "off"); } catch {}
  if (!voiceOn) try { speechSynthesis.cancel(); } catch {}
  e.currentTarget.classList.toggle("off", !voiceOn);
  e.currentTarget.textContent = voiceOn ? "🔊" : "🔇";
  toast(voiceOn ? "Sesli yanıt açık 🔊" : "Sesli yanıt kapalı 🔇");
};
if (!voiceOn) { $("voiceToggleBtn").classList.add("off"); $("voiceToggleBtn").textContent = "🔇"; }

/* mic (speech to text) */
$("micBtn").onclick = () => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return toast("Tarayıcın sesli yazımı desteklemiyor (Chrome önerilir)");
  if (listening) { recog?.stop(); return; }
  recog = new SR(); recog.lang = "tr-TR"; recog.interimResults = false;
  listening = true; $("micBtn").textContent = "⏹️"; toast("Dinliyorum… 🎙️ konuş!");
  recog.onresult = (e) => { inputEl.value = e.results[0][0].transcript; autoGrow(); updateCount(); handleSend(); };
  recog.onend = () => { listening = false; $("micBtn").textContent = "🎙️"; };
  recog.onerror = () => { listening = false; $("micBtn").textContent = "🎙️"; toast("Mikrofon hatası"); };
  recog.start();
};

/* sidebar mobile */
const sidebar = $("sidebar"), scrim = $("scrim");
function closeSidebar() { sidebar.classList.remove("open"); scrim.classList.remove("show"); }
$("menuBtn").onclick = () => { sidebar.classList.add("open"); scrim.classList.add("show"); };
$("sidebarClose").onclick = closeSidebar;
scrim.onclick = closeSidebar;

/* keyboard shortcut */
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLocaleLowerCase("tr") === "k") { e.preventDefault(); $("newChatBtn").click(); }
  if (e.key === "Escape") closeSidebar();
});

/* ---------------- init ---------------- */
if (!conversations.length) createConversation(true);
activeId = conversations[0].id;
renderHistory(); renderMessages(); updateCount();
if (conversations[0].messages.length === 0) {
  setTimeout(() => addMsg("bot", "👋 Tekrar merhaba! Ben **Sohby**. Aşağıdaki haplara dokunarak ya da serbestçe yazarak başlayabilirsin. Nasıl yardımcı olabilirim? 😊", Date.now(), false), 900);
}
