"""Explicit local YouTube helper for NEXUS: user authorizes, helper downloads, validates and uploads the MP4 to the bound NEXUS job."""
import argparse
import html
import http.client
import json
import pathlib
import re
import secrets
import subprocess
import sys
import threading
import time
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit

MAX_BYTES = 90 * 1024 * 1024
ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
JOB_RE = re.compile(r"^video_[A-Za-z0-9_-]{8,64}$")
CLIENT_RE = re.compile(r"^[A-Za-z0-9_-]{1,120}$")
TICKET_RE = re.compile(r"^[A-Za-z0-9_-]{32,256}$")
ALLOWED_NEXUS_HOSTS = {"servidor-nexus.diamantehinode2015.workers.dev"}
ALLOWED_PORTAL_ORIGINS = {"https://servidor-nexus.diamantehinode2015.workers.dev"}

def youtube_url(value):
    value = str(value).strip()
    if ID_RE.fullmatch(value):
        video_id = value
    else:
        url = urlsplit(value)
        if url.scheme != "https" or url.username or url.password or url.port:
            raise ValueError("Use um link HTTPS público do YouTube.")
        host = (url.hostname or "").lower()
        query = parse_qs(url.query)
        if host == "youtu.be":
            video_id = url.path.strip("/")
        elif host in {"youtube.com", "www.youtube.com", "m.youtube.com"}:
            if url.path == "/watch":
                video_id = query.get("v", [""])[0]
            elif url.path.startswith(("/shorts/", "/embed/", "/live/")):
                video_id = url.path.split("/")[2]
            else:
                raise ValueError("Link de vídeo YouTube inválido.")
        else:
            raise ValueError("Somente vídeos públicos do YouTube.")
    if not ID_RE.fullmatch(video_id):
        raise ValueError("Identificador de vídeo inválido.")
    return "https://www.youtube.com/watch?v=" + video_id

def normalize_local_upload(value):
    if not isinstance(value, dict):
        raise ValueError("handoff_invalid")
    source_url = youtube_url(value.get("sourceUrl", ""))
    job_id = str(value.get("jobId", "")).strip()
    client_id = str(value.get("clientId", "")).strip()
    ticket = str(value.get("uploadTicket", "")).strip()
    callback_base = str(value.get("callbackBase", "")).strip().rstrip("/")
    parsed = urlsplit(callback_base)
    if (
        parsed.scheme != "https"
        or parsed.username
        or parsed.password
        or parsed.port
        or parsed.query
        or parsed.fragment
        or parsed.path not in ("", "/")
        or (parsed.hostname or "").lower() not in ALLOWED_NEXUS_HOSTS
    ):
        raise ValueError("handoff_callback_invalid")
    if not JOB_RE.fullmatch(job_id) or not CLIENT_RE.fullmatch(client_id) or not TICKET_RE.fullmatch(ticket):
        raise ValueError("handoff_token_invalid")
    return {
        "sourceUrl": source_url,
        "jobId": job_id,
        "clientId": client_id,
        "uploadTicket": ticket,
        "callbackBase": callback_base,
    }

def _language(value):
    return str(value or "").lower().replace("_", "-").split("-")[0]

def _declared_portuguese(info):
    title = str(info.get("title") or "").lower()
    return _language(info.get("language")) == "pt" or "dublado" in title or "dublagem" in title

def select_format(info):
    formats = info.get("formats", [])
    audio_tracks = [f for f in formats if f.get("acodec") not in (None, "none") and f.get("vcodec") == "none"]
    audio = [f for f in audio_tracks if _language(f.get("language")) == "pt"]
    if not audio:
        untagged_only = bool(audio_tracks) and not any(_language(f.get("language")) for f in audio_tracks)
        if untagged_only and _declared_portuguese(info):
            audio = audio_tracks
        else:
            raise ValueError("audio_pt_unconfirmed: o YouTube não confirmou uma faixa de áudio em português. Escolha outro trailer oficial dublado.")
    videos = [f for f in formats if f.get("vcodec") not in (None, "none") and f.get("acodec") == "none" and 0 < (f.get("height") or 0) <= 720]
    if not videos:
        raise ValueError("Nenhum vídeo até 720p disponível.")
    video = max(videos, key=lambda f: (str(f.get("vcodec", "")).startswith("avc1"), f.get("protocol") == "https", f.get("height") or 0, f.get("tbr") or 0))
    track = max(audio, key=lambda f: (str(f.get("acodec", "")).startswith("mp4a"), f.get("protocol") == "https", f.get("abr") or f.get("tbr") or 0))
    return str(video["format_id"]) + "+" + str(track["format_id"])

