"use strict";
const { WebSocketServer } = require("ws");
const ALLOWED_HOSTS = new Map([["lichess.org","lichess"],["www.lichess.org","lichess"],["chess.com","chesscom"],["www.chess.com","chesscom"]]);
class ExtensionBridge {
  constructor({port=27301,host="127.0.0.1",onPage}={}) { this.port=port; this.host=host; this.onPage=typeof onPage==="function"?onPage:()=>{}; this.server=null; }
  start() {
    if(this.server)return;
    this.server=new WebSocketServer({host:this.host,port:this.port,path:"/extension",maxPayload:2048,perMessageDeflate:false,verifyClient:({origin,req},done)=>{
      const address=req.socket.remoteAddress||"";
      const loopback=["127.0.0.1","::1","::ffff:127.0.0.1"].includes(address);
      const trusted=typeof origin==="string"&&(origin.startsWith("chrome-extension://")||origin.startsWith("moz-extension://"));
      done(loopback&&trusted,loopback&&trusted?200:403,"Local extension only");
    }});
    this.server.on("connection",socket=>{
      socket.send(JSON.stringify({type:"bridge-ready",version:1}));
      socket.on("message",raw=>{
        let msg;try{msg=JSON.parse(String(raw));}catch{return;}
        if(msg?.type!=="platform-page")return;
        let url;try{url=new URL(String(msg.url||""));}catch{return;}
        const platform=String(msg.platform||"");
        if(url.protocol!=="https:"||ALLOWED_HOSTS.get(url.hostname)!==platform)return;
        this.onPage({platform,url:url.origin+url.pathname,seenAt:Date.now()});
      });
    });
    this.server.on("error",error=>{if(error.code==="EADDRINUSE"){this.server?.close();this.server=null;}});
  }
  stop(){if(!this.server)return;for(const c of this.server.clients)c.close(1001,"Application closing");this.server.close();this.server=null;}
}
module.exports={ExtensionBridge,ALLOWED_HOSTS};