from pathlib import Path
import re
root=Path('/mnt/data/patch-live-v07-work')
f=root/'index.html'
s=f.read_text()
start=s.index('      <section class="intro"')
end=s.index('      <div class="manifest-ticker"',start)
hero='''      <section class="intro preview-intro" aria-label="PATCH LIVE: a world your community can rewrite">
        <div class="preview-sky" aria-hidden="true"></div>
        <div class="preview-kicker"><span><i class="preview-live-dot"></i> A GAME BUILT FOR CHAOS</span><span>TWITCH CHAT × PHYSICS × YOU</span><span>01 / REALITY, INTERRUPTED</span></div>
        <div class="preview-world">
          <div class="preview-copy">
            <span class="preview-edition">THE FIRST CROWD-CONTROLLED UNIVERSE / EXPERIMENT 001</span>
            <h1>PLAY THE<br><em>IMPOSSIBLE.</em><span class="preview-title-spark">✳</span></h1>
            <p>Your job? <strong>Survive.</strong> Your chat's job? Rewrite gravity, summon meteors, and make sure you don't.</p>
            <div class="preview-actions"><a href="#app-layout" id="hero-play" class="preview-play"><span class="play-icon">↗</span><span>PLAY THE FREE DEMO<small>NO ACCOUNT · KEYBOARD OR TOUCH</small></span></a><a href="#how-it-works" class="preview-explore">HOW DOES THIS WORK? <span>↗</span></a></div>
            <div class="preview-micro"><span><b>06</b> REALITY MUTATIONS</span><i></i><span><b>03</b> ACTS TO SURVIVE</span><i></i><span><b>∞</b> WAYS TO LOSE</span></div>
          </div>
          <div class="preview-stage" aria-label="Animated view of the playable game world">
            <div class="preview-stage-top"><span>✳ &nbsp; REALITY ENGINE / PREVIEW</span><span><i></i> OFFLINE DEMO</span></div>
            <div class="preview-screen"><canvas id="hero-teaser" width="1152" height="648" aria-hidden="true"></canvas><div class="preview-screen-vignette"></div><div class="preview-gravity"><span>↟</span> GRAVITY IS OPTIONAL</div><div class="preview-signal"><span class="preview-signal-icon">↯</span><span><small>INCOMING FROM CHAT</small><strong>METEOR + MOON</strong></span></div><div class="preview-crosshair" aria-hidden="true">✳</div></div>
            <div class="preview-stage-footer"><span>YOUR WORLD IS LIVE.</span><span>A / D MOVE &nbsp; · &nbsp; SPACE JUMP</span></div>
          </div>
        </div>
        <div class="preview-foot"><span>THE WORLD NEVER PLAYS FAIR.</span><span>BUILT FOR CREATORS. CONTROLLED BY COMMUNITIES.</span><a href="#app-layout">SCROLL TO PLAY <span>↓</span></a></div>
      </section>
'''
s=s[:start]+hero+s[end:]
start=s.index('      <section class="chapter-head"')
end=s.index('<section class="app-layout"',start)
chapter='''      <section class="chapter-head" id="experience"><div class="chapter-kicker"><span>02 / THE EXPERIENCE</span><span>PLAY IN YOUR BROWSER · NO TWITCH LOGIN REQUIRED FOR THE DEMO</span></div><div class="chapter-grid"><div><span class="arena-arrival">✳ THE ARENA IS OPEN</span><h2>YOUR MOVE.<br><em>THEIR WORLD.</em></h2></div><div class="chapter-side"><p>One character. Twelve cores. Three acts. An audience that decides what physics will do next.</p><a href="#chat-lab">TRY THE OFFLINE CHAT LAB <span>↘</span></a></div></div><div class="chapter-rule"><span>01 / THE PLAYABLE ARENA</span><span>DEMO MODE — NO LIVE TWITCH CONNECTION <b>●</b></span></div></section>
'''
s=s[:start]+chapter+s[end:]
s=s.replace('THE WORLD IS YOURS. <span>FOR NOW.</span>','WELCOME TO<br><span>THE IMPOSSIBLE.</span>',1)
s=s.replace('Collect 12 cores before your community breaks reality.','Collect 12 cores. Outsmart the hazards. Survive the rule changes.',1)
s=s.replace('ENTER THE ARENA <span>↗</span>','START PLAYING <span>↗</span>',1)
s=s.replace('CHAT DECIDES.','THE CROWD<br>HAS POWER.',1)
s=s.replace('Vote on a single rule or forge two together. One viewer, one vote per round.','Pick a rule. Break the game. Even better, combine two effects into a brand-new disaster.',1)
s=s.replace('<link rel="stylesheet" href="/src/campaign.css" />','<link rel="stylesheet" href="/src/campaign.css" />\n  <link rel="stylesheet" href="/src/experience.css" />')
f.write_text(s)
main=root/'src/main.js'
s=main.read_text().replace("'THE WORLD IS YOURS. <span>FOR NOW.</span>'","'WELCOME TO<br><span>THE IMPOSSIBLE.</span>'").replace('Collect 12 cores before your community breaks reality.','Collect 12 cores. Outsmart the hazards. Survive the rule changes.')
main.write_text(s)
