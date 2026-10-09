// Authenticated read-only snapshot. Credential input is hidden and never persisted.
import fs from 'node:fs';
process.stdin.setRawMode(true);
process.stdout.write('Ready for read-only source request (hidden stdin).\n');
let buffer='', busy=false;
process.stdin.on('data',async chunk=>{
  buffer+=chunk.toString();
  if(busy||!/[\r\n]/.test(buffer))return;
  busy=true;process.stdin.pause();
  try{
    const input=JSON.parse(buffer.trim());
    const response=await fetch(input.url,{headers:{'OAI-Sites-Authorization':`Bearer ${input.token}`},signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw Error('HTTP '+response.status);
    const data=await response.json();
    fs.writeFileSync('roadbook-source.json',JSON.stringify(data,null,2));
    console.log('Read-only roadbook snapshot saved.');process.exit(0);
  }catch(error){console.error(error.message);process.exit(1);}
});
