#!/usr/bin/env python3
"""Edit actual captured Chromium gameplay into a truthful narrated-by-captions demo.
No synthetic Twitch chat and no fake win/lose sequences are generated.
"""
import json, math, random, subprocess, wave, struct
from pathlib import Path
D=Path("demo-capture")
m=json.loads((D/"walkthrough-markers.json").read_text())
if m.get("errors") or m.get("result",{}).get("result")!="VICTORY":
    raise SystemExit("Refusing to edit an incomplete or unsuccessful actual game capture")
markers={r["name"]:r["t"] for r in m["markers"]}
video=D/"codebreakers-gameplay.webm"
if not video.exists():raise SystemExit("Capture missing")
def length():
    return float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration",
          "-of","default=noprint_wrappers=1:nokey=1",str(video)],text=True))
duration=length()
chapters=[
 ("THE GAME YOUR CHAT REWRITES","CODEBREAKERS / ACTUAL BROWSER DEMONSTRATION",0,markers["intro"]),
 ("HOW THE STREAMER PLAYS","A / D MOVE   •   SPACE REFLECTS   •   SHIFT DASHES",markers["intro"],markers["raid-begins"]),
 ("WAVE 01 / SYSTEM BREACH","CLEAR 12 GLITCHLINGS AND PACKET DRONES",markers["raid-begins"],markers["wave-2"]),
 ("WAVE 02 / FIREWALL UPRISING","BREAK THE SENTINEL WITH REFLECTED SHOTS",markers["wave-2"],markers["wave-3"]),
 ("WAVE 03 / FINAL COMPILATION","THE COMPILER CHANGES AS THE AUDIENCE VOTES",markers["wave-3"],markers["result-VICTORY"]),
 ("CAMPAIGN COMPLETE","REAL VICTORY • SCORE • WAVE PROGRESSION",markers["result-VICTORY"],markers["local-twitch-option"]),
 ("HOW TWITCH CONNECTS","STREAMER.BOT BRIDGE • LIVE CHAT REQUIRES AUTHORIZATION",markers["local-twitch-option"],duration)
]
font="/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
def draw_txt(s):
    return s.replace("\\","\\\\").replace(":",r"\:").replace("'","").replace("%",r"\%")
vf=["fps=30","scale=1920:1080:flags=lanczos","format=yuv420p"]
for title,detail,a,b in chapters:
    # Compact lower third at the top. Real gameplay and streamer HUD stay visible.
    a=max(0,a);b=min(duration,b)
    en=f"between(t\\,{a:.3f}\\,{b:.3f})"
    vf.append(f"drawbox=x=535:y=20:w=1325:h=104:color=0x091410@0.84:t=fill:enable='{en}'")
    vf.append(f"drawbox=x=535:y=20:w=7:h=104:color=0xDFFF69@1:t=fill:enable='{en}'")
    vf.append(f"drawtext=fontfile={font}:text='{draw_txt(title)}':x=560:y=34:fontsize=31:fontcolor=0xF2F4E8:enable='{en}'")
    vf.append(f"drawtext=fontfile={font}:text='{draw_txt(detail)}':x=560:y=81:fontsize=17:fontcolor=0xDFFF69:enable='{en}'")
    print(f"{a:.1f}-{b:.1f}: {title}")
# Calm original music bed; no commercial/sample recordings.
seconds=int(math.ceil(duration))+1
rate=24000
random.seed(28)
notes=[(110,164.8,220),(98,146.8,196),(82.4,123.5,164.8),(92.5,138.6,185)]
with wave.open(str(D/"original-underscore.wav"),"wb") as out:
    out.setnchannels(1);out.setsampwidth(2);out.setframerate(rate)
    for block in range(seconds):
        buf=bytearray()
        for j in range(rate):
            t=block+j/rate
            chord=notes[int(t//11)%len(notes)]
            attack=min(1,t/2);fade=min(1,(duration-t)/3)
            gain=.065*max(0,min(attack,fade))
            pad=sum(math.sin(2*math.pi*f*t+.19*math.sin(2*math.pi*.13*t)) for f in chord)/len(chord)
            pulse=math.sin(2*math.pi*55*t)*(1 if (t%4.0)<.18 else .06)
            shimmer=math.sin(2*math.pi*440*t)*max(0,1-(t%4.0)*4)
            value=(pad*.8+pulse*.13+shimmer*.08)*gain
            buf+=struct.pack("<h",int(max(-1,min(1,value))*32767))
        out.writeframesraw(buf)
# Generated narration can be supplied separately; this version uses readable
# in-video caption chapters and a quiet original sound bed.
outpath=D/"PATCH_CODEBREAKERS_ACTUAL_GAMEPLAY_DEMO.mp4"
cmd=["ffmpeg","-y","-hide_banner","-loglevel","error","-i",str(video),
     "-i",str(D/"original-underscore.wav"),"-vf",",".join(vf),
     "-map","0:v:0","-map","1:a:0","-c:v","libx264","-preset","fast","-crf","23",
     "-pix_fmt","yuv420p","-c:a","aac","-b:a","128k",
     "-t",str(duration),"-movflags","+faststart",str(outpath)]
subprocess.run(cmd,check=True)
info=subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration,size",
    "-of","default=noprint_wrappers=1",str(outpath)],text=True)
(D/"README.txt").write_text(
 "PATCH//LIVE: CODEBREAKERS — REAL BROWSER GAMEPLAY DEMO\n\n"+
 "Recorded with Chromium from the real game engine. The Twitch audience shown in\n"+
 "the guided gameplay is explicitly simulated. NO live Twitch interaction is claimed.\n"+
 "The real Twitch chat clip must be supplied by the broadcaster before final submission.\n"+
 "The original Codex session was verified separately: 01a18d81-cb43-7fb0-acdb-855b03b028bd\n"+
 "Later game improvements were completed outside Codex and should not be misattributed.\n"+
 "Recording chapters:\n"+
 "\n".join(f"{a:.1f}-{b:.1f}s: {title}" for title,_,a,b in chapters)+
 "\n\nVideo details:\n"+info
)
print("OUTPUT",outpath,info)
