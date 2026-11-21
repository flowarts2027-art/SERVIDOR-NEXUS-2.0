const $ = (id) => document.getElementById(id);
const api = "/api/portal/banner/";
const titles = {
  movies: ["Première", "Cartaz de festival", "Sessão da noite"],
  football: ["Arquibancada", "Placar central", "Noite de clássico"],
  sports: ["Octógono", "Arena elétrica", "Combate principal"],
};
titles.series = titles.movies;
const cinema = (k) => k === "movies" || k === "series";
let customCover = null,
  coverVersion = 0;
const palettes = [
  ["#150c2e", "#ff9679"],
  ["#082a36", "#61edce"],
  ["#300e22", "#ffc443"],
];
const buttons = [...document.querySelectorAll("[data-for]")];
let records = [],
  logo = null,
  revision = 0,
  requestId = 0;
const message = (text) => {
  $("msg").textContent = text;
};
function picture(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => resolve(im);
    im.onerror = () => reject(Error("Não foi possível carregar a imagem."));
    im.src = src;
  });
}
async function read(path) {
  const r = await fetch(api + path);
  if (r.status === 401) {
    $("login").hidden = false;
    $("studio").hidden = true;
    throw Error("Entre para continuar.");
  }
  const data = await r.json();
  if (!r.ok) throw Error(data.error || "Falha ao consultar os dados.");
  return data;
}
function fit(ctx, text, y, size, maxLines, width = 924, x = 78) {
  ctx.font = "bold " + size + "px system-ui";
  const words = String(text || "").split(/\s+/);
  let line = "",
    count = 1;
  for (const word of words) {
    const next = (line + " " + word).trim();
    if (ctx.measureText(next).width <= width) {
      line = next;
      continue;
    }
    if (count === maxLines) {
      line = line || word;
      while (line.length && ctx.measureText(line + "…").width > width)
        line = line.slice(0, -1);
      line += "…";
      break;
    }
    if (line) {
      ctx.fillText(line, x, y, width);
      y += size * 1.22;
      count++;
    }
    line = word;
  }
  ctx.fillText(line, x, y, width);
  return y + size * 1.22;
}
function contain(ctx, img, x, y, w, h) {
  const scale = Math.min(w / img.width, h / img.height);
  ctx.drawImage(
    img,
    x + (w - img.width * scale) / 2,
    y + (h - img.height * scale) / 2,
    img.width * scale,
    img.height * scale,
  );
}
function paint(canvas, item, poster, colors) {
  const c = canvas.getContext("2d"),
    h = canvas.height,
    k = $("kind").value,
    variant = Number($("styleChoice").value);
  const [dark, accent] = palettes[variant];
  c.fillStyle = dark;
  c.fillRect(0, 0, 1080, h);
  const artH = h * [0.43, 0.47, 0.4][variant];
  c.save();
  c.beginPath();
  c.rect(0, 0, 1080, artH);
  c.clip();
  if (cinema(k) && !poster) {
    genreArt(c, artH, item.genres, variant);
  } else if (poster) {
    const ratio = Math.max(1080 / poster.width, artH / poster.height);
    c.globalAlpha = 0.35;
    c.drawImage(
      poster,
      0,
      (artH - poster.height * ratio) * 0.3,
      poster.width * ratio,
      poster.height * ratio,
    );
    c.globalAlpha = 1;
    contain(
      c,
      poster,
      variant === 0 ? 0 : variant === 1 ? 230 : 460,
      28,
      620,
      artH - 56,
    );
  } else {
    const g = c.createLinearGradient(0, 0, 1080, artH);
    g.addColorStop(0, colors[0] || dark);
    g.addColorStop(1, colors[1] || accent);
    c.fillStyle = g;
    c.fillRect(0, 0, 1080, artH);
    c.strokeStyle = "#ffffff80";
    c.lineWidth = 8;
    c.translate(variant === 1 ? 540 : variant === 0 ? 300 : 760, artH / 2);
    if (k === "football") {
      c.strokeRect(-475, -220, 950, 440);
      c.strokeRect(-475, -108, 144, 216);
      c.strokeRect(331, -108, 144, 216);
      c.beginPath();
      c.moveTo(0, -220);
      c.lineTo(0, 220);
      c.stroke();
      c.beginPath();
      c.arc(0, 0, 86, 0, 2 * Math.PI);
      c.stroke();
    } else
      for (const radius of [210, 246, 282]) {
        c.beginPath();
        for (let n = 0; n < 8; n++) {
          const a = ((n + 0.5) * Math.PI) / 4;
          c.lineTo(radius * Math.cos(a), radius * Math.sin(a));
        }
        c.closePath();
        c.stroke();
      }
  }
  c.restore();
  c.fillStyle = accent;
  c.fillRect(0, artH, 1080, 12);
  let y = artH + 78;
  if (variant === 1) {
    c.fillStyle = accent;
    c.fillRect(46, artH + 34, 9, h - artH - 205);
  }
  if (variant === 2) {
    c.fillStyle = accent;
    c.beginPath();
    c.moveTo(0, artH);
    c.lineTo(1080, artH - 90);
    c.lineTo(1080, artH + 12);
    c.fill();
  }
  c.fillStyle = accent;
  c.font = "bold 34px system-ui";
  c.fillText(
    {
      movies: "INDICAÇÃO DE CINEMA",
      series: "INDICAÇÃO DE SÉRIE",
      football: "FUTEBOL DO DIA",
      sports: "AGENDA ESPORTIVA",
    }[k],
    78,
    y,
  );
  c.fillStyle = "white";
  y = fit(c, item.title, y + 87, 70, 2);
  c.fillStyle = accent;
  y = fit(
    c,
    [item.meta, item.date].filter(Boolean).join("  •  "),
    y + 4,
    36,
    2,
  );
  if (item.director) y = fit(c, "Direção: " + item.director, y, 32, 1);
  c.fillStyle = "white";
  fit(
    c,
    item.body,
    y + 12,
    cinema(k) ? 38 : 52,
    Math.max(1, Math.floor((h - 164 - y) / (cinema(k) ? 47 : 64))),
  );
  c.fillStyle = "#091220";
  c.fillRect(0, h - 142, 1080, 142);
  c.fillStyle = "white";
  c.font = "bold 30px system-ui";
  c.fillText(item.credit || "Agenda • TheSportsDB", 78, h - 61);
  if (item.license) {
    c.font = "24px system-ui";
    c.fillText(item.license, 78, h - 25, 620);
  }
  if (logo) contain(c, logo, 730, h - 125, 276, 108);
}
async function render() {
  const now = ++revision;
  buttons.forEach((b) => (b.disabled = true));
  for (const id of ["feed", "story"]) {
    const c = $(id);
    c.getContext("2d").clearRect(0, 0, c.width, c.height);
  }
  const item = records[$("items").selectedIndex];
  if (!item) return;
  try {
    const poster = cinema($("kind").value) ? customCover : null;
    const colors =
      $("kind").value === "football"
        ? await read(
            "colors?ids=" + encodeURIComponent(item.teams.join(",")),
          ).catch(() => [])
        : [];
    if (now !== revision) return;
    for (const id of ["feed", "story"])
      paint(
        $(id),
        item,
        poster,
        colors.map((v) => (/^#[a-f\d]{6}$/i.test(v) ? v : null)),
      );
    buttons.forEach((b) => (b.disabled = false));
  } catch (e) {
    if (now === revision) message(e.message);
  }
}
async function populate() {
  clearCover();
  const seq = ++requestId,
    k = $("kind").value;
  records = [];
  $("items").replaceChildren();
  render();
  if (cinema(k) && $("query").value.trim().length < 2) {
    message("Busque um filme ou uma série pelo nome.");
    return;
  }
  message("Consultando o catálogo…");
  try {
    const rows = await read(
      k +
        (cinema(k) ? "?q=" + encodeURIComponent($("query").value.trim()) : ""),
    );
    if (seq !== requestId) return;
    records = rows;
    $("items").replaceChildren(
      ...rows.map(
        (r, i) =>
          new Option(
            [r.title, r.meta, cinema(k) ? "" : r.body]
              .filter(Boolean)
              .join(" · "),
            i,
          ),
      ),
    );
    message(
      rows.length
        ? ""
        : cinema(k)
          ? "Nenhum título encontrado."
          : "A fonte não retornou eventos para hoje em Brasília.",
    );
    await render();
  } catch (e) {
    if (seq === requestId) message(e.message);
  }
}
function changeKind() {
  const k = $("kind").value;
  $("covers").hidden = !cinema(k);
  $("search").hidden = !cinema(k);
  $("refresh").hidden = cinema(k);
  $("styleChoice").replaceChildren(
    ...titles[k].map((t, i) => new Option(t, i)),
  );
  populate();
}
async function start() {
  const r = await fetch(api + "logo");
  if (r.status === 401) {
    $("login").hidden = false;
    return;
  }
  if (r.status === 403) {
    $("login").hidden = false;
    message("Banner do Dia não está ativo para esta conta.");
    return;
  }
  if (!r.ok)
    throw Error("Não foi possível abrir a conta. Recarregue a página.");
  if (r.status === 200) {
    const url = URL.createObjectURL(await r.blob());
    try {
      logo = await picture(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  $("login").hidden = true;
  $("studio").hidden = false;
  changeKind();
}
$("login").onsubmit = async (e) => {
  e.preventDefault();
  try {
    const r = await fetch("/api/portal/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: $("user").value,
        password: $("pass").value,
      }),
    });
    if (!r.ok)
      throw Error("Não foi possível entrar. Confira o usuário e a senha.");
    $("pass").value = "";
    await start();
  } catch (e) {
    message(e.message);
  }
};
$("upload").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const input = e.target;
  input.disabled = true;
  const url = URL.createObjectURL(file);
  try {
    if (
      file.size > 10000000 ||
      !["image/png", "image/jpeg", "image/webp"].includes(file.type)
    )
      throw Error("Escolha uma imagem PNG, JPEG ou WebP de até 10 MB.");
    const im = await picture(url),
      c = document.createElement("canvas"),
      scale = Math.min(1, 640 / Math.max(im.width, im.height));
    c.width = Math.max(1, Math.round(im.width * scale));
    c.height = Math.max(1, Math.round(im.height * scale));
    c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
    const blob = await new Promise((ok) => c.toBlob(ok));
    const r = await fetch(api + "logo", { method: "PUT", body: blob });
    if (!r.ok) throw Error("Não foi possível salvar a logo.");
    logo = c;
    message("Logo salva na sua conta.");
    await render();
  } catch (e) {
    message(e.message);
  } finally {
    URL.revokeObjectURL(url);
    input.disabled = false;
    input.value = "";
  }
};
$("kind").onchange = changeKind;
$("search").onsubmit = (e) => {
  e.preventDefault();
  populate();
};
$("refresh").onclick = populate;
$("items").onchange = () => {
  clearCover();
  render();
};
$("styleChoice").onchange = render;
for (const button of buttons) {
  button.onclick = () => {
    const link = document.createElement("a");
    link.href = $(button.dataset.for).toDataURL("image/png");
    link.download = "banner-do-dia-" + button.dataset.for + ".png";
    document.body.append(link);
    link.click();
    link.remove();
  };
}
start().catch((e) => message(e.message));
function clearCover() {
  coverVersion++;
  customCover = null;
  $("cover").value = "";
  $("removeCover").hidden = true;
}
$("removeCover").onclick = () => {
  clearCover();
  render();
};
$("cover").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const version = ++coverVersion;
  const url = URL.createObjectURL(file);
  try {
    if (
      file.size > 10000000 ||
      !["image/png", "image/jpeg", "image/webp"].includes(file.type)
    )
      throw Error("Escolha uma capa PNG, JPEG ou WebP de até 10 MB.");
    const img = await picture(url);
    if (version !== coverVersion) return;
    customCover = img;
    $("removeCover").hidden = false;
    await render();
  } catch (e) {
    message(e.message);
  } finally {
    URL.revokeObjectURL(url);
  }
};
function genreArt(c, h, genres, variant) {
  const genre = (genres || [])
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const themes = [
    [/terror|horror/, "#220923", "#ed435b", "forest"],
    [/animac|animat/, "#4932a2", "#ffcf49", "dots"],
    [/ficcao|science/, "#10154a", "#4aeafa", "orbit"],
    [/romance|romantic/, "#73234b", "#ffafae", "heart"],
    [/comedia|comedy/, "#ee672c", "#ffe463", "dots"],
    [/acao|action/, "#252e56", "#fb653e", "slash"],
  ];
  const [, base, light, motif] = themes.find(([re]) => re.test(genre)) || [
    null,
    "#17223c",
    "#b39aff",
    "orbit",
  ];
  const g = c.createLinearGradient(0, h, 1080, 0);
  g.addColorStop(0, base);
  g.addColorStop(1, light);
  c.fillStyle = g;
  c.fillRect(0, 0, 1080, h);
  c.translate([265, 540, 770][variant], h * 0.52);
  c.rotate((variant - 1) * 0.22);
  c.fillStyle = base;
  c.strokeStyle = light;
  c.lineWidth = 9;
  if (motif === "heart") {
    c.beginPath();
    c.moveTo(0, 185);
    c.bezierCurveTo(-410, -60, -125, -270, 0, -100);
    c.bezierCurveTo(150, -280, 375, -55, 0, 185);
    c.fill();
  } else
    for (let i = 0; i < 12; i++) {
      c.beginPath();
      if (motif === "orbit") {
        c.ellipse(0, 0, 120 + i * 26, 50 + i * 11, -0.45, 0, Math.PI * 2);
        c.stroke();
      }
      if (motif === "dots") {
        c.arc(
          (i % 4) * 150 - 200,
          Math.floor(i / 4) * 155 - 165,
          20 + i * 4,
          0,
          Math.PI * 2,
        );
        c.fill();
      }
      if (motif === "slash") {
        c.moveTo(-600 + i * 150, 400);
        c.lineTo(-280 + i * 150, -400);
        c.lineWidth = 32;
        c.stroke();
      }
      if (motif === "forest") {
        const x = i * 115 - 550,
          y = (i % 3) * 50 - 200;
        c.moveTo(x, y);
        c.lineTo(x - 100, 440);
        c.lineTo(x + 110, 440);
        c.fill();
      }
    }
}
