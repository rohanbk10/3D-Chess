const fs=require('fs'),vm=require('vm');
const ctx={console,Date,Math};ctx.self=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname+'/../vendor/chess.js','utf8')+';this.Chess=Chess',ctx);
vm.runInContext(fs.readFileSync(__dirname+'/../js/engine-core.js','utf8'),ctx);
const E=ctx.WizardEngine;
function t(name,fen,opts){const s=Date.now();const m=E.findBestMove(fen,opts);console.log(name,JSON.stringify(m),(Date.now()-s)+'ms');return m;}
// mate in 1: back rank
t('mate1','6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1',{maxDepth:3,timeMs:1500,noise:0});
// hanging queen capture
t('winqueen','rnb1kbnr/pppp1ppp/8/4p3/4P2q/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3',{maxDepth:3,timeMs:1500,noise:0});
t('start-normal','rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',{maxDepth:3,timeMs:1500,noise:12});
t('mid-hard','r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',{maxDepth:5,timeMs:3500,noise:0});
t('easy','rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1',{maxDepth:1,timeMs:300,noise:260});
// full self-play legality check
const {Chess}=ctx;const g=new Chess();let n=0;
while(!g.game_over()&&n<60){const m=E.findBestMove(g.fen(),{maxDepth:2,timeMs:400,noise:20});if(!g.move(m)){console.log('ILLEGAL',m,g.fen());process.exit(1)}n++}
console.log('selfplay ok plies',n, g.pgn().slice(0,80));
