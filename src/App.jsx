import React,{useEffect,useState} from "react";
import {Chess} from "chess.js";
import Board from "./components/Board";
import Sidebar from "./components/Sidebar";
import TitleBar from "./components/TitleBar";
import LichessConnect from "./components/LichessConnect";
import PlayPage from "./components/PlayPage";
import SpectatePage from "./components/SpectatePage";
import ProfilesPage from "./components/ProfilesPage";
import EnginePage from "./components/EnginePage";
import LocalEngineGame from "./components/LocalEngineGame";
import ChessistLibrary from "./components/ChessistLibrary";
import PerformancePage from "./components/PerformancePage";
import PuzzlesPage from "./components/PuzzlesPage";
import OpeningsPage from "./components/OpeningsPage";
import DiagnosticsPage from "./components/DiagnosticsPage";
import {engine as berserkEngine} from "./services/engine";

const NAV=[["home","Home","⌂"],["play","Play","♟"],["spectate","Spectate","◉"],["review","Review","▤"],["analysis","Analysis","⌘"],["profiles","Profiles","◎"],["library","Library","▣"],["bot","Local engine","♞"],["puzzles","Puzzles","✣"],["openings","Openings","⌁"],["engine","Engine","⚙"],["performance","Performance","↗"],["diagnostics","Diagnostics","⌕"]];
const TITLES={home:"Your chess command centre",play:"Play on Lichess",spectate:"Live chess, your way",review:"Game review",analysis:"Analysis studio",profiles:"Player profiles",library:"Your chess library",bot:"Play against Berserk",puzzles:"Tactical training",openings:"Opening explorer",engine:"Engine workshop",performance:"Engine performance",diagnostics:"System diagnostics",settings:"Settings",about:"About Chessist Local"};

function Dashboard({onNavigate,fairness}) {
 return <div className="dashboard"><div className="welcome"><div><div className="eyebrow">NATIVE DESKTOP CHESS WORKSPACE</div><h1>Think deeper.<br/><span>Play smarter.</span></h1><p>Games, analysis and engines — running locally in Chessist.</p></div></div>
 <div className="stat-grid"><div className="stat-card"><span>BERSERK ENGINE</span><strong>WebAssembly</strong><small>Runs in a local worker</small></div><div className="stat-card"><span>ONLINE PLAY</span><strong>Lichess Board API</strong><small>Chess.com opens its official client</small></div><div className="stat-card"><span>FAIR-PLAY GUARD</span><strong>{fairness.locked?"Locked":"Enabled"}</strong><small>{fairness.locked?"Active game detected":"Analysis allowed outside active games"}</small></div></div>
 <div className="section-heading"><div><span className="eyebrow">WORKSPACE</span><h2>Jump back in</h2></div></div><div className="action-grid">{NAV.filter(x=>["play","spectate","analysis","review","bot","puzzles"].includes(x[0])).map(x=><button className="action-card" key={x[0]} onClick={()=>onNavigate(x[0])}><span className="action-icon">{x[2]}</span><strong>{x[1]}</strong><small>{({play:"Play real games on Lichess",spectate:"Watch games and analyse as a spectator",analysis:"Analyse a FEN or PGN with Berserk",review:"Review an imported game",bot:"Play locally against Berserk",puzzles:"Solve the daily Lichess puzzle"})[x[0]]}</small><span className="card-arrow">↗</span></button>)}</div>
 <div className="notice"><span className="notice-dot"/>{fairness.locked?"Fair-play lock active: engine searches are blocked while you play online.":"Fair-play protection is active. Analysis is available for local positions, finished games and games you spectate."}</div></div>;
}

