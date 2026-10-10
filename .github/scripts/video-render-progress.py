#!/usr/bin/env python3
import argparse
import json
import subprocess
import sys
import time
import urllib.request

def post_progress(args, progress, message, stage):
    payload=json.dumps({"progress":int(progress),"message":message,"stage":stage}).encode("utf-8")
    req=urllib.request.Request(
        args.base_url.rstrip("/")+"/api/internal/video-render/progress",
        data=payload,
        method="POST",
        headers={
            "content-type":"application/json",
            "x-nexus-job-id":args.job_id,
            "x-nexus-client-id":args.client_id,
            "x-nexus-callback-token":args.token,
            "user-agent":"NEXUS-GitHub-Renderer/2.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            response.read()
    except Exception as exc:
        print("progress_callback_warning", type(exc).__name__, file=sys.stderr)

def seconds(value):
    try:
        h,m,s=value.split(":")
        return int(h)*3600+int(m)*60+float(s)
    except Exception:
        return 0.0

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--duration",type=float,required=True)
    parser.add_argument("--base-url",required=True)
    parser.add_argument("--job-id",required=True)
    parser.add_argument("--client-id",required=True)
    parser.add_argument("--token",required=True)
    parser.add_argument("command",nargs=argparse.REMAINDER)
    args=parser.parse_args()
    cmd=args.command[1:] if args.command and args.command[0]=="--" else args.command
    if not cmd:
        raise SystemExit("render_command_missing")

    post_progress(args,45,"Renderizando vídeo…","rendering")
    proc=subprocess.Popen(cmd,stdout=subprocess.PIPE,text=True,bufsize=1)
    last=45
    last_sent=0.0
    for raw in proc.stdout:
        line=raw.strip()
        if not line.startswith("out_time="):
            continue
        done=seconds(line.split("=",1)[1])
        ratio=max(0.0,min(1.0,done/max(args.duration,0.1)))
        progress=min(90,45+int(ratio*45))
        now=time.monotonic()
        if progress>=last+3 or (now-last_sent)>=5:
            post_progress(args,progress,f"Renderizando vídeo… {progress}%","rendering")
            last=progress
            last_sent=now
    code=proc.wait()
    if code:
        raise SystemExit(code)
    post_progress(args,92,"Render concluído. Preparando o arquivo final.","encoding_done")

if __name__=="__main__":
    main()
