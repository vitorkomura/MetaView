const p = (n) => String(n).padStart(2, "0"),
  ds = (d) =>
    d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()),
  TD = () => ds(new Date());
const add = (d, n) => {
  const x = new Date(d + "T12:00");
  x.setDate(x.getDate() + n);
  return ds(x);
};
const fmt = (d) =>
  new Date(d + "T12:00").toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
const SC = { done: 1, part: 0.5, miss: 0 },
  LB = { done: "Concluído", part: "Parcial", miss: "Não concluído", na: "N/A" };
/* ---------- Contas e dados por usuário (armazenados neste navegador) ---------- */
const UK = "metaview:users", // contas cadastradas
  SK = "metaview:session", // conta logada
  TK = "metaview:theme", // tema (claro/escuro)
  DK = (id) => "metaview:data:" + id; // dados de cada conta
const jget = (k, d) => {
  try {
    const v = JSON.parse(localStorage.getItem(k));
    return v == null ? d : v;
  } catch (e) {
    return d;
  }
};
const jset = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch (e) {}
};
const LS = (() => {
  try {
    localStorage.setItem("_t", "1");
    localStorage.removeItem("_t");
    return true;
  } catch (e) {
    return false;
  }
})();
let TH = jget(TK, null),
  S = null, // dados da conta logada
  U = null; // conta logada
const save = () => {
  if (U && S) jset(DK(U.id), S);
};
function newData(name) {
  const D = {
    name: name || "",
    habits: [],
    logs: {},
    closed: {},
    t: [90, 70, 50, 30],
    seeded: 1,
  };
  [
    ["Estudar por 1 hora", "Estudos", "1 h", [1, 2, 3, 4, 5]],
    ["Ler por 20 minutos", "Leitura", "20 min", [0, 1, 2, 3, 4, 5, 6]],
    ["Praticar atividade física", "Saúde", "40 min", [1, 3, 5]],
    ["Beber a água planejada", "Saúde", "2 L", [0, 1, 2, 3, 4, 5, 6]],
    ["Trabalhar no projeto pessoal", "Projetos", "1 h", [1, 2, 3, 4]],
    ["Dormir no horário planejado", "Sono", "23h", [0, 1, 2, 3, 4, 5, 6]],
  ].forEach((h, i) =>
    D.habits.push({
      id: "h" + i,
      name: h[0],
      desc: "",
      cat: h[1],
      freq: "custom",
      goal: h[2],
      days: h[3],
      w: 1,
      start: TD(),
      end: "",
      paused: 0,
      color: "#1f8a4c",
    }),
  );
  return D;
}
const users = () => jget(UK, {});
function signIn(u) {
  U = u;
  jset(SK, u.id);
  S = jget(DK(u.id), null) || newData(u.name);
  S.name = S.name || u.name;
  save();
}
function signOut() {
  U = S = null;
  try {
    localStorage.removeItem(SK);
  } catch (e) {}
}
const hex = (b) =>
  [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const rnd = () =>
  hex(
    window.crypto && crypto.getRandomValues
      ? crypto.getRandomValues(new Uint8Array(12))
      : Array.from({ length: 12 }, () => Math.random() * 256),
  );
async function hashPw(pw, salt) {
  if (window.crypto && crypto.subtle) {
    const enc = new TextEncoder(),
      key = await crypto.subtle.importKey(
        "raw",
        enc.encode(pw),
        "PBKDF2",
        false,
        ["deriveBits"],
      ),
      bits = await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          salt: enc.encode(salt),
          iterations: 150000,
          hash: "SHA-256",
        },
        key,
        256,
      );
    return hex(bits);
  }
  let h = 5381; // alternativa simples quando o navegador não oferece crypto.subtle
  for (const c of salt + pw) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0;
  return "x" + h.toString(16);
}
let am = "in"; // tela de acesso: "in" (entrar) ou "up" (criar conta)
function authView() {
  const up = am == "up";
  return `<div class="auth"><div class="alg">MetaView</div><p class="m">Acompanhe sua consistência, um dia de cada vez.</p>
<div class="card"><div class="tabs"><button class="${up ? "" : "on"}" data-a="amode" data-v="in">Entrar</button><button class="${up ? "on" : ""}" data-a="amode" data-v="up">Criar conta</button></div>
${up ? '<label>Nome<input id="au_n" autocomplete="name"></label>' : ""}
<label>E-mail<input id="au_e" type="email" autocomplete="email"></label>
<label>Senha<input id="au_p" type="password" autocomplete="${up ? "new-password" : "current-password"}"></label>
${up ? '<label>Confirmar senha<input id="au_c" type="password" autocomplete="new-password"></label>' : ""}
<p class="err" id="au_err" role="alert">${LS ? "" : "Este ambiente bloqueia o armazenamento do navegador: a conta não será mantida ao recarregar."}</p>
<button class="pri" id="au_go" data-a="auth">${up ? "Criar conta" : "Entrar"}</button></div>
<p class="m" style="font-size:13px">As contas ficam salvas neste navegador. Cada pessoa tem seus próprios hábitos, metas e registros.</p></div>`;
}
/* Transição de boas-vindas (após entrar ou ao abrir o app já logado) */
function welcome() {
  if (!U || document.getElementById("wl")) return;
  const o = document.createElement("div");
  o.id = "wl";
  o.setAttribute("role", "status");
  o.innerHTML = `<div class="wl-in"><span class="wl-k">Seja bem-vindo,</span><span class="wl-n">${esc(U.name.trim().split(/\s+/)[0])}</span><i class="wl-bar"></i></div>`;
  document.body.appendChild(o);
  const B = document.body;
  B.classList.add("pre"); // esconde a tela principal enquanto as boas-vindas aparecem
  const end = () => {
    if (o.classList.contains("out")) return;
    o.classList.add("out"); // o texto sai primeiro; a cortina sobe 0,3 s depois
    setTimeout(() => {
      B.classList.remove("pre");
      B.classList.add("enter"); // tela principal entra junto com a cortina
      setTimeout(() => B.classList.remove("enter"), 1800);
    }, 300);
    setTimeout(() => o.remove(), 1100);
  };
  o.addEventListener("click", end); // toque para pular
  setTimeout(end, 2100);
}
async function doAuth() {
  const up = am == "up",
    em = $("#au_e").value.trim().toLowerCase(),
    pw = $("#au_p").value,
    err = (m) => ($("#au_err").textContent = m);
  if (!/^\S+@\S+\.\S+$/.test(em)) return err("Informe um e-mail válido.");
  if (pw.length < 6) return err("A senha precisa ter ao menos 6 caracteres.");
  const us = users();
  if (up) {
    const nm = $("#au_n").value.trim();
    if (!nm) return err("Informe seu nome.");
    if (pw != $("#au_c").value) return err("As senhas não conferem.");
    if (us[em]) return err("Já existe uma conta com este e-mail.");
    const salt = rnd(),
      u = {
        id: "u" + rnd(),
        name: nm,
        email: em,
        salt,
        hash: await hashPw(pw, salt),
      },
      old = Object.keys(us).length ? null : jget("evolua1", null); // 1ª conta aproveita os dados da versão sem login
    us[em] = u;
    jset(UK, us);
    if (old && old.habits) jset(DK(u.id), { ...old, name: old.name || nm });
    signIn(u);
  } else {
    const u = us[em];
    if (!u || (await hashPw(pw, u.salt)) != u.hash)
      return err("E-mail ou senha incorretos.");
    signIn(u);
  }
  if (location.hash != "#visao") location.hash = "visao";
  else go();
  welcome();
}
let cal = { mode: "year", off: 0, f: "" },
  sel = "",
  ci = TD(),
  rng = 30;
