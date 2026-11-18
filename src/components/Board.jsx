import React,{useState} from "react";
const FILES="abcdefgh";
const GLYPHS={wk:"♔",wq:"♕",wr:"♖",wb:"♗",wn:"♘",wp:"♙",bk:"♚",bq:"♛",br:"♜",bb:"♝",bn:"♞",bp:"♟"};
export default function Board({game,onMove,arrow,bestMove,orientation="white",disabled=false}){
 const [selected,setSelected]=useState(null);
 const rows=game.board();
 const ordered=orientation==="black"?[...rows].reverse().map(row=>[...row].reverse()):rows;
 const squares=ordered.flatMap((row,displayRow)=>row.map((piece,displayCol)=>{
   const r=orientation==="black"?7-displayRow:displayRow;
   const c=orientation==="black"?7-displayCol:displayCol;
   return {piece,r,c,square:FILES[c]+(8-r)};
 }));
 const select=sq=>{if(disabled)return;if(!selected){setSelected(sq);return;}if(selected===sq){setSelected(null);return;}onMove?.(selected,sq);setSelected(null);};
 const coords=bestMove&&bestMove.length>=4?{from:bestMove.slice(0,2),to:bestMove.slice(2,4)}:null;
 const point=sq=>{const file=FILES.indexOf(sq[0]),rank=Number(sq[1])-1;return orientation==="black"?{x:(7-file+.5)*12.5,y:(rank+.5)*12.5}:{x:(file+.5)*12.5,y:(7-rank+.5)*12.5};};
 return <div className="board-wrap"><div className="chess-board">{squares.map(({piece,r,c,square})=><button key={square} aria-label={square} disabled={disabled} onClick={()=>select(square)} className={"square "+((r+c)%2?"dark":"light")+(selected===square?" selected":"")}>{piece?<span className={piece.color==="w"?"piece-white":"piece-black"}>{GLYPHS[piece.color+piece.type]}</span>:null}</button>)}</div>{arrow&&coords?<svg className="move-arrow" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><marker id="best-arrow-head" markerWidth="5" markerHeight="5" refX="3" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="#a66be7"/></marker></defs><line x1={point(coords.from).x} y1={point(coords.from).y} x2={point(coords.to).x} y2={point(coords.to).y} stroke="#a66be7" strokeWidth="1.3" opacity=".9" markerEnd="url(#best-arrow-head)"/></svg>:null}</div>;
}