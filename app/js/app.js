(function () {
  const B = MiniBoot;
  const root = document.getElementById("screen");
  const KEY = "cuaca-kita-city";
  let data = null;
  let q = "";

  function cities() { return (data && data.cities) || []; }
  function pick() {
    var name = B.load(KEY, null);
    var list = cities();
    if (name) {
      for (var i = 0; i < list.length; i++) if (list[i].label === name || list[i].kotkab === name) return list[i];
    }
    return list[0];
  }
  function icon(desc) {
    var d = (desc || "").toLowerCase();
    if (d.indexOf("hujan") >= 0) return "Hujan";
    if (d.indexOf("petir") >= 0) return "Petir";
    if (d.indexOf("cerah") >= 0 && d.indexOf("berawan") >= 0) return "Cerah berawan";
    if (d.indexOf("cerah") >= 0) return "Cerah";
    if (d.indexOf("berawan") >= 0) return "Berawan";
    if (d.indexOf("kabut") >= 0 || d.indexOf("kabur") >= 0) return "Berkabut";
    return desc || "—";
  }

  function render() {
    var html = '<div class="screen-fade"><div class="top"><div><div class="eyebrow">Prakiraan BMKG</div><h1>Cuaca Kita</h1></div><div class="date-chip">' + B.escapeHtml(B.formatIdDate()) + "</div></div>";
    if (!data || !cities().length) {
      html += '<div class="warn-banner">Prakiraan belum tersedia. Nilai tidak dikira-kira. Coba lagi setelah pembaruan data, atau cek bmkg.go.id.</div>';
      html += '<p class="footer-links">Sumber resmi: BMKG. Aplikasi ini hanya menampilkan data yang berhasil diarsipkan.</p></div>';
      root.innerHTML = html; return;
    }
    if (data.fetchedAt) {
      var stale = (Date.now() - new Date(data.fetchedAt).getTime()) > 36 * 3600 * 1000;
      if (stale) html += '<div class="warn-banner">Data terakhir diambil ' + B.escapeHtml(String(data.fetchedAt)) + ". Ini arsip terakhir, bukan tebakan.</div>";
    }
    var c = pick();
    html += '<label class="field">Wilayah (satu kelurahan sebagai titik prakiraan)</label>';
    html += '<input id="q" type="search" placeholder="Cari kota…" value="' + B.escapeHtml(q) + '">';
    if (q) {
      var hits = cities().filter(function (x) {
        return (x.label + " " + x.kotkab + " " + x.provinsi).toLowerCase().indexOf(q.toLowerCase()) >= 0;
      }).slice(0, 8);
      html += '<div class="card" style="margin:8px 0">' + hits.map(function (x) {
        return '<button class="row" style="width:100%;text-align:left" data-city="' + B.escapeHtml(x.label) + '"><span>' + B.escapeHtml(x.kotkab) + '</span><span class="muted">' + B.escapeHtml(x.desa) + "</span></button>";
      }).join("") + "</div>";
    }
    html += '<div class="card"><p class="muted">' + B.escapeHtml(c.kotkab + " · " + c.desa + " · " + c.provinsi) + "</p>";
    var hours = (c.forecast || []);
    if (!hours.length) html += '<p class="warn-banner">Tidak ada baris prakiraan untuk titik ini pada arsip terakhir.</p>';
    var byDay = {};
    hours.forEach(function (h) {
      var day = String(h.local_datetime || "").slice(0, 10);
      (byDay[day] = byDay[day] || []).push(h);
    });
    Object.keys(byDay).sort().forEach(function (day) {
      html += '<p class="lead" style="margin-top:14px;font-size:18px">' + B.escapeHtml(day) + "</p>";
      byDay[day].forEach(function (h) {
        var jam = String(h.local_datetime || "").slice(11, 16);
        html += '<div class="row"><span>' + jam + " · " + B.escapeHtml(icon(h.weather_desc)) + '</span><span class="kpi" style="font-size:18px">' + (h.t != null ? h.t + "°" : "—") + " · " + (h.hu != null ? h.hu + "%" : "") + "</span></div>";
      });
    });
    html += "</div>";
    html += '<p class="source">Sumber: BMKG (Badan Meteorologi, Klimatologi, dan Geofisika), API prakiraan cuaca terbuka. Titik = satu kelurahan, bukan rata-rata seluruh kota. Ikon cuaca dipakai dalam bentuk teks orisinal, bukan unduhan ulang ikon resmi.</p>';
    html += '<div class="btn-row"><button class="btn" id="share">Bagikan ringkasan</button></div>';
    html += '<div data-ad-slot="banner" hidden></div>';
    html += '<div class="affiliate-row"><div data-affiliate="shopee" hidden><a href="#"><span data-affiliate-label>Shopee</span></a></div><div data-affiliate="tokopedia" hidden><a href="#"><span data-affiliate-label>Tokopedia</span></a></div></div>';
    html += '<button class="stars-btn" data-stars hidden><span data-stars-label>Hapus iklan</span></button>';
    html += '<p class="footer-links">Bukan situs resmi BMKG. Untuk peringatan dini, utamakan bmkg.go.id.</p></div>';
    root.innerHTML = html;
    if (MiniAds && MiniAds.apply) MiniAds.apply(root);
    var inp = document.getElementById("q");
    if (inp) inp.oninput = function () { q = inp.value; render(); var n=document.getElementById("q"); if(n){n.focus();n.value=q;n.setSelectionRange(q.length,q.length);} };
    Array.prototype.forEach.call(document.querySelectorAll("[data-city]"), function (b) {
      b.onclick = function () { B.store(KEY, b.getAttribute("data-city")); q=""; render(); };
    });
    var sh = document.getElementById("share");
    if (sh) sh.onclick = function () {
      var first = (c.forecast || [])[0];
      var line = first ? (icon(first.weather_desc) + " · " + first.t + "°") : "Lihat prakiraan";
      var card = B.drawShareCard({
        bg: "#E8F3FF", ink: "#0B2A4A", muted: "#4A6A88", accent: "#1A6FE8", wash: "rgba(26,111,232,0.12)",
        eyebrow: "Cuaca Kita", title: c.kotkab.replace("Kota Adm. ", "").replace("Kota ", ""),
        lines: [{ text: c.desa, muted: true }, { text: line, big: true }, { text: "Sumber: BMKG", muted: true }],
        footer: "kabarunnie.github.io/cuaca-kita"
      });
      B.shareCanvas(card, "Cuaca " + c.kotkab + " (" + c.desa + "): " + line + "\nSumber: BMKG", "https://kabarunnie.github.io/cuaca-kita/");
    };
  }

  B.setupTelegram();
  Promise.all([
    fetch("data/forecast.json").then(function (r) { return r.ok ? r.json() : null; }),
    MiniAds.load("data/ads.json")
  ]).then(function (res) { data = res[0]; render(); });
})();