export function AnalysisWorkspace({fairness}) {
 const [game,setGame]=useState(()=>new Chess());const [depth,setDepth]=useState(18);const [arrow,setArrow]=useState(true);const [importText,setImportText]=useState("");const [info,setInfo]=useState(null);const [message,setMessage]=useState("Choose Berserk or a native UCI engine to analyse.");const [best,setBest]=useState("");const [pv,setPv]=useState("");const [engineMode,setEngineMode]=useState("berserk");const [berserkStatus,setBerserkStatus]=useState({status:"idle",progress:0});
 useEffect(()=>{const offNative=window.chessist.engine.onInfo(x=>{setInfo(x);if(x.pv?.length){setBest(x.pv[0]);setPv(x.pv.slice(0,10).join(" "));}});const offBerserk=berserkEngine.subscribe(setBerserkStatus);const pending=localStorage.getItem("chessist:review:pendingPgn");if(pending){try{const next=new Chess();next.loadPgn(pending);setGame(next);setImportText(pending);setMessage("Imported game loaded for review.");localStorage.removeItem("chessist:review:pendingPgn");}catch(e){setMessage("Could not load PGN: "+e.message);}}return()=>{offNative?.();offBerserk();berserkEngine.stop();};},[]);
 const importPosition=()=>{try{const value=importText.trim();if(!value)throw new Error("Paste a FEN or PGN first.");let next;if(value.includes("/")&&value.split(/\s+/).length>=6)next=new Chess(value);else{next=new Chess();next.loadPgn(value);}setGame(next);setBest("");setPv("");setInfo(null);setMessage("Position or game loaded.");}catch(e){setMessage("Import error: "+e.message);}};
 const move=(from,to)=>{try{const next=game.pgn()?new Chess():new Chess(game.fen());if(game.pgn())next.loadPgn(game.pgn());const m=next.move({from,to,promotion:"q"});if(m){setGame(next);setBest("");setPv("");setInfo(null);}}catch{}};
 const run=async()=>{if(fairness.locked){setMessage("Engine locked while your online game is active.");return;}try{if(engineMode==="berserk"){const result=await berserkEngine.search(game.fen(),Math.max(500,Math.min(10000,depth*250)),3,"analysis-board");const candidate=result.candidates?.[0];const move=candidate?.uci||result.bestmove;setBest(move&&move!=="(none)"&&move!=="0000"?move:"");setPv(candidate?.pv?.join(" ")||move||"");setInfo({depth:result.depth,score:{type:"cp",value:result.scoreCp},nodes:result.nodes});setMessage("Berserk analysis complete.");}else{await window.chessist.engine.start();await window.chessist.engine.analyze({fen:game.fen(),depth,context:"analysis-board"});setMessage("Native UCI analysis running…");}}catch(e){setMessage(e.message||"Engine analysis failed.");}};
 const undo=()=>{const next=game.pgn()?new Chess():new Chess(game.fen());if(game.pgn())next.loadPgn(game.pgn());if(next.undo())setGame(next);setBest("");setPv("");};
 return <div className="analysis-layout"><section className="board-column"><div className="analysis-toolbar"><span className="live-indicator"/> POSITION ANALYSIS <span className="toolbar-spacer"/><button onClick={()=>setGame(new Chess())}>Reset</button></div><Board game={game} onMove={move} arrow={arrow&&Boolean(best)} bestMove={best}/><div className="board-controls"><button onClick={()=>setGame(new Chess())}>New position</button><button onClick={()=>setArrow(v=>!v)} className={arrow?"toggle-active":""}>↗ Best-move arrow</button><button onClick={undo}>Undo</button><button onClick={()=>navigator.clipboard?.writeText(game.fen())}>Copy FEN</button></div></section><aside className="analysis-side"><div className="eval-card"><div className="eyebrow">ENGINE EVALUATION</div><div className="eval-score">{info?.score?(info.score.type==="mate"?"M":"")+info.score.value:"—"}</div><div className="engine-stats"><span>DEPTH <b>{info?.depth??"—"}</b></span><span>NODES <b>{info?.nodes?Number(info.nodes).toLocaleString():"—"}</b></span></div></div><div className="panel-card"><div className="panel-title">Import position or game</div><textarea value={importText} onChange={e=>setImportText(e.target.value)} placeholder="Paste FEN or PGN…"/><button className="quiet-button full" onClick={importPosition}>Load FEN / PGN</button></div><div className="panel-card"><div className="panel-title">Engine control</div><label>Engine<select value={engineMode} onChange={e=>setEngineMode(e.target.value)}><option value="berserk">Berserk WASM</option><option value="native">Native UCI / Stockfish</option></select></label><label>Search depth: {depth}<input type="range" min="8" max="30" value={depth} onChange={e=>setDepth(Number(e.target.value))}/></label><button className="primary-button full" disabled={fairness.locked} onClick={run}>Analyse position</button><p className="helper-text">{engineMode==="berserk"?"Berserk: "+berserkStatus.status:""} </p><p className="helper-text">{message}</p></div><div className="panel-card"><div className="panel-title">Best continuation</div><div className="pv-text">{pv||"Waiting for engine…"}</div><small className="helper-text">Best move: {best||"—"}</small></div><div className="panel-card"><div className="panel-title">Position FEN</div><textarea value={game.fen()} readOnly/><button className="quiet-button full" onClick={()=>navigator.clipboard?.writeText(game.fen())}>Copy FEN</button></div></aside></div>;
}