def probe(path, ffprobe):
    data = json.loads(subprocess.check_output([str(ffprobe), "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)], timeout=30))
    videos = [s for s in data.get("streams", []) if s.get("codec_type") == "video"]
    audios = [s for s in data.get("streams", []) if s.get("codec_type") == "audio"]
    if not videos or not audios or float(data.get("format", {}).get("duration", 0)) <= 0:
        raise ValueError("Arquivo sem vídeo/áudio válido.")
    return videos[0], audios[0]

def upload_to_nexus(path, handoff, on_progress=None):
    handoff = normalize_local_upload(handoff)
    parsed = urlsplit(handoff["callbackBase"])
    connection = http.client.HTTPSConnection(parsed.hostname, timeout=600)
    try:
        size = pathlib.Path(path).stat().st_size
        connection.putrequest("PUT", "/api/local-video-ingest/upload")
        connection.putheader("Host", parsed.hostname)
        connection.putheader("Content-Type", "video/mp4")
        connection.putheader("Content-Length", str(size))
        connection.putheader("X-Nexus-Job-Id", handoff["jobId"])
        connection.putheader("X-Nexus-Client-Id", handoff["clientId"])
        connection.putheader("X-Nexus-Upload-Ticket", handoff["uploadTicket"])
        connection.putheader("User-Agent", "NEXUS-Local-Helper/1.0")
        connection.endheaders()
        sent, last_report = 0, time.monotonic()
        with pathlib.Path(path).open("rb") as body:
            while True:
                chunk = body.read(1024 * 1024)
                if not chunk:
                    break
                connection.send(chunk)
                sent += len(chunk)
                if on_progress:
                    on_progress(sent, size)
                if sent == size or sent % (5 * 1024 * 1024) < len(chunk) or time.monotonic() - last_report >= 6:
                    report_to_nexus(handoff, "ENVIANDO AO NEXUS", uploaded_bytes=sent, total_bytes=size)
                    last_report = time.monotonic()
        response = connection.getresponse()
        raw = response.read(64 * 1024)
        try:
            payload = json.loads(raw.decode("utf-8", errors="replace") or "{}")
        except Exception:
            payload = {}
        if response.status != 201 or payload.get("ok") is not True:
            raise ValueError("nexus_upload_failed:" + str(payload.get("error") or response.status))
        return payload
    finally:
        connection.close()

def report_to_nexus(handoff, status, error="", uploaded_bytes=0, total_bytes=0):
    if not handoff:
        return
    try:
        handoff = normalize_local_upload(handoff)
        parsed = urlsplit(handoff["callbackBase"])
        payload = json.dumps({
            "jobId": handoff["jobId"],
            "status": str(status),
            "error": str(error or "")[:500],
            "uploadedBytes": int(uploaded_bytes or 0),
            "totalBytes": int(total_bytes or 0)
        }).encode("utf-8")
        connection = http.client.HTTPSConnection(parsed.hostname, timeout=20)
        connection.request(
            "POST",
            "/api/local-video-ingest/status",
            body=payload,
            headers={
                "Content-Type": "application/json",
                "Content-Length": str(len(payload)),
                "X-Nexus-Job-Id": handoff["jobId"],
                "X-Nexus-Client-Id": handoff["clientId"],
                "X-Nexus-Upload-Ticket": handoff["uploadTicket"],
                "User-Agent": "NEXUS-Local-Helper/1.0"
            }
        )
        response = connection.getresponse()
        response.read(64 * 1024)
        connection.close()
    except Exception:
        pass

class Downloader:
    def __init__(self, output, ffmpeg, node):
        self.output = pathlib.Path(output).resolve()
        self.output.mkdir(parents=True, exist_ok=True)
        self.ffmpeg = pathlib.Path(ffmpeg).resolve()
        self.ffprobe = self.ffmpeg.with_name("ffprobe.exe" if sys.platform == "win32" else "ffprobe")
        self.node = node
        self.lock = threading.Lock()
        self.state = {"status": "idle", "message": "Aguardando autorização."}
        self.files = {}

    def start(self, url, handoff=None):
        url = youtube_url(url)
        normalized = normalize_local_upload(handoff) if handoff else None
        if normalized and normalized["sourceUrl"] != url:
            raise ValueError("handoff_source_mismatch")
        with self.lock:
            if self.state["status"] in {"busy", "uploading"}:
                raise ValueError("Um download já está em andamento.")
            self.state = {"status": "busy", "message": "Consultando vídeo e áudio em português…", "progress": 0}
        threading.Thread(target=self.download, args=(url, normalized), daemon=True).start()

    def update(self, **kwargs):
        with self.lock:
            self.state.update(kwargs)

    def download(self, url, handoff=None):
        directory = self.output / secrets.token_hex(16)
        final = None
        file_id = directory.name
        try:
            directory.mkdir()
            report_to_nexus(handoff, "BAIXANDO")
            from yt_dlp import YoutubeDL
            class Quiet:
                def debug(self, msg): pass
                def warning(self, msg): pass
                def error(self, msg): pass
            def progress(data):
                if data.get("status") == "downloading":
                    total = data.get("total_bytes") or data.get("total_bytes_estimate") or 0
                    downloaded = data.get("downloaded_bytes") or 0
                    if downloaded > MAX_BYTES:
                        raise ValueError("Vídeo ultrapassa o limite de 90 MB.")
                    percent = min(92, round(downloaded / total * 88)) if total else 0
                    self.update(message="Baixando vídeo autorizado…", progress=percent)
            options = {"noplaylist": True, "quiet": True, "logger": Quiet(), "js_runtimes": {"node": {"path": self.node}}, "socket_timeout": 30, "retries": 3, "fragment_retries": 3, "ffmpeg_location": str(self.ffmpeg.parent), "max_filesize": MAX_BYTES, "outtmpl": str(directory / "source.%(ext)s"), "merge_output_format": "mp4", "progress_hooks": [progress]}
            with YoutubeDL(options) as ydl:
                info = ydl.extract_info(url, download=False)
            if info.get("is_live") or (info.get("duration") or 0) > 3600:
                raise ValueError("Escolha um vídeo gravado com até uma hora.")
            options["format"] = select_format(info)
            with YoutubeDL(options) as ydl:
                ydl.download([url])
            source = directory / "source.mp4"
            if not source.is_file():
                raise ValueError("O download não produziu MP4 completo.")
            self.update(message="Validando MP4 e preparando compatibilidade…", progress=94)
            report_to_nexus(handoff, "VALIDANDO MP4")
            video, audio = probe(source, self.ffprobe)
            final = directory / "video.mp4"
            cmd = [str(self.ffmpeg), "-hide_banner", "-loglevel", "error", "-y", "-i", str(source), "-map", "0:v:0", "-map", "0:a:0", "-c:v", "copy" if video.get("codec_name") == "h264" else "libx264"]
            if video.get("codec_name") != "h264":
                cmd += ["-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p"]
            cmd += ["-c:a", "copy" if audio.get("codec_name") == "aac" else "aac", "-metadata:s:a:0", "language=por", "-movflags", "+faststart", str(final)]
            subprocess.run(cmd, check=True, timeout=1800, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
            video, audio = probe(final, self.ffprobe)
            if video.get("codec_name") != "h264" or audio.get("codec_name") != "aac" or video.get("height", 0) > 720 or not 0 < final.stat().st_size <= MAX_BYTES:
                raise ValueError("MP4 incompatível ou maior que 90 MB. Escolha um trailer menor.")
            source.unlink()
            self.files[file_id] = final

            if handoff:
                self.update(status="uploading", message="Enviando ao Nexus…", progress=97, file_id=file_id, path=str(final), title=str(info.get("title") or "Vídeo YouTube"), bytes=final.stat().st_size)
                report_to_nexus(handoff, "ENVIANDO AO NEXUS")
                try:
                    def progress_upload(sent, total):
                        percent = min(100, round(100 * sent / max(1, total)))
                        self.update(message=f"Enviando MP4 ao NEXUS… {percent}% enviado",
                                    uploaded_bytes=sent, upload_total_bytes=total,
                                    upload_percent=percent)
                    result = upload_to_nexus(final, handoff, on_progress=progress_upload)
                except Exception as exc:
                    report_to_nexus(handoff, "FALHOU", str(exc))
                    self.update(status="upload_error", message="O MP4 ficou pronto, mas o envio ao Nexus falhou.", progress=100, file_id=file_id, path=str(final), title=str(info.get("title") or "Vídeo YouTube"), bytes=final.stat().st_size, upload_error=str(exc)[:180])
                    return
                if result.get("editable"):
                    final_message = "Envio concluído. Volte ao Nexus para escolher o corte e gerar o vídeo."
                elif result.get("renderStarted"):
                    final_message = "Envio concluído. Geração iniciada no Nexus."
                else:
                    final_message = "MP4 recebido pelo Nexus; confira o status no painel."
                self.update(
                    status="ready",
                    message=final_message,
                    progress=100,
                    file_id=file_id,
                    path=str(final),
                    title=str(info.get("title") or "Vídeo YouTube"),
                    bytes=final.stat().st_size,
                    uploaded=True,
                    render_started=bool(result.get("renderStarted")),
                    editable=bool(result.get("editable")),
                )
            else:
                self.update(status="ready", message="MP4 salvo no PC. Use o envio manual no Nexus somente como fallback.", progress=100, file_id=file_id, path=str(final), title=str(info.get("title") or "Vídeo YouTube"), bytes=final.stat().st_size)
        except Exception as exc:
            message = str(exc)
            report_to_nexus(handoff, "FALHOU", message)
            if "audio_pt_unconfirmed" not in message and not isinstance(exc, ValueError):
                message = "Não foi possível baixar este vídeo público. O YouTube pode ter bloqueado o download; tente outro trailer."
            self.update(status="error", message=message[:400], progress=0)
            try:
                if directory.is_dir():
                    for path in directory.iterdir():
                        if path.is_file():
                            path.unlink()
            except OSError:
                pass

PAGE = """<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Nexus — Preparando vídeo</title><style>body{font:17px system-ui;background:#0e1728;color:#e9eef8;max-width:760px;margin:60px auto;padding:20px}input,button{font:inherit;padding:14px;border-radius:9px}input{box-sizing:border-box;width:100%;margin:12px 0}button{background:#96e4c6;color:#102018;cursor:pointer}a{color:#96e4c6}p{line-height:1.6}code{overflow-wrap:anywhere}progress{width:100%}.muted{color:#a9b6ca}</style><h1>Preparando geração do vídeo</h1><p id="intro">O Nexus vai baixar somente o trailer escolhido e enviar o MP4 para o job atual. Nenhum outro arquivo do computador será acessado.</p><form id="form"><label>Trailer selecionado<input id="url" required value="__URL__" maxlength="2048" readonly></label><button id="submit">Iniciar download</button></form><p id="message"></p><progress id="progress" max="100" value="0"></progress><p id="file"></p><p id="path" class="muted"></p><script>const token=__TOKEN__;let localError="";let handoff=null;try{const raw=location.hash.slice(1);if(raw)handoff=JSON.parse(decodeURIComponent(raw))}catch(e){}const form=document.getElementById('form');const submit=document.getElementById('submit');const urlInput=document.getElementById('url');const autoMode=Boolean(handoff&&handoff.sourceUrl&&handoff.uploadTicket&&handoff.jobId&&handoff.clientId);if(autoMode){urlInput.value=handoff.sourceUrl;form.hidden=true;document.getElementById('message').textContent='Download automático iniciado pelo Nexus.'}else{document.getElementById('intro').textContent='Modo manual de fallback: baixe o MP4 e depois use o envio manual no Nexus.';submit.textContent='Baixar MP4 no PC';urlInput.readOnly=false}history.replaceState(null,'',location.pathname+location.search);async function startDownload(){localError="";submit.disabled=true;try{const r=await fetch('/download',{method:'POST',headers:{'Content-Type':'application/json','X-Nexus-CSRF':token},body:JSON.stringify({url:urlInput.value,handoff})});const data=await r.json();if(!r.ok){localError=data.message||"Falha ao iniciar.";document.getElementById('message').textContent=localError}else{localError=""}}catch(e){localError="Falha de conexão com o serviço local.";document.getElementById('message').textContent=localError}finally{await poll()}}form.onsubmit=async e=>{e.preventDefault();await startDownload()};async function poll(){try{const r=await fetch('/status');if(!r.ok)return;const s=await r.json();if(s.status==="busy"||s.status==="uploading")localError="";document.getElementById('message').textContent=localError||s.message;document.getElementById('progress').value=s.progress||0;submit.disabled=s.status==='busy'||s.status==='uploading';const file=document.getElementById('file');file.replaceChildren();if(s.file_id&&(s.status==='ready'||s.status==='upload_error')){const a=document.createElement('a');a.href='/files/'+s.file_id;a.textContent='Salvar uma cópia do MP4';a.download='nexus-youtube.mp4';file.append(a)}document.getElementById('path').textContent=s.path?'Arquivo local temporário: '+s.path:''}catch(e){document.getElementById('message').textContent='O serviço local foi encerrado. Abra-o novamente.'}}poll();setInterval(poll,1500);if(autoMode)setTimeout(startDownload,0);</script></html>"""

def make_handler(downloader):
    sessions = {}
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args): pass
        def origin(self): return "http://127.0.0.1:" + str(self.server.server_port)
        def host_valid(self): return self.headers.get("Host") == "127.0.0.1:" + str(self.server.server_port)
        def session(self):
            try:
                cookies = SimpleCookie(self.headers.get("Cookie", ""))
                key = cookies["nexus_local"].value if "nexus_local" in cookies else ""
                entry = sessions.get(key)
                return entry[0] if entry and entry[1] > time.time() else None
            except Exception:
                return None
        def send(self, status, payload, kind="application/json", cookie=None, allow_portal_cors=False):
            raw = payload.encode("utf-8") if isinstance(payload, str) else json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", kind + "; charset=utf-8")
            self.send_header("Content-Length", str(len(raw)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'")
            if allow_portal_cors:
                origin = self.headers.get("Origin", "")
                if origin in ALLOWED_PORTAL_ORIGINS:
                    self.send_header("Access-Control-Allow-Origin", origin)
                    self.send_header("Vary", "Origin")
                    self.send_header("Access-Control-Allow-Private-Network", "true")
            if cookie: self.send_header("Set-Cookie", cookie)
            self.end_headers()
            self.wfile.write(raw)
        def do_GET(self):
            if not self.host_valid():
                return self.send(403, {"message": "Host inválido."})
            path = urlsplit(self.path)
            if path.path == "/health":
                with downloader.lock:
                    status = str(downloader.state.get("status") or "idle")
                return self.send(200, {
                    "ok": True, "service": "nexus-local-helper",
                    "handoffSupported": True, "handoffReady": status not in {"busy", "uploading"},
                    "status": status
                }, allow_portal_cors=True)
            if path.path == "/":
                key, token = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
                sessions[key] = (token, time.time() + 12 * 3600)
                for old in list(sessions):
                    if sessions[old][1] <= time.time(): sessions.pop(old)
                url = parse_qs(path.query).get("url", [""])[0][:2048]
                page = PAGE.replace("__URL__", html.escape(url, quote=True)).replace("__TOKEN__", json.dumps(token))
                return self.send(200, page, "text/html", "nexus_local=" + key + "; HttpOnly; SameSite=Strict; Path=/")
            if not self.session(): return self.send(403, {"message": "Abra a página local primeiro."})
            if path.path == "/status":
                with downloader.lock: state = dict(downloader.state)
                state.pop("uploadTicket", None)
                return self.send(200, state)
            if path.path.startswith("/files/"):
                file_id = path.path.removeprefix("/files/")
                file = downloader.files.get(file_id) if re.fullmatch(r"[a-f0-9]{32}", file_id) else None
                if not file or not file.is_file(): return self.send(404, {"message": "Arquivo indisponível."})
                self.send_response(200)
                self.send_header("Content-Type", "video/mp4")
                self.send_header("Content-Length", str(file.stat().st_size))
                self.send_header("Content-Disposition", 'attachment; filename="nexus-youtube.mp4"')
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                with file.open("rb") as body:
                    while chunk := body.read(1024 * 1024): self.wfile.write(chunk)
                return
            return self.send(404, {"message": "Página indisponível."})
        def do_POST(self):
            if not self.host_valid():
                return self.send(403, {"message": "Host inválido."})
            if self.path == "/handoff":
                origin = self.headers.get("Origin", "")
                if origin not in ALLOWED_PORTAL_ORIGINS:
                    return self.send(403, {"message": "Origem não autorizada."}, allow_portal_cors=True)
                try:
                    size = int(self.headers.get("Content-Length", "0"))
                    if not 0 < size <= 8192 or not self.headers.get("Content-Type", "").startswith("application/json"):
                        raise ValueError("Pedido inválido.")
                    handoff = normalize_local_upload(json.loads(self.rfile.read(size)))
                    downloader.start(handoff["sourceUrl"], handoff)
                    return self.send(202, {"ok": True, "message": "PC recebeu o job. Download iniciado."}, allow_portal_cors=True)
                except (ValueError, TypeError, AttributeError):
                    return self.send(400, {"message": "Ticket inválido, expirado ou download já em andamento."}, allow_portal_cors=True)

            token = self.session()
            if self.headers.get("Origin") != self.origin() or not token or not secrets.compare_digest(self.headers.get("X-Nexus-CSRF", ""), token):
                return self.send(403, {"message": "Abra a página local e tente novamente."})
            if self.path != "/download": return self.send(404, {"message": "Rota indisponível."})
            try:
                size = int(self.headers.get("Content-Length", "0"))
                if not 0 < size <= 8192 or self.headers.get("Content-Type") != "application/json":
                    raise ValueError("Pedido inválido.")
                data = json.loads(self.rfile.read(size))
                handoff = data.get("handoff")
                if handoff is not None:
                    handoff = normalize_local_upload(handoff)
                downloader.start(data.get("url", ""), handoff)
                return self.send(202, {"message": "Autorização recebida. Download iniciado."})
            except (ValueError, TypeError, AttributeError):
                return self.send(400, {"message": "Dados inválidos, ticket expirado/alterado ou download em andamento."})
        def do_OPTIONS(self):
            if not self.host_valid():
                return self.send(403, {"message": "Host inválido."})
            origin = self.headers.get("Origin", "")
            if self.path in {"/handoff", "/health"} and origin in ALLOWED_PORTAL_ORIGINS:
                self.send_response(204)
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Vary", "Origin")
                self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
                self.send_header("Access-Control-Allow-Headers", "Content-Type")
                self.send_header("Access-Control-Allow-Private-Network", "true")
                self.send_header("Access-Control-Max-Age", "600")
                self.end_headers()
                return
            self.send(403, {"message": "Acesso não autorizado."})
    return Handler

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--ffmpeg", required=True)
    parser.add_argument("--node", required=True)
    parser.add_argument("--deps")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    if args.deps: sys.path.insert(0, str(pathlib.Path(args.deps).resolve()))
    downloader = Downloader(args.output, args.ffmpeg, args.node)
    server = ThreadingHTTPServer(("127.0.0.1", args.port), make_handler(downloader))
    print("Nexus local pronto: http://127.0.0.1:" + str(args.port), flush=True)
    server.serve_forever()
