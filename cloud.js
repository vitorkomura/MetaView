/* MetaView — modo nuvem com Supabase (login + sincronização dos dados).
   Só ativa quando o config.js define window.MV_CFG. Carrega depois do app.js. */
(() => {
  const C = window.MV_CFG;
  if (!C) return;
  const sb = window.supabase && supabase.createClient(C.url, C.key);
  const CL = (window.CL = { busy: true });
  const UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let snap = null,
    timer = 0,
    pushing = false,
    again = false,
    recovery = false;

  const E = (m) => {
    const e = document.getElementById("au_err");
    if (e) e.textContent = m;
  };
  const msg = (m) => {
    const t = document.createElement("div");
    t.className = "toast";
    t.setAttribute("role", "status");
    t.textContent = m;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 6000);
  };
  const MSG = {
    "Invalid login credentials": "E-mail ou senha incorretos.",
    "Email not confirmed": "Confirme seu e-mail antes de entrar.",
    "User already registered": "Já existe uma conta com este e-mail.",
  };
  const tr = (e) => {
    if (
      e.code == "42P01" ||
      e.code == "PGRST205" ||
      /schema cache|does not exist/i.test(e.message || "")
    )
      return "As tabelas ainda não existem no Supabase. Rode o supabase/schema.sql no SQL Editor.";
    return MSG[e.message] || "Erro: " + (e.message || "tente novamente.");
  };

  /* ---------- Conversão entre o estado do app e as linhas do banco ---------- */
  const rows = (D, uid_) => {
    const hs = new Map(
      D.habits.map((h) => [
        h.id,
        {
          id: h.id,
          user_id: uid_,
          name: h.name,
          description: h.desc || null,
          category: h.cat || "Geral",
          goal: h.goal || null,
          days: h.days,
          weight: h.w || 1,
          start_date: h.start,
          end_date: h.end || null,
          paused: !!h.paused,
          color: h.color || "#1f8a4c",
        },
      ]),
    );
    const lg = new Map();
    for (const [d, m] of Object.entries(D.logs || {}))
      for (const [hid, l] of Object.entries(m))
        if (hs.has(hid) && ["done", "part", "miss", "na"].includes(l.s))
          lg.set(d + "|" + hid, {
            user_id: uid_,
            habit_id: hid,
            log_date: d,
            status: l.s,
            note: l.n || null,
          });
    const ev = new Map(
      (D.ev || []).map((e) => [
        e.id,
        {
          id: e.id,
          user_id: uid_,
          title: e.t,
          event_date: e.d,
          event_time: e.h,
          color: e.c,
        },
      ]),
    );
    return { hs, lg, ev };
  };
  const profRow = (D, id) => ({
    id,
    name: D.name || "",
    settings: { t: D.t, closed: D.closed || {}, fr: D.fr || [], init: true },
  });
  const uuidify = (D) => {
    const map = {};
    D.habits.forEach((h) => {
      if (!UUID.test(h.id)) {
        map[h.id] = uid();
        h.id = map[h.id];
      }
    });
    for (const m of Object.values(D.logs || {}))
      for (const k of Object.keys(m))
        if (map[k]) {
          m[map[k]] = m[k];
          delete m[k];
        }
    (D.ev || []).forEach((e) => {
      if (!UUID.test(e.id)) e.id = uid();
    });
    return D;
  };

  /* ---------- Envio das mudanças (só o que mudou desde o último envio) ---------- */
  const queue = (CL.queue = () => {
    clearTimeout(timer);
    timer = setTimeout(push, 1000);
  });
  async function push() {
    if (!U || !S || !snap) return;
    if (pushing) {
      again = true;
      return;
    }
    pushing = true;
    const n = rows(S, U.id),
      o = snap,
      pf = profRow(S, U.id);
    const ch = (a, b) =>
      [...a]
        .filter(
          ([k, v]) =>
            !b.has(k) || JSON.stringify(b.get(k)) != JSON.stringify(v),
        )
        .map(([, v]) => v);
    const gone = (a, b) => [...a.keys()].filter((k) => !b.has(k));
    const ok = (r) => {
      if (r.error) throw r.error;
    };
    try {
      ok(await sb.from("profiles").upsert(pf));
      const hUp = ch(n.hs, o.hs);
      if (hUp.length) ok(await sb.from("habits").upsert(hUp));
      const hDel = gone(o.hs, n.hs);
      for (const k of gone(o.lg, n.lg)) {
        const [d, h] = k.split("|");
        if (!hDel.includes(h))
          ok(
            await sb
              .from("daily_logs")
              .delete()
              .eq("habit_id", h)
              .eq("log_date", d),
          );
      }
      const lUp = ch(n.lg, o.lg);
      if (lUp.length) ok(await sb.from("daily_logs").upsert(lUp));
      if (hDel.length) ok(await sb.from("habits").delete().in("id", hDel));
      const eUp = ch(n.ev, o.ev);
      if (eUp.length) ok(await sb.from("events").upsert(eUp));
      const eDel = gone(o.ev, n.ev);
      if (eDel.length) ok(await sb.from("events").delete().in("id", eDel));
      snap = n;
    } catch (e) {
      msg("Não foi possível sincronizar agora. Tentaremos de novo.");
      setTimeout(queue, 15000);
    } finally {
      pushing = false;
      if (again) {
        again = false;
        queue();
      }
    }
  }
  addEventListener("online", queue);

  /* ---------- Carregar os dados da conta ---------- */
  async function all(t) {
    let out = [],
      f = 0;
    for (;;) {
      const r = await sb
        .from(t)
        .select("*")
        .range(f, f + 999);
      if (r.error) throw r.error;
      out = out.concat(r.data);
      if (r.data.length < 1000) return out;
      f += 1000;
    }
  }
  async function load(user, nm) {
    const pr = await sb.from("profiles").select("*").eq("id", user.id);
    if (pr.error) throw pr.error;
    const [hs, lg, ev] = [
      await all("habits"),
      await all("daily_logs"),
      await all("events"),
    ];
    const p0 = (pr.data && pr.data[0]) || {},
      st = p0.settings || {};
    const name =
      p0.name || nm || (user.user_metadata && user.user_metadata.name) || "";
    let D;
    if (st.init) {
      D = {
        name,
        habits: hs.map((h) => ({
          id: h.id,
          name: h.name,
          desc: h.description || "",
          cat: h.category,
          freq: "custom",
          goal: h.goal || "—",
          days: h.days,
          w: h.weight,
          start: h.start_date,
          end: h.end_date || "",
          paused: h.paused ? 1 : 0,
          color: h.color,
        })),
        logs: {},
        closed: st.closed || {},
        t: st.t || [90, 70, 50, 30],
        seeded: 1,
        ev: ev.map((e) => ({
          id: e.id,
          t: e.title,
          d: e.event_date,
          h: e.event_time.slice(0, 5),
          c: e.color,
        })),
        fr: st.fr || [],
      };
      lg.forEach((l) => {
        (D.logs[l.log_date] = D.logs[l.log_date] || {})[l.habit_id] = {
          s: l.status,
          n: l.note || "",
        };
      });
      snap = rows(D, user.id);
    } else {
      const old = jget("evolua1", null);
      D =
        jget(DK(user.id), null) ||
        (old &&
        old.habits &&
        confirm("Importar para sua conta os dados antigos deste navegador?")
          ? old
          : null) ||
        newData(name);
      D.name = D.name || name;
      uuidify(D);
      snap = { hs: new Map(), lg: new Map(), ev: new Map() }; // nada enviado ainda: o primeiro envio sobe tudo
    }
    U = { id: user.id, name: name || user.email, email: user.email };
    S = D;
    save();
  }
  async function start(user, nm) {
    CL.busy = true;
    go();
    try {
      await load(user, nm);
    } catch (e) {
      CL.busy = false;
      U = S = null;
      snap = null;
      try {
        await sb.auth.signOut();
      } catch (x) {}
      go();
      E(tr(e));
      return;
    }
    CL.busy = false;
    if (location.hash != "#visao") location.hash = "visao";
    else go();
    welcome();
  }

  /* ---------- Telas e ações de conta ---------- */
  const _av = authView;
  const recView = () =>
    `<div class="auth"><div class="alg">MetaView</div><p class="m">Defina sua nova senha.</p><div class="card"><label>Nova senha<input id="au_p" type="password" autocomplete="new-password"></label><p class="err" id="au_err" role="alert"></p><button class="pri" data-x="newpw">Salvar senha</button></div></div>`;
  authView = () =>
    CL.busy
      ? '<div class="auth"><div class="alg">MetaView</div><p class="m">Carregando…</p></div>'
      : am == "rec"
        ? recView()
        : _av();

  async function auth() {
    if (am == "rec") return newpw();
    if (!sb)
      return E("Não foi possível carregar o Supabase. Verifique a internet.");
    const up = am == "up",
      em = $("#au_e").value.trim().toLowerCase(),
      pw = $("#au_p").value;
    if (!/^\S+@\S+\.\S+$/.test(em)) return E("Informe um e-mail válido.");
    if (pw.length < 6) return E("A senha precisa ter ao menos 6 caracteres.");
    if (up) {
      const nm = $("#au_n").value.trim();
      if (!nm) return E("Informe seu nome.");
      if (pw != $("#au_c").value) return E("As senhas não conferem.");
      const r = await sb.auth.signUp({
        email: em,
        password: pw,
        options: {
          data: { name: nm },
          emailRedirectTo: location.origin + location.pathname,
        },
      });
      if (r.error) return E(tr(r.error));
      if (!r.data.session) {
        am = "in";
        go();
        return E("Enviamos um e-mail de confirmação. Confirme e depois entre.");
      }
      return start(r.data.session.user, nm);
    }
    const r = await sb.auth.signInWithPassword({ email: em, password: pw });
    if (r.error) return E(tr(r.error));
    start(r.data.user);
  }
  async function newpw() {
    const pw = $("#au_p").value;
    if (pw.length < 6) return E("A senha precisa ter ao menos 6 caracteres.");
    const r = await sb.auth.updateUser({ password: pw });
    if (r.error) return E(tr(r.error));
    recovery = false;
    am = "in";
    start(r.data.user);
  }
  doAuth = auth;

  const _so = signOut;
  signOut = () => {
    clearTimeout(timer);
    const f = push();
    _so();
    snap = null;
    f.finally(() => sb && sb.auth.signOut());
  };

  document.addEventListener(
    "click",
    async (e) => {
      const b = e.target.closest(
        "[data-x=forgot],[data-x=newpw],[data-a=delacc]",
      );
      if (!b) return;
      if (b.dataset.a == "delacc") {
        e.stopImmediatePropagation();
        if (
          !confirm(
            "Apagar todos os seus hábitos, registros e agenda da nuvem e sair? O login continua existindo.",
          )
        )
          return;
        clearTimeout(timer);
        const id = U.id,
          f = (t) => sb.from(t).delete().gte("created_at", "1970-01-01");
        await f("habits");
        await f("events");
        await sb.from("profiles").delete().eq("id", id);
        localStorage.removeItem(DK(id));
        snap = null;
        _so();
        await sb.auth.signOut();
        am = "in";
        go();
      } else if (b.dataset.x == "forgot") {
        const em = $("#au_e").value.trim().toLowerCase();
        if (!/^\S+@\S+\.\S+$/.test(em))
          return E("Digite seu e-mail acima para receber o link.");
        const r = await sb.auth.resetPasswordForEmail(em, {
          redirectTo: location.origin + location.pathname,
        });
        E(
          r.error
            ? tr(r.error)
            : "Se o e-mail estiver cadastrado, enviamos um link para redefinir a senha.",
        );
      } else newpw();
    },
    true,
  );

  /* ---------- Início ---------- */
  if (sb)
    sb.auth.onAuthStateChange((ev) => {
      if (ev == "PASSWORD_RECOVERY") {
        recovery = true;
        U = S = null;
        CL.busy = false;
        am = "rec";
        go();
      }
    });
  (async () => {
    if (sb) {
      const { data } = await sb.auth.getSession();
      if (data.session && !recovery) return start(data.session.user);
    }
    CL.busy = false;
    go();
  })();
  go();
})();