function AboutPage(){return <div className="panel-card"><div className="eyebrow">ABOUT</div><h2>Chessist Local</h2><p className="helper-text">A native Electron desktop chess application. Lichess online play runs through its official Board API. Chess.com public player data uses its published API; actual Chess.com games are played on Chess.com itself. Engine analysis is blocked during your active online games.</p></div>;}

export default function App(){
 const [page,setPage]=useState("home");const [collapsed,setCollapsed]=useState(false);const [fairness,setFairness]=useState({locked:false,reason:null});const [browserPage,setBrowserPage]=useState(null);const [engineStatus,setEngineStatus]=useState("idle");
 useEffect(()=>{const api=window.chessist;const offEngine=berserkEngine.subscribe(state=>setEngineStatus(state.status));if(!api)return()=>offEngine();api.fairness.getState().then(setFairness).catch(()=>{});const offFairness=api.fairness.onChange(setFairness);const offExtension=api.extension?.onPage(setBrowserPage);return()=>{offFairness?.();offExtension?.();offEngine();};},[]);
 if(!window.chessist?.isDesktop)return <main className="desktop-required"><h1>Chessist Local</h1><p>This is a native desktop application, not a browser website.</p><p>Run <code>npm run dev</code> to launch the Electron app, or install a desktop release.</p></main>;
 const review=pgn=>{localStorage.setItem("chessist:review:pendingPgn",pgn);setPage("review");};
 let content;
 if(page==="home")content=<Dashboard onNavigate={setPage} fairness={fairness}/>;
 else if(page==="play")content=<PlayPage/>;
 else if(page==="spectate")content=<SpectatePage fairness={fairness}/>;
 else if(page==="profiles")content=<ProfilesPage/>;
 else if(page==="engine")content=<EnginePage/>;
 else if(page==="analysis"||page==="review")content=<AnalysisWorkspace fairness={fairness}/>;
 else if(page==="bot")content=<LocalEngineGame fairness={fairness}/>;
 else if(page==="library")content=<ChessistLibrary onReview={review}/>;
 else if(page==="performance")content=<PerformancePage/>;
 else if(page==="puzzles")content=<PuzzlesPage/>;
 else if(page==="openings")content=<OpeningsPage/>;
 else if(page==="diagnostics")content=<DiagnosticsPage/>;
 else if(page==="settings")content=<div className="settings-layout"><LichessConnect/></div>;
 else content=<AboutPage/>;
 return <div className="app-shell"><TitleBar/><div className="app-layout"><Sidebar items={NAV} active={page} onNavigate={setPage} collapsed={collapsed} setCollapsed={setCollapsed} engineStatus={"Berserk "+engineStatus}/><main className="main-area"><header className="main-header"><div><div className="breadcrumbs">CHESSIST LOCAL <span>/</span> {page.toUpperCase()}</div><h2>{TITLES[page]||"Chessist Local"}</h2></div><div className="header-right"><span className="ready-pill">{browserPage?browserPage.platform.toUpperCase()+" OPEN":"DESKTOP APP"}</span><span className={fairness.locked?"lock-pill":"ready-pill"}>{fairness.locked?"ENGINE LOCKED":"● FAIR PLAY ON"}</span><button className="avatar-button" onClick={()=>setPage("settings")}>MK</button></div></header><div className="page-scroll">{content}</div></main></div></div>;
}
