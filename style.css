:root{
  --bg:#000;
  --card:#0b0b0c;
  --border:rgba(255,255,255,.08);
  --text:#e6e6eb;
  --muted:#8b8b91;
}

*{ box-sizing:border-box; }

body{
  margin:0;
  background:var(--bg);
  color:var(--text);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.wrap{
  max-width:900px;
  margin:0 auto;
  padding:18px 14px 60px;
}

.header h1{
  margin:0;
  font-size:26px;
}

.section{ margin-top:22px; }

.card{
  margin-top:14px;
  background:var(--card);
  border:1px solid var(--border);
  border-radius:14px;
  padding:14px;
}

.subtle{ background: rgba(255,255,255,0.025); }

pre{
  margin:0;
  font:inherit;
  white-space:pre-wrap;
  line-height:1.45;
}

.muted{ color:var(--muted); }
.small{ font-size:13px; }
.sub{ margin: 6px 0 10px; }

h2{
  margin:0 0 10px;
  font-size:18px;
}
.h3{
  margin:16px 0 8px;
  font-size:16px;
  font-weight:400;
  color:var(--muted);
}

/* ===== now playing card ===== */
.np-card{
  display:flex;
  gap:12px;
  align-items:center;
  background:var(--card);
  border:1px solid var(--border);
  border-radius:14px;
  padding:10px;
}
.hidden{ display:none; }

.np-cover{
  width:52px;
  height:52px;
  border-radius:10px;
  object-fit:cover;
  background:#000;
}
.np-info{ flex:1; min-width:0; }
.np-title{
  display:block;
  color:var(--text);
  text-decoration:none;
  font-size:14px;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.np-title:hover{ opacity:.9; text-decoration:underline; }
.np-artist{ font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

.np-progress{
  display:flex;
  align-items:center;
  gap:8px;
  margin-top:6px;
  font-size:12px;
}
.np-bar{
  flex:1;
  height:5px;
  border-radius:999px;
  overflow:hidden;
  background:rgba(255,255,255,.10);
  border:1px solid rgba(255,255,255,.10);
}
#npFill{
  height:100%;
  width:0%;
  background:rgba(255,255,255,.55);
}

/* ===== history cards (like your screenshots) ===== */
.history-scroll{
  display:flex;
  gap:12px;
  overflow-x:auto;
  padding-bottom:8px;
}
.history-scroll::-webkit-scrollbar{ display:none; }

.track-card{
  min-width:240px;
  background:var(--card);
  border:1px solid var(--border);
  border-radius:14px;
  padding:10px;
  display:flex;
  gap:10px;
  align-items:center;
}
.track-card img{
  width:44px;
  height:44px;
  border-radius:10px;
  object-fit:cover;
  background:#000;
}
.track-meta{ flex:1; min-width:0; }
.track-title{
  font-size:13px;
  color:var(--text);
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.track-artist{
  font-size:12px;
  color:var(--muted);
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.track-ago{
  font-size:11px;
  color:var(--muted);
  opacity:.75;
  white-space:nowrap;
  margin-left:6px;
}

.hint{
  margin-top:8px;
  text-align:center;
  font-size:12px;
  color:var(--muted);
}

/* ===== letterbox (like screenshots, but in your dark style) ===== */
.letterbox{
  background:var(--card);
  border:1px solid var(--border);
  border-radius:14px;
  overflow:hidden;
}

.lb-text{
  width:100%;
  min-height:120px;
  background:transparent;
  border:none;
  color:var(--text);
  padding:14px;
  font:inherit;
  resize:none;
  outline:none;
}
.lb-text::placeholder{ color:var(--muted); }

.letterbox-bar{
  display:flex;
  justify-content:space-between;
  align-items:center;
  border-top:1px solid var(--border);
  padding:6px 10px;
}

.emojis span{
  cursor:pointer;
  opacity:.6;
  margin-right:6px;
  user-select:none;
}
.emojis span:hover{ opacity:1; }

.send-btn{
  background:none;
  border:none;
  color:var(--muted);
  font:inherit;
  cursor:pointer;
}
.send-btn:hover{ color:#fff; }

.lb-hp{
  position:absolute !important;
  left:-9999px !important;
  width:1px !important;
  height:1px !important;
  opacity:0 !important;
}

/* approved letters */
.letters-list{ padding: 10px 12px; }
.letter-item{
  display:flex;
  justify-content:space-between;
  gap:10px;
  padding:10px 0;
  border-top:1px solid rgba(255,255,255,.08);
}
.letter-item:first-child{ border-top:none; }
.letter-msg{
  color:var(--text);
  font-size:13px;
  line-height:1.45;
  white-space:pre-wrap;
  word-break:break-word;
}
.letter-time{
  font-size:11px;
  color:var(--muted);
  white-space:nowrap;
  opacity:.75;
}

.footer{
  margin-top:40px;
  text-align:center;
  font-size:13px;
}
.footer a{
  color:var(--muted);
  text-decoration:none;
}
.footer a:hover{ color:#fff; }