const minStart = () =>
  S.habits.reduce((m, h) => (!m || h.start < m ? h.start : m), "");
const sched = (d) => {
  const wd = new Date(d + "T12:00").getDay();
  return S.habits.filter(
    (h) =>
      !h.paused &&
      h.start <= d &&
      (!h.end || d <= h.end) &&
      h.days.includes(wd),
  );
};
function calc(d, f) {
  let sc = sched(d);
  if (f) sc = sc.filter((h) => h.id == f || h.cat == f);
  const c = { done: 0, part: 0, miss: 0 };
  if (!sc.length)
    return {
      k: minStart() && d >= minStart() && d <= TD() ? "rest" : "none",
      sc,
      e: [],
      c,
    };
  const L = S.logs[d] || {},
    e = sc.filter((h) => L[h.id] && SC[L[h.id].s] !== undefined);
  e.forEach((h) => c[L[h.id].s]++);
  if (!e.length) return { k: "none", sc, e, c };
  const pct =
      (e.reduce((a, h) => a + h.w * SC[L[h.id].s], 0) /
        e.reduce((a, h) => a + h.w, 0)) *
      100,
    t = S.t;
  return {
    k:
      pct >= t[0]
        ? "g3"
        : pct >= t[1]
          ? "g2"
          : pct >= t[2]
            ? "g1"
            : pct >= t[3]
              ? "am"
              : "rd",
    pct,
    sc,
    e,
    c,
  };
}
const avg = (end, n) => {
  const v = [];
  for (let i = 0; i < n; i++) {
    const r = calc(add(end, -i));
    if (r.pct != null) v.push(r.pct);
  }
  return v.length ? v.reduce((a, b) => a + b) / v.length : null;
};
const pc = (v) => (v == null ? "—" : Math.round(v) + "%");
function streak() {
  let n = 0,
    d = TD();
  if (calc(d).k == "none") d = add(d, -1);
  for (; d >= "2000"; d = add(d, -1)) {
    const r = calc(d);
    if (r.k == "rest") continue;
    if (r.pct >= S.t[2]) n++;
    else break;
  }
  return n;
}
function runs() {
  const o = [];
  let c = 0,
    st = "";
  for (let d = add(TD(), -364); d <= TD(); d = add(d, 1)) {
    const r = calc(d);
    if (r.k == "rest") continue;
    if (r.pct >= S.t[2]) {
      if (!c) st = d;
      c++;
    } else {
      if (c > 1) o.push([st, c]);
      c = 0;
    }
  }
  if (c > 1) o.push([st, c]);
  return o;
}
function cell(d, big, f = cal.f) {
  if (d > TD()) return '<b class="cell" style="visibility:hidden"></b>';
  const r = calc(d, f),
    tip =
      fmt(d) +
      ": " +
      (r.pct != null
        ? pc(r.pct) +
          " · " +
          r.c.done +
          " concluída(s), " +
          r.c.part +
          " parcial(is), " +
          r.c.miss +
          " não concluída(s)"
        : r.k == "rest"
          ? "Descanso planejado"
          : "Sem registro");
  return `<button class="cell${sel == d ? " sel" : ""}" data-a="day" data-v="${d}" style="background:var(--${r.k})" title="${tip}" aria-label="${tip}">${big ? +d.slice(8) : ""}</button>`;
}
function year() {
  const end = add(TD(), -cal.off * 371),
    s = new Date(end + "T12:00");
  s.setDate(s.getDate() - s.getDay() - 52 * 7);
  let d = ds(s),
    cols = "",
    ml = "",
    pm = -1;
  for (let w = 0; w < 53; w++) {
    const m = new Date(d + "T12:00").getMonth();
    ml += `<span>${m != pm && +d.slice(8) <= 7 ? new Date(d + "T12:00").toLocaleDateString("pt-BR", { month: "short" }) : ""}</span>`;
    if (+d.slice(8) <= 7) pm = m;
    let c = "";
    for (let i = 0; i < 7; i++) {
      c += d > end ? '<b class="cell" style="visibility:hidden"></b>' : cell(d);
      d = add(d, 1);
    }
    cols += `<div class="col">${c}</div>`;
  }
  return `<div class="ml">${ml}</div><div class="hm"><div class="dl"><i></i><span>Seg</span><i></i><span>Qua</span><i></i><span>Sex</span><i></i></div>${cols}</div>`;
}
function month(o = cal.off, f = cal.f) {
  const b = new Date();
  b.setDate(1);
  b.setMonth(b.getMonth() - o);
  const n = new Date(b.getFullYear(), b.getMonth() + 1, 0).getDate();
  let h =
    "SDTQQSS"
      .split("")
      .map((x) => `<div class="hdr">${x}</div>`)
      .join("") + "<i></i>".repeat(b.getDay());
  for (let i = 1; i <= n; i++)
    h += cell(ds(new Date(b.getFullYear(), b.getMonth(), i)), 1, f);
  return `<div class="mg">${h}</div>`;
}
const legend = () => {
  const t = S.t;
  return `<div class="lgd">${[
    ["g3", "≥ " + t[0] + "%"],
    ["g2", t[1] + "–" + (t[0] - 1) + "%"],
    ["g1", t[2] + "–" + (t[1] - 1) + "%"],
    ["am", t[3] + "–" + (t[2] - 1) + "%"],
    ["rd", "< " + t[3] + "%"],
    ["none", "Sem registro"],
    ["rest", "Descanso planejado"],
  ]
    .map((x) => `<span><i style="background:var(--${x[0]})"></i>${x[1]}</span>`)
    .join("")}</div>`;
};
function detail() {
  if (!sel)
    return '<div class="card m">Selecione um dia para ver os detalhes.</div>';
  const r = calc(sel, cal.f),
    L = S.logs[sel] || {};
  return `<div class="card"><div class="row"><h2 style="text-transform:capitalize">${fmt(sel)}</h2><button data-a="edit" data-v="${sel}">Editar check-in</button></div>
<p class="big" style="margin:0">${r.pct != null ? pc(r.pct) : r.k == "rest" ? "Descanso planejado" : "Sem registro"}</p>
<p class="m">${r.c.done} concluída(s) · ${r.c.part} parcial(is) · ${r.c.miss} não concluída(s)</p>
${r.sc
  .map((h) => {
    const l = L[h.id] || {};
    return `<div class="row" style="padding:8px 0;border-top:1px solid var(--b)"><span>${esc(h.name)}${l.n ? `<br><small>${esc(l.n)}</small>` : ""}</span><span class="bd ${l.s || ""}">${LB[l.s] || "Sem registro"}</span></div>`;
  })
  .join("")}</div>`;
}
function calendario() {
  const o = S.habits
      .map(
        (h) =>
          `<option value="${h.id}"${cal.f == h.id ? " selected" : ""}>${esc(h.name)}</option>`,
      )
      .join(""),
    cs = [...new Set(S.habits.map((h) => h.cat))]
      .map(
        (c) =>
          `<option value="${esc(c)}"${cal.f == c ? " selected" : ""}>Categoria: ${esc(c)}</option>`,
      )
      .join("");
  const lab =
    cal.mode == "month"
      ? (() => {
          const b = new Date();
          b.setDate(1);
          b.setMonth(b.getMonth() - cal.off);
          return b.toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric",
          });
        })()
      : cal.off
        ? cal.off + " período(s) atrás"
        : "Últimos 12 meses";
  return `<h1>Meu calendário</h1><p class="m">Cada cor vem dos seus registros reais.</p><div class="row"><div class="tabs"><button class="${cal.mode == "year" ? "on" : ""}" data-a="mode" data-v="year">Anual</button><button class="${cal.mode == "month" ? "on" : ""}" data-a="mode" data-v="month">Mensal</button></div>
<select data-c="f" aria-label="Filtro"><option value="">Todos os hábitos</option>${cs}${o}</select><div class="tabs"><button data-a="nav" data-v="1" aria-label="Anterior">‹</button><span style="min-width:130px;text-align:center;text-transform:capitalize">${lab}</span><button data-a="nav" data-v="-1" ${cal.off ? "" : "disabled"} aria-label="Próximo">›</button></div></div>
<div class="card"><div class="sc">${cal.mode == "year" ? year() : month()}</div>${legend()}</div>${detail()}`;
}
function monthStats(o) {
  const b = new Date();
  b.setDate(1);
  b.setMonth(b.getMonth() - o);
  const n = new Date(b.getFullYear(), b.getMonth() + 1, 0).getDate(),
    c = { done: 0, part: 0, miss: 0 },
    v = [];
  for (let i = 1; i <= n; i++) {
    const d = ds(new Date(b.getFullYear(), b.getMonth(), i));
    if (d > TD()) break;
    const r = calc(d);
    r.e.forEach((h) => c[S.logs[d][h.id].s]++);
    if (r.pct != null) v.push(r.pct);
  }
  return {
    c,
    avg: v.length ? v.reduce((a, x) => a + x) / v.length : null,
    tot: c.done + c.part + c.miss,
  };
}
function monthCard() {
  const m = monthStats(0),
    pv = monthStats(1),
    nm = new Date().toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    }),
    C = [
      ["done", "Concluídas", "var(--g3)"],
      ["part", "Parciais", "var(--am)"],
      ["miss", "Não concluídas", "var(--rd)"],
    ];
  let off = 0;
  const arcs = m.tot
    ? C.map((x) => {
        const l = (m.c[x[0]] / m.tot) * 100,
          s = `<circle cx="60" cy="60" r="48" pathLength="100" fill="none" stroke="${x[2]}" stroke-width="12" stroke-dasharray="${l} ${100 - l}" stroke-dashoffset="${-off}"/>`;
        off += l;
        return s;
      }).join("")
    : "";
  const df =
    m.avg != null && pv.avg != null ? Math.round(m.avg - pv.avg) : null;
  return `<h2 style="text-transform:capitalize">${nm}</h2><div class="dn"><svg viewBox="0 0 120 120" role="img" aria-label="Distribuição das atividades do mês"><g transform="rotate(-90 60 60)"><circle cx="60" cy="60" r="48" fill="none" stroke="var(--none)" stroke-width="12"/>${arcs}</g><text x="60" y="62" text-anchor="middle" class="dv">${pc(m.avg)}</text><text x="60" y="77" text-anchor="middle" class="ds">média do mês</text></svg><div class="dl2">${C.map((x) => `<div class="row"><span><i style="background:${x[2]}"></i> ${x[1]}</span><b>${m.c[x[0]]}</b></div>`).join("")}<small>${m.tot ? (df == null ? "Primeiro mês com registros" : (df >= 0 ? "+" : "") + df + " pts vs. mês anterior") : "Sem registros neste mês ainda"}</small></div></div><div style="margin-top:18px">${month(0, "")}</div>${legend()}`;
}
function visao() {
  const t = TD(),
    r = calc(t),
    h = new Date().getHours(),
    a7 = avg(t, 7),
    b7 = avg(add(t, -7), 7),
    L = S.logs[t] || {},
    dn = r.sc.filter((x) => L[x.id] && L[x.id].s == "done").length;
  return `<div class="hd"><div><h1>${h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite"}${S.name ? ", " + esc(S.name) : ""}</h1><span class="m" style="text-transform:capitalize">${fmt(t)}</span></div><button class="pri" data-a="edit" data-v="${t}">Fazer check-in</button></div>
<div class="grid"><div class="card"><small>Cumprimento · 7 dias</small><div class="big">${pc(a7)}</div></div><div class="card"><small>Concluídos hoje</small><div class="big">${dn}/${r.sc.length}</div></div><div class="card"><small>Sequência positiva</small><div class="big">${streak()} dia(s)</div></div><div class="card"><small>Vs. semana anterior</small><div class="big">${a7 == null || b7 == null ? "—" : (a7 - b7 >= 0 ? "+" : "") + Math.round(a7 - b7) + " pts"}</div></div></div>
<div class="two"><div class="card cp"><h2>Atividades de hoje</h2>${
    r.sc.length
      ? r.sc
          .map((x) => {
            const l = L[x.id] || {};
            return `<div class="row" style="padding:8px 0;border-top:1px solid var(--b)"><span><span class="dot" style="background:${x.color}"></span> ${esc(x.name)} <small>${esc(x.goal)}</small></span><span class="bd ${l.s || ""}">${LB[l.s] || "Pendente"}</span></div>`;
          })
          .join("")
      : '<p class="m">Nada programado para hoje. Dia de descanso ou sem hábitos ativos.</p>'
  }</div>
<div class="card mo">${monthCard()}</div></div>`;
}
function checkin() {
  const d = ci,
    sc = sched(d),
    L = S.logs[d] || {};
  return `<h1>Check-in diário</h1><div class="row"><span class="m" style="text-transform:capitalize">${fmt(d)}</span><input type="date" data-c="cid" value="${d}" max="${TD()}" aria-label="Data"></div>
${
  sc.length
    ? sc
        .map((h) => {
          const l = L[h.id] || {};
          return `<div class="card"><div class="row"><span><span class="dot" style="background:${h.color}"></span> <b>${esc(h.name)}</b><br><small>${esc(h.cat)} · meta: ${esc(h.goal)}</small></span></div>
<div class="seg">${["done", "part", "miss", "na"].map((k) => `<button class="sg ${k}${l.s == k ? " on" : ""}" data-a="st" data-h="${h.id}" data-v="${k}" aria-pressed="${l.s == k}">${LB[k]}</button>`).join("")}</div><input class="note" data-n="${h.id}" placeholder="Observação (opcional)" value="${esc(l.n || "")}"></div>`;
        })
        .join("")
    : '<div class="card m">Nenhuma atividade programada para este dia.</div>'
}
${sc.length ? '<button class="pri" data-a="fin">Finalizar meu dia</button>' : ""}<div id="sum"></div>`;
}
function habitos() {
  return `<div class="hd"><h1>Hábitos e metas</h1><button class="pri" data-a="new">Novo hábito</button></div>${S.habits.length ? S.habits.map((h) => `<div class="card"><div class="row"><span><span class="dot" style="background:${h.color}"></span> <b>${esc(h.name)}</b>${h.paused ? ' <span class="bd">Pausado</span>' : ""}<br><small>${esc(h.cat)} · ${h.days.map((i) => "DSTQQSS"[i]).join(" ")} · meta ${esc(h.goal)} · peso ${h.w}</small></span><span><button data-a="edith" data-v="${h.id}">Editar</button> <button data-a="pause" data-v="${h.id}">${h.paused ? "Retomar" : "Pausar"}</button> <button class="dng" data-a="del" data-v="${h.id}">Excluir</button></span></div></div>`).join("") : '<div class="card m">Nenhum hábito ainda. Crie o primeiro para começar.</div>'}`;
}
function form(id) {
  const h = S.habits.find((x) => x.id == id) || {
    name: "",
    desc: "",
    cat: "",
    freq: "daily",
    goal: "",
    days: [0, 1, 2, 3, 4, 5, 6],
    w: 1,
    start: TD(),
    end: "",
    color: "#1f8a4c",
  };
  $("#dlg").innerHTML =
    `<h2>${id ? "Editar" : "Novo"} hábito</h2><label>Nome<input id="f_n" value="${esc(h.name)}"></label><label>Descrição<input id="f_d" value="${esc(h.desc)}"></label><label>Categoria<input id="f_c" value="${esc(h.cat)}"></label>
<label>Frequência<select id="f_f">${[
      ["daily", "Diária"],
      ["weekly", "Semanal"],
      ["custom", "Personalizada"],
    ]
      .map(
        (x) =>
          `<option value="${x[0]}"${h.freq == x[0] ? " selected" : ""}>${x[1]}</option>`,
      )
      .join("")}</select></label>
<label>Dias da semana</label><div class="dk">${"DSTQQSS"
      .split("")
      .map(
        (l, i) =>
          `<label><input type="checkbox" class="f_w" value="${i}"${h.days.includes(i) ? " checked" : ""}>${["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][i]}</label>`,
      )
      .join("")}</div>
<label>Meta diária ou semanal<input id="f_g" value="${esc(h.goal)}" placeholder="ex.: 30 min"></label><div class="row"><label>Início<input type="date" id="f_s" value="${h.start}"></label><label>Fim (opcional)<input type="date" id="f_e" value="${h.end}"></label><label>Peso<select id="f_p">${[1, 2, 3].map((n) => `<option${h.w == n ? " selected" : ""}>${n}</option>`).join("")}</select></label><label>Cor<input type="color" id="f_k" value="${h.color}"></label></div>
<p class="err" id="f_err"></p><div class="row"><button data-a="cancel">Cancelar</button><button class="pri" data-a="saveh" data-v="${id || ""}">Salvar</button></div>`;
  $("#dlg").showModal();
}
function evolucao() {
  const t = TD(),
    ent = [],
    days = [];
  for (let i = rng - 1; i >= 0; i--) {
    const d = add(t, -i),
      r = calc(d);
    days.push(r);
    r.e.forEach((h) => ent.push({ h, s: SC[S.logs[d][h.id].s] }));
  }
  const tabs = `<div class="tabs">${[
    [7, "Semana"],
    [30, "Mês"],
    [90, "Trimestre"],
    [365, "Ano"],
  ]
    .map(
      (x) =>
        `<button class="${rng == x[0] ? "on" : ""}" data-a="rng" data-v="${x[0]}">${x[1]}</button>`,
    )
    .join("")}</div>`;
  if (!ent.length)
    return `<div class="hd"><h1>Minha evolução</h1>${tabs}</div><div class="card"><h2>Ainda sem dados suficientes</h2><p class="m">Faça seu primeiro check-in e finalize o dia. Os gráficos aparecem conforme seus registros reais.</p><button class="pri" data-a="edit" data-v="${t}">Ir para o check-in</button></div>`;
  const bs = rng <= 30 ? 1 : 7,
    B = [];
  for (let i = 0; i < days.length; i += bs) {
    const v = days
      .slice(i, i + bs)
      .filter((r) => r.pct != null)
      .map((r) => r.pct);
    B.push(v.length ? v.reduce((a, b) => a + b) / v.length : null);
  }
  const w6 = [0, 1, 2, 3, 4, 5].map((i) => avg(add(t, -7 * (5 - i)), 7)),
    by = (k) => {
      const m = {};
      ent.forEach((e) => {
        (m[k(e)] = m[k(e)] || []).push(e.s);
      });
      return Object.entries(m)
        .map(([n, v]) => [n, (v.reduce((a, b) => a + b) / v.length) * 100])
        .sort((a, b) => b[1] - a[1]);
    };
  const bar = (n, v) =>
      `<div style="margin:8px 0"><div class="row"><span>${esc(n)}</span><b>${pc(v)}</b></div><div class="pb"><i style="width:${v}%"></i></div></div>`,
    hb = by((e) => e.h.name),
    R = runs();
  return `<div class="hd"><h1>Minha evolução</h1>${tabs}</div><div class="card"><h2>Taxa de cumprimento</h2><div class="bars">${B.map((v) => `<div class="${v == null ? "n" : ""}" style="height:${v == null ? 2 : v}%" title="${pc(v)}"></div>`).join("")}</div></div>
<div class="grid"><div class="card"><h2>Últimas 6 semanas</h2><div class="bars" style="height:90px">${w6.map((v) => `<div class="${v == null ? "n" : ""}" style="height:${v == null ? 2 : v}%" title="${pc(v)}"></div>`).join("")}</div></div><div class="card"><h2>Dias com bom desempenho</h2><div class="big">${days.filter((r) => r.pct >= S.t[1]).length}</div><small>de ${days.filter((r) => r.pct != null).length} dias registrados</small></div></div>
<div class="grid" style="margin-top:12px"><div class="card"><h2>Por categoria</h2>${by(
    (e) => e.h.cat,
  )
    .map((x) => bar(...x))
    .join("")}</div><div class="card"><h2>Maior consistência</h2>${hb
    .slice(0, 3)
    .map((x) => bar(...x))
    .join("")}</div><div class="card"><h2>Precisam de atenção</h2>${
    hb
      .filter((x) => x[1] < S.t[2])
      .slice(-3)
      .map((x) => bar(...x))
      .join("") || '<p class="m">Nenhum hábito abaixo de ' + S.t[2] + "%.</p>"
  }</div></div>
<div class="card"><h2>Sequências de consistência</h2>${
    R.length
      ? R.sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(
            (x) =>
              `<div class="row"><span>${x[1]} dias</span><small>desde ${x[0].split("-").reverse().join("/")}</small></div>`,
          )
          .join("")
      : '<p class="m">Sequências de 2+ dias aparecem aqui.</p>'
  }</div>`;
}
function config() {
  return `<h1>Configurações</h1><div class="card"><label>Seu nome<input data-c="name" value="${esc(S.name)}"></label><h2 style="margin-top:18px">Faixas de cor (% mínimo)</h2><div class="row">${["Verde escuro", "Verde médio", "Verde claro", "Âmbar"].map((l, i) => `<label>${l}<input type="number" min="1" max="100" data-c="t${i}" value="${S.t[i]}"></label>`).join("")}</div><p class="m">Abaixo da última faixa, o dia fica vermelho. Dias sem registro nunca contam como zero.</p><p class="err" id="te"></p></div>
<div class="card"><h2>Conta</h2><p class="m">${esc(U.name)} · ${esc(U.email)}</p><button data-a="logout">Sair da conta</button> <button class="dng" data-a="delacc">Excluir conta</button></div>
<div class="card"><h2>Dados</h2><p class="m">Os dados desta conta ficam salvos neste navegador. Para acessar de outros aparelhos é preciso um banco na nuvem (Supabase).</p><button data-a="exp">Exportar JSON</button> <button class="dng" data-a="reset">Apagar dados</button></div>`;
}
const R = {
  visao: ["Visão geral", visao],
  calendario: ["Meu calendário", calendario],
  habitos: ["Hábitos e metas", habitos],
  checkin: ["Check-in diário", checkin],
  evolucao: ["Minha evolução", evolucao],
  config: ["Configurações", config],
};
const $ = (s) => document.querySelector(s);
const SUN =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6L6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/></svg>',
  MOON =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.2 8.2 0 1 0 10.2 10.2z"/></svg>',
  dk = () =>
    TH ? TH == "dark" : matchMedia("(prefers-color-scheme: dark)").matches,
  applyT = () => {
    if (TH) document.documentElement.dataset.theme = TH;
    else delete document.documentElement.dataset.theme;
  },
  tg = () =>
    `<div class="tgw"><button data-a="theme" aria-label="Alternar tema claro ou escuro">${dk() ? SUN : MOON}</button></div>`;
function go() {
  applyT();
  document.body.classList.toggle("auth", !U);
  if (!U) {
    $("#nav").innerHTML = "";
    $("#bn").innerHTML = "";
    $("#app").innerHTML = tg() + authView();
    return;
  }
  const k = R[location.hash.slice(1)] ? location.hash.slice(1) : "visao",
    l = Object.entries(R)
      .map(
        ([i, v]) => `<a href="#${i}" class="${i == k ? "on" : ""}">${v[0]}</a>`,
      )
      .join("");
  $("#nav").innerHTML =
    '<b class="lg">MetaView</b>' +
    l +
    `<div class="nu"><small>${esc(U.name)}</small><button data-a="logout">Sair</button></div>`;
  $("#bn").innerHTML = Object.entries(R)
    .map(
      ([i, v]) =>
        `<a href="#${i}" class="${i == k ? "on" : ""}">${v[0].split(" ")[0]}</a>`,
    )
    .join("");
  const y = window.scrollY;
  $("#app").innerHTML = tg() + R[k][1]();
  window.scrollTo(0, y);
  document
    .querySelectorAll(".sc")
    .forEach((e) => (e.scrollLeft = e.scrollWidth));
}
addEventListener("hashchange", () => {
  window.scrollTo(0, 0);
  go();
});
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-a]");
  if (!b) return;
  const a = b.dataset.a,
    v = b.dataset.v;
  if (a == "amode") {
    am = v;
    go();
  } else if (a == "auth") {
    doAuth();
  } else if (a == "logout") {
    signOut();
    am = "in";
    location.hash = "";
    go();
  } else if (a == "delacc") {
    if (
      confirm(
        "Excluir esta conta e todos os dados dela? Isso não pode ser desfeito.",
      )
    ) {
      const us = users();
      delete us[U.email];
      jset(UK, us);
      try {
        localStorage.removeItem(DK(U.id));
      } catch (x) {}
      signOut();
      am = "up";
      go();
    }
  } else if (a == "theme") {
    const H = document.documentElement;
    H.classList.add("theming");
    TH = dk() ? "light" : "dark";
    jset(TK, TH);
    applyT();
    b.innerHTML = dk() ? SUN : MOON;
    b.firstChild.classList.add("spin");
    clearTimeout(window._tt);
    window._tt = setTimeout(() => H.classList.remove("theming"), 600);
  } else if (a == "day") {
    sel = v;
    if (location.hash != "#calendario") location.hash = "calendario";
    else go();
  } else if (a == "mode") {
    cal.mode = v;
    cal.off = 0;
    go();
  } else if (a == "nav") {
    cal.off = Math.max(0, cal.off + +v);
    go();
  } else if (a == "rng") {
    rng = +v;
    go();
  } else if (a == "edit") {
    ci = v;
    if (location.hash != "#checkin") location.hash = "checkin";
    else go();
  } else if (a == "st") {
    const L = (S.logs[ci] = S.logs[ci] || {}),
      o = L[b.dataset.h] || {};
    o.s = o.s == v ? "" : v;
    L[b.dataset.h] = o;
    save();
    go();
  } else if (a == "fin") {
    const L = (S.logs[ci] = S.logs[ci] || {});
    sched(ci).forEach((h) => {
      if (!L[h.id] || !L[h.id].s) L[h.id] = { ...(L[h.id] || {}), s: "miss" };
    });
    S.closed[ci] = 1;
    save();
    const r = calc(ci);
    go();
    $("#sum").innerHTML =
      `<div class="card"><h2>Resumo do dia</h2><div class="big">${pc(r.pct)}</div><p>${r.c.done} concluída(s) · ${r.c.part} parcial(is) · ${r.c.miss} não concluída(s)</p><p class="m">${r.pct >= S.t[1] ? "Ótimo trabalho. Consistência é o que constrói resultado." : r.pct >= S.t[3] ? "Um bom passo. O que contou hoje já faz diferença." : "Dias difíceis acontecem e não definem sua jornada. Amanhã é uma nova chance."}</p></div>`;
  } else if (a == "new") form();
  else if (a == "edith") form(v);
  else if (a == "cancel") $("#dlg").close();
  else if (a == "saveh") {
    const n = $("#f_n").value.trim(),
      d = [...document.querySelectorAll(".f_w:checked")].map((x) => +x.value),
      s = $("#f_s").value,
      en = $("#f_e").value,
      er = !n
        ? "Informe o nome."
        : !d.length
          ? "Escolha ao menos um dia."
          : !s
            ? "Informe a data de início."
            : en && en < s
              ? "A data final deve ser após o início."
              : "";
    if (er) {
      $("#f_err").textContent = er;
      return;
    }
    const o = {
        name: n,
        desc: $("#f_d").value,
        cat: $("#f_c").value.trim() || "Geral",
        freq: $("#f_f").value,
        goal: $("#f_g").value || "—",
        days: d,
        w: +$("#f_p").value,
        start: s,
        end: en,
        color: $("#f_k").value,
      },
      h = S.habits.find((x) => x.id == v);
    if (h) Object.assign(h, o);
    else S.habits.push({ id: "h" + Date.now(), paused: 0, ...o });
    save();
    $("#dlg").close();
    go();
  } else if (a == "pause") {
    const h = S.habits.find((x) => x.id == v);
    h.paused = h.paused ? 0 : 1;
    save();
    go();
  } else if (a == "del") {
    if (
      confirm(
        "Excluir este hábito? Os registros antigos deixam de ser contados.",
      )
    ) {
      S.habits = S.habits.filter((x) => x.id != v);
      save();
      go();
    }
  } else if (a == "reset") {
    if (confirm("Apagar todos os hábitos e registros desta conta?")) {
      S = newData(U.name);
      save();
      go();
    }
  } else if (a == "exp") {
    const u = URL.createObjectURL(
        new Blob([JSON.stringify(S, null, 1)], { type: "application/json" }),
      ),
      l = document.createElement("a");
    l.href = u;
    l.download = "metaview.json";
    l.click();
  }
});
document.addEventListener("change", (e) => {
  const t = e.target,
    c = t.dataset.c;
  if (t.dataset.n) {
    const L = (S.logs[ci] = S.logs[ci] || {}),
      o = L[t.dataset.n] || { s: "" };
    o.n = t.value;
    L[t.dataset.n] = o;
    save();
  } else if (c == "f") {
    cal.f = t.value;
    go();
  } else if (c == "cid") {
    ci = t.value || TD();
    go();
  } else if (c == "name") {
    S.name = t.value.trim();
    save();
  } else if (c && c[0] == "t" && c.length == 2) {
    const v = [...document.querySelectorAll("[data-c^=t][type=number]")].map(
      (x) => +x.value,
    );
    if (v.every((x, i) => x > 0 && x <= 100 && (!i || x < v[i - 1]))) {
      S.t = v;
      save();
      $("#te").textContent = "";
    } else {
      $("#te").textContent = "Use valores decrescentes entre 1 e 100.";
    }
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key == "Enter" && e.target.closest && e.target.closest(".auth")) {
    e.preventDefault();
    doAuth();
  }
});
// Retoma a sessão salva (se houver) e desenha a tela
{
  const sid = jget(SK, null),
    u = Object.values(users()).find((x) => x.id == sid);
  if (u) signIn(u);
}
go();
if (U) welcome();
