/* MetaView — Assistente: chat com IA que usa o desempenho da semana.
   Fala com /api/chat (função na Vercel que guarda a chave do Gemini). Carrega depois do extras.js. */
(() => {
  const chat = []; // { role: "user" | "assistant", text, err?, pending? }
  let busy = false;
  const URL_ = () => (window.MV_CFG && MV_CFG.chatUrl) || "/api/chat";
  const first = () =>
    ((S && S.name) || (U && U.name) || "").trim().split(/\s+/)[0];

  function summary() {
    const t = TD(),
      dias = [],
      hab = {},
      cat = {};
    for (let i = 6; i >= 0; i--) {
      const d = add(t, -i),
        r = calc(d);
      dias.push({
        data: d,
        dia: new Date(d + "T12:00").toLocaleDateString("pt-BR", {
          weekday: "short",
        }),
        desempenho: r.pct == null ? null : Math.round(r.pct),
        situacao:
          r.pct != null
            ? "registrado"
            : r.k == "rest"
              ? "descanso planejado"
              : "sem registro",
        concluidas: r.c.done,
        parciais: r.c.part,
        nao_concluidas: r.c.miss,
      });
      r.e.forEach((h) => {
        const v = SC[S.logs[d][h.id].s];
        (hab[h.name] = hab[h.name] || []).push(v);
        (cat[h.cat] = cat[h.cat] || []).push(v);
      });
    }
    const taxa = (v) =>
      Math.round((v.reduce((a, x) => a + x, 0) / v.length) * 100);
    const a7 = avg(t, 7),
      b7 = avg(add(t, -7), 7);
    return {
      hoje: t,
      media_7_dias: a7 == null ? null : Math.round(a7),
      media_semana_anterior: b7 == null ? null : Math.round(b7),
      sequencia_dias_positivos: streak(),
      faixas_de_cor_percentual: S.t,
      dias,
      habitos_7_dias: Object.entries(hab).map(([habito, v]) => ({
        habito,
        taxa: taxa(v),
        registros: v.length,
      })),
      categorias_7_dias: Object.entries(cat).map(([categoria, v]) => ({
        categoria,
        taxa: taxa(v),
      })),
      programados_hoje: sched(t).map((h) => h.name),
      compromissos_hoje: (S.ev || []).filter((e) => e.d == t).length,
    };
  }

  const fmtMsg = (s) =>
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>");
  const ICON =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M9 11h6M9 14h4"/></svg>';
  const avail = () => !!(window.CL && CL.token && U);
  let fab,
    panel,
    who = null;
  function build() {
    if (fab) return;
    fab = document.createElement("button");
    fab.id = "aib";
    fab.setAttribute("aria-label", "Abrir assistente");
    fab.setAttribute("aria-expanded", "false");
    fab.innerHTML = ICON;
    panel = document.createElement("div");
    panel.id = "ai";
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Assistente");
    panel.innerHTML = `<div class="ah"><b>Assistente</b><button data-x="ax" aria-label="Fechar">×</button></div><div id="msgs" aria-live="polite"></div>
<div class="chips">${["Como foi minha semana?", "O que devo melhorar?", "Monte meu plano para amanhã"].map((q) => `<button data-x="aq" data-v="${q}">${q}</button>`).join("")}</div>
<div class="ar"><input id="as_i" placeholder="Escreva sua mensagem" maxlength="800" aria-label="Mensagem"><button class="pri" data-x="as">Enviar</button></div>
<small class="m">Enviamos ao Gemini só um resumo da semana (percentuais e nomes dos hábitos), sem as suas observações.</small>`;
    document.body.append(fab, panel);
    fab.addEventListener("click", () => (panel.hidden ? open() : close()));
  }
  function msgs() {
    const m = $("#msgs");
    if (!m) return;
    m.innerHTML = chat.length
      ? chat
          .map(
            (x) =>
              `<div class="b ${x.role}${x.pending ? " pending" : ""}">${fmtMsg(x.text)}</div>`,
          )
          .join("")
      : '<p class="m">Converse sobre a sua semana e receba passos pequenos para as próximas metas.</p>';
    m.scrollTop = m.scrollHeight;
  }
  function open() {
    panel.hidden = false;
    fab.setAttribute("aria-expanded", "true");
    msgs();
    $("#as_i").focus();
  }
  function close() {
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    fab.setAttribute("aria-expanded", "false");
  }
  function sync() {
    build();
    const id = U ? U.id : null;
    if (who !== id) {
      who = id;
      chat.length = 0;
      msgs();
    }
    const on = avail();
    fab.hidden = !on;
    if (!on) close();
  }

  async function send(text) {
    text = (text || "").trim();
    if (!text || busy || !window.CL || !CL.token) return;
    chat.push({ role: "user", text });
    const inp = $("#as_i");
    if (inp) inp.value = ""; // limpa o campo depois de enviar
    chat.push({ role: "assistant", text: "Pensando…", pending: true });
    busy = true;
    msgs();
    let m = null,
      out = null;
    try {
      const token = await CL.token();
      let hist = chat
        .filter((x) => !x.pending && !x.err)
        .slice(-10)
        .map(({ role, text }) => ({ role, text }));
      while (hist.length && hist[0].role != "user") hist.shift();
      const r = await fetch(URL_(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          messages: hist,
          summary: summary(),
          nome: first(),
        }),
      });
      const ct =
        (r.headers && r.headers.get && r.headers.get("content-type")) || "";
      if (
        r.ok &&
        !ct.includes("application/json") &&
        r.body &&
        r.body.getReader
      ) {
        // resposta em partes: o texto aparece enquanto o Gemini escreve
        const rd = r.body.getReader(),
          dec = new TextDecoder();
        let acc = "";
        for (;;) {
          const { done, value } = await rd.read();
          if (done) break;
          acc += dec.decode(value, { stream: true });
          if (!m) {
            chat.pop();
            m = { role: "assistant", text: acc };
            chat.push(m);
          } else m.text = acc;
          msgs();
        }
        if (!m)
          out = {
            role: "assistant",
            text: "Não consegui gerar uma resposta. Tente reformular.",
            err: 1,
          };
      } else {
        const j = await r.json().catch(() => ({}));
        out =
          r.ok && j.reply
            ? { role: "assistant", text: j.reply }
            : {
                role: "assistant",
                text:
                  (j.error || "Não consegui responder agora.") +
                  (j.detail ? "\n(" + j.detail + ")" : ""),
                err: 1,
              };
      }
    } catch (e) {
      if (m) m.text += "\n\n(A resposta foi interrompida. Tente novamente.)";
      else
        out = {
          role: "assistant",
          text: "Sem conexão com o assistente. Tente novamente.",
          err: 1,
        };
    }
    if (out) {
      chat.pop();
      chat.push(out);
    }
    busy = false;
    msgs();
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("#ai [data-x]");
    if (!b) return;
    const x = b.dataset.x;
    if (x == "aq") send(b.dataset.v);
    else if (x == "as") {
      const i = $("#as_i");
      send(i && i.value);
    } else if (x == "ax") {
      close();
      fab.focus();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key == "Escape" && panel && !panel.hidden) {
      close();
      fab.focus();
    }
    if (e.key == "Enter" && e.target.id == "as_i") {
      e.preventDefault();
      send(e.target.value);
    }
  });
  // Some enquanto a pessoa digita em outro campo (teclado aberto), para não atrapalhar
  document.addEventListener("focusin", (e) => {
    if (
      fab &&
      e.target.matches("input,textarea,select") &&
      !e.target.closest("#ai")
    )
      fab.classList.add("away");
  });
  document.addEventListener(
    "focusout",
    () => fab && fab.classList.remove("away"),
  );
  const _g = go;
  go = function () {
    _g();
    sync();
  };
  sync();
  go();
})();
