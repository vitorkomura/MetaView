/* MetaView — extras: agenda com calendário mensal, amigos, barra inferior e lembretes.
   Carrega depois do app.js e usa as mesmas variáveis globais dele (R, S, U, go...). */
(() => {
  const I = (p) => `<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
  const IC = {
    visao: I(
      '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    ),
    checkin: I('<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>'),
    agenda: I(
      '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    ),
    evolucao: I('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
    mais: I(
      '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
    ),
  };
  const st = () => {
    if (!S) return false;
    S.ev = S.ev || [];
    S.fr = S.fr || [];
    return true;
  };
  const ag = { off: 0, sel: "" }; // mês exibido (deslocamento) e dia selecionado na agenda
  const toast = (m) => {
    const t = document.createElement("div");
    t.className = "toast";
    t.setAttribute("role", "status");
    t.textContent = m;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 6000);
  };
  const notify = (t, b) => {
    toast(t + " — " + b);
    try {
      if (window.Notification && Notification.permission == "granted") {
        const fb = () => new Notification(t, { body: b });
        navigator.serviceWorker
          ? navigator.serviceWorker
              .getRegistration()
              .then((r) =>
                r
                  ? r.showNotification(t, {
                      body: b,
                      icon: "icons/icon-192.png",
                    })
                  : fb(),
              )
              .catch(fb)
          : fb();
      }
    } catch (e) {}
  };

  /* ---------- Agenda ---------- */
  function miniCal() {
    const b = new Date();
    b.setDate(1);
    b.setMonth(b.getMonth() + ag.off);
    const y = b.getFullYear(),
      m = b.getMonth(),
      n = new Date(y, m + 1, 0).getDate(),
      t = TD();
    let h =
      "SDTQQSS"
        .split("")
        .map((x) => `<div class="mh">${x}</div>`)
        .join("") + "<i></i>".repeat(b.getDay());
    for (let i = 1; i <= n; i++) {
      const d = ds(new Date(y, m, i)),
        es = S.ev.filter((e) => e.d == d);
      h += `<button class="md${d == t ? " td" : ""}${d == ag.sel ? " sl" : ""}" data-x="ags" data-v="${d}" aria-label="${fmt(d)}${es.length ? ", " + es.length + " compromisso(s)" : ""}">${i}<span>${es
        .slice(0, 3)
        .map((e) => `<b style="background:${e.c}"></b>`)
        .join("")}</span></button>`;
    }
    return `<div class="row"><button data-x="agm" data-v="-1" aria-label="Mês anterior">‹</button><b style="text-transform:capitalize">${b.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</b><button data-x="agm" data-v="1" aria-label="Próximo mês">›</button></div><div class="mcg">${h}</div>`;
  }
  function agenda() {
    st();
    const t = TD(),
      all = S.ev.slice().sort((a, b) => (a.d + a.h).localeCompare(b.d + b.h)),
      ev = ag.sel ? all.filter((e) => e.d == ag.sel) : all;
    return `<h1>Agenda</h1><p class="m">Compromissos com aviso no horário.</p>
<div class="card">${miniCal()}</div>
<div class="card"><div class="row"><input id="ag_t" placeholder="Compromisso" aria-label="Título"><input id="ag_d" type="date" value="${ag.sel || t}" aria-label="Data"><input id="ag_h" type="time" value="09:00" aria-label="Hora"><input id="ag_c" type="color" value="#7a5c48" aria-label="Cor"></div><p class="err" id="ag_e"></p><div class="row"><button class="pri" data-x="aa">Adicionar</button><button data-x="an">Ativar avisos</button></div></div>
${ag.sel ? `<div class="row"><b style="text-transform:capitalize">${fmt(ag.sel)}</b><button data-x="agall">Ver todos</button></div>` : ""}
${
  ev.length
    ? [...new Set(ev.map((e) => e.d))]
        .map(
          (d) =>
            `<div class="card"><h2 style="text-transform:capitalize">${d == t ? "Hoje · " : ""}${fmt(d)}</h2>${ev
              .filter((e) => e.d == d)
              .map(
                (e) =>
                  `<div class="row" style="padding:6px 0"><span><span class="dot" style="background:${e.c}"></span> <b>${e.h}</b> ${esc(e.t)}</span><button class="dng" data-x="ad" data-v="${e.id}">Excluir</button></div>`,
              )
              .join("")}</div>`,
        )
        .join("")
    : `<div class="card m">${ag.sel ? "Nenhum compromisso neste dia." : "Nenhum compromisso. Adicione o primeiro acima."}</div>`
}`;
  }

  /* ---------- Amigos (por código; não é sincronização ao vivo) ---------- */
  const myCode = () =>
    "MV1." +
    btoa(
      unescape(
        encodeURIComponent(
          JSON.stringify({
            n: (S.name || U.name).slice(0, 30),
            w: avg(TD(), 7),
            m: monthStats(0).avg,
            s: streak(),
            d: TD(),
          }),
        ),
      ),
    );
  function amigos() {
    st();
    const w = avg(TD(), 7),
      bar = (v) => `<div class="pb"><i style="width:${v || 0}%"></i></div>`;
    return `<h1>Amigos</h1><p class="m">Compare seu progresso com quem você convidar.</p>
<div class="card"><h2>Seu código</h2><input id="am_c" readonly value="${myCode()}" aria-label="Seu código"><div class="row" style="margin-top:8px"><button data-x="cp">Copiar código</button></div><p class="m" style="font-size:13px">Envie o código a um amigo. O progresso dele só muda quando ele enviar um novo código.</p></div>
<div class="card"><h2>Adicionar amigo</h2><input id="am_n" placeholder="Cole o código do amigo" aria-label="Código do amigo"><p class="err" id="am_e"></p><button class="pri" data-x="fa">Adicionar</button></div>
<div class="card"><h2>Comparação · 7 dias</h2><div class="row"><b>Você</b><b>${pc(w)}</b></div>${bar(w)}${S.fr.map((f) => `<div style="margin-top:14px"><div class="row"><b>${esc(f.n)}</b><b>${pc(f.w)}</b></div>${bar(f.w)}<div class="row"><small>mês ${pc(f.m)} · sequência ${f.s} dia(s) · ${f.d.split("-").reverse().join("/")}</small><button class="dng" data-x="fd" data-v="${esc(f.n)}">Remover</button></div></div>`).join("") || '<p class="m">Nenhum amigo adicionado ainda.</p>'}</div>`;
  }
  function addFriend() {
    const err = (m) => ($("#am_e").textContent = m),
      c = $("#am_n").value.trim();
    try {
      if (!c.startsWith("MV1.")) throw 0;
      const o = JSON.parse(decodeURIComponent(escape(atob(c.slice(4)))));
      if (
        typeof o.n != "string" ||
        !o.n ||
        !/^\d{4}-\d\d-\d\d$/.test(o.d) ||
        (o.w != null && typeof o.w != "number")
      )
        throw 0;
      const f = {
        n: o.n.slice(0, 30),
        w: o.w,
        m: typeof o.m == "number" ? o.m : null,
        s: +o.s || 0,
        d: o.d,
      };
      S.fr = S.fr.filter((x) => x.n != f.n).concat(f);
      save();
      go();
    } catch (e) {
      err("Código inválido.");
    }
  }

  /* ---------- Rotas, barra inferior e eventos ---------- */
  R.agenda = ["Agenda", agenda];
  R.amigos = ["Amigos", amigos];
  const cfg = R.config;
  delete R.config;
  R.config = cfg;
  const MAIS = [
    ["calendario", "Calendário"],
    ["habitos", "Hábitos"],
    ["amigos", "Amigos"],
    ["config", "Ajustes"],
  ];

  function fixBar() {
    const k = location.hash.slice(1) || "visao";
    $("#bn").innerHTML =
      [
        ["visao", "Início"],
        ["checkin", "Check-in"],
        ["agenda", "Agenda"],
        ["evolucao", "Evolução"],
      ]
        .map(
          ([r, l]) =>
            `<a href="#${r}" class="${r == k ? "on" : ""}">${IC[r]}${l}</a>`,
        )
        .join("") +
      `<button class="mo ${MAIS.some((x) => x[0] == k) ? "on" : ""}" data-x="mais" aria-expanded="false">${IC.mais}Mais</button>`;
    let s = $("#sheet");
    if (!s) {
      s = document.createElement("div");
      s.id = "sheet";
      document.body.appendChild(s);
    }
    s.className = "";
    s.innerHTML = MAIS.map(
      ([r, l]) => `<a href="#${r}" class="${r == k ? "on" : ""}">${l}</a>`,
    ).join("");
  }
  const _go = go;
  go = function () {
    _go();
    if (U) {
      fixBar();
      st();
    }
  };

  document.addEventListener("click", (e) => {
    const s = $("#sheet");
    if (
      s &&
      s.classList.contains("open") &&
      !e.target.closest("#sheet,[data-x=mais]")
    )
      s.classList.remove("open");
    const b = e.target.closest("[data-x]");
    if (!b || !st()) return;
    const x = b.dataset.x,
      v = b.dataset.v;
    if (x == "mais") {
      s.classList.toggle("open");
      b.setAttribute("aria-expanded", s.classList.contains("open"));
    } else if (x == "agm") {
      ag.off += +v;
      go();
    } else if (x == "ags") {
      ag.sel = ag.sel == v ? "" : v;
      go();
    } else if (x == "agall") {
      ag.sel = "";
      go();
    } else if (x == "aa") {
      const t = $("#ag_t").value.trim(),
        d = $("#ag_d").value,
        h = $("#ag_h").value;
      if (!t || !d || !h)
        return ($("#ag_e").textContent = "Preencha título, data e hora.");
      S.ev.push({ id: uid(), t, d, h, c: $("#ag_c").value });
      save();
      go();
    } else if (x == "ad") {
      S.ev = S.ev.filter((q) => q.id != v);
      save();
      go();
    } else if (x == "an") {
      if (!window.Notification)
        return toast("Este navegador não oferece notificações.");
      Notification.requestPermission().then((r) =>
        toast(
          r == "granted"
            ? "Avisos ativados neste aparelho."
            : "Avisos não permitidos.",
        ),
      );
    } else if (x == "cp") {
      const i = $("#am_c");
      i.select();
      try {
        navigator.clipboard.writeText(i.value);
      } catch (q) {
        document.execCommand("copy");
      }
      toast("Código copiado.");
    } else if (x == "fa") addFriend();
    else if (x == "fd") {
      S.fr = S.fr.filter((q) => q.n != v);
      save();
      go();
    }
  });

  /* Avisos da agenda (só funcionam com o app aberto) */
  const fired = new Set();
  setInterval(() => {
    if (!U || !st()) return;
    const n = new Date(),
      hm = p(n.getHours()) + ":" + p(n.getMinutes());
    S.ev
      .filter((e) => e.d == TD() && e.h == hm && !fired.has(e.id))
      .forEach((e) => {
        fired.add(e.id);
        notify("Agenda", e.h + " · " + e.t);
      });
  }, 1000);

  go();
})();
