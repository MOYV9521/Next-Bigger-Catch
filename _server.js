const http=require('http'),fs=require('fs'),path=require('path');
http.createServer((q,s)=>{
  let p=path.join(process.cwd(),q.url==='/'?'index.html':q.url.split('?')[0]);
  fs.readFile(p,(e,d)=>{
    if(e){s.writeHead(404);s.end('404');return;}
    let ext=path.extname(p);
    let ct=ext==='.html'?'text/html; charset=utf-8':ext==='.js'?'text/javascript; charset=utf-8':ext==='.png'?'image/png':'application/octet-stream';
    s.writeHead(200,{'Content-Type':ct});
    s.end(d);
  });
}).listen(8080,()=>console.log('server up on 8080'));
