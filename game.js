// 🎣 下一条鱼会更大 — 全屏钓点大冒险版
const WL=0.48;
let inputIsSetup=false;
let currentLevel=levelIdx=0,levelCaught=0,levelCasts=0,levelMaxCasts=8,levelGoal='';
let spots=[],temptations=[],trashItems=[];
const SPOT_ZONES=['water','cloud','mountain','sky','tree','sun','rock'];
const ZONE_COLORS={water:'#4FC3F7',cloud:'#E8EAF6',mountain:'#8D6E63',sky:'#90CAF9',tree:'#66BB6A',sun:'#FFEE58',rock:'#78909C'};
const ZONE_EMOJI={water:'🌊',cloud:'☁️',mountain:'⛰️',sky:'🌤️',tree:'🌳',sun:'☀️',rock:'🪨'};
const ZONE_NAME={water:'湖泊水域',cloud:'云端幻境',mountain:'山涧溪流',sky:'天空之海',tree:'巨树树冠',sun:'烈日熔湖',rock:'礁石深渊'};
// 钓点区域权重：让大部分钓点落在水下（water 占约 62%）
const SPOT_ZONE_WEIGHTS={water:62,rock:4,cloud:7,mountain:9,sky:8,tree:6,sun:4};
// 各非水域的基础稀有度加成（天空 / 山 更容易出稀有鱼）
const ZONE_RARITY_BONUS={cloud:1,mountain:2,sky:2,tree:0,rock:0};

// 按权重随机选择钓点区域
function pickSpotZone(){
  let keys=Object.keys(SPOT_ZONE_WEIGHTS),total=0;
  for(let k of keys)total+=SPOT_ZONE_WEIGHTS[k];
  let r=Math.random()*total,acc=0;
  for(let k of keys){acc+=SPOT_ZONE_WEIGHTS[k];if(r<=acc)return k;}
  return 'water';
}
// 水下钓点纵向范围：从水面往下到接近水底
function waterTopY(){return H*WL+14;}
function waterBotY(){return H*0.86;}
// 水下钓点：从水面到水底随机分布（越往下的钓点越深）
function waterSpotY(){return waterTopY()+Math.random()*(waterBotY()-waterTopY());}
// 水深比例：0=水面，1=水底
function waterDepthRatio(y){
  let top=H*WL,bot=waterBotY();
  return Math.max(0,Math.min(1,(y-top)/(bot-top||1)));
}
// 水深稀有度加成：越深的水加成越高
function waterDepthBonus(y){
  let d=waterDepthRatio(y);
  if(d>0.85)return 3;
  if(d>0.6)return 2;
  if(d>0.3)return 1;
  return 0;
}
// 统一计算区域稀有度加成（水用深度，太阳用关卡配置，天空/山固定较高）
function zoneBonusRarity(zone,y,cfg){
  if(zone==='water')return waterDepthBonus(y);
  if(zone==='sun')return cfg?(cfg.srBonus?2:(cfg.ssrBonus?3:1)):2;
  return ZONE_RARITY_BONUS[zone]||0;
}

// 关卡配置
// 50 关闯关主线：奖励总额恰为 800,000（通关 80 万 + 沿途鱼钱 → 冲刺全局 100 万）
const LEVELS=[
  // ===== 序章 · 入门（1-5）=====
  {id:1,name:'初出茅庐',desc:'热身关！钓到任意 3 条鱼',goal:{type:'fish',count:3},casts:8,fakeRate:0.15,spots:5},
  {id:2,name:'再战江湖',desc:'手感渐热，钓到 4 条鱼',goal:{type:'fish',count:4},casts:9,fakeRate:0.2,spots:6},
  {id:3,name:'水草危机',desc:'水面漂着水草团！避开干扰钓 4 条鱼',goal:{type:'fish',count:4},casts:9,fakeRate:0.25,spots:6},
  {id:4,name:'雾里看花',desc:'【道具教学】先用💣闪光弹照出假点，再钓 5 条真鱼',goal:{type:'fish',count:5},casts:11,fakeRate:0.4,spots:8},
  {id:5,name:'云中漫步',desc:'【区域教学】对准☁️云朵钓点下竿，钓 2 条云鱼',goal:{type:'zone_cloud',count:2},casts:10,fakeRate:0.3,spots:6,forceCloud:2},
  // ===== 第一章 · 试炼开始（6-10）=====
  {id:6,name:'R 级信号',desc:'钓到 2 条 R 级以上的鱼',goal:{type:'rarity',rarity:'R',count:2},casts:10,fakeRate:0.3,spots:6},
  {id:7,name:'山岩藏宝',desc:'【区域教学】对准⛰️山岩钓点下竿，钓 2 条 R 级',goal:{type:'zone_rarity',zone:'mountain',rarity:'R',count:2},casts:11,fakeRate:0.3,spots:7,forceMountain:2},
  {id:8,name:'真假难辨',desc:'假钓点暴增！钓 6 条真鱼稳住心态',goal:{type:'fish',count:6},casts:12,fakeRate:0.5,spots:9},
  {id:9,name:'云上人家',desc:'云中渔获 3 条',goal:{type:'zone_cloud',count:3},casts:12,fakeRate:0.3,spots:7,forceCloud:3},
  {id:10,name:'第一道金光',desc:'钓到 1 条 SR 级鱼（首次接触高星鱼）',goal:{type:'rarity',rarity:'SR',count:1},casts:14,fakeRate:0.3,spots:7,srBonus:0.15},
  // ===== 第二章 · 道具讲堂（11-15）=====
  {id:11,name:'道具课·闪光弹',desc:'【道具教学】先用💣闪光弹照亮假点，再钓 5 条真鱼',goal:{type:'fish',count:5},casts:13,fakeRate:0.55,spots:10},
  {id:12,name:'道具课·精准雷达',desc:'【道具教学】先开🎯雷达锁定真点，再钓 3 条 R 级',goal:{type:'rarity',rarity:'R',count:3},casts:13,fakeRate:0.6,spots:9},
  {id:13,name:'道具课·强化香饵',desc:'【道具教学】先撒🍀香饵提升稀有度，再钓 2 条 SR',goal:{type:'rarity',rarity:'SR',count:2},casts:17,fakeRate:0.4,spots:8,srBonus:0.18},
  {id:14,name:'道具课·呼唤鱼群',desc:'【道具教学】用🐟呼唤鱼群刷新钓点，再钓 7 条鱼',goal:{type:'fish',count:7},casts:14,fakeRate:0.4,spots:8},
  {id:15,name:'道具课·延时沙漏',desc:'【道具教学】用⏰沙漏加 2 竿，再钓 8 条鱼',goal:{type:'fish',count:8},casts:12,fakeRate:0.35,spots:8},
  // ===== 第三章 · 山川湖海（16-20）=====
  {id:16,name:'石缝惊魂',desc:'山岩区钓 3 条 R 级',goal:{type:'zone_rarity',zone:'mountain',rarity:'R',count:3},casts:14,fakeRate:0.35,spots:8,forceMountain:2},
  {id:17,name:'云席酒宴',desc:'云鱼 3 条 + R 级 1 条',goal:{type:'combo',sub:[{type:'zone_cloud',count:3},{type:'rarity',rarity:'R',count:1}]},casts:14,fakeRate:0.35,spots:8,forceCloud:3},
  {id:18,name:'烈日灼心',desc:'太阳力场出现！钓 2 条 SR 鱼',goal:{type:'rarity',rarity:'SR',count:2},casts:17,fakeRate:0.4,spots:8,forceSun:1,srBonus:0.18},
  {id:19,name:'水草迷城',desc:'干扰物猖獗，钓 7 条真鱼',goal:{type:'fish',count:7},casts:15,fakeRate:0.6,spots:10},
  {id:20,name:'初遇金鳞',desc:'【里程碑】钓到 1 条 SSR！金鳞鲤在等你',goal:{type:'rarity',rarity:'SSR',count:1},casts:19,fakeRate:0.4,spots:8,ssrBonus:0.18},
  // ===== 第四章 · 双星闪耀（21-25）=====
  {id:21,name:'双璧同辉',desc:'钓 2 条 SR 级',goal:{type:'rarity',rarity:'SR',count:2},casts:17,fakeRate:0.4,spots:8,srBonus:0.15},
  {id:22,name:'山风拂面',desc:'山岩 R 级 1 条 + 任意 4 条',goal:{type:'combo',sub:[{type:'zone_rarity',zone:'mountain',rarity:'R',count:1},{type:'fish',count:4}]},casts:15,fakeRate:0.4,spots:8,forceMountain:1},
  {id:23,name:'三重天',desc:'云 1 + 山 1 + 任意 4',goal:{type:'combo',sub:[{type:'zone_cloud',count:1},{type:'zone_rarity',zone:'mountain',rarity:'R',count:1},{type:'fish',count:4}]},casts:17,fakeRate:0.45,spots:9,forceCloud:1,forceMountain:1},
  {id:24,name:'陷阱大师',desc:'假点占比 65%！钓 8 条真鱼',goal:{type:'fish',count:8},casts:17,fakeRate:0.65,spots:11},
  {id:25,name:'龙王显圣',desc:'【里程碑】钓到 1 条 UR！龙王现身',goal:{type:'rarity',rarity:'UR',count:1},casts:23,fakeRate:0.4,spots:8,urBonus:0.2},
  // ===== 第五章 · 大师之路（26-30）=====
  {id:26,name:'金鳞重光',desc:'SSR 鱼 2 条',goal:{type:'rarity',rarity:'SSR',count:2},casts:23,fakeRate:0.45,spots:9,ssrBonus:0.2},
  {id:27,name:'云上双龙',desc:'云鱼 2 条 + SR 1 条',goal:{type:'combo',sub:[{type:'zone_cloud',count:2},{type:'rarity',rarity:'SR',count:1}]},casts:18,fakeRate:0.45,spots:9,forceCloud:2,srBonus:0.15},
  {id:28,name:'高山流水',desc:'山 R 2 + 云 1',goal:{type:'combo',sub:[{type:'zone_rarity',zone:'mountain',rarity:'R',count:2},{type:'zone_cloud',count:1}]},casts:18,fakeRate:0.45,spots:9,forceMountain:2,forceCloud:1},
  {id:29,name:'伪装的盛宴',desc:'钓 9 条真鱼，擦亮眼睛！',goal:{type:'fish',count:9},casts:18,fakeRate:0.6,spots:11},
  {id:30,name:'大师的门槛',desc:'SSR 鱼 3 条',goal:{type:'rarity',rarity:'SSR',count:3},casts:27,fakeRate:0.45,spots:9,ssrBonus:0.22},
  // ===== 第六章 · 高处不胜寒（31-35）=====
  {id:31,name:'鱼贯而入',desc:'R 级 4 条（假点干扰）',goal:{type:'rarity',rarity:'R',count:4},casts:17,fakeRate:0.5,spots:9},
  {id:32,name:'白热化',desc:'SR 鱼 3 条',goal:{type:'rarity',rarity:'SR',count:3},casts:21,fakeRate:0.5,spots:9,srBonus:0.18},
  {id:33,name:'天空商人',desc:'云中 4 条好货',goal:{type:'zone_cloud',count:4},casts:18,fakeRate:0.45,spots:9,forceCloud:4},
  {id:34,name:'九死一生',desc:'假点 70%！钓 9 条真鱼',goal:{type:'fish',count:9},casts:19,fakeRate:0.7,spots:12},
  {id:35,name:'深海传唤',desc:'UR 鱼 1 条',goal:{type:'rarity',rarity:'UR',count:1},casts:25,fakeRate:0.45,spots:8,urBonus:0.25},
  // ===== 第七章 · 天地交辉（36-40）=====
  {id:36,name:'珠光宝气',desc:'R 3 + SR 1',goal:{type:'combo',sub:[{type:'rarity',rarity:'R',count:3},{type:'rarity',rarity:'SR',count:1}]},casts:20,fakeRate:0.5,spots:9,srBonus:0.15},
  {id:37,name:'双虹贯日',desc:'SSR 1 + 云 1',goal:{type:'combo',sub:[{type:'rarity',rarity:'SSR',count:1},{type:'zone_cloud',count:1}]},casts:23,fakeRate:0.5,spots:9,forceCloud:1,ssrBonus:0.2},
  {id:38,name:'天地同辉',desc:'山 SR 1 + 云 SR 1',goal:{type:'combo',sub:[{type:'zone_rarity',zone:'mountain',rarity:'SR',count:1},{type:'zone_rarity',zone:'cloud',rarity:'SR',count:1}]},casts:24,fakeRate:0.5,spots:10,forceMountain:1,forceCloud:1,srBonus:0.2},
  {id:39,name:'假作真时',desc:'假点 70%，钓 10 条真鱼',goal:{type:'fish',count:10},casts:20,fakeRate:0.7,spots:12},
  {id:40,name:'SSR 瀑布',desc:'SSR 鱼 4 条！',goal:{type:'rarity',rarity:'SSR',count:4},casts:29,fakeRate:0.5,spots:9,ssrBonus:0.25},
  // ===== 第八章 · 传说降临（41-45）=====
  {id:41,name:'紫电青霜',desc:'UR 1 + SR 2',goal:{type:'combo',sub:[{type:'rarity',rarity:'UR',count:1},{type:'rarity',rarity:'SR',count:2}]},casts:29,fakeRate:0.5,spots:9,urBonus:0.28,srBonus:0.2},
  {id:42,name:'星河舰队',desc:'云 3 + SR 1',goal:{type:'combo',sub:[{type:'zone_cloud',count:3},{type:'rarity',rarity:'SR',count:1}]},casts:22,fakeRate:0.5,spots:10,forceCloud:3,srBonus:0.18},
  {id:43,name:'龙争虎斗',desc:'UR 1 + 山 R 1',goal:{type:'combo',sub:[{type:'rarity',rarity:'UR',count:1},{type:'zone_rarity',zone:'mountain',rarity:'R',count:1}]},casts:27,fakeRate:0.55,spots:9,forceMountain:1,urBonus:0.3},
  {id:44,name:'群魔乱舞',desc:'假点 75%！钓 11 条真鱼',goal:{type:'fish',count:11},casts:21,fakeRate:0.75,spots:13},
  {id:45,name:'黎明曙光',desc:'UR 鱼 2 条！',goal:{type:'rarity',rarity:'UR',count:2},casts:31,fakeRate:0.5,spots:9,urBonus:0.3},
  // ===== 终章 · 百冠之路（46-50）=====
  {id:46,name:'日月同辉',desc:'云 2 + 山 2 + 任意 2',goal:{type:'combo',sub:[{type:'zone_cloud',count:2},{type:'zone_rarity',zone:'mountain',rarity:'R',count:2},{type:'fish',count:2}]},casts:22,fakeRate:0.55,spots:10,forceCloud:2,forceMountain:2},
  {id:47,name:'百川归海',desc:'SSR 鱼 5 条！',goal:{type:'rarity',rarity:'SSR',count:5},casts:31,fakeRate:0.55,spots:9,ssrBonus:0.3},
  {id:48,name:'天罗地网',desc:'假点 70%，钓 12 条真鱼',goal:{type:'fish',count:12},casts:23,fakeRate:0.7,spots:12},
  {id:49,name:'万鱼之王',desc:'SR 鱼 5 条 + SSR 2 条',goal:{type:'combo',sub:[{type:'rarity',rarity:'SR',count:5},{type:'rarity',rarity:'SSR',count:2}]},casts:33,fakeRate:0.6,spots:10,srBonus:0.3,ssrBonus:0.25},
  {id:50,name:'最终试炼',desc:'UR 2 + SSR 2 —— 传说之巅！通关即获 100 万认证',goal:{type:'combo',sub:[{type:'rarity',rarity:'UR',count:2},{type:'rarity',rarity:'SSR',count:2}]},casts:37,fakeRate:0.6,spots:10,urBonus:0.35,ssrBonus:0.35},
];
// 50 关奖励曲线：幂函数递增，总额精确约 800,000（第 1 关≈200 → 第 50 关≈3.7万）
(function(){let s=0;for(let k=1;k<=50;k++)s+=Math.pow(k,1.35);window._LVRSUMM=s;})();
function lvReward(i){let r=Math.round(800000*Math.pow(i,1.35)/window._LVRSUMM);return Math.max(100,r);}

// 诱惑语池
const TEMPT_GOOD=['这里有大鱼！🐟','手感对了…要来了！','金光一闪！','好像有东西在动✨','来啊，点我~','就这里，绝对好货！','💎 传说在召唤','手感爆棚！','直觉说这里有好东西','👑 王者气息','大货在水下！'];
const TEMPT_FAKE=['这里有大鱼！🐟','超稀有！快点点看！','金光闪闪的！','UR鱼池！','100%出货！','必出SSR！','点我必赚！','大鱼在这！','传说级别！','👑 超级稀有！'];
const TEMPT_DECOY=['这里好像有动静…','一闪而过，是幻觉吗？','好像有东西…','嗯？刚才动了一下','有鱼吗…再看看'];

// 垃圾/干扰物品
const DECOYS=[
  {n:'旧靴子',e:'👢',v:0,msg:'一只破旧靴子…'},
  {n:'空罐头',e:'🥫',v:0,msg:'生锈的空罐头'},
  {n:'水草团',e:'🌿',v:3,msg:'钩到了水草'},
  {n:'枯树枝',e:'🪵',v:2,msg:'一根枯树枝'},
  {n:'塑料袋',e:'🛍️',v:0,msg:'废弃塑料袋…'},
  {n:'破渔网',e:'🥅',v:5,msg:'缠上了破渔网'},
  {n:'石头',e:'🪨',v:1,msg:'一块普通的石头'},
  {n:'气泡',e:'🫧',v:0,msg:'只是气泡而已'},
];

// ============ 策略道具系统 ============
const ITEMS={
  // ===== 经典道具（真假钓点 / 稀有度 / 竿数）=====
  flash:{name:'闪光弹',emoji:'💣',desc:'揭示所有假钓点，持续4秒',price:30,type:'instant'},
  accuracy:{name:'精准雷达',emoji:'🎯',desc:'下一个钓点必定为真货',price:50,type:'buff'},
  lucky:{name:'强化香饵',emoji:'🍀',desc:'接下来3次钓鱼稀有度+1级',price:80,type:'buff'},
  sandglass:{name:'延时沙漏',emoji:'⏰',desc:'本关/本日增加2次出竿机会',price:40,type:'instant'},
  refresh:{name:'呼唤鱼群',emoji:'🐟',desc:'立即刷新所有钓点',price:20,type:'instant'},
  // ===== 新版道具（潜水 / 灾难 / 宝藏 / 奇遇 / 青蛙）=====
  oxygen:{name:'高压氧气瓶',emoji:'🤿',desc:'潜水时长+10秒；未潜水时恢复1次潜水机会',price:60,type:'instant',advOnly:true},
  cloak:{name:'避风斗篷',emoji:'☂️',desc:'立刻平息当前灾难，并把危险值清零',price:120,type:'instant',advOnly:true},
  compass:{name:'寻宝罗盘',emoji:'🧭',desc:'立即在水面刷出2处隐藏宝藏',price:70,type:'instant',advOnly:true},
  whistle:{name:'糖果鸟哨',emoji:'🕊️',desc:'吹响哨子，立刻召来巨型糖果鸟',price:90,type:'instant',advOnly:true},
  frogdrink:{name:'蛙力饮料',emoji:'🥤',desc:'接下来3竿青蛙绝不失误（大鱼不再跑）',price:100,type:'buff'},
};

// ============ 鱼类图鉴数据 ============
// rarity: N(★★) R(★★★) SR(★★★★) SSR(★★★★★) UR(★★★★★★)
const FISH_POOL=[
  // N - 50%
  {id:'crucian',n:'小鲫鱼',e:'🐟',r:'N',  w:[0.2,1.5],v:40,  c:'#8da0b0'},
  {id:'bleak',  n:'白条子',e:'🐟',r:'N',  w:[0.05,0.3],v:20, c:'#c8c8c8'},
  {id:'chub',   n:'胖头鲢',e:'🐠',r:'N',  w:[0.8,3],v:60,   c:'#a0b0c0'},
  {id:'loach',  n:'泥鳅滑',e:'🐟',r:'N',  w:[0.1,0.5],v:30, c:'#8b7355'},
  {id:'wildcarp',n:'土鲫鱼',e:'🐟',r:'N', w:[0.3,1.8],v:50, c:'#9da0b0'},
  {id:'catfish',n:'黄颡鱼',e:'🐡',r:'N',  w:[0.2,1],v:70,   c:'#d4a040'},
  // R - 30%
  {id:'grasscarp',n:'大草鱼',e:'🐟',r:'R', w:[2,8],v:150,   c:'#6b8e5a'},
  {id:'greencarp',n:'青皮鲤',e:'🐟',r:'R', w:[1.5,6],v:140, c:'#5a8a6a'},
  {id:'bream',   n:'武昌鱼',e:'🐟',r:'R',  w:[0.5,2.5],v:180,c:'#88a0b0'},
  {id:'bighead', n:'花鲢鳙',e:'🐠',r:'R',  w:[3,12],v:160,  c:'#7a8aaa'},
  {id:'culter',  n:'翘嘴白',e:'🐠',r:'R',  w:[0.5,3],v:120, c:'#b0c0d0'},
  // SR - 13%
  {id:'bass',    n:'大口鲈',e:'🐟',r:'SR', w:[3,10],v:300,  c:'#4a7a4a'},
  {id:'mandarin',n:'桂鱼鲜',e:'🐟',r:'SR', w:[1,6],v:350,   c:'#d4b050'},
  {id:'snakehead',n:'黑鱼霸',e:'🐡',r:'SR',w:[2,15],v:280,  c:'#2a3a2a'},
  {id:'catfish-big',n:'鲶鱼胡',e:'🐡',r:'SR',w:[5,20],v:260,c:'#5a6a5a'},
  {id:'siniperca',n:'回弯鳜',e:'🐟',r:'SR',w:[2,8],v:320,  c:'#c09060'},
  // SSR - 5%
  {id:'goldcarp',n:'金鳞鲤',e:'✨',r:'SSR',w:[3,12],v:800,  c:'#FFD700'},
  {id:'arowana', n:'银龙鱼',e:'🐉',r:'SSR',w:[2,8],v:1200,  c:'#E8E8E8'},
  {id:'arapaima',n:'巨骨舌',e:'🦈',r:'SSR',w:[20,60],v:1500,c:'#8B4513'},
  {id:'eel',     n:'幽灵电鳗',e:'⚡',r:'SSR',w:[8,25],v:1000,c:'#00CED1'},
  // UR - 2%
  {id:'sturgeon',n:'中华鲟',e:'👑',r:'UR', w:[50,200],v:5000,c:'#FF6347'},
  {id:'dragon',  n:'湖中龙王',e:'🐲',r:'UR', w:[30,100],v:4000,c:'#9400D3'},
  {id:'koi',     n:'黄金锦鲤',e:'🏆',r:'UR', w:[5,15],v:4500,  c:'#FFD700'},
  // 特殊区域鱼种
  {id:'cloudcarp',n:'云纹锦鲤',e:'☁️',r:'SR', w:[1,5],v:380, c:'#E0E0FF',zone:'cloud'},
  {id:'skyray',   n:'天空魟鱼',e:'🪽',r:'SSR',w:[8,20],v:1100, c:'#87CEEB',zone:'sky'},
  {id:'suneel',   n:'金辉鳗',e:'🌟',r:'SSR',w:[5,15],v:1300, c:'#FFD700',zone:'sun'},
  {id:'clouddragon',n:'云中龙',e:'🐉',r:'UR', w:[8,25],v:4800, c:'#E8E8FF',zone:'cloud'},
  {id:'rockcrab', n:'岩壳蟹',e:'🦀',r:'R',  w:[0.5,3],v:200, c:'#8B7355',zone:'mountain'},
  {id:'sunkoi',   n:'日轮锦鲤',e:'☀️',r:'UR', w:[3,10],v:5000, c:'#FFA500',zone:'sun'},
  // 彩蛋鱼（仅通过 maybeEasterFish 0.3% 概率触发，不参与普通池抽选）
  {id:'milky',    n:'奶鱼',   e:'🍼',r:'UR', w:[3,10], v:6666, c:'#FFE8C8', easter:true},
];

// ============ 鱼类艺术系统：每条鱼用 canvas 独立绘制，绝不重样 ============
// s:身形  b:体色  be:腹部/花纹色  f:鳍尾色  t:尾型  p:花纹  e:眼  m:嘴  w:须  g:发光
const FISH_ART={
  crucian:{s:'oval',b:'#8da0b0',be:'#c0d0e0',f:'#6a8090',t:'fork',p:'none',e:'n',m:'s'},
  bleak:{s:'slender',b:'#d8d8d8',be:'#f0f0f0',f:'#b0b0b0',t:'fork',p:'line',e:'n',m:'s'},
  chub:{s:'round',b:'#a0b0c0',be:'#d0d8e0',f:'#8090a0',t:'round',p:'none',e:'big',m:'s'},
  loach:{s:'eel',b:'#8b7355',be:'#a89070',f:'#6a5035',t:'point',p:'none',e:'s',m:'s',w:1},
  wildcarp:{s:'oval',b:'#9da0b0',be:'#c8c8b8',f:'#7a8090',t:'fork',p:'spots',e:'n',m:'s'},
  catfish:{s:'catfish',b:'#d4a040',be:'#e8c878',f:'#b88830',t:'round',p:'none',e:'n',m:'wide',w:1},
  grasscarp:{s:'elongated',b:'#6b8e5a',be:'#a8c890',f:'#506a40',t:'square',p:'scale',e:'n',m:'s'},
  greencarp:{s:'oval',b:'#5a8a6a',be:'#88b89a',f:'#406a50',t:'fork',p:'scale',e:'n',m:'s'},
  bream:{s:'flat',b:'#88a0b0',be:'#c0d0e0',f:'#6a8090',t:'fork',p:'none',e:'n',m:'s'},
  bighead:{s:'bighead',b:'#7a8aaa',be:'#b0c0d8',f:'#5a6a8a',t:'round',p:'none',e:'big',m:'wide'},
  culter:{s:'sleek',b:'#b0c0d0',be:'#e0e8f0',f:'#8090a0',t:'fork',p:'none',e:'n',m:'up'},
  bass:{s:'oval',b:'#4a7a4a',be:'#a8c898',f:'#2a5a2a',t:'round',p:'stripes',e:'n',m:'wide'},
  mandarin:{s:'oval',b:'#d4b050',be:'#f0d890',f:'#a88830',t:'round',p:'spots',e:'n',m:'s'},
  snakehead:{s:'eel',b:'#2a3a2a',be:'#5a6a5a',f:'#1a2a1a',t:'round',p:'spots',e:'angry',m:'wide'},
  'catfish-big':{s:'catfish',b:'#5a6a5a',be:'#889a88',f:'#3a4a3a',t:'round',p:'none',e:'n',m:'wide',w:1},
  siniperca:{s:'oval',b:'#c09060',be:'#e8c098',f:'#a07040',t:'round',p:'spots',e:'n',m:'wide'},
  goldcarp:{s:'koi',b:'#FFD700',be:'#FFF0A0',f:'#E0B800',t:'flowing',p:'scales',e:'n',m:'s',g:1},
  arowana:{s:'dragon',b:'#E8E8E8',be:'#FFFFFF',f:'#B0B0B0',t:'flowing',p:'scales',e:'n',m:'s'},
  arapaima:{s:'armored',b:'#8B4513',be:'#C89060',f:'#6a3010',t:'round',p:'armor',e:'s',m:'wide'},
  eel:{s:'eel',b:'#00CED1',be:'#40E8E8',f:'#009a9a',t:'point',p:'glow',e:'n',m:'s',g:1},
  sturgeon:{s:'armored',b:'#FF6347',be:'#FFa090',f:'#c04030',t:'point',p:'armor',e:'n',m:'pointed'},
  dragon:{s:'dragon',b:'#9400D3',be:'#c060ff',f:'#7000a0',t:'flowing',p:'scales',e:'angry',m:'wide',g:1},
  koi:{s:'koi',b:'#FFD700',be:'#FFFFFF',f:'#E0B800',t:'flowing',p:'koi',e:'n',m:'s'},
  cloudcarp:{s:'koi',b:'#E0E0FF',be:'#FFFFFF',f:'#a0a0d0',t:'flowing',p:'cloud',e:'n',m:'s'},
  skyray:{s:'ray',b:'#87CEEB',be:'#c0e8f8',f:'#5099b8',t:'whip',p:'none',e:'n',m:'under'},
  suneel:{s:'eel',b:'#FFD700',be:'#FFF0A0',f:'#E0B800',t:'point',p:'glow',e:'n',m:'s',g:1},
  clouddragon:{s:'dragon',b:'#E8E8FF',be:'#FFFFFF',f:'#a0a0d8',t:'flowing',p:'scales',e:'n',m:'s',g:1},
  rockcrab:{s:'crab',b:'#8B7355',be:'#a89070',f:'#6a5035',t:'none',p:'none',e:'n',m:'s'},
  sunkoi:{s:'koi',b:'#FFA500',be:'#FFD070',f:'#E08000',t:'flowing',p:'sun',e:'n',m:'s',g:1},
  milky:{s:'image'},
};
function _p(c,fn){c.beginPath();fn(c);}
function drawFishArt(c,fish,x,y,size,dir,alpha){
  let cfg=FISH_ART[fish.id]||FISH_ART.crucian;
  c.save();
  c.globalAlpha=(alpha==null?1:alpha);
  c.translate(x,y);
  c.scale(size/40,size/40);
  if(dir<0)c.scale(-1,1);
  if(cfg.g){c.shadowColor=cfg.b;c.shadowBlur=18;}
  if(cfg.s==='image'){c.restore();return;}
  let b=cfg.b,be=cfg.be,f=cfg.f;
  c.fillStyle=f;
  if(cfg.t==='fork'){_p(c,()=>{c.moveTo(-30,0);c.lineTo(-58,-24);c.lineTo(-44,0);c.lineTo(-58,24);});c.fill();}
  else if(cfg.t==='round'){c.beginPath();c.ellipse(-38,0,16,22,0,0,Math.PI*2);c.fill();}
  else if(cfg.t==='square'){c.fillRect(-58,-20,20,40);}
  else if(cfg.t==='point'){_p(c,()=>{c.moveTo(-30,0);c.lineTo(-58,-7);c.lineTo(-58,7);});c.fill();}
  else if(cfg.t==='flowing'){_p(c,()=>{c.moveTo(-28,0);c.bezierCurveTo(-55,-30,-72,-10,-68,0);c.bezierCurveTo(-72,10,-55,30,-28,0);});c.fill();}
  else if(cfg.t==='whip'){c.lineWidth=5;c.strokeStyle=f;c.beginPath();c.moveTo(-8,4);c.quadraticCurveTo(-60,-2,-88,14);c.stroke();}
  if(cfg.s!=='ray'&&cfg.s!=='crab'){
    c.fillStyle=f;c.beginPath();
    if(cfg.s==='eel'||cfg.s==='dragon'){c.moveTo(-4,-9);c.quadraticCurveTo(6,-26,16,-9);}
    else{c.moveTo(-6,-13);c.quadraticCurveTo(6,-30,22,-12);}
    c.closePath();c.fill();
  }
  c.fillStyle=b;c.beginPath();
  switch(cfg.s){
    case 'oval':c.ellipse(0,0,32,16,0,0,Math.PI*2);break;
    case 'slender':c.ellipse(0,0,38,8,0,0,Math.PI*2);break;
    case 'round':c.ellipse(0,0,26,22,0,0,Math.PI*2);break;
    case 'eel':c.ellipse(0,0,40,9,0,0,Math.PI*2);break;
    case 'flat':c.ellipse(0,0,20,24,0,0,Math.PI*2);break;
    case 'sleek':c.ellipse(0,0,36,9,0,0,Math.PI*2);break;
    case 'bighead':c.ellipse(8,0,28,20,0,0,Math.PI*2);break;
    case 'catfish':c.ellipse(0,0,30,15,0,0,Math.PI*2);break;
    case 'koi':c.ellipse(0,0,30,16,0,0,Math.PI*2);break;
    case 'dragon':c.ellipse(0,0,34,11,0,0,Math.PI*2);break;
    case 'elongated':c.ellipse(0,0,38,12,0,0,Math.PI*2);break;
    case 'armored':c.ellipse(0,0,36,14,0,0,Math.PI*2);break;
    case 'ray':c.moveTo(0,0);c.quadraticCurveTo(8,-30,12,-14);c.quadraticCurveTo(45,-8,40,0);c.quadraticCurveTo(45,8,12,14);c.quadraticCurveTo(8,30,0,0);break;
    case 'crab':c.ellipse(0,0,28,18,0,0,Math.PI*2);break;
  }
  c.fill();
  c.fillStyle=be;c.beginPath();c.ellipse(6,7,22,4,0,0,Math.PI*2);c.fill();
  c.lineWidth=1.4;c.strokeStyle=be;
  if(cfg.p==='stripes'){for(let i=-2;i<=2;i++){c.beginPath();c.moveTo(i*10,-14);c.lineTo(i*10,14);c.stroke();}}
  else if(cfg.p==='spots'){c.fillStyle=be;for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){c.beginPath();c.arc(i*14,j*5,2.8,0,Math.PI*2);c.fill();}}
  else if(cfg.p==='scale'){for(let x=-22;x<24;x+=8)for(let y=-10;y<10;y+=7){c.beginPath();c.arc(x,y,3.2,0,Math.PI*2);c.stroke();}}
  else if(cfg.p==='armor'){for(let x=-24;x<28;x+=10){c.beginPath();c.moveTo(x,-13);c.lineTo(x,13);c.stroke();}for(let y=-10;y<10;y+=8){c.beginPath();c.moveTo(-30,y);c.lineTo(30,y);c.stroke();}}
  else if(cfg.p==='koi'){c.fillStyle='#fff';c.beginPath();c.ellipse(10,4,11,5,0,0,Math.PI*2);c.fill();c.fillStyle=b;c.beginPath();c.ellipse(-10,-2,9,4,0,0,Math.PI*2);c.fill();}
  else if(cfg.p==='cloud'){c.fillStyle=be;[{x:4,y:-2,r:6},{x:-6,y:3,r:5},{x:14,y:2,r:4}].forEach(p=>{c.beginPath();c.arc(p.x,p.y,p.r,0,Math.PI*2);c.fill();});}
  else if(cfg.p==='sun'){c.fillStyle='#fff';c.beginPath();c.arc(0,0,6,0,Math.PI*2);c.fill();c.strokeStyle='#fff';c.lineWidth=1.5;for(let i=0;i<8;i++){let a=i*Math.PI/4;c.beginPath();c.moveTo(Math.cos(a)*8,Math.sin(a)*8);c.lineTo(Math.cos(a)*14,Math.sin(a)*14);c.stroke();}}
  else if(cfg.p==='glow'){c.fillStyle='rgba(255,255,255,0.45)';c.beginPath();c.ellipse(0,0,32,7,0,0,Math.PI*2);c.fill();}
  else if(cfg.p==='line'){c.beginPath();c.moveTo(-32,-7);c.lineTo(32,-7);c.stroke();}
  c.fillStyle=f;c.beginPath();c.ellipse(4,13,10,5,0.5,0,Math.PI*2);c.fill();
  if(cfg.e!=='none'){
    let r=cfg.e==='big'?7:cfg.e==='s'?3.5:5;
    c.fillStyle='#fff';c.beginPath();c.arc(22,-4,r,0,Math.PI*2);c.fill();
    c.fillStyle='#000';c.beginPath();c.arc(23,-4,r*0.5,0,Math.PI*2);c.fill();
    if(cfg.e==='angry'){c.strokeStyle='#000';c.lineWidth=1.5;c.beginPath();c.moveTo(17,-10);c.lineTo(27,-9);c.stroke();}
  }
  c.strokeStyle='#000';c.lineWidth=1.2;c.fillStyle='#000';
  if(cfg.m==='up'){c.beginPath();c.moveTo(32,-2);c.quadraticCurveTo(30,-8,26,-6);c.stroke();}
  else if(cfg.m==='wide'){c.beginPath();c.moveTo(28,4);c.quadraticCurveTo(33,9,34,2);c.stroke();}
  else if(cfg.m==='pointed'){c.beginPath();c.moveTo(32,0);c.lineTo(30,-3);c.lineTo(30,3);c.closePath();c.fill();}
  else if(cfg.m==='under'){c.beginPath();c.arc(0,4,3,0,Math.PI);c.stroke();}
  else{c.beginPath();c.moveTo(30,2);c.quadraticCurveTo(33,5,32,7);c.stroke();}
  if(cfg.w){c.strokeStyle=b;c.lineWidth=1;c.beginPath();c.moveTo(24,2);c.quadraticCurveTo(40,10,50,20);c.stroke();c.beginPath();c.moveTo(24,4);c.quadraticCurveTo(40,14,48,26);c.stroke();}
  if(cfg.s==='ray'){c.fillStyle='#fff';c.beginPath();c.arc(2,-4,4,0,Math.PI*2);c.fill();c.fillStyle='#000';c.beginPath();c.arc(3,-4,2,0,Math.PI*2);c.fill();}
  if(cfg.s==='crab'){
    c.fillStyle=f;
    _p(c,()=>{c.moveTo(-22,-12);c.lineTo(-40,-22);c.lineTo(-44,-14);c.lineTo(-32,-6);});c.fill();
    _p(c,()=>{c.moveTo(-22,12);c.lineTo(-40,22);c.lineTo(-44,14);c.lineTo(-32,6);});c.fill();
    _p(c,()=>{c.moveTo(22,-12);c.lineTo(40,-22);c.lineTo(44,-14);c.lineTo(32,-6);});c.fill();
    _p(c,()=>{c.moveTo(22,12);c.lineTo(40,22);c.lineTo(44,14);c.lineTo(32,6);});c.fill();
    c.beginPath();c.arc(-44,-20,7,0,Math.PI*2);c.fill();
    c.beginPath();c.arc(-44,20,7,0,Math.PI*2);c.fill();
    c.beginPath();c.arc(44,-20,7,0,Math.PI*2);c.fill();
    c.beginPath();c.arc(44,20,7,0,Math.PI*2);c.fill();
    c.lineWidth=3;c.strokeStyle=f;
    [[-14,22,32],[-6,24,36],[6,24,36],[14,22,32],[-14,-22,-32],[-6,-24,-36],[6,-24,-36],[14,-22,-32]].forEach(([x1,y1,y2])=>{c.beginPath();c.moveTo(x1,y1);c.lineTo(x1+8,y2);c.stroke();});
    c.fillStyle='#fff';c.beginPath();c.arc(2,-10,4,0,Math.PI*2);c.fill();c.beginPath();c.arc(2,10,4,0,Math.PI*2);c.fill();
    c.fillStyle='#000';c.beginPath();c.arc(3,-10,2,0,Math.PI*2);c.fill();c.beginPath();c.arc(3,10,2,0,Math.PI*2);c.fill();
  }
  c.restore();
}
// 每条鱼渲染一次并缓存为 dataURL（DOM 用）
const _fishImgCache={};
function fishImgSrc(fish){
  if(fish.id==='milky')return _milkyUrl||'';
  if(_fishImgCache[fish.id])return _fishImgCache[fish.id];
  let px=180,cv=document.createElement('canvas');cv.width=px;cv.height=px;
  drawFishArt(cv.getContext('2d'),fish,px/2,px/2,40,1,1);
  let url=cv.toDataURL('image/png');
  _fishImgCache[fish.id]=url;
  return url;
}
// 统一的 <img> 生成：奶鱼未就绪时用占位符，加载完自动替换
function fishImgHtml(fish,cls){
  if(fish.id==='milky'&&!_milkyUrl){preloadMilky();return '<span data-milky data-milky-class="'+cls+'">🍼</span>';}
  return '<img class="'+cls+'" src="'+fishImgSrc(fish)+'" alt="">';
}
// 奶鱼素材：加载后自动抠掉白底
let _milkyUrl=null,_milkyLoading=false;
function preloadMilky(){
  if(_milkyUrl||_milkyLoading)return;
  _milkyLoading=true;
  let img=new Image();
  img.onload=()=>{
    let px=200,cv=document.createElement('canvas');cv.width=px;cv.height=px;
    let c=cv.getContext('2d');
    let sc=Math.min(px/img.width,px/img.height),w=img.width*sc,h=img.height*sc;
    c.drawImage(img,(px-w)/2,(px-h)/2,w,h);
    let id=c.getImageData(0,0,px,px),d=id.data;
    for(let i=0;i<d.length;i+=4){if(d[i]>235&&d[i+1]>235&&d[i+2]>235)d[i+3]=0;}
    c.putImageData(id,0,0);
    _milkyUrl=cv.toDataURL('image/png');
    document.querySelectorAll('[data-milky]').forEach(el=>{
      let cls=el.getAttribute('data-milky-class')||'';
      el.outerHTML='<img class="'+cls+'" src="'+_milkyUrl+'" alt="">';
    });
  };
  img.onerror=()=>{_milkyLoading=false;};
  img.src='奶鱼素材.jpg';
}
preloadMilky();

const RARITY_GLOW={N:'#4488cc',R:'#8a44dd',SR:'#ddaa22',SSR:'#ff8822',UR:'#ff44aa'};
const RARITY_STARS={N:'★★',R:'★★★',SR:'★★★★',SSR:'★★★★★',UR:'★★★★★★'};
const RARITY_ORDER=['N','R','SR','SSR','UR'];
const RARITY_NAME={N:'普通',R:'稀有',SR:'史诗',SSR:'传说',UR:'神话',easter:'彩蛋'};
// 图鉴首次解锁奖励：越稀有金币越高
const ALBUM_REWARD={N:200,R:600,SR:2000,SSR:6000,UR:20000,easter:8888};
const RARITY_WEIGHTS={N:500,R:300,SR:130,SSR:50,UR:20}; // out of 1000
const COST_SINGLE=100, COST_TEN=900;
const PITY_SR=10, PITY_SSR=90, SOFT_PITY=75;
const START_COINS=500;

// ============ 青蛙养成系统 ============
const FROG_CFG=[
  {lv:1,rate:0.60,xp:80,name:'蝌蚪蛙',color:'#8BC34A',size:0.82},
  {lv:2,rate:0.70,xp:200,name:'小青蛙',color:'#4FC3F7',size:0.90},
  {lv:3,rate:0.80,xp:400,name:'大眼蛙',color:'#66BB6A',size:1.00},
  {lv:4,rate:0.90,xp:800,name:'金瞳蛙',color:'#AB47BC',size:1.12},
  {lv:5,rate:1.00,xp:99999,name:'神钓蛙',color:'#FFD700',size:1.28},
];
const FROG_XP={N:8,R:16,SR:32,SSR:64,UR:128,FAKE:1};
const ADV_DAYS=100, ADV_TARGET=1000000;
// 全局目标：100 天内赚到 100 万（闯关+冒险共同累计）
const GOAL_DAYS=100, GOAL_TARGET=1000000;
const ADV_CASTS_PER_DAY=20; // 仅闯关模式沿用：每关 20 竿上限（冒险模式每天捕鱼数量不限制）
const FROG_UPGRADE_COST=[0,300,800,2000,5000]; // 青蛙付费升级花费（按当前等级）
const DANGER_SAFE=30, DANGER_WARN=50, DANGER_DANGER=70, DANGER_DOOM=90;
const DANGER_CAST=3, DANGER_FAKE=8, DANGER_RARE=-5, DANGER_TIME=0.5;
const DANGER_PREMONITION=80; // 80%+ 开始出现暴风雨预兆
const DANGER_DISASTER_CHANCE=0.06; // 90%+每秒6%概率触发灾难

// ============ 全局时间系统（参考《星露谷物语》）============
// 一天从早上 6:00 开始，到次日凌晨 2:00 结束（共 20 游戏小时 = 1200 游戏分钟）
// 流速：每 7 秒真实时间流逝 10 游戏分钟（星露谷流速），即一整天约 14 分钟真实时间
const CLOCK_START=360;          // 早上 6:00（游戏内分钟）
const CLOCK_DAY_LEN=1200;       // 6:00 → 次日 2:00
const CLOCK_MIN_PER_SEC=10/7;   // 每 1 秒真实时间 = 10/7 游戏分钟

// ============ 时间流速（1x / 2x / 4x）============
// 只加速"游戏内时间"：全局时钟（天数 / 时段 / 日出日落）、种鱼生长、以及随时间累积的危险值。
// 钓鱼手感、鱼群游动、粒子、潜水小游戏等实时演出保持原速，不受影响。
const TIME_SCALES=[1,2,4];
let timeScale=1;
// 当前流速下"一整天"约需多少真实分钟（×1 时约 14 分钟）
function timeScaleDayMinutes(){return Math.round(CLOCK_DAY_LEN/CLOCK_MIN_PER_SEC/timeScale/60*10)/10;}
function updateTimeScaleUI(){
  let txt='⏩ ×'+timeScale;
  let nodes=document.querySelectorAll('.js-time-speed');
  for(let i=0;i<nodes.length;i++){
    let b=nodes[i];
    b.textContent=txt;
    b.classList.toggle('fast',timeScale===2);
    b.classList.toggle('turbo',timeScale===4);
    b.title='时间流速 ×'+timeScale+' · 一天约 '+timeScaleDayMinutes()+' 分钟（点击切换 1/2/4 倍）';
  }
}
function cycleTimeScale(){
  let i=TIME_SCALES.indexOf(timeScale);
  timeScale=TIME_SCALES[(i+1)%TIME_SCALES.length];
  try{localStorage.setItem('nbc_timeScale',String(timeScale));}catch(e){}
  updateTimeScaleUI();
  if(timeScale===1)toast('⏩ 时间流速 ×1 · 已恢复正常速度','gray');
  else toast('⏩ 时间流速 ×'+timeScale+' · 一天约 '+timeScaleDayMinutes()+' 分钟（危险值同步加快）','blue');
  sfx_reveal_N();
}
function loadTimeScale(){
  let v=1;
  try{v=parseInt(localStorage.getItem('nbc_timeScale')||'1',10);}catch(e){}
  if(TIME_SCALES.indexOf(v)<0)v=1;
  timeScale=v;
  updateTimeScaleUI();
}

// ============ 种鱼模式（Fish Farm）============
const GARDEN_PLOTS=6;           // 鱼塘格子数量
const GARDEN_UNLOCK_CAUGHT=1;   // 第一次钓鱼（至少钓到1条）回来小岛后解锁种鱼模式

// ============ 灾难类型系统 ============
const DISASTERS=[
  {id:'storm',name:'暴风雨',icon:'⛈️',desc:'狂风暴雨席卷海面！闪电劈裂天空',effect:'loss_20',msg:'{amt}💰 被风暴卷走了！',visual:'storm'},
  {id:'tsunami',name:'巨浪海啸',icon:'🌊',desc:'巨浪吞噬了甲板！',effect:'loss_35',msg:'{amt}💰 被巨浪冲走了！',visual:'tsunami'},
  {id:'tornado',name:'龙卷水柱',icon:'🌪️',desc:'海上龙卷风袭来！',effect:'loss_25_end',msg:'{amt}💰 损失+强制收竿！',visual:'tornado'},
  {id:'kraken',name:'深海巨怪',icon:'🐙',desc:'巨大触手从海底伸出！',effect:'lose_day',msg:'今天的鱼获全没了！',visual:'kraken'},
  {id:'darkfog',name:'诡异黑雾',icon:'🌫️',desc:'黑雾突然笼罩海面，鱼获被卷走...',effect:'loss_10',msg:'{amt}💰 在迷雾中丢了！',visual:'fog'},
  {id:'hail',name:'冰雹袭击',icon:'🧊',desc:'拳头大的冰雹砸下来！',effect:'loss_15_stun',msg:'{amt}💰 损失+冻结3秒！',visual:'hail'},
];
let disasterFX={active:false,type:null,timer:0,intensity:0,paused:false};
let disasterAmbient=null; // 灾难环境音振荡器组
let stormWarn={active:false,timer:0,lightning:0,rainDrops:[],darkAlpha:0,windOff:0};

// ============ 奇遇系统 ============
const GOOD_EVENTS=[
  {id:'diamond_rain',name:'钻石雨',icon:'💎',desc:'天上突然下起了钻石！',effect:'bonus_80_150',msg:'天降钻石雨，+{amt}💰！',visual:'diamonds'},
  {id:'fish_surge',name:'鱼跃龙门',icon:'🐟',desc:'一大群鱼跳上了甲板！',effect:'bonus_50_120',msg:'鱼跃龙门，+{amt}💰！',visual:'fish_surge'},
  {id:'mermaid',name:'人鱼之歌',icon:'🧜',desc:'美人鱼浮出水面歌唱...',effect:'rare_boost',msg:'未来3次的稀有度提升了！',visual:'mermaid'},
  {id:'rainbow',name:'彩虹桥',icon:'🌈',desc:'一道彩虹横跨海面！',effect:'next_ur',msg:'下一次抛竿必出UR！',visual:'rainbow'},
  {id:'seagull',name:'海鸥衔金',icon:'🦅',desc:'一只海鸥衔着金币飞来！',effect:'bonus_30_60',msg:'海鸥送来了{amt}💰！',visual:'seagull'},
  {id:'treasure_chest',name:'漂流宝箱',icon:'🎁',desc:'海浪冲来一个发光的宝箱！',effect:'bonus_60_100',msg:'宝箱里藏了{amt}💰！',visual:'chest'},
  {id:'candy_bird',name:'巨型糖果鸟',icon:'🦜',desc:'天空中飞来一只巨大的糖果鸟！',effect:'candy_bird',msg:'',visual:'candy_bird'},
];
let goodEventFX={active:false,type:null,timer:0,intensity:0};
let goodCheckTimer=0;
let candyBird={active:false,timer:0,x:0,y:0,clicks:0,maxClicks:3,phase:'idle',size:1,shakeTimer:0,popTimer:0};
let tongueState={active:false,phase:'idle',startX:0,startY:0,targetX:0,targetY:0,progress:0,hitTreasure:null};
let hiddenTreasures=[];
let treasureSpawnTimer=0;
let treasureCollectAnim=[];

// ============ 波塞冬脑筋急转弯 ============
const POSEIDON_RIDDLES=[
  {q:'什么东西越洗越脏？',a:'水',wrong:['布','手','毛巾']},
  {q:'什么东西有头无脚，却走遍天下？',a:'船',wrong:['鱼','鸟','风']},
  {q:'什么鱼不能在水里游？',a:'木鱼',wrong:['章鱼','鱿鱼','鲸鱼']},
  {q:'一个人在海里游泳为什么头发没湿？',a:'是光头',wrong:['带了帽子','海很深','头发防水']},
  {q:'为什么鱼不说话？',a:'因为在水里',wrong:['它不识字','没有舌头','嘴太小']},
  {q:'什么东西不用手却能敲门？',a:'风',wrong:['头','脚','雨']},
  {q:'什么东西天气越热爬得越高？',a:'温度计',wrong:['猴子','梯子','气球']},
  {q:'什么船最安全？',a:'停在海港的船',wrong:['救生船','渔船','航母']},
  {q:'什么东西破了比不破好？',a:'记录',wrong:['衣服','船帆','鱼网']},
  {q:'渔夫最怕什么？',a:'没鱼',wrong:['鲨鱼','风暴','海怪']},
  {q:'什么海没有水？',a:'人海',wrong:['红海','死海','脑海']},
  {q:'为什么螃蟹横着走？',a:'因为有钱（钳）任性',wrong:['腿不对称','看路方便','天生就这样']},
];
let poseidon={active:false,riddle:null,answered:false};
function poseidonEncounter(){
  if(poseidon.active)return;
  let r=POSEIDON_RIDDLES[Math.floor(Math.random()*POSEIDON_RIDDLES.length)];
  poseidon.active=true;poseidon.riddle=r;poseidon.answered=false;
  // 生成选项：正确+2个错误
  let options=[r.a,...r.wrong.slice(0,2)];
  // 随机打乱
  for(let i=options.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[options[i],options[j]]=[options[j],options[i]];}
  document.getElementById('poseidonQuestion').textContent='🐟 "'+r.q+'"';
  let btns=document.querySelectorAll('#poseidonOptions .poseidon-btn');
  btns.forEach((b,i)=>{b.textContent=options[i];b._answer=options[i];b.className='poseidon-btn';});
  document.getElementById('poseidonOverlay').classList.add('active');
  sfx_good_mermaid();
}
function poseidonAnswer(answer){
  if(poseidon.answered)return;
  poseidon.answered=true;
  let correct=answer===poseidon.riddle.a;
  let btns=document.querySelectorAll('#poseidonOptions .poseidon-btn');
  btns.forEach(b=>{if(b._answer===poseidon.riddle.a)b.classList.add('correct');if(b._answer===answer&&!correct)b.classList.add('wrong');});
  if(correct){
    let reward=500+Math.floor(Math.random()*301);
    recordIncome(reward);
    let freshlyUnlocked=!G.islandUnlocked;
    if(freshlyUnlocked){G.islandUnlocked=true;} // 首次答对解锁种鱼功能
    setTimeout(()=>{toast('🔱 海神龙颜大悦！奖励 '+reward+'💰！'+(freshlyUnlocked?' 🏝️小岛种鱼池解锁！':''),'gold');sfx_reveal_UR();updateUI();},400);
  }else{
    let pity=30+Math.floor(Math.random()*41);
    recordIncome(pity);
    setTimeout(()=>{toast('🔱 海神摇摇头："再想想吧…" 安慰奖 +'+pity+'💰','orange');sfx_reveal_N();updateUI();},400);
  }
  setTimeout(()=>closePoseidon(),2000);
}
function closePoseidon(){
  document.getElementById('poseidonOverlay').classList.remove('active');
  poseidon.active=false;poseidon.riddle=null;
}


// ============ Web Audio BGM & SFX ============
let AC=null, bgmG=null, sfxG=null, muted=false;
// 保险：若当前曲目应播放却处于暂停（如浏览器自动播放被拦），任何交互后都尝试恢复
function ensureMusicPlaying(){
  let t=MUSIC_TRACKS[musicIdx];
  if(!t||t.off||muted)return;
  if(t.file){
    let a=getBgmAudioEl();
    if(a&&a.paused){let p=a.play();if(p&&p.catch)p.catch(()=>{});}
  }
}
function initAudio(){
  if(AC){if(AC.state==='suspended')AC.resume().catch(()=>{});ensureMusicPlaying();return;}
  AC=new(window.AudioContext||window.webkitAudioContext)();
  AC.resume().catch(()=>{});
  bgmG=AC.createGain();bgmG.gain.value=0.7;bgmG.connect(AC.destination);
  sfxG=AC.createGain();sfxG.gain.value=1.0;sfxG.connect(AC.destination);
  applyMusic();
}
// ===== 背景音乐曲目：原创《遐夏》为默认，循环播放；可自由切换 =====
const MUSIC_TRACKS=[
  {name:'遐夏（原创纯手搓）',file:'bgm-xiaxia.mp3'},
  {name:'悠闲假日（纯AI）',file:null},
  {name:'关闭音乐',file:null,off:true}
];
let musicIdx=0, bgmAudioEl=null;
function getBgmAudioEl(){
  if(!bgmAudioEl)bgmAudioEl=document.getElementById('bgmFileAudio');
  return bgmAudioEl;
}
// 按当前曲目应用播放（原创曲目走 <audio> 循环，纯AI 走合成器）
function applyMusic(){
  let t=MUSIC_TRACKS[musicIdx]||MUSIC_TRACKS[0];
  let isOff=!!t.off||muted;
  let btn=document.getElementById('musicBtn');
  if(btn){btn.textContent='🎵 '+(isOff?'🔇 已关闭':t.name);btn.classList.toggle('muted',isOff);}
  stopBGM();
  let a=getBgmAudioEl();if(a)a.pause();
  if(bgmG)bgmG.gain.value=0.7;
  if(isOff){if(bgmG)bgmG.gain.value=0;return;}
  if(t.file){
    if(a){
      if(!a.src)a.src=encodeURI(t.file);
      a.loop=true;a.volume=0.75;
      if(AC&&AC.state==='suspended')AC.resume().catch(()=>{});
      let p=a.play();if(p&&p.catch)p.catch(()=>{});
    }
  }else{
    if(AC){if(AC.state==='suspended')AC.resume().catch(()=>{});playBGM();}
  }
}
// 常驻按钮：循环切换曲目
function cycleMusic(){
  if(!AC){initAudio();}
  musicIdx=(musicIdx+1)%MUSIC_TRACKS.length;
  let t=MUSIC_TRACKS[musicIdx];
  muted=!!t.off; // 选到"关闭音乐"就静音；切回曲目自动恢复
  applyMusic();
  let b=document.getElementById('bgmToggle');if(b){b.textContent=muted?'🔇':'🔊';b.classList.toggle('muted',muted);}
  toast(muted?'🔇 已关闭背景音乐':'🎵 切换到：'+t.name,'blue');
}
function toggleBGM(){
  if(!AC){initAudio();}
  muted=!muted;
  if(!muted&&MUSIC_TRACKS[musicIdx]&&MUSIC_TRACKS[musicIdx].off)musicIdx=0;
  let b=document.getElementById('bgmToggle');
  b.textContent=muted?'🔇':'🔊';b.classList.toggle('muted',muted);
  applyMusic();
}
function note(f,d,t='sine',v=0.2,del=0,g=null){
  if(!AC||muted)return;
  if(AC.state==='suspended')AC.resume().catch(()=>{});
  let o=AC.createOscillator(),gain=AC.createGain();
  o.type=t;o.frequency.value=f;
  gain.gain.setValueAtTime(v,AC.currentTime+del);
  gain.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+del+d);
  o.connect(gain);gain.connect(g||sfxG||AC.destination);
  o.start(AC.currentTime+del);o.stop(AC.currentTime+del+d+0.05);
}

// ============ Tropical House BGM ============
const TH_BPM=106, TH_BEAT=60000/TH_BPM, TH_BAR=TH_BEAT*4;
let bgmTimers=[],bgmDrumG=null,bgmBassG=null,bgmLeadG=null,bgmPadG=null,bgmStep=0;
function clearBGM(){bgmTimers.forEach(clearTimeout);bgmTimers=[];}
function stopBGM(){clearBGM();}
function noise(dur,v,hp=8000,lp=8000,g=null){
  if(!AC||muted)return;
  let len=Math.floor(AC.sampleRate*dur),buf=AC.createBuffer(1,len,AC.sampleRate);
  let d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
  let src=AC.createBufferSource(),gain=AC.createGain();
  let hpF=AC.createBiquadFilter();hpF.type='highpass';hpF.frequency.value=hp;
  let lpF=AC.createBiquadFilter();lpF.type='lowpass';lpF.frequency.value=lp;
  src.buffer=buf;gain.gain.setValueAtTime(v,AC.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+dur);
  src.connect(hpF);hpF.connect(lpF);lpF.connect(gain);gain.connect(g||bgmG);
  src.start();src.stop(AC.currentTime+dur+0.02);
}
function thKick(){
  if(!AC||muted)return;
  let o=AC.createOscillator(),g=AC.createGain();
  o.type='sine';o.frequency.setValueAtTime(150,AC.currentTime);
  o.frequency.exponentialRampToValueAtTime(40,AC.currentTime+0.10);
  g.gain.setValueAtTime(1.0,AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+0.30);
  o.connect(g);g.connect(bgmDrumG||bgmG);o.start();o.stop(AC.currentTime+0.32);
  noise(0.015,0.30,4000,12000,bgmDrumG||bgmG);
}
function thClap(){
  if(!AC||muted)return;
  noise(0.09,0.50,1200,9000,bgmDrumG||bgmG);
  setTimeout(()=>{noise(0.05,0.30,2500,11000,bgmDrumG||bgmG);},25);
}
function thHHC(){if(!AC||muted)return;noise(0.04,0.20,7000,16000,bgmDrumG||bgmG);}
function thHHO(){if(!AC||muted)return;noise(0.12,0.25,6000,15000,bgmDrumG||bgmG);}
function thBass(f,v=0.5,dur=0.35){
  if(!AC||muted)return;
  let o=AC.createOscillator(),sub=AC.createOscillator(),g=AC.createGain(),lp=AC.createBiquadFilter();
  o.type='sawtooth';o.frequency.value=f;sub.type='sine';sub.frequency.value=f*0.5;
  lp.type='lowpass';lp.frequency.value=320;lp.Q.value=1.2;
  g.gain.setValueAtTime(v,AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+dur);
  o.connect(lp);sub.connect(lp);lp.connect(g);g.connect(bgmBassG||bgmG);
  o.start();o.stop(AC.currentTime+dur+0.03);sub.start();sub.stop(AC.currentTime+dur+0.03);
}
function thPluck(f,v=0.35,dur=0.22){
  if(!AC||muted)return;
  let o=AC.createOscillator(),g=AC.createGain();
  o.type='triangle';o.frequency.value=f;
  g.gain.setValueAtTime(v,AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+dur);
  o.connect(g);g.connect(bgmLeadG||bgmG);o.start();o.stop(AC.currentTime+dur+0.03);
}
function playBGM(){
  clearBGM();
  if(!AC||muted)return;
  if(!bgmDrumG){bgmDrumG=AC.createGain();bgmDrumG.gain.value=0.6;bgmDrumG.connect(bgmG);}
  if(!bgmBassG){bgmBassG=AC.createGain();bgmBassG.gain.value=0.5;bgmBassG.connect(bgmG);}
  if(!bgmLeadG){bgmLeadG=AC.createGain();bgmLeadG.gain.value=0.4;bgmLeadG.connect(bgmG);}
  if(!bgmPadG){bgmPadG=AC.createGain();bgmPadG.gain.value=0.25;bgmPadG.connect(bgmG);}
  const chords=[[220,261.63,329.63,392],[174.61,220,261.63,329.63],[261.63,329.63,392,493.88],[196,246.94,293.66,392]];
  const bassR=[110,87.31,130.81,98];
  const pent=[261.63,293.66,329.63,392,440,523.25,587.33,659.25,784,880,1046.5,1174.66];
  let chordI=0,melI=4;
  function seq(){
    if(!AC||muted){bgmTimers.push(setTimeout(seq,TH_BEAT/4));return;}
    let s=bgmStep%64;
    if(s%16===0){chordI=Math.floor(s/16)%4;chords[chordI].forEach((f,i)=>note(f,TH_BAR/1000,'sine',0.06+i*0.015,0,bgmPadG));}
    if(s%4===0)thBass(bassR[chordI],0.5,0.42);
    else if(s%4===2)thBass(bassR[chordI],0.3,0.18);
    if(s%4===0)thKick();
    if(s%16===4||s%16===12)thClap();
    if(s%2===1)thHHC();
    if(s%16===14)thHHO();
    if(s%2===0&&Math.random()<0.60){
      melI=Math.max(0,Math.min(pent.length-1,melI+(Math.random()<0.55?1:-1)*(Math.floor(Math.random()*3)+1)));
      thPluck(pent[melI],0.18+Math.random()*0.10,0.12+Math.random()*0.15);
      if(Math.random()<0.25)thPluck(pent[Math.max(0,melI-2)],0.10,0.10+Math.random()*0.10);
    }
    if(s%16===8&&Math.random()<0.7)thPluck(pent[9+Math.floor(Math.random()*3)],0.14,0.10);
    bgmStep++;bgmTimers.push(setTimeout(seq,TH_BEAT/4));
  }
  bgmStep=0;seq();
}

// ============ 抽卡 SFX ============
function sfx_pull(){note(200,0.12,'triangle',0.3,0);note(300,0.08,'triangle',0.2,0.05);note(150,0.1,'triangle',0.25,0.02);}
function sfx_splash(){note(180,0.25,'sine',0.3,0);note(120,0.4,'sine',0.2,0.06);}
function sfx_reveal_N(){note(400,0.15,'triangle',0.2,0);note(500,0.1,'triangle',0.15,0.08);}
function sfx_reveal_R(){note(500,0.2,'triangle',0.25,0);note(600,0.15,'triangle',0.2,0.06);note(700,0.12,'triangle',0.15,0.12);}
function sfx_reveal_SR(){chord_sfx([[523,0.25],[659,0.25],[784,0.3]],0.28,0);
  setTimeout(()=>chord_sfx([[659,0.2],[784,0.2],[1047,0.25]],0.25,0),150);}
function sfx_reveal_SSR(){chord_sfx([[784,0.35],[988,0.35],[1175,0.35],[1319,0.4]],0.35,0);
  setTimeout(()=>note(1568,0.5,'triangle',0.3,0.1),100);}
function sfx_reveal_UR(){chord_sfx([[523,0.5],[659,0.5],[784,0.5],[1047,0.6],[1319,0.6]],0.4,0);
  setTimeout(()=>chord_sfx([[784,0.4],[988,0.4],[1175,0.4],[1568,0.5]],0.35,0),200);
  setTimeout(()=>note(2093,0.8,'triangle',0.4,0.3),400);}
function chord_sfx(notes,v,del){notes.forEach(([f,d])=>note(f,d,'triangle',v,del,sfxG));}
// 一天过去 / 新的一天开始提示音：轻柔两声上行铃音 + 极轻秒针感
function sfx_day_pass(){
  if(!AC||muted)return;
  if(AC.state==='suspended')AC.resume().catch(()=>{});
  note(523.25,0.45,'sine',0.22,0);       // C5
  note(659.25,0.45,'sine',0.20,0.13);    // E5
  note(783.99,0.75,'triangle',0.24,0.26);// G5 收尾铃音（晨钟感）
  noise(0.05,0.05,2000,8000,sfxG);       // 极轻"嗒"秒针
}

// ============ 灾难 SFX ============
function sfx_disaster_storm(){
  // 低沉雷鸣 + 闪电劈裂 - 增强版
  noise(1.5,0.85,40,500,sfxG);
  note(45,1.2,'sawtooth',0.65,0,sfxG);
  setTimeout(()=>{note(32,0.9,'sawtooth',0.7,0,sfxG);noise(0.4,0.9,80,1800,sfxG);},350);
  setTimeout(()=>{note(75,0.2,'square',0.55,0,sfxG);noise(0.1,1.0,2500,9000,sfxG);},850);
  setTimeout(()=>noise(0.7,0.7,40,400,sfxG),1300);
  // 持续低沉轰隆
  setTimeout(()=>noise(2.0,0.4,30,350,sfxG),1800);
}
function sfx_thunder(vol){
  // 闪电雷声：低频轰鸣 + 短促劈裂，vol 0-1 控制远近大小
  if(!AC||muted)return;
  if(AC.state==='suspended')AC.resume().catch(()=>{});
  let v=Math.max(0.06,Math.min(1,vol||0.6));
  noise(1.2,v,40,500,sfxG);
  note(45,1.0,'sawtooth',v*0.75,0,sfxG);
  setTimeout(()=>{noise(0.35,v*0.9,80,1800,sfxG);note(65+Math.random()*20,0.15,'square',v*0.5,0,sfxG);},250+Math.random()*250);
  setTimeout(()=>noise(1.5,v*0.5,30,400,sfxG),600);
}
function sfx_disaster_tsunami(){
  // 深海低鸣 + 巨浪冲击 - 增强版
  noise(2.0,0.85,20,350,sfxG);
  note(28,1.3,'sine',0.75,0,sfxG);
  note(45,1.0,'sine',0.55,0.12,sfxG);
  setTimeout(()=>{noise(0.6,1.0,80,2500,sfxG);note(25,0.8,'triangle',0.7,0,sfxG);noise(0.3,0.9,200,4000,sfxG);},550);
  setTimeout(()=>noise(0.5,0.8,150,4500,sfxG),1100);
  setTimeout(()=>noise(1.5,0.5,25,300,sfxG),1800);
}
function sfx_disaster_tornado(){
  // 旋风呼啸 + 上升音阶 - 增强版
  noise(2.2,0.7,400,9000,sfxG);
  setTimeout(()=>noise(0.4,0.55,300,5500,sfxG),400);
  [200,260,330,400,520,660].forEach((f,i)=>note(f,0.3,'sine',0.28,i*0.12,sfxG));
  setTimeout(()=>noise(1.0,0.75,250,4500,sfxG),900);
  setTimeout(()=>noise(1.5,0.5,500,7000,sfxG),1700);
}
function sfx_disaster_kraken(){
  // 深海低吼 + 震动 - 增强版
  noise(2.5,0.9,15,250,sfxG);
  note(22,1.8,'sawtooth',0.7,0,sfxG);
  note(38,1.5,'sawtooth',0.45,0.25,sfxG);
  note(18,1.2,'triangle',0.6,0.7,sfxG);
  setTimeout(()=>noise(1.0,0.8,12,180,sfxG),1100);
  setTimeout(()=>note(15,1.3,'sawtooth',0.55,0.4,sfxG),550);
  setTimeout(()=>noise(1.8,0.55,20,250,sfxG),2000);
}
function sfx_disaster_darkfog(){
  // 诡异的渐弱高音 - 增强版
  noise(2.0,0.5,1500,10000,sfxG);
  note(880,0.8,'sine',0.22,0,sfxG);
  note(1100,0.7,'sine',0.18,0.25,sfxG);
  note(660,1.0,'sine',0.15,0.55,sfxG);
  setTimeout(()=>{noise(0.8,0.4,2500,9000,sfxG);note(1320,0.6,'sine',0.12,0,sfxG);},750);
  setTimeout(()=>noise(1.5,0.35,1800,11000,sfxG),1600);
}
function sfx_disaster_hail(){
  // 冰雹砸击 - 短促高频敲击 - 增强版
  noise(0.2,0.9,2500,14000,sfxG);
  note(1400,0.1,'square',0.5,0,sfxG);
  for(let i=1;i<8;i++){
    setTimeout(()=>{
      noise(0.08,0.7,1800+(i*800),13000,sfxG);
      note(700+Math.random()*700,0.06,'square',0.4,0,sfxG);
    },i*130+Math.random()*60);
  }
  setTimeout(()=>noise(0.12,0.65,1200,11000,sfxG),850);
  setTimeout(()=>noise(0.3,0.5,2000,12000,sfxG),1400);
}

function sfx_disaster_ambient_start(type){
  if(!AC)return;
  sfx_disaster_ambient_stop();
  disasterAmbient={nodes:[],timer:0};
  let cfg={
    storm:{rumble:[30,50,70],hiss:[800,2000],vol:0.25,wind:0.3},
    tsunami:{rumble:[15,30,50],hiss:[200,800],vol:0.3,wind:0.2},
    tornado:{rumble:[40,60,100],hiss:[1500,4000],vol:0.22,wind:0.45},
    kraken:{rumble:[10,20,35],hiss:[100,400],vol:0.35,wind:0.15},
    darkfog:{rumble:[25,45,80],hiss:[800,6000],vol:0.18,wind:0.25},
    hail:{rumble:[50,80,120],hiss:[2000,8000],vol:0.2,wind:0.35},
  }[type]||cfg.storm;
  // 持续低频轰鸣
  for(let f of cfg.rumble){
    let osc=AC.createOscillator();osc.type='sine';osc.frequency.value=f;
    let g=AC.createGain();g.gain.value=0;
    osc.connect(g);g.connect(sfxG);
    g.gain.linearRampToValueAtTime(cfg.vol*0.4,AC.currentTime+0.5);
    osc.start();
    disasterAmbient.nodes.push({osc,gain:g,base:cfg.vol*0.4});
  }
  // 风噪
  function makeWind(vol,fRange){
    let buf=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate);
    let d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1);
    let src=AC.createBufferSource();src.buffer=buf;src.loop=true;
    let flt=AC.createBiquadFilter();flt.type='bandpass';
    flt.frequency.value=fRange[0]+(fRange[1]-fRange[0])*0.3;
    flt.Q.value=0.3;
    let g=AC.createGain();g.gain.value=0;
    src.connect(flt);flt.connect(g);g.connect(sfxG);
    g.gain.linearRampToValueAtTime(vol,AC.currentTime+0.8);
    src.start();
    disasterAmbient.nodes.push({osc:src,gain:g,filter:flt,fRange:fRange});
  }
  makeWind(cfg.wind,cfg.hiss);
  // 低频脉冲
  let pulse=AC.createOscillator();pulse.type='triangle';pulse.frequency.value=0.6;
  let pg=AC.createGain();pg.gain.value=0;
  let mod=AC.createGain();mod.gain.value=cfg.vol*30;
  pulse.connect(mod);mod.connect(pulse.frequency);
  pulse.connect(pg);pg.connect(sfxG);
  pg.gain.linearRampToValueAtTime(cfg.vol*0.25,AC.currentTime+1);
  pulse.start();
  disasterAmbient.nodes.push({osc:pulse,gain:pg});
}
function sfx_disaster_ambient_stop(){
  if(!disasterAmbient)return;
  try{
    for(let n of disasterAmbient.nodes){
      n.gain.gain.cancelScheduledValues(AC.currentTime);
      n.gain.gain.setValueAtTime(n.gain.gain.value||0,AC.currentTime);
      n.gain.gain.linearRampToValueAtTime(0,AC.currentTime+0.6);
      try{if(n.osc.stop)n.osc.stop(AC.currentTime+0.7);}catch(_){}
    }
  }catch(_){}
  setTimeout(()=>{disasterAmbient=null;},800);
}

// ============ 预警阶段雷雨环境音（与画面同步） ============
let rainAmbient=null;
function sfx_rain_start(vol){
  if(!AC||muted||rainAmbient)return;
  try{
    let buf=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate);
    let d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
    let src=AC.createBufferSource();src.buffer=buf;src.loop=true;
    let hp=AC.createBiquadFilter();hp.type='highpass';hp.frequency.value=1400;hp.Q.value=0.4;
    let g=AC.createGain();g.gain.value=0;
    src.connect(hp);hp.connect(g);g.connect(sfxG);
    g.gain.linearRampToValueAtTime(Math.max(0.02,vol),AC.currentTime+1.2);
    src.start();
    rainAmbient={nodes:[{osc:src,gain:g}]};
  }catch(_){}
}
function sfx_rain_stop(){
  if(!rainAmbient)return;
  try{
    for(let n of rainAmbient.nodes){
      n.gain.gain.cancelScheduledValues(AC.currentTime);
      n.gain.gain.setValueAtTime(n.gain.gain.value||0,AC.currentTime);
      n.gain.gain.linearRampToValueAtTime(0,AC.currentTime+0.8);
      try{if(n.osc.stop)n.osc.stop(AC.currentTime+0.9);}catch(_){}
    }
  }catch(_){}
  setTimeout(()=>{rainAmbient=null;},1000);
}

// ============ 奇遇 SFX ============
function sfx_good_diamonds(){
  note(1047,0.15,'sine',0.25,0,sfxG);
  note(1319,0.15,'sine',0.22,0.1,sfxG);
  note(1568,0.15,'sine',0.2,0.2,sfxG);
  note(1319,0.15,'sine',0.22,0.3,sfxG);
  note(1047,0.35,'triangle',0.28,0.4,sfxG);
}
function sfx_good_bonus(){
  note(523,0.3,'sine',0.35,0,sfxG);
  note(659,0.3,'sine',0.28,0.06,sfxG);
  note(784,0.45,'sine',0.25,0.12,sfxG);
  note(1047,0.55,'triangle',0.22,0.2,sfxG);
}
function sfx_good_mermaid(){
  note(880,0.5,'sine',0.2,0,sfxG);
  note(1047,0.5,'sine',0.17,0.15,sfxG);
  note(1319,0.7,'sine',0.14,0.3,sfxG);
}
function sfx_candy_bird_appear(){
  note(523,0.4,'sine',0.3,0,sfxG);
  note(659,0.4,'sine',0.28,0.08,sfxG);
  note(784,0.5,'sine',0.25,0.16,sfxG);
  note(1047,0.6,'triangle',0.22,0.25,sfxG);
}
function sfx_candy_bird_lick(){
  note(660,0.12,'sine',0.35,0,sfxG);
  note(830,0.12,'sine',0.3,0.06,sfxG);
  note(1000,0.15,'triangle',0.28,0.12,sfxG);
}
function sfx_candy_bird_done(){
  note(523,0.3,'sine',0.4,0,sfxG);
  note(659,0.3,'sine',0.35,0.08,sfxG);
  note(784,0.3,'sine',0.3,0.16,sfxG);
  note(1047,0.5,'triangle',0.3,0.2,sfxG);
  note(1319,0.6,'sine',0.25,0.3,sfxG);
}
function sfx_candy_bird_fail(){
  note(400,0.4,'sine',0.25,0,sfxG);
  note(350,0.5,'sine',0.2,0.15,sfxG);
  note(300,0.6,'triangle',0.15,0.3,sfxG);
  setTimeout(()=>{note(1568,0.3,'sine',0.12,0,sfxG);note(1319,0.5,'triangle',0.1,0.2,sfxG);},400);
}
function sfx_tongue_shoot(){
  note(300,0.08,'sawtooth',0.25,0,sfxG);
  note(450,0.06,'sawtooth',0.2,0.04,sfxG);
  note(200,0.1,'triangle',0.15,0.06,sfxG);
}
function sfx_treasure_found(quality){
  if(quality>=2){
    note(523,0.3,'sine',0.35,0,sfxG);
    note(784,0.3,'sine',0.3,0.08,sfxG);
    note(1047,0.5,'triangle',0.3,0.16,sfxG);
    setTimeout(()=>note(1319,0.6,'sine',0.25,0.2,sfxG),200);
  }else{
    note(440,0.2,'sine',0.3,0,sfxG);
    note(660,0.2,'sine',0.25,0.1,sfxG);
  }
}

// ============ 游戏状态 ============
let G={
  phase:'idle', // idle | pulling | reveal
  coins:START_COINS,
  pitySR:0, pitySSR:0,
  totalPulls:0,
  album:{}, // {fishId: count}
  albumNew:{}, // {fishId:true} 新解锁但还没在图鉴里看过的鱼（用于 NEW 角标 + 红点）
  albumPending:{}, // {fishId:reward} 新收录奖励待领取（红点提示，需手动领取）
  albumFilter:'all', // 图鉴当前筛选
  redDots:{}, // 通用红点状态 {key:true}
  // ===== 每日任务 / 签到（捕鱼大作战风格）=====
  dailyDate:'',   // 每日任务所属日期
  dailyTasks:{},  // {taskId:{prog,claimed}}
  signInDate:'',  // 最后签到日期
  signInDay:0,    // 已连续签到天数
  catches:[], // [{fish,weight,value}]
  pendingPulls:[], // 待揭示的抽卡结果队列
  currentReveal:null, // 当前正在揭示
  ceremony:null, // 仪式动画状态
  items:{flash:3, accuracy:1, lucky:1, sandglass:1, oxygen:1, frogdrink:1}, // 初始赠送道具
  buffs:{accuracyNext:false, luckyBait:0, rareBoost:0, nextUR:false, frogPower:0},
  flashAlpha:0, // 闪光弹全屏白屏
  paused:false, // 暂停
  tutorial:0, // 新手教程 0=未开始 1-5=步骤
  islandUnlocked:false, // 种鱼功能解锁（答对海神题后）
  islandMode:false, // 岛屿模式
  totalEarned:0,   // 全局总收入（100万目标判定，只增不减，两模式共同累计）
  gameDay:0,       // 全局已结算天数（闯关每通一关 +1，冒险每天结束 +1）
  gameEnded:false, // 本次挑战是否已结束（赢或输）
  levelCleared:0,  // 闯关已通过关数（= 下一关索引），两模式切换不丢失
  // ===== 全局时间（参考星露谷）=====
  clockMin:0,      // 当前游戏内分钟（0=6:00，CLOCK_DAY_LEN=次日2:00），每次换天重置
  worldTime:0,     // 全局累计游戏内分钟（单调递增，用于种鱼生长计时）
  // ===== 种鱼模式 =====
  totalCaught:0,   // 冒险+闯关累计成功钓鱼次数（种鱼模式解锁条件）
  seedlings:{},    // 鱼苗背包 {fishId: 数量}
  gardenPlots:[],  // 鱼塘 [{fishId,plantTime,growMin}]
  gardenUnlocked:false, // 种鱼模式是否已解锁
  gardenMode:false,     // 是否处于种鱼模式
  gardenTutSeen:false,  // 是否看过种鱼模式教学
  gardenTutPending:false, // 需要弹出种鱼教学（刚解锁）
  gardenTutStep:0,      // 教学当前步骤
  levelTut:{},          // 已完成的关卡教学 {levelId:true}
  claimedMilestones:{}, // 已领取的里程碑奖励 {index:true}
};

// 关卡进度追踪
let levelProgress={fish:0,zone_cloud:0,zone_mountain:0,zone_sky:0,zone_sun:0,R:0,SR:0,SSR:0,UR:0,mtn_R:0};
let levelSpotTimer=0, levelComplete_d=false, clickTarget_d=null;

// ============ 抽卡核心 ============
function rollRarity(){
  // 奇遇buff：下一竿必出UR
  if(G.buffs.nextUR){G.buffs.nextUR=false;return 'UR';}
  // 保底检查
  if(G.pitySR>=PITY_SR-1)return 'SR';
  if(G.pitySSR>=PITY_SSR-1)return 'SSR';

  // 软保底：75抽后SSR概率递增
  let w={...RARITY_WEIGHTS};
  // 奇遇buff：稀有度提升（人鱼之歌）
  if(G.buffs.rareBoost>0){
    G.buffs.rareBoost--;
    w.N=Math.max(0,w.N-200);
    w.R=Math.max(0,w.R-100);
    w.SR+=120;
    w.SSR+=80;
    w.UR+=50;
  }
  if(G.pitySSR>=SOFT_PITY){
    let extra=(G.pitySSR-SOFT_PITY+1)*30;
    w.SSR+=extra;
    w.N=Math.max(0,w.N-extra/2);
    w.R=Math.max(0,w.R-extra/2);
  }

  let total=Object.values(w).reduce((a,b)=>a+b,0);
  let r=Math.random()*total, acc=0;
  for(let [rarity,weight] of Object.entries(w)){
    acc+=weight;
    if(r<=acc)return rarity;
  }
  return 'N';
}

function pickFish(rarity,zone){
  let pool=FISH_POOL.filter(f=>f.r===rarity&&!f.easter);
  // 区域专属鱼种优先
  if(zone){
    let zonePool=pool.filter(f=>f.zone===zone);
    if(zonePool.length>0&&Math.random()<0.4)return zonePool[Math.floor(Math.random()*zonePool.length)];
  }
  return pool[Math.floor(Math.random()*pool.length)];
}
// 彩蛋鱼：0.3% 概率触发，固定 6666 金币
function maybeEasterFish(){
  if(Math.random()<0.003){
    let m=FISH_POOL.find(f=>f.id==='milky');
    if(m)return {fish:m,weight:6,value:6666};
  }
  return null;
}

// 记录图鉴捕获：首次解锁生成「待领取」奖励（越稀有越多）+ NEW 标记 + 红点
function registerAlbum(fish){
  let isNew=!G.album[fish.id];
  G.album[fish.id]=(G.album[fish.id]||0)+1;
  // 每日任务：钓鱼数 / 稀有鱼
  dailyProgress('catch',1);
  if(fish.r==='SR'||fish.r==='SSR'||fish.r==='UR')dailyProgress('rare',1);
  let reward=0;
  if(isNew){
    if(!G.albumPending)G.albumPending={};
    G.albumNew[fish.id]=true;
    reward=(fish.easter?ALBUM_REWARD.easter:ALBUM_REWARD[fish.r])||0;
    // 奖励不直接到账：挂起为「待领取」，图鉴按钮亮红点提示玩家去领
    if(reward>0)G.albumPending[fish.id]=(G.albumPending[fish.id]||0)+reward;
    dailyProgress('album');
    setTimeout(()=>{
      updateRedDots();
      if(reward>0)toast('📖 图鉴新收录！点「📖 图鉴」领取 +'+reward+'💰','gold');
    },900);
  }
  return {isNew,reward};
}
// ===== 图鉴收录奖励：待领取 / 领取 =====
function albumPendingCount(){return Object.keys(G.albumPending||{}).length;}
function albumPendingTotal(){let t=0;for(let k in (G.albumPending||{}))t+=G.albumPending[k];return t;}
function claimAlbumReward(id){
  if(!G.albumPending)G.albumPending={};
  let rw=G.albumPending[id];
  if(!rw)return;
  delete G.albumPending[id];
  G.coins+=rw;G.totalEarned+=rw;
  tutComplete('collect_album');
  if(typeof adv!=='undefined'&&adv&&adv.active)adv.dayEarned+=rw;
  dailyProgress('earn',rw);
  toast('📖 收录奖励 +'+rw+'💰','gold');
  updateUI();updateRedDots();renderAlbum();
  saveGame(true);
}
function claimAllAlbumRewards(){
  if(!G.albumPending)G.albumPending={};
  let n=albumPendingCount();
  if(!n){toast('没有待领取的收录奖励','blue');return;}
  let total=albumPendingTotal();
  G.albumPending={};
  G.coins+=total;G.totalEarned+=total;
  if(typeof adv!=='undefined'&&adv&&adv.active)adv.dayEarned+=total;
  dailyProgress('earn',total);
  toast('📖 一键领取 '+n+' 份收录奖励 +'+total+'💰','gold');
  updateUI();updateRedDots();renderAlbum();
  saveGame(true);
}

function getFishWeight(fish){
  return fish.w[0]+Math.random()*(fish.w[1]-fish.w[0]);
}

function getFishValue(fish,weight){
  let ratio=(weight-fish.w[0])/(fish.w[1]-fish.w[0]||1);
  return Math.floor(fish.v*(0.7+ratio*0.6));
}

function doSinglePull(){
  let rarity=rollRarity();
  let fish=pickFish(rarity);
  let weight=getFishWeight(fish);
  let value=getFishValue(fish,weight);
  let _eg=maybeEasterFish();if(_eg){fish=_eg.fish;weight=_eg.weight;value=_eg.value;rarity=fish.r;}
  // 更新保底
  G.totalPulls++;
  if(rarity==='SR'||rarity==='SSR'||rarity==='UR'){
    G.pitySR=0;
    if(rarity==='SSR'||rarity==='UR')G.pitySSR=0;
    else G.pitySSR++;
  }else{
    G.pitySR++;G.pitySSR++;
  }

  // 更新图鉴（首次解锁：发奖励 + NEW 标记 + 红点）
  let _ar=registerAlbum(fish);

  return {fish,weight,value,isNew:_ar.isNew,albumReward:_ar.reward,rarity};
}

// ============ 抽卡仪式动画 ============
function castAtSpot(spot){
  if(G.phase!=='idle')return;
  initAudio();
  let cost=adv.active?50:100;
  if(G.coins<cost){toast('💰 金币不足！钓到的鱼会自动换成金币','gold');return;}
  if(adv.active){
    // 每天捕鱼数量无上限：只有被灾难强制收竿才会暂时封竿，凌晨 2:00 自动进入下一天
    if(adv.dayEnded){toast('🌅 今天已被灾难收竿，凌晨 2 点自动进入下一天','orange');return;}
  }else{
    if(levelCasts>=levelMaxCasts){levelFailFlow();return;}
  }

  G.coins-=cost;
  levelCasts++;
  if(adv.active){adv.dayCasts++;adv.danger+=DANGER_CAST;}
  updateUI();

  // 波塞冬遭遇：4%概率在冒险模式触发
  if(adv.active&&!spot.isFake&&Math.random()<0.04){
    poseidonEncounter();
    spot.clicked=true;
    return;
  }

  // 设置钓点坐标（舌头/鱼钩直接伸到钓点真实位置，可深达水下）
  castX=spot.x; castY=spot.y;
  effectInWater=(spot.zone==='water');
  // 特效统一锚定在「钓到鱼的真实位置(中心)」spot.y；水中鱼不再飘到水面
  castSurfaceY=castY;
  clickTarget_d=spot;
  spot.clicked=true;
  tutComplete('cast');

  // 精准雷达：强制真货
  if(G.buffs.accuracyNext&&spot.isFake){
    spot.isFake=false; G.buffs.accuracyNext=false;
    toast('🎯 精准雷达生效！','purple');
  }
  // 掷骰：假钓点出垃圾
  let result, frogFailed=false;
  if(spot.isFake){
    let decoy=DECOYS[Math.floor(Math.random()*DECOYS.length)];
    result={isFake:true,decoy,rarity:'N'};
    sfx_reveal_N();
  }else{
    let rarity=spot.fishRarity||rollRarity();
    // 强化香饵：稀有度+1
    if(G.buffs.luckyBait>0){
      let rks=['N','R','SR','SSR','UR'];
      let idx=rks.indexOf(rarity);
      if(idx<4)rarity=rks[idx+1];
      G.buffs.luckyBait--;
    }
    // 稀有度加成（钓点已锁定预告值时，仅保留冒险模式动态危险加成）
    if(spot.fishRarity){
      if(adv.active){
        if(adv.danger>DANGER_DANGER&&Math.random()<0.06)rarity='SSR';
        if(adv.danger>DANGER_DOOM&&Math.random()<0.03)rarity='UR';
        // 冒险模式：危险度越高，高稀有度概率微增
        let drBonus=adv.danger>DANGER_DOOM?0.04:adv.danger>DANGER_DANGER?0.02:0;
        if(drBonus>0&&Math.random()<drBonus){
          let rks=['N','R','SR','SSR','UR'];
          let ri=rks.indexOf(rarity);
          if(ri<4)rarity=rks[ri+1];
        }
      }
    }else{
      // 旧版钓点（无锁定）：保留原区域/关卡加成
      if(spot.bonusRarity>=3){// SSR+ bonus
        if(Math.random()<0.15)rarity='SSR';
        else if(Math.random()<0.05)rarity='UR';
      }else if(spot.bonusRarity>=2){// SR+ bonus
        if(Math.random()<0.2)rarity='SR';
        else if(Math.random()<0.08)rarity='SSR';
      }else if(spot.bonusRarity>=1){
        if(Math.random()<0.15)rarity='R';
        else if(Math.random()<0.05)rarity='SR';
      }
      // UR bonus (adv uses danger)
      if(adv.active){
        if(adv.danger>DANGER_DANGER&&Math.random()<0.06)rarity='SSR';
        if(adv.danger>DANGER_DOOM&&Math.random()<0.03)rarity='UR';
        let drBonus=adv.danger>DANGER_DOOM?0.04:adv.danger>DANGER_DANGER?0.02:0;
        if(drBonus>0&&Math.random()<drBonus){
          let rks=['N','R','SR','SSR','UR'];
          let ri=rks.indexOf(rarity);
          if(ri<4)rarity=rks[ri+1];
        }
      }else{
        let cfg=LEVELS[levelIdx];
        if(cfg.urBonus&&Math.random()<cfg.urBonus)rarity='UR';
        if(cfg.ssrBonus&&Math.random()<cfg.ssrBonus)rarity='SSR';
      }
    }

    // 青蛙技能判定：等级决定基础成功率，稀有度决定难度系数（满级青蛙100%成功）
    let rarityCatchMod={N:1.0,R:0.88,SR:0.75,SSR:0.58,UR:0.38};
    let baseRate=FROG_CFG[frogLv-1].rate;
    let frogRate=baseRate>=1?1:baseRate*(rarityCatchMod[rarity]||1.0);
    if(G.buffs.frogPower>0){
      // 蛙力饮料：这一竿青蛙必定抓住
      G.buffs.frogPower--;
    }else if(Math.random()>frogRate){
      frogFailed=true;
      let rStars=RARITY_STARS[rarity]||'';
      result={isFake:true,decoy:{e:'🐸💨',n:rStars+' 大鱼跑了!',msg:'差一点就抓住了…',v:0},rarity};
      addFrogXp(rarity);
      if(adv.active)adv.danger+=3;
      sfx_reveal_N();
      G.totalPulls++;
    }

    if(!frogFailed){
      let fish=pickFish(rarity,spot.zone);
      let weight=getFishWeight(fish);
      let value=getFishValue(fish,weight);
      let _eg=maybeEasterFish();if(_eg){fish=_eg.fish;weight=_eg.weight;value=_eg.value;rarity=fish.r;}
      if(adv.active)value=Math.round(value*getAdvMultiplier());
      let _ar=null;

      G.totalPulls++;
      if(!adv.active){
        if(rarity==='SR'||rarity==='SSR'||rarity==='UR'){
          G.pitySR=0;
          if(rarity==='SSR'||rarity==='UR')G.pitySSR=0;
          else G.pitySSR++;
        }else{G.pitySR++;G.pitySSR++;}
      }
      // 图鉴：首次解锁发奖励 + NEW 标记 + 红点
      _ar=registerAlbum(fish);
      // ===== 种鱼模式：累计钓鱼数 + 掉落对应鱼苗 =====
      G.totalCaught++;
      grantSeedling(fish);
      checkGardenUnlock();
      result={isFake:false,fish,weight,value,isNew:_ar.isNew,albumReward:_ar.reward,rarity};
      G.catches.push(result);
      // 钓到鱼直接获得金币（无需卖鱼按钮），并计入全局总收入
      recordIncome(value);
      if(adv.active){
        // 鱼仍计入背包，作为种鱼材料
        adv.fishBag.push({name:fish.name+fish.emoji,rarity,value,icon:fish.emoji,fishId:fish.id});
      }
      addFrogXp(rarity);
      if(adv.active&&rarityRank(rarity)>=2)adv.danger=Math.max(0,adv.danger+DANGER_RARE);
    }
  }

  G.pendingPulls=[result];
  bestRarity_d=result.rarity||'N';

  G.phase='pulling';updateUI();disableButtons();
  isTenPull=false;

  let ceremony={timer:0,phase:0,results:[result],currentIdx:0,bestRarity:result.rarity||'N',isTen:false,spot};
  G.ceremony=ceremony;ceremonyAnim_d=ceremony;
  ceremony.hl=rarityRank(result.rarity||'N')+1;ceremony.hasHighlight=ceremony.hl>=3;ceremony.frogFailed=frogFailed;
  sfx_pull();
  rodBend=8;castTimer_d=0;ceremonyGlow_d=0;mouseClicked_d=false;
  updateUI();
}

function rarityRank(r){return {N:0,R:1,SR:2,SSR:3,UR:4}[r]||0;}
function rollSpotRarity(spot){
  // 钓点生成时锁定最终稀有度 → 青蛙悬停反应可精确预告
  if(spot.isFake)return 'N';
  let rarity=rollRarity();
  if(spot.bonusRarity>=3){
    if(Math.random()<0.15)rarity='SSR';
    else if(Math.random()<0.05)rarity='UR';
  }else if(spot.bonusRarity>=2){
    if(Math.random()<0.2)rarity='SR';
    else if(Math.random()<0.08)rarity='SSR';
  }else if(spot.bonusRarity>=1){
    if(Math.random()<0.15)rarity='R';
    else if(Math.random()<0.05)rarity='SR';
  }
  if(!adv.active){
    let cfg=LEVELS[levelIdx];
    if(cfg.urBonus&&Math.random()<cfg.urBonus)rarity='UR';
    if(cfg.ssrBonus&&Math.random()<cfg.ssrBonus)rarity='SSR';
  }
  return rarity;
}

let ceremonyAnim_d=null, bestRarity_d=null, castTimer_d=0, mouseClicked_d=false, ceremonyGlow_d=0, isTenPull=false;

function updateCeremony(dt){
  let c=ceremonyAnim_d;if(!c)return;
  c.timer+=dt;

  if(c.phase===0){
    // Phase 0: 竿子后拉+前甩
    castTimer_d+=dt;
    if(castTimer_d<0.28){
      let t=castTimer_d/0.28;
      rodAngle=lerp(IDLE_ANGLE,-55,Math.pow(t,0.6));
      rodBend=Math.sin(t*Math.PI*0.5)*12;
    }else if(castTimer_d<0.6){
      let t=(castTimer_d-0.28)/0.32;
      rodAngle=lerp(-55,38,Math.pow(t,0.5));
      rodBend=Math.sin(t*Math.PI)*24;
      if(castTimer_d>=0.58)sfx_splash();
    }else{
      rodAngle=lerp(rodAngle,15,6*dt);
      rodBend*=Math.exp(-4*dt);
      if(castTimer_d>=0.9){
        c.phase=1;c.timer=0;castTimer_d=0;
        rodAngle=15;rodBend=8;
        if(effectInWater){
          for(let i=0;i<20;i++)spawnBubble(castX+(Math.random()-0.5)*80,castSurfaceY+2);
          spawnSplash(castX,castSurfaceY);
        }else{
          // 非水中鱼（云/山/太阳）：在鱼真实位置上炸开彩色闪光，不冒水花
          spawnParticles(castX,castSurfaceY,RARITY_GLOW[c.bestRarity],16,4,0.6);
        }
        spawnParticles(castX,castSurfaceY,'#7FEFFF',15,4,0.6);
        // 稀有度预兆：落水水花颜色 + 扩散波纹（等级越高越明显）
        let preCol=RARITY_GLOW[c.bestRarity];
        let hl=c.hl||1;
        spawnParticles(castX,castSurfaceY,preCol,3+hl*3,3+hl*1.2,0.7);
        spawnRippleRing(castX,castSurfaceY,preCol,hl>=3?4:2);
      }
    }
  }else if(c.phase===1){
    // Phase 1: 水面搅动+稀有度光效预告（全稀有度，等级越高越激烈）
    let hl=c.hl||1;
    rodBend=8+Math.sin(c.timer*(3.5+hl*0.8))*(2+hl*0.7);
    let col1=RARITY_GLOW[c.bestRarity];
    if(c.timer>0.4){
      ceremonyGlow_d=Math.min(0.5+hl*0.12,(c.timer-0.4)/0.6);
      // 稀有度水花粒子（颜色=鱼稀有度）
      if(Math.random()<0.22+0.1*hl*ceremonyGlow_d){
        spawnParticles(castX+(Math.random()-0.5)*70,castSurfaceY-6,col1,1+Math.floor(hl/2),2+hl*0.8,0.5);
      }
      // 稀有度扩散波纹
      if(Math.random()<0.3*ceremonyGlow_d*(hl>2?1:0.5)){
        spawnRippleRing(castX,castSurfaceY,col1,1);
      }
      // 青蛙提前感知等级
      if(!c._reactSet&&c.timer>0.6){
        c._reactSet=true;
        if(hl>=3)frog.reactType='amazed';
        else if(hl>=2)frog.reactType='happy';
        else frog.reactType='question';
        frog.catchReact=1;
      }
    }
    if(c.timer>=1.1||mouseClicked_d){
      c.phase=2;c.timer=0;ceremonyGlow_d=0;mouseClicked_d=false;
      // 揭示结果
      revealResult(c);
    }
  }else if(c.phase===2){
    // Phase 2: 显示结果卡片
    if(mouseClicked_d||c.timer>3){
      c.phase=3;c.timer=0;mouseClicked_d=false;
      if(!c.isTen)document.getElementById('revealOverlay').classList.remove('active','dim');
      else document.getElementById('resultsOverlay').classList.remove('active');
    }
  }else if(c.phase===3){
    // Phase 3: 收尾
    if(c.timer>0.5||mouseClicked_d){
      G.phase='idle';G.ceremony=null;ceremonyAnim_d=null;
      rodAngle=IDLE_ANGLE;rodBend=0;ceremonyGlow_d=0;
      mouseClicked_d=false;
      updateUI();updateButtons();
      if(levelComplete_d)showLevelComplete();
    }
  }
}

function revealResult(c){
  let best=c.bestRarity;
  let isFake=c.results[0]&&c.results[0].isFake;
  let frogFail=c.frogFailed||false;
  if(!isFake&&!frogFail)tutComplete('catch');

  // 音效+粒子按实际稀有度
  let rk=rarityRank(best);
  if(frogFail){
    // 青蛙失败：用略暗的稀有度粒子，表示"差一点"
    let dimColor=RARITY_GLOW[best]||'#888888';
    spawnParticles(castX,castSurfaceY-5,dimColor,8+rk*6,2+rk*1.5,0.5);
  }else if(isFake){
    sfx_reveal_N();
    spawnParticles(castX,castSurfaceY-5,'#888888',10,3,0.6);
  }else{
    switch(best){
      case 'N':sfx_reveal_N();break;
      case 'R':sfx_reveal_R();break;
      case 'SR':sfx_reveal_SR();break;
      case 'SSR':sfx_reveal_SSR();break;
      case 'UR':sfx_reveal_UR();break;
    }
    let count=20+rk*20;
    spawnParticles(castX,castSurfaceY-5,RARITY_GLOW[best],count,4+rk*2,0.9);
  }
  if(effectInWater)spawnSplash(castX,castSurfaceY);
  // 高阶稀有度：震屏 + 连续水花冲击 + 扩散波纹
  if(rk>=3){
    shakeScreen(4+rk*2);
    for(let i=1;i<=rk-1;i++){
      if(effectInWater)setTimeout(()=>{spawnSplash(castX,castSurfaceY);spawnRippleRing(castX,castSurfaceY,RARITY_GLOW[best],2);},i*90);
    }
  }
  spawnRippleRing(castX,castSurfaceY,RARITY_GLOW[best]||'#888888',rk>=3?3:1);

  // 更新关卡进度
  if(!adv.active)updateLevelProgress(c.results[0],c.spot);
  // 青蛙反应
  frog.catchReact=2;frog.tongueExt=0;
  if(frogFail)frog.reactType='cry';
  else if(isFake)frog.reactType='disgust';
  else{let r=rk;if(r>=3)frog.reactType='amazed';else if(r>=1)frog.reactType='happy';else frog.reactType='question';frog.targetGrade=r<2?2:r+1;}

  // 显示结果
  if(isFake){
    showDecoyCard(c.results[0].decoy,c.results[0].rarity,frogFail);
    document.getElementById('revealOverlay').classList.add('active','dim');
  }else{
    showFishCardUI(c.results[0]);
    document.getElementById('revealOverlay').classList.add('active','dim');
  }
  setTimeout(()=>{mouseClicked_d=true;},2500);
}

function showFishCardUI(r){
  let fish=r.fish;
  let card=document.getElementById('revealCard');
  card.className='reveal-card '+fish.r;
  document.getElementById('rvEmoji').innerHTML=fishImgHtml(fish,'rv-fish-img');
  document.getElementById('rvName').textContent=fish.n;
  document.getElementById('rvStars').textContent=RARITY_STARS[fish.r];
  document.getElementById('rvWeight').textContent=r.weight.toFixed(1)+'kg';
  document.getElementById('rvValue').textContent='+'+r.value+' 💰';
  document.getElementById('rvNew').style.display=r.isNew?'inline-block':'none';
  // 图鉴首次解锁奖励提示
  let rwEl=document.getElementById('rvAlbumReward');
  if(rwEl){
    let rw=r.albumReward||0;
    if(r.isNew&&rw>0){rwEl.style.display='block';rwEl.textContent='📖 新收录！点「图鉴」领 +'+rw+'💰';}
    else if(r.isNew){rwEl.style.display='block';rwEl.textContent='📖 新鱼入册！';}
    else rwEl.style.display='none';
  }
  // 区域标记
  let zoneTag=document.getElementById('rvZone');
  if(zoneTag&&clickTarget_d)zoneTag.textContent=ZONE_EMOJI[clickTarget_d.zone]||'';
}

function showDecoyCard(d,rarity,frogFail){
  let card=document.getElementById('revealCard');
  card.className='reveal-card '+(rarity||'N');
  document.getElementById('rvEmoji').textContent=d.e;
  document.getElementById('rvName').textContent=d.n;
  document.getElementById('rvStars').textContent=frogFail?'差一点就钓到了':'干扰项';
  document.getElementById('rvWeight').textContent=d.msg;
  document.getElementById('rvValue').textContent='+'+d.v+' 💰';
  document.getElementById('rvNew').style.display='none';
  let rwEl=document.getElementById('rvAlbumReward');
  if(rwEl)rwEl.style.display='none';
  if(d.v>0){
    recordIncome(d.v);
    if(adv.active)adv.fishBag.push({name:d.n,r:'N',value:d.v,icon:d.e,fishId:''});
  }
  let zoneTag=document.getElementById('rvZone');
  if(zoneTag)zoneTag.textContent='';
}

function updateLevelProgress(result,spot){
  if(!result||result.isFake)return;
  if(!spot)return;


  // 计数基础鱼类
  levelProgress.fish++;
  levelCaught++;

  // 区域计数
  if(spot.zone==='cloud')levelProgress.zone_cloud++;
  if(spot.zone==='mountain')levelProgress.zone_mountain++;
  if(spot.zone==='sky')levelProgress.zone_sky++;
  if(spot.zone==='sun')levelProgress.zone_sun++;
  if(gameMode==='level')levelTutComplete('catch_'+(spot.zone||'water')); // 区域教学：钓到对应区域的鱼

  // 稀有度计数
  let rr=rarityRank(result.rarity||'N');
  if(rr>=1)levelProgress.R++;
  if(rr>=2)levelProgress.SR++;
  if(rr>=3)levelProgress.SSR++;
  if(rr>=4)levelProgress.UR++;

  // 区域+稀有度组合追踪（用于 zone_rarity 类型关卡）
  if(spot.zone==='mountain'&&rr>=1)levelProgress.mtn_R=(levelProgress.mtn_R||0)+1;

  updateLevelHUD();
  checkLevelComplete();
}

function checkLevelComplete(){
  let cfg=LEVELS[levelIdx];
  if(cfg.goal.type==='endless')return;
  let g=cfg.goal;
  let done=false;

  if(g.type==='fish')done=levelProgress.fish>=g.count;
  else if(g.type==='zone_cloud')done=levelProgress.zone_cloud>=g.count;
  else if(g.type==='rarity'){
    let k=g.rarity;
    done=(levelProgress[k]||0)>=g.count;
  }
  else if(g.type==='zone_rarity'){
    // 检查区域专属稀有度（如：山岩R级以上）
    if(g.zone==='mountain')done=(levelProgress.mtn_R||0)>=g.count;
    else done=(levelProgress[g.rarity]||0)>=g.count;
  }
  else if(g.type==='combo'){
    done=g.sub.every(s=>{
      if(s.type==='rarity')return (levelProgress[s.rarity]||0)>=s.count;
      if(s.type==='zone_cloud')return levelProgress.zone_cloud>=s.count;
      return false;
    });
  }

  if(done&&!levelComplete_d){
    levelComplete_d=true;
    setTimeout(()=>showLevelComplete(),600);
  }
}

function showLevelComplete(){
  if(G.gameEnded)return; // 若已达成 100 万进入最终剧情，不再叠加通关弹窗
  let ov=document.getElementById('levelCompleteOverlay');
  if(ov.classList.contains('active'))return; // 防止重复触发
  let reward=200+levelIdx*50;
  document.getElementById('lcTitle').textContent='🎉 第'+(levelIdx+1)+'关 通关！';
  document.getElementById('lcStars').textContent='⭐'.repeat(Math.min(3,1+Math.floor(levelProgress.fish/3)));
  document.getElementById('lcCaught').textContent='钓获: '+levelCaught+'条';
  document.getElementById('lcReward').textContent='奖励: +'+reward+' 💰';
  ov.classList.add('active');
  sfx_reveal_UR();
}

function nextLevel(){
  document.getElementById('levelCompleteOverlay').classList.remove('active');
  // 通关奖励：固定奖励曲线（总额 80 万），并结算 1 天
  let reward=lvReward(levelIdx+1);
  recordIncome(reward);
  toast('🗺️ 第'+(levelIdx+1)+'关通关奖励 +'+reward.toLocaleString()+'💰','gold');
  levelIdx++;G.levelCleared=Math.max(G.levelCleared,levelIdx);G.gameDay++;resetClockToMorning();
  updateGoalHUD();updateUI();flashDayRed();
  if(G.levelCleared>=LEVELS.length){
    // 50 关全部通关：认证保险丝，补足差额到 100 万
    if(G.totalEarned<GOAL_TARGET){
      let bonus=GOAL_TARGET-G.totalEarned;
      recordIncome(bonus);
      setTimeout(()=>toast('🎓 全部通关！百冠认证奖金 +'+bonus.toLocaleString()+'💰','gold'),600);
    }
    updateGoalHUD();
    checkGoal();
    return;
  }
  if(checkGoal())return; // 满 100 万直接胜利 / 超 100 天直接失败
  startLevel(levelIdx);
}

function startLevel(idx){
  let cfg=LEVELS[idx];
  currentLevel=idx;
  levelCaught=0;levelCasts=0;
  levelMaxCasts=cfg.casts;
  diveState.sessionsLeft=3; // 每关重置潜水次数
  levelGoal=cfg.desc;
  levelComplete_d=false;
  resetClockToMorning(); // 每关从早上 6:00 开始（全局时钟）
  levelProgress={fish:0,zone_cloud:0,zone_mountain:0,zone_sky:0,zone_sun:0,R:0,SR:0,SSR:0,UR:0,mtn_R:0};
  spots=[];
  levelSpotTimer=0;
  // 关闭道具商店
  document.getElementById('itemShopOverlay').classList.remove('active');
  clickTarget_d=null;
  G.phase='idle';G.ceremony=null;ceremonyAnim_d=null;
  rodAngle=IDLE_ANGLE;rodBend=0;ceremonyGlow_d=0;
  mouseClicked_d=false;
  castX=stick.x+120;castY=H*WL;castSurfaceY=H*WL;
  updateUI();updateButtons();
  updateLevelHUD();
  spawnSpots(); // 立即生成初始钓点
  document.getElementById('levelIndicator').style.display='flex';
  document.getElementById('liNum').textContent='第'+(idx+1)+'关';
  document.getElementById('liName').textContent=cfg.name;
  document.getElementById('liDesc').textContent=cfg.desc;
  toast('🎯 '+cfg.name+' — '+cfg.desc,'blue');
  maybeLevelTut(idx); // 道具课 / 区域课：进关弹出操作引导教学
}

function showTenResults(results){
  let grid=document.getElementById('resultsGrid');
  // 按稀有度排序
  let sorted=[...results].sort((a,b)=>rarityRank(b.rarity)-rarityRank(a.rarity));
  grid.innerHTML=sorted.map((r,i)=>{
    let fish=r.fish;
    return `<div class="result-card ${fish.r}" style="animation-delay:${i*0.06}s">
      <span class="card-emoji">${fishImgHtml(fish,'card-fish-img')}</span>
      <div class="card-name">${fish.n}</div>
      <div class="card-stars">${RARITY_STARS[fish.r]}</div>
      <div style="font-size:0.7em;color:#aaa">${r.weight.toFixed(1)}kg</div>
      <div style="font-size:0.75em;color:#FFD700">+${r.value}💰</div>
      ${r.isNew?'<div style="font-size:0.7em;color:#2ecc71">NEW!</div>':''}
    </div>`;
  }).join('');
  document.getElementById('resultsOverlay').classList.add('active');
}

// ============ 卖鱼（已移除按钮：钓到鱼自动换算金币） ============
function sellAll(){
  toast('🐟 钓到的鱼已自动换算为金币，无需手动卖鱼','blue');
}

// ============ 图鉴 ============
function albumRewardOf(f){return (f.easter?ALBUM_REWARD.easter:ALBUM_REWARD[f.r])||0;}
function toggleAlbum(){
  let ov=document.getElementById('albumOverlay');
  tutComplete('open_album');
  if(ov.classList.contains('active')){
    ov.classList.remove('active');
    let d=document.getElementById('albumDetail');if(d)d.classList.remove('active');
    // 关闭即视为已查看：清掉 NEW 角标与红点
    G.albumNew={};
    updateRedDots();
    saveGame(true);
    return;
  }
  renderAlbum();
  ov.classList.add('active');
}
function setAlbumFilter(r){G.albumFilter=r;renderAlbum();}
function renderAlbum(){
  let totalFish=FISH_POOL.length;
  let owned=FISH_POOL.filter(f=>G.album[f.id]).length;
  let pEl=document.getElementById('albumProgress');
  if(pEl)pEl.textContent=owned+'/'+totalFish;
  let bar=document.getElementById('albumBarFill');
  if(bar)bar.style.width=(totalFish?owned/totalFish*100:0)+'%';
  // 分稀有度进度
  let segEl=document.getElementById('albumSegments');
  if(segEl){
    let segs=RARITY_ORDER.map(r=>{
      let all=FISH_POOL.filter(f=>f.r===r);
      if(!all.length)return '';
      let own=all.filter(f=>G.album[f.id]).length;
      return `<span class="album-seg" style="color:${RARITY_GLOW[r]}">${RARITY_NAME[r]} ${own}/${all.length}</span>`;
    });
    let eggs=FISH_POOL.filter(f=>f.easter);
    if(eggs.length){
      let own=eggs.filter(f=>G.album[f.id]).length;
      segs.push(`<span class="album-seg" style="color:#FF9CF0">彩蛋 ${own}/${eggs.length}</span>`);
    }
    segEl.innerHTML=segs.join('');
  }
  // 筛选栏
  let fEl=document.getElementById('albumFilters');
  if(fEl){
    let tabs=[{k:'all',t:'全部'}].concat(RARITY_ORDER.filter(r=>FISH_POOL.some(f=>f.r===r)).map(r=>({k:r,t:RARITY_NAME[r]})));
    if(FISH_POOL.some(f=>f.easter))tabs.push({k:'easter',t:'彩蛋'});
    fEl.innerHTML=tabs.map(t=>`<button class="album-tab${G.albumFilter===t.k?' on':''}" onclick="setAlbumFilter('${t.k}')">${t.t}</button>`).join('');
  }
  // 待领取奖励横幅
  let pend=G.albumPending||{};
  let pc=Object.keys(pend).length,pt=albumPendingTotal();
  let cbar=document.getElementById('albumClaimBar');
  if(cbar){
    if(pc>0){
      cbar.style.display='flex';
      cbar.innerHTML=`<span class="acb-txt">🎁 待领取收录奖励 <b>${pc}</b> 份 · 共 <b>+${pt.toLocaleString()}💰</b></span>
        <button class="acb-btn" onclick="claimAllAlbumRewards()">一键领取</button>`;
    }else{cbar.style.display='none';cbar.innerHTML='';}
  }
  // 格子
  let grid=document.getElementById('albumGrid');
  if(!grid)return;
  let flt=G.albumFilter||'all';
  let list=FISH_POOL.filter(f=>flt==='all'||(flt==='easter'?f.easter:f.r===flt));
  grid.innerHTML=list.map(f=>{
    let count=G.album[f.id]||0;
    let isNew=!!G.albumNew[f.id];
    let rw=albumRewardOf(f);
    let canClaim=(pend[f.id]||0)>0;
    let cls=count>0?'owned':'locked';
    return `<div class="album-cell ${cls}${canClaim?' claimable':''}"${count>0?` onclick="showAlbumDetail('${f.id}')"`:''}>
      ${isNew?'<span class="album-new">NEW</span>':''}
      ${canClaim?'<span class="album-gift">🎁</span>':''}
      <span class="ae">${count>0?fishImgHtml(f,'ae-fish-img'):'❓'}</span>
      <div class="album-name">${count>0?f.n:'???'}</div>
      <div class="album-stars" style="color:${RARITY_GLOW[f.r]}">${RARITY_STARS[f.r]}</div>
      ${canClaim?`<button class="album-claim" onclick="event.stopPropagation();claimAlbumReward('${f.id}')">领取 +${pend[f.id].toLocaleString()}💰</button>`
        : count>0?`<div class="album-count">已钓 x${count}</div>`
        :`<div class="album-count" style="color:#7d8a99">首录 +${rw}💰</div>`}
    </div>`;
  }).join('');
}
// 图鉴详情：点击已解锁的鱼查看
function showAlbumDetail(id){
  let f=FISH_POOL.find(x=>x.id===id);if(!f)return;
  let count=G.album[f.id]||0;
  let rw=albumRewardOf(f);
  let d=document.getElementById('albumDetail');
  if(!d)return;
  d.innerHTML=`<div class="album-detail-card">
    <div class="adc-img">${fishImgHtml(f,'adc-fish-img')}</div>
    <div class="adc-name">${f.n}</div>
    <div class="adc-rar" style="color:${RARITY_GLOW[f.r]}">${RARITY_NAME[f.r]} · ${f.r} ${RARITY_STARS[f.r]}${f.easter?' · 彩蛋鱼':''}</div>
    <div class="adc-row">参考价值 <b>${f.v}💰</b></div>
    <div class="adc-row">体重范围 <b>${f.w[0]}~${f.w[1]}kg</b></div>
    <div class="adc-row">已钓数量 <b>x${count}</b></div>
    <div class="adc-row">首次收录奖励 <b style="color:#FFD700">+${rw}💰</b></div>
    ${f.zone?`<div class="adc-row">出没水域 <b>${ZONE_EMOJI[f.zone]||''}${ZONE_NAME[f.zone]||f.zone}</b></div>`:''}
    ${(G.albumPending&&G.albumPending[f.id])?`<button class="gacha-btn btn-single" onclick="claimAlbumReward('${f.id}');showAlbumDetail('${f.id}')" style="margin-top:12px">🎁 领取 +${G.albumPending[f.id].toLocaleString()}💰</button>`:''}
    <button class="gacha-btn btn-sell" onclick="document.getElementById('albumDetail').classList.remove('active')" style="margin-top:12px">关闭</button>
  </div>`;
  d.classList.add('active');
  // 看过的鱼去掉 NEW
  if(G.albumNew[f.id]){delete G.albumNew[f.id];updateRedDots();renderAlbum();}
}

// ============ 每日任务 & 签到（捕鱼大作战风格）============
const DAILY_TASKS=[
  {id:'catch5',   type:'catch', n:'钓到 5 条鱼',        need:5,    rw:500},
  {id:'catch15',  type:'catch', n:'钓到 15 条鱼',       need:15,   rw:1200},
  {id:'rare1',    type:'rare',  n:'钓到 1 条 SR 及以上', need:1,    rw:1000},
  {id:'earn2000', type:'earn',  n:'累计赚取 2000 金币',  need:2000, rw:800},
  {id:'newfish',  type:'album', n:'图鉴收录 1 条新鱼',    need:1,    rw:600},
];
const SIGNIN_REWARDS=[300,500,800,1200,1800,2500,5000];
function todayStr(){let d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();}
function ensureDaily(){
  let t=todayStr();
  if(G.dailyDate!==t){
    G.dailyDate=t;G.dailyTasks={};G.dailyClaimed={};
    DAILY_TASKS.forEach(k=>{G.dailyTasks[k.id]=0;});
  }
  if(!G.dailyClaimed)G.dailyClaimed={};
}
// 任务进度累计（type: catch / rare / earn / album）
function dailyProgress(type,amount){
  if(!type)return;
  ensureDaily();
  let changed=false;
  DAILY_TASKS.forEach(t=>{
    if(t.type!==type)return;
    if((G.dailyTasks[t.id]||0)>=t.need)return;
    G.dailyTasks[t.id]=Math.min(t.need,(G.dailyTasks[t.id]||0)+(amount||1));
    changed=true;
  });
  if(changed){
    updateRedDots();
    let ov=document.getElementById('dailyOverlay');
    if(ov&&ov.classList.contains('active'))renderDailyPanel();
  }
}
function claimDailyTask(id){
  ensureDaily();
  let t=DAILY_TASKS.find(x=>x.id===id);if(!t)return;
  if(G.dailyClaimed[id])return;
  if((G.dailyTasks[id]||0)<t.need){toast('任务还没完成哦','blue');return;}
  G.dailyClaimed[id]=true;
  G.coins+=t.rw;G.totalEarned+=t.rw;
  toast('✅ 任务完成奖励 +'+t.rw+'💰','gold');
  updateUI();updateRedDots();renderDailyPanel();saveGame(true);
}
function signInAvailable(){return G.signInDate!==todayStr();}
function doSignIn(){
  if(!signInAvailable()){toast('今天已经签到过啦','blue');return;}
  let y=new Date();y.setDate(y.getDate()-1);
  let yStr=y.getFullYear()+'-'+(y.getMonth()+1)+'-'+y.getDate();
  if(G.signInDate===yStr)G.signInDay=Math.min(7,(G.signInDay||0)+1);else G.signInDay=1;
  G.signInDate=todayStr();
  let rw=SIGNIN_REWARDS[(G.signInDay-1)%7];
  G.coins+=rw;G.totalEarned+=rw;
  toast('📅 第'+G.signInDay+'天签到 +'+rw+'💰','gold');
  updateUI();updateRedDots();renderDailyPanel();saveGame(true);
}
function dailyHasReward(){
  ensureDaily();
  if(signInAvailable())return true;
  return DAILY_TASKS.some(t=>!G.dailyClaimed[t.id]&&(G.dailyTasks[t.id]||0)>=t.need);
}
function toggleDailyPanel(){
  let ov=document.getElementById('dailyOverlay');if(!ov)return;
  if(ov.classList.contains('active')){ov.classList.remove('active');return;}
  ensureDaily();renderDailyPanel();ov.classList.add('active');
}
function renderDailyPanel(){
  let el=document.getElementById('dailySignin');
  if(el){
    let day=G.signInDay||0,avail=signInAvailable(),cells='';
    for(let i=0;i<7;i++){
      let done=i<day;
      cells+=`<div class="si-cell${done?' done':''}${(avail&&i===day)?' today':''}"><div class="si-day">第${i+1}天</div><div class="si-rw">${SIGNIN_REWARDS[i]}</div></div>`;
    }
    el.innerHTML=cells+`<button class="si-btn ${avail?'on':''}" ${avail?'':'disabled'} onclick="doSignIn()">${avail?'立即签到':'今日已签'}</button>`;
  }
  let list=document.getElementById('dailyList');
  if(list){
    list.innerHTML=DAILY_TASKS.map(t=>{
      let prog=Math.min(t.need,G.dailyTasks[t.id]||0);
      let done=prog>=t.need,claimed=!!G.dailyClaimed[t.id];
      let pct=Math.round(prog/t.need*100);
      return `<div class="daily-task${claimed?' claimed':''}">
        <div class="dt-info">
          <div class="dt-name">${t.n}</div>
          <div class="dt-bar"><div class="dt-bar-fill" style="width:${pct}%"></div></div>
          <div class="dt-prog">${prog}/${t.need}</div>
        </div>
        <button class="dt-btn" ${(!done||claimed)?'disabled':''} onclick="claimDailyTask('${t.id}')">${claimed?'已领取':(done?'领取 +'+t.rw+'💰':'未完成')}</button>
      </div>`;
    }).join('');
  }
}
// ============ 红点系统 ============
function setRedDot(el,on,count){
  if(!el)return;
  if(on){
    let d=el.querySelector('.red-dot');
    if(!d){d=document.createElement('span');d.className='red-dot';el.appendChild(d);}
    let n=count||0;
    d.textContent=n>0?(n>99?'99+':String(n)):'';
    if(n>0)d.classList.add('with-num');else d.classList.remove('with-num');
    el.classList.add('has-reddot');
  }else{
    let d=el.querySelector('.red-dot');if(d)d.remove();
    el.classList.remove('has-reddot');
  }
}
function updateRedDots(){
  try{
    if(typeof ensureDaily==='function')ensureDaily();
    // 图鉴：有待领取的收录奖励（优先）或未查看的新鱼
    let pcnt=albumPendingCount();
    setRedDot(document.getElementById('btnAlbum'),pcnt>0||Object.keys(G.albumNew||{}).length>0,pcnt);
    // 道具商店：手里有可用道具
    setRedDot(document.getElementById('btnShop'),Object.keys(G.items||{}).some(k=>(G.items[k]||0)>0));
    // 青蛙升级：金币足够
    let fu=document.getElementById('btnFrogUpgrade');
    if(fu){
      let cost=FROG_UPGRADE_COST[frogLv]||0;
      setRedDot(fu,frogLv<5&&G.coins>=cost);
    }
    // 每日任务 / 签到
    setRedDot(document.getElementById('btnDaily'),dailyHasReward());
    // 种鱼：有可收获的鱼 / 或还没看过新玩法教学
    let gc=document.getElementById('mpGardenCard');
    if(gc){
      let needTut=isGardenUnlocked()&&!G.gardenTutSeen;
      setRedDot(gc,(G.gardenPlots||[]).some(p=>gardenReady(p))||needTut);
    }
    let gb=document.getElementById('gardenGuideBtn');
    if(gb)gb.classList.toggle('blink',isGardenUnlocked()&&!G.gardenTutSeen);
  }catch(e){}
}

// ============ 道具商店 ============
function toggleItemShop(){
  let ov=document.getElementById('itemShopOverlay');
  if(ov.classList.contains('active')){ov.classList.remove('active');return;}
  updateItemShopUI();
  ov.classList.add('active');
}
function updateItemShopUI(){
  document.getElementById('isCoins').textContent=G.coins;
  for(let id of ['flash','accuracy','lucky','sandglass','refresh','oxygen','cloak','compass','whistle','frogdrink']){
    let cnt=G.items[id]||0;
    let el=document.getElementById('is_'+id);
    if(el)el.textContent='x'+cnt;
    let ub=document.getElementById('isUse_'+id);
    if(ub){
      if(cnt>0&&id!=='sandglass'){ub.style.display='inline-block';ub.textContent='使用';}
      else if(id==='sandglass'&&cnt>0){ub.style.display='inline-block';ub.textContent='增加+2';}
      else ub.style.display='none';
    }
  }
}
// ===== 道具悬停快捷面板：鼠标放到「🎒 道具」上自动展开，一键使用 =====
const QUICK_ITEM_IDS=['flash','accuracy','lucky','refresh','sandglass','frogdrink','oxygen','cloak','compass','whistle'];
function buildItemQuickPanel(){
  let list=document.getElementById('ihpList');
  if(!list)return;
  let isAdv=(typeof adv!=='undefined'&&adv&&adv.active);
  let rows=QUICK_ITEM_IDS.filter(id=>ITEMS[id]&&(!ITEMS[id].advOnly||isAdv));
  if(!rows.length){list.innerHTML='<div class="ihp-empty">暂无可用的道具</div>';return;}
  list.innerHTML=rows.map(id=>{
    let it=ITEMS[id],cnt=G.items[id]||0;
    let act=cnt>0
      ? `<button class="ihp-use" onclick="quickUseItem('${id}')">使用</button>`
      : `<button class="ihp-buy" onclick="quickBuyItem('${id}')">${it.price}💰买</button>`;
    return `<div class="ihp-row" title="${it.desc}">
      <span class="ihp-ico">${it.emoji}</span>
      <span class="ihp-name">${it.name}${it.advOnly?'<i class="ihp-tag">冒险</i>':''}</span>
      <span class="ihp-cnt">x${cnt}</span>
      ${act}
    </div>`;
  }).join('');
}
function quickUseItem(id){
  if((G.items[id]||0)<=0)return;
  useItem(id);
  updateUI();updateItemShopUI();updateRedDots();
  buildItemQuickPanel();
  if((G.items[id]||0)<=0)closeItemHover(150);
  saveGame(true);
}
function quickBuyItem(id){
  buyItem(id);
  updateRedDots();buildItemQuickPanel();
}
function openItemHover(){
  let btn=document.getElementById('btnShop');
  let panel=document.getElementById('itemHoverPanel');
  if(!panel||!btn)return;
  if(!btn.offsetParent)return; // 按钮不可见时不展开
  buildItemQuickPanel();
  let r=btn.getBoundingClientRect();
  let w=panel.offsetWidth||236;
  panel.style.left=Math.max(10,Math.min(window.innerWidth-w-10,r.right-w))+'px';
  panel.style.bottom=(window.innerHeight-r.top+12)+'px';
  panel.style.top='auto';
  panel.classList.add('active');
}
function closeItemHover(delay){
  let panel=document.getElementById('itemHoverPanel');
  if(!panel)return;
  clearTimeout(closeItemHover._t);
  closeItemHover._t=setTimeout(()=>panel.classList.remove('active'),delay||200);
}
function setupItemHover(){
  let btn=document.getElementById('btnShop');
  let panel=document.getElementById('itemHoverPanel');
  if(!btn||!panel||setupItemHover._done)return;
  setupItemHover._done=true;
  btn.addEventListener('mouseenter',()=>{clearTimeout(closeItemHover._t);openItemHover();tutComplete('hover_item');});
  btn.addEventListener('mouseleave',()=>closeItemHover(300));
  panel.addEventListener('mouseenter',()=>{clearTimeout(closeItemHover._t);});
  panel.addEventListener('mouseleave',()=>closeItemHover(180));
  window.addEventListener('resize',()=>{if(panel.classList.contains('active'))openItemHover();});
  window.addEventListener('scroll',()=>{if(panel.classList.contains('active'))openItemHover();},true);
  // 打开商店/图鉴等弹窗时收起
  document.addEventListener('click',(e)=>{
    if(panel.classList.contains('active')&&!panel.contains(e.target)&&e.target!==btn&&!btn.contains(e.target))closeItemHover(0);
  });
}
function buyItem(id){
  initAudio();
  let it=ITEMS[id];
  if(G.coins<it.price){toast('💰 金币不足！钓到的鱼会自动换成金币','gold');return;}
  G.coins-=it.price;
  G.items[id]=(G.items[id]||0)+1;
  updateUI();updateItemShopUI();
  toast(it.emoji+' 获得 '+it.name+'！','blue');
  sfx_reveal_SR();
}
function useItem(id){
  let cnt=G.items[id]||0;
  if(cnt<=0)return;
  levelTutComplete('use:'+id); // 关卡教学：真的用了对应道具即算学会
  switch(id){
    case 'flash': useFlashBomb();break;
    case 'accuracy': G.buffs.accuracyNext=true;G.items.accuracy--;toast('🎯 精准雷达已激活！下个钓点必为真货','purple');break;
    case 'lucky': G.buffs.luckyBait=3;G.items.lucky--;toast('🍀 强化香饵已激活！接下来3次稀有度+1','purple');break;
    case 'sandglass': levelMaxCasts+=2;G.items.sandglass--;updateLevelHUD();toast('⏰ 增加2次出竿机会！','blue');break;
    case 'refresh': useFishRefresh();break;
    // ===== 新版道具 =====
    case 'oxygen':{
      if(!adv.active){toast('🤿 氧气瓶只在冒险模式有用','gray');return;}
      G.items.oxygen--;
      if(diveState.active){diveState.timeLeft+=10;toast('🤿 氧气补充！潜水时间 +10 秒','blue');}
      else{diveState.sessionsLeft++;updateDiveBtn();toast('🤿 潜水机会 +1！今天还能再潜一次','blue');}
      break;
    }
    case 'cloak':{
      if(!adv.active){toast('☂️ 避风斗篷只在冒险模式有用','gray');return;}
      G.items.cloak--;
      let hadDisaster=disasterFX.active;
      if(hadDisaster){
        disasterFX.active=false;disasterFX.type=null;disasterFX.timer=0;disasterFX.intensity=0;disasterFX.paused=false;
        if(typeof sfx_disaster_ambient_stop==='function')sfx_disaster_ambient_stop();
        if(typeof sfx_rain_stop==='function')sfx_rain_stop();
        toast('☂️ 斗篷展开——灾难被挡下了！','blue');
      }else toast('☂️ 风平浪静，暂时用不上','gray');
      adv.danger=0;
      if(typeof updateAdvHUD==='function')updateAdvHUD();
      break;
    }
    case 'compass':{
      if(!adv.active){toast('🧭 寻宝罗盘只在冒险模式有用','gray');return;}
      G.items.compass--;
      if(typeof spawnHiddenTreasure==='function'){spawnHiddenTreasure();spawnHiddenTreasure();}
      toast('🧭 罗盘震动！水下宝藏浮现了（用舌头点它）','gold');
      break;
    }
    case 'whistle':{
      if(!adv.active){toast('🕊️ 糖果鸟哨只在冒险模式有用','gray');return;}
      G.items.whistle--;
      candyBird.active=true;candyBird.timer=0;candyBird.clicks=0;
      candyBird.x=W*0.3+Math.random()*W*0.4;
      candyBird.y=H*0.15+Math.random()*H*0.2;
      candyBird.phase='appearing';candyBird.size=0.01;candyBird.shakeTimer=0;candyBird.popTimer=0;
      toast('🕊️ 哨声响起——巨型糖果鸟来了！点它3下！','gold');
      break;
    }
    case 'frogdrink':
      G.buffs.frogPower=(G.buffs.frogPower||0)+3;G.items.frogdrink--;
      toast('🥤 蛙力饮料！接下来3竿青蛙绝不失误','purple');
      break;
  }
  updateUI();updateItemShopUI();
  tutComplete('use_item');
  sfx_reveal_R();
}
function useFishRefresh(){
  G.items.refresh--;
  for(let i=spots.length-1;i>=0;i--){if(!spots[i].clicked)spots.splice(i,1);}
  spawnSpots();
  for(let i=0;i<30;i++)spawnParticles(W/2,H/2,'#4FC3F7',1,15,0.4);
  toast('🐟 呼唤鱼群！钓点已全部刷新','rainbow');
  sfx_reveal_SSR();
}
function useFlashBomb(){
  G.items.flash--;
  spots.forEach(s=>{if(s.isFake&&!s.clicked&&s.life>0)s.flashRevealed=4;});
  G.flashAlpha=0.7;
  for(let i=0;i<35;i++)spawnParticles(W/2,H/2,'#FFFFFF',1,20,0.25);
  sfx_reveal_SSR();
  toast('💣 闪光弹！假钓点已暴露','rainbow');
}

// ============ Canvas & 渲染 ============
let cv, cx, W, H;
let stick={x:0,y:0,handX:0,handY:0};
let hook={x:0,y:0};
let rodTip={x:-1,y:-1};
let ww=0;
let fishes=[], bubbles=[], splashes=[], particles=[], rippleRings=[];
let screenShake=0;
let lastTime=0, deltaTime=0;
let fishSpawnTimer=0;
let rodAngle=-35, rodBend=0;
const IDLE_ANGLE=-35;

// ============ 青蛙鱼竿状态 ============
let frog={bellySize:1,targetBelly:1,eyeDX:0,eyeDY:0,targetEyeDX:0,targetEyeDY:0,bounceP:0,tongueExt:0,catchReact:0,reactType:'',blinkT:3+Math.random()*4,eyeSize:1,targetEyeSize:1,shakeA:0,rewardGrade:0,targetGrade:0};
let gameMode='',frogLv=1,frogXp=0,frogXpNext=FROG_CFG[0].xp,frogRainbow=false; // 达成100万后青蛙彩虹化
let adv={active:false,day:1,dayCasts:0,dayEarned:0,totalEarned:0,danger:0,dayEnded:false,penaltyToday:0,gameOver:false,gameWin:false,_warnedWarn:false,_warnedDanger:false,_triggeredDoom:false,
  fishBag:[], plantedVeg:[], plantedFish:[], islandTab:'plant', timeOfDay:'morning'};
// ============ 全局时间系统（参考《星露谷物语》）============
// 旧的"按天数循环时段"改为"全局连续时钟"：所有模式共用同一个时钟，
// 时钟随时间真实流动，时段（morning/noon/evening/night）由时钟推导。
function clockTodayMin(){return ((G.clockMin%CLOCK_DAY_LEN)+CLOCK_DAY_LEN)%CLOCK_DAY_LEN;}
function clockAbsMin(){return CLOCK_START+clockTodayMin();} // 360(6:00) ~ 1560(次日2:00)
function clockHM(){
  let m=Math.floor(clockAbsMin());
  let h=Math.floor(m/60),mm=m%60;
  let ap=h<12?'AM':'PM';let h12=h%12;if(h12===0)h12=12;
  return {h:h12,mm,ap,label:h12+':'+String(mm).padStart(2,'0')+' '+ap};
}
function clockStr(){return clockHM().label;}
// 由全局时钟推导时段（保留旧函数名，忽略传入的天数参数）
// 6:00-11:00 早晨 | 11:00-14:00 中午 | 14:00-17:00 下午 | 17:00-21:00 傍晚 | 21:00-次日2:00 夜晚
function getTimeOfDay(dayNum){
  let t=clockAbsMin();
  if(t<11*60)return 'morning';   // 6:00 - 11:00
  if(t<14*60)return 'noon';      // 11:00 - 14:00
  if(t<17*60)return 'afternoon'; // 14:00 - 17:00
  if(t<21*60)return 'evening';   // 17:00 - 21:00
  return 'night';                // 21:00 - 次日 2:00
}
function getTimeEmoji(t){return{noon:'☀️',morning:'🌅',afternoon:'🌤️',evening:'🌆',night:'🌙'}[t]||'☀️';}
function getTimeName(t){return{noon:'中午',morning:'早晨',afternoon:'下午',evening:'傍晚',night:'夜晚'}[t]||'白天';}
// 换天时把时钟拨回早上 6:00
function resetClockToMorning(){G.clockMin=0;if(adv&&adv.active)adv.timeOfDay=getTimeOfDay();updateClockHUD();}
// 全局时钟推进（每帧调用）。dt 为真实秒数
function tickGlobalClock(dt){
  if(G.gameEnded||G.paused)return;
  let dmin=dt*CLOCK_MIN_PER_SEC*timeScale; // 时间流速倍率（1/2/4）
  G.clockMin+=dmin;
  G.worldTime+=dmin;
  if(G.clockMin>=CLOCK_DAY_LEN){
    G.clockMin-=CLOCK_DAY_LEN;
    // 凌晨 2:00：冒险模式一律自动进入下一天
    // （不再要求手动结算；被灾难强制收竿的日子也照常翻页，不会卡住）
    if(adv.active&&!adv.gameOver){endDay();}
    else{toast('🌙 已是凌晨 2 点，新的一天开始了','blue');}
  }
  adv.timeOfDay=getTimeOfDay();
  updateClockHUD();
}
// 更新全局时钟 HUD
function updateClockHUD(){
  let el=document.getElementById('globalClock');if(!el)return;
  let hm=clockHM();el.textContent=getTimeEmoji(getTimeOfDay())+' '+hm.label;
}
let mouseX=-100,mouseY=-100;
let islandAnimTime=0; // 岛屿动画时间

// ============ 潜水寻宝系统 ============
let diveState={active:false,sessionsLeft:3,earned:0,timeLeft:0,spawnTimer:0,phase:'idle',treasureId:0,bubbleTimer:0};
const DIVE_TREASURES=[
  {e:'💎',v:45,g:80, w:0.06},   // 钻石：高价值
  {e:'👑',v:75,g:120,w:0.03},   // 金色皇冠：稀有高价值！
  {e:'🦪',v:25,g:55, w:0.14},   // 珍珠
  {e:'🐚',v:12,g:35, w:0.16},   // 贝壳
  {e:'🦀',v:30,g:65, w:0.12},   // 螃蟹
  {e:'🏆',v:60,g:100,w:0.04},   // 金色奖杯：稀有！
  {e:'🐡',v:8, g:22, w:0.10},   // 河豚
  {e:'🪸',v:18,g:45, w:0.09},   // 珊瑚
  {e:'🦞',v:35,g:70, w:0.10},   // 龙虾：中高价值
  {e:'🐙',v:22,g:50, w:0.08},   // 小章鱼
  {e:'🌿',v:0, g:0,  w:0.08},   // 海草：垃圾
];
function startDive(){
  if(!diveState.sessionsLeft){toast('🤿 今天已经潜过了，明天再来吧','gray');return;}
  diveState.active=true;diveState.earned=0;diveState.timeLeft=15;diveState.spawnTimer=0;diveState.phase='playing';diveState.treasureId=0;diveState.bubbleTimer=0;
  let area=document.getElementById('diveArea');
  if(area)area.innerHTML='';
  document.getElementById('diveOverlay').classList.add('active');
  document.getElementById('diveTimer').textContent='⏱️ '+diveState.timeLeft+'秒';
  document.getElementById('diveEarned').textContent='';
  document.getElementById('diveCloseBtn').style.display='none';
  let n=['沉船遗迹','珊瑚暗礁','海底洞穴','蓝洞深渊'];
  document.getElementById('diveTitle').textContent='🤿 探索'+n[Math.floor(Math.random()*n.length)];
  // 立刻在全区域刷出12个初始宝藏
  for(let i=0;i<12;i++)spawnTreasure();
  // 延迟让所有宝物依次浮现
  setTimeout(()=>{
    let items=area.querySelectorAll('.dive-item:not(.show)');
    items.forEach((el,i)=>{setTimeout(()=>{el.classList.add('show');},i*60);});
  },50);
}
function pickTreasure(el,v){
  if(!diveState.active||diveState.phase!=='playing')return;
  if(!el||el._picked)return;
  el._picked=true;
  // 拾取弹跳效果
  el.style.animation='none';
  el.style.transition='transform 0.2s ease-out, opacity 0.2s ease-out';
  if(v<=0){
    el.style.transform='scale(0.3) rotate(90deg)';
    el.style.opacity='0';
    setTimeout(()=>{if(el.parentNode)el.parentNode.removeChild(el);},300);
    showDivePop(el,'🌿 海草 +0','#7B6B4E');
    return;
  }
  diveState.earned+=v;
  el.style.transform='scale(1.6) rotate(-15deg)';
  el.style.opacity='0';
  setTimeout(()=>{if(el.parentNode)el.parentNode.removeChild(el);},300);
  showDivePop(el,'+'+v+'💰','#FFD700');
  document.getElementById('diveEarned').textContent='已收集: '+diveState.earned+'💰';
  sfx_reveal_R();
}
function showDivePop(el,text,color){
  let area=document.getElementById('diveArea');
  if(!area)return;
  let pop=document.createElement('div');
  pop.className='dive-pop';
  pop.textContent=text;
  pop.style.color=color;
  pop.style.left=el.style.left;
  pop.style.top=el.style.top;
  area.appendChild(pop);
  setTimeout(()=>{if(pop.parentNode)pop.parentNode.removeChild(pop);},1000);
}
function spawnTreasure(){
  let area=document.getElementById('diveArea');
  if(!area)return;
  // 按权重选宝藏类型
  let r=Math.random(),acc=0,s=DIVE_TREASURES[0];
  for(let t of DIVE_TREASURES){acc+=t.w;if(r<=acc){s=t;break;}}
  let el=document.createElement('div');
  el.className='dive-item';
  if(s.v>=50)el.classList.add('rare');
  el.textContent=s.e;
  // ★★★ 关键：基于实际像素均匀分布全区域 ★★★
  let rect=area.getBoundingClientRect();
  let pad=30;  // 边距
  let px=pad+Math.random()*(rect.width-pad*2);
  let py=pad+Math.random()*(rect.height-pad*2);
  el.style.left=px+'px';
  el.style.top=py+'px';
  el._v=s.v;
  el._spawnedAt=Date.now();
  el._lifetime=2200+Math.random()*2200;
  if(s.v>=50)el._lifetime+=1200;
  el.onclick=function(){pickTreasure(el,s.v);};
  area.appendChild(el);
  // 每件宝物有独立的随机延迟浮现
  let delay=Math.random()*350;
  setTimeout(()=>{if(el.parentNode&&!el._picked)el.classList.add('show');},delay);
  // 到期消失
  setTimeout(()=>{
    if(el.parentNode&&!el._picked){
      el.classList.add('leaving');
      setTimeout(()=>{if(el.parentNode)el.parentNode.removeChild(el);},350);
    }
  },el._lifetime+delay);
}
function closeDive(){
  if(diveState.earned>0){
    recordIncome(diveState.earned); updateUI();
    toast('🤿 潜水寻宝获得 +'+diveState.earned+' 💰','gold'); sfx_reveal_SR();
    diveState.sessionsLeft--;
    if(diveState.earned>=150) sfx_reveal_UR();
  }
  diveState.active=false;diveState.phase='idle';
  document.getElementById('diveOverlay').classList.remove('active');
  let timerEl=document.getElementById('diveTimer');
  if(timerEl){timerEl.style.color='';timerEl.style.animation='';}
  let area=document.getElementById('diveArea');
  if(area)area.innerHTML='';
  let btn=document.getElementById('btnDive');
  if(btn){updateDiveBtn();}
}
function updateDiveBtn(){
  let btn=document.getElementById('btnDive');
  if(!btn)return;
  if(diveState.sessionsLeft>0){
    btn.style.display='inline-block';btn.style.opacity='1';
    btn.textContent='🤿 潜水('+diveState.sessionsLeft+')';
  }else{
    btn.style.display='inline-block';btn.style.opacity='0.5';
    btn.textContent='🤿 已潜完';
  }
}
function diveUpdate(dt){
  if(!diveState.active||diveState.phase!=='playing')return;
  diveState.timeLeft-=dt;
  diveState.spawnTimer-=dt;
  diveState.bubbleTimer-=dt;
  // 剩余5秒时加速生成 + 视觉紧迫
  let urgency=diveState.timeLeft<=5;
  if(diveState.spawnTimer<=0){
    spawnTreasure();
    diveState.spawnTimer=urgency?(0.2+Math.random()*0.3):(0.3+Math.random()*0.5);
  }
  // 更新计时器显示 + 紧迫闪烁
  let timerEl=document.getElementById('diveTimer');
  if(timerEl){
    let sec=Math.max(0,Math.ceil(diveState.timeLeft));
    timerEl.textContent='⏱️ '+sec+'秒';
    if(urgency){timerEl.style.color='#FF4444';timerEl.style.animation='none';timerEl.offsetHeight;timerEl.style.animation='flash 0.5s infinite';}
    else if(diveState.timeLeft<=8){timerEl.style.color='#FFAA00';timerEl.style.animation='none';}
  }
  // 定时清理过期元素 + 装饰气泡
  if(diveState.bubbleTimer<=0){
    diveState.bubbleTimer=0.8;
    // 清理已经离开的宝物元素
    let area=document.getElementById('diveArea');
    if(area){
      let items=area.querySelectorAll('.dive-item');
      let now=Date.now();
      items.forEach(el=>{
        if(!el._picked&&el._spawnedAt&&(now-el._spawnedAt)>el._lifetime+800){
          if(el.parentNode)el.parentNode.removeChild(el);
        }
      });
      // 装饰性气泡
      let b=document.createElement('div');
      b.className='dive-bubble';
      b.style.left=(5+Math.random()*90)+'%';
      b.style.animationDuration=(3+Math.random()*4)+'s';
      b.style.width=b.style.height=(6+Math.random()*12)+'px';
      area.appendChild(b);
      setTimeout(()=>{if(b.parentNode)b.parentNode.removeChild(b);},5000);
    }
    diveState.bubbleTimer=0.3+Math.random()*0.5;
  }
  let rEl=document.getElementById('diveTimer');
  if(rEl)rEl.textContent='⏱️ '+Math.ceil(diveState.timeLeft)+'秒';
  if(diveState.timeLeft<=0){
    diveState.phase='summary';
    if(rEl)rEl.textContent='上浮中...';
    let eEl=document.getElementById('diveEarned');
    if(eEl)eEl.textContent='✨ 合计: +'+diveState.earned+' 💰';
    document.getElementById('diveCloseBtn').style.display='inline-block';
  }
}
// ============ 点击选钓点 ============
let castX=0, castY=0; // 目标钓点坐标（舌头/鱼钩实际到达处，可深达水下）
let castSurfaceY=0;   // 该钓点对应的特效锚点高度（水中=水面；非水中=鱼真实位置）
let effectInWater=true; // 当前这一竿的鱼是否在水里（云/山/太阳鱼=false）
let castRipple=0;     // 点击涟漪动画强度

// ============ 待机 pose 系统 ============
// face: 0=面无表情 1=看水发愣 2=闭眼 3=微笑 4=专注 5=打哈欠 6=左看 7=右看 8=惊讶张嘴
const IDLE_POSES=[
  {rodA:-35, lean:0,  sw:0,  face:0, dur:3.5}, // 正常扛竿
  {rodA:-25, lean:7,  sw:4,  face:1, dur:2.2}, // 前倾看水
  {rodA:-55, lean:-12,sw:-6, face:2, dur:2.5}, // 仰身伸懒腰
  {rodA:-30, lean:3,  sw:1,  face:3, dur:2.8}, // 悠闲微笑
  {rodA:-18, lean:14, sw:9,  face:4, dur:2.5}, // 俯身专注
  {rodA:-50, lean:-8, sw:-4, face:5, dur:2.0}, // 打哈欠
  {rodA:-38, lean:-6, sw:-1, face:6, dur:1.8}, // 左看看
  {rodA:-32, lean:6,  sw:1,  face:7, dur:1.8}, // 右看看
  {rodA:-42, lean:-4, sw:-2, face:3, dur:2.5}, // 悠闲2
  {rodA:-22, lean:10, sw:6,  face:1, dur:2.0}, // 看鱼
  {rodA:-35, lean:0,  sw:0,  face:0, dur:4.0}, // 发呆长
];
let idleTarget=IDLE_POSES[0], idleTimer=0;
let idleCurRod=-35, idleCurLean=0, idleCurSw=0, idleCurFace=0;

function updateIdlePose(dt){
  if(ceremonyAnim_d)return;
  idleTimer+=dt;
  if(idleTimer>=idleTarget.dur){
    idleTarget=IDLE_POSES[Math.floor(Math.random()*IDLE_POSES.length)];
    idleTimer=0;
  }
  let spd=4*dt;
  idleCurRod=lerp(idleCurRod,idleTarget.rodA,spd);
  idleCurLean=lerp(idleCurLean,idleTarget.lean,spd);
  idleCurSw=lerp(idleCurSw,idleTarget.sw,spd);
  idleCurFace=idleTarget.face; // instant face change
  rodAngle=idleCurRod;
}

function resize(){
  cv=document.getElementById('gameCanvas');
  W=cv.width=cv.parentElement.clientWidth;
  H=cv.height=cv.parentElement.clientHeight;
  cx=cv.getContext('2d');
  stick.x=W*0.15; stick.y=H*0.55;
  // 默认钓点在小船前方水域
  castX=stick.x+120; castY=H*WL;
}

// ============ 粒子/气泡/水花 ============
function spawnParticles(x,y,color='#FFD700',count=15,speed=3,life=0.8){
  for(let i=0;i<count;i++){
    let a=Math.random()*Math.PI*2;
    particles.push({x,y,vx:Math.cos(a)*speed*(0.5+Math.random()),vy:Math.sin(a)*speed*(0.5+Math.random())-2,life:life+Math.random()*0.4,mLife:life+Math.random()*0.4,size:2+Math.random()*5,color});
  }
}
function spawnBubble(x,y){bubbles.push({x:x+(Math.random()-0.5)*20,y,size:2+Math.random()*6,spd:0.5+Math.random()*2,op:0.7});}
function spawnSplash(x,y){for(let i=0;i<10;i++){let a=Math.PI*2*i/10+Math.random()*0.3;splashes.push({x,y,vx:Math.cos(a)*(2+Math.random()*4),vy:Math.sin(a)*(2+Math.random()*4)-4,size:3+Math.random()*5,op:1});}}
// 扩散水波纹（稀有度预兆）
function spawnRippleRing(x,y,color,count){
  for(let i=0;i<count;i++){
    let delay=i*(0.1+Math.random()*0.05);
    rippleRings.push({x,y,color,r:6,life:-delay,lifeMax:0.9+Math.random()*0.3,thick:1.5+Math.random()*1.5});
  }
}
function shakeScreen(amt){screenShake=Math.max(screenShake,amt);}
function drawRippleRings(){
  for(let R of rippleRings){
    if(R.life<0)continue;
    let a=Math.max(0,1-R.life/R.lifeMax);
    cx.strokeStyle=`rgba(${hexRGB(R.color)},${(1-a)*0.55})`;
    cx.lineWidth=R.thick*(1-a*0.6);
    cx.beginPath();cx.arc(R.x,R.y,R.r,0,Math.PI*2);cx.stroke();
  }
}

// ============ 钓点系统 ============
// 鱼影尺寸：稀有度只给「倾向」不给答案 —— 影子越大越可能有好鱼，但也可能是假货
const RARITY_SHADOW={N:0,R:0.22,SR:0.46,SSR:0.7,UR:0.95};
function spotDimScale(){return Math.max(560,Math.min(W,H))/760;}
// 生成鱼影外观 + 缓慢游动参数（全部是模糊黑色鱼影，看不出具体是什么鱼）
function initSpotLook(s){
  let k=spotDimScale();
  let rf=Math.min(1,(RARITY_SHADOW[s.fishRarity]||0)+Math.random()*0.08);
  // 尺寸系数 0.35~1.30：稀有鱼整体偏大，但与普通鱼区间重叠 → 需要赌
  let g=0.35+rf*0.55+Math.random()*0.45;
  if(s.isFake)g=0.34+Math.random()*0.6; // 假货尺寸同样随机，不留破绽
  s.sizeK=Math.max(0.3,g);
  s.size=(11+s.sizeK*21)*k;               // 鱼影半长
  s.dir=Math.random()<0.5?-1:1;
  s.vx=s.dir*(6+Math.random()*10)*k;      // 缓慢横向游动
  s.swimPhase=Math.random()*Math.PI*2;
  s.tailPhase=Math.random()*Math.PI*2;
  s.bobAmp=(2.5+Math.random()*4)*k;
  s.bobSpeed=0.45+Math.random()*0.5;
  s.baseY=s.y;
  s.age=0;
  s.opacity=(s.zone==='water'?0.46:0.4)+Math.random()*0.18;
  s.minX=stick.x+30;s.maxX=Math.max(s.minX+60,W-40);
}
// 区域内随机取点（带回溯次数上限，避免钓点多时死循环）
function spotXY(zone){
  switch(zone){
    case 'water': return {x:stick.x+40+Math.random()*(W-stick.x-80),y:waterSpotY()};
    case 'cloud': return {x:W*0.1+Math.random()*W*0.8,y:H*0.05+Math.random()*H*0.2};
    case 'mountain': return {x:W*0.2+Math.random()*W*0.55,y:H*0.2+Math.random()*H*0.2};
    case 'sky': return {x:W*0.05+Math.random()*W*0.9,y:H*0.03+Math.random()*H*0.15};
    case 'tree': return {x:W*0.05+Math.random()*W*0.3,y:H*0.25+Math.random()*H*0.25};
    case 'sun': return {x:W*0.68+Math.random()*W*0.1,y:H*0.12+Math.random()*H*0.1};
    case 'rock': return {x:W*0.1+Math.random()*W*0.5,y:H*0.4+Math.random()*H*0.12};
    default: return {x:stick.x+40+Math.random()*(W-stick.x-80),y:waterSpotY()};
  }
}
function findSpotPos(zone){
  for(let t=0;t<16;t++){
    let p=spotXY(zone);
    if(!spots.some(s=>s.life>0&&Math.hypot(s.x-p.x,s.y-p.y)<42))return p;
  }
  return null; // 太挤，本次放弃生成
}
function makeSpot(zone,isFake,cfg){
  let p=findSpotPos(zone);
  if(!p)return null;
  let bonusRarity=zoneBonusRarity(zone,p.y,cfg||null);
  let fishRarity=rollSpotRarity({isFake,bonusRarity});
  let lifeV=4+Math.random()*3;
  let sp={x:p.x,y:p.y,zone,isFake,temptation:'',life:lifeV,maxLife:lifeV,
    pulse:Math.random()*Math.PI*2,scale:1,bonusRarity,fishRarity,
    textAlpha:1,showText:false,flashRevealed:0,flashColor:''};
  initSpotLook(sp);
  return sp;
}
function spawnSpots(){
  if(G.phase!=='idle')return;
  // 冒险模式：独立钓点生成，不受关卡配置影响
  if(adv.active){
    // 水中鱼影大幅增加：至少 10 个，随天数继续增长
    let targetCount=Math.min(15,10+Math.floor(adv.day*0.5));
    spots=spots.filter(s=>s.life>0);
    if(spots.length>=targetCount)return;
    let needed=Math.min(5,targetCount-spots.length);
    // 危险度越高 → 假鱼影越多
    let fakeRate=adv.danger>DANGER_DOOM?0.55:adv.danger>DANGER_DANGER?0.4:adv.danger>DANGER_WARN?0.25:0.12;
    let waterCount=spots.filter(s=>s.zone==='water').length;
    for(let i=0;i<needed;i++){
      // 水面是冒险模式主战场：优先保证水里有足够鱼影
      let zone=(waterCount<7&&Math.random()<0.75)?'water':pickSpotZone();
      let sp=makeSpot(zone,Math.random()<fakeRate,null);
      if(!sp)break;
      if(zone==='water')waterCount++;
      spots.push(sp);
    }
    return;
  }
  // 闯关模式：使用关卡配置
  let cfg=LEVELS[levelIdx];
  let targetCount=cfg.spots;
  // 清理过期钓点
  spots=spots.filter(s=>s.life>0);
  if(spots.length>=targetCount)return;

  let needed=targetCount-spots.length;
  let forcedCloud=cfg.forceCloud||0;
  let forcedMtn=cfg.forceMountain||0;
  let forcedSun=cfg.forceSun||0;

  for(let i=0;i<needed;i++){
    let zone;
    // 优先放置强制区域
    if(forcedCloud>0){zone='cloud';forcedCloud--;}
    else if(forcedMtn>0){zone='mountain';forcedMtn--;}
    else if(forcedSun>0){zone='sun';forcedSun--;}
    else zone=pickSpotZone();

    // 特殊区域稀有度加成（水=越深越高；天空/山固定较高；太阳按关卡配置）
    let sp=makeSpot(zone,Math.random()<cfg.fakeRate,cfg);
    if(!sp)break;
    spots.push(sp);
  }
}

function refreshSpot(s){
  // 鱼影游走后重新生成（优先保证强制区域）
  let cfg=LEVELS[levelIdx];
  // 检查是否需要补充强制区域
  let forceCloud=0,forceMtn=0,forceSun=0;
  if(cfg.forceCloud){let cnt=spots.filter(sp=>sp.zone==='cloud'&&!sp.clicked&&sp.life>0).length;forceCloud=Math.max(0,cfg.forceCloud-cnt);}
  if(cfg.forceMountain){let cnt=spots.filter(sp=>sp.zone==='mountain'&&!sp.clicked&&sp.life>0).length;forceMtn=Math.max(0,cfg.forceMountain-cnt);}
  if(cfg.forceSun){let cnt=spots.filter(sp=>sp.zone==='sun'&&!sp.clicked&&sp.life>0).length;forceSun=Math.max(0,cfg.forceSun-cnt);}
  let zone;
  if(forceCloud>0)zone='cloud';
  else if(forceMtn>0)zone='mountain';
  else if(forceSun>0)zone='sun';
  else zone=pickSpotZone();
  let isFake=Math.random()<cfg.fakeRate;
  s.life=4+Math.random()*3;s.maxLife=s.life; // 先置存活，避免同一批刷新时互相重叠
  let p=findSpotPos(zone);
  if(!p){p=spotXY(zone);}
  let bonusRarity=zoneBonusRarity(zone,p.y,cfg);
  s.x=p.x;s.y=p.y;s.zone=zone;s.isFake=isFake;s.temptation='';
  s.pulse=Math.random()*Math.PI*2;s.scale=1;
  s.bonusRarity=bonusRarity;s.textAlpha=1;s.showText=false;
  s.flashRevealed=0;
  s.fishRarity=rollSpotRarity({isFake,bonusRarity});
  initSpotLook(s);
  s.age=0;
}

// ============ 鱼群（装饰） ============
function maintainFishSchool(){
  fishSpawnTimer+=deltaTime;
  const SPAWN_INTERVAL=0.55;   // 每条鱼固定的出现间隔（秒）—— 出现时间统一
  const FISH_MAX=10;           // 鱼群总数上限
  if(fishSpawnTimer<SPAWN_INTERVAL)return;
  fishSpawnTimer=0;
  if(fishes.length>=FISH_MAX)return;
  let dir=Math.random()>0.5?1:-1;
  let fish,speed,goldenFish=Math.random()<0.01;   // 1% 概率出现高速高等级黄金鱼
  if(goldenFish){
    const PREMIUM=['🐉','🐬','🦈','🐢','🐠'];
    fish=FISH_POOL.find(f=>PREMIUM.includes(f.e))||FISH_POOL[0];
    speed=(260+Math.random()*140)*dir;   // 游动速度明显更快
  }else{
    fish=FISH_POOL[Math.floor(Math.random()*FISH_POOL.length)];
    // 每条鱼速度都不同：基础 28~180
    speed=(28+Math.random()*152)*dir;
  }
  let size=fish.w[0]+Math.random()*(fish.w[1]-fish.w[0])*0.5;
  fishes.push({
    fish,dir,speed,size,color:fish.c,emoji:fish.e,
    y:H*WL+H*0.04+Math.random()*H*0.3,
    x:dir===1?-60:W+60,alive:true,wobble:Math.random()*Math.PI*2,
    depth:goldenFish?0.1:0.3+Math.random()*0.7,
    alpha:goldenFish?0.95:0.3+Math.random()*0.4,
    golden:goldenFish,
  });
  for(let i=fishes.length-1;i>=0;i--){
    let f=fishes[i];
    if((f.dir===1&&f.x>W+120)||(f.dir===-1&&f.x<-120))fishes.splice(i,1);
  }
}

// ============ 渲染函数 ============
// 顶部中央钓点刷新倒计时（明显版）
function drawRefreshCountdown(){
  if(G.islandMode)return;
  if(!adv.active&&gameMode!=='level')return;
  let remain=null;
  for(let s of spots){if(!s.clicked&&s.life>0){if(remain===null||s.life<remain)remain=s.life;}}
  if(remain===null)return;
  remain=Math.max(0,remain);
  let t=performance.now()*0.001;
  let urgent=remain<=1.2;
  let col=remain>3?'#4FC3F7':urgent?'#EF5350':'#FFC107';
  let pulse=urgent?(0.35+0.3*Math.sin(t*12)):0;
  let x=W/2,y=24;
  cx.save();
  cx.font='bold 21px system-ui,sans-serif';
  let txt='⏳ 刷新 '+remain.toFixed(1)+'s';
  let tw=cx.measureText(txt).width;
  let bw=tw+34,bh=36;
  // 紧急脉冲外圈
  if(pulse>0){
    cx.globalAlpha=pulse;
    cx.strokeStyle=col;cx.lineWidth=5;
    cx.beginPath();roundRect(x-bw/2-8,y-bh/2-8,bw+16,bh+16,26);cx.stroke();
  }
  // 主体
  cx.globalAlpha=0.92;
  cx.fillStyle='rgba(8,14,28,0.85)';
  cx.beginPath();roundRect(x-bw/2,y-bh/2,bw,bh,18);cx.fill();
  cx.globalAlpha=1;
  cx.strokeStyle=col;cx.lineWidth=2;
  cx.beginPath();roundRect(x-bw/2,y-bh/2,bw,bh,18);cx.stroke();
  // 文字
  cx.fillStyle=col;
  cx.textAlign='center';cx.textBaseline='middle';
  cx.fillText(txt,x,y);
  cx.restore();
}

function render(){
  if(!cx||W<=0||H<=0)return;
  cx.clearRect(0,0,W,H);
  // 岛屿模式（种下的鱼在小岛下方的水里游）
  if(G.islandMode){renderIsland();drawIslandPondFish();return;}
  // 种鱼模式：渲染海面背景作氛围，池塘界面由 DOM 覆盖层绘制
  if(G.gardenMode){drawSky();drawSun();drawMountains();drawWater();drawFishSchool();drawBoat();drawStickman();return;}
  // 屏幕震动
  if(screenShake>0){
    cx.save();
    cx.translate((Math.random()-0.5)*screenShake*2,(Math.random()-0.5)*screenShake*2);
    screenShake=Math.max(0,screenShake-0.03);
  }
  drawSky();drawSun();drawMountains();drawWater();
  // 暴风雨预兆特效（在钓点之前显示天气）
  if(adv.active&&adv.danger>=DANGER_PREMONITION&&!adv.dayEnded)drawStormPremonition();
  drawSpots();
  drawCastTarget();
  drawFishSchool();drawBoat();drawStickman();
  drawFrogRod();drawHookLine();
  drawParticles();drawBubbles();drawSplashes();drawRippleRings();
  if(disasterFX.active)drawDisasterFX();
  if(goodEventFX.active)drawGoodEventFX();
  drawCandyBird();
  drawHiddenTreasures();
  drawTongue();
  if(ceremonyAnim_d&&ceremonyAnim_d.phase===1&&ceremonyGlow_d>0)drawCeremonyGlow();
  if(screenShake>0)cx.restore();
  if(G.flashAlpha>0){
    cx.fillStyle=`rgba(255,255,255,${G.flashAlpha})`;
    cx.fillRect(0,0,W,H);
  }
}

function drawSky(){
  let dark=0;
  if(adv.active&&adv.danger>=DANGER_PREMONITION&&!adv.dayEnded){
    dark=Math.min(1,(adv.danger-DANGER_PREMONITION)/(DANGER_DOOM-DANGER_PREMONITION))*0.7;
  }
  if(disasterFX.active&&(disasterFX.type==='darkfog'||disasterFX.type==='tornado')){
    dark=Math.max(dark,disasterFX.intensity*0.85);
  }
  let tod=adv.timeOfDay||'noon';
  let g=cx.createLinearGradient(0,0,0,H*WL);
  let topR,topG,topB,mR,mG,mB,bR,bG,bB,botR,botG,botB;
  if(tod==='morning'){
    // 🌅 早晨：柔和的粉金渐变
    topR=120;topG=80;topB=180;
    mR=240;mG=150;mB=130;
    bR=200;bG=220;bB=240;
    botR=160;botG=210;botB=240;
  }else if(tod==='evening'){
    // 🌆 傍晚：暖橙红色
    topR=100;topG=50;topB=30;
    mR=220;mG=120;mB=50;
    bR=200;bG=180;bB=130;
    botR=170;botG=190;botB=210;
  }else if(tod==='night'){
    // 🌙 夜晚：深蓝紫
    topR=15;topG=15;topB=40;
    mR=20;mG=20;mB=60;
    bR=25;bG=35;bB=80;
    botR=30;botG=50;botB=90;
  }else{
    // ☀️ 正午：明亮蓝天
    topR=130;topG=185;topB=255;
    mR=180;mG=215;mB=255;
    bR=220;bG=235;bB=255;
    botR=200;botG=230;botB=255;
  }
  // 应用灾难黑暗效果
  topR=Math.floor(topR*(1-dark));topG=Math.floor(topG*(1-dark));topB=Math.floor(topB*(1-dark));
  mR=Math.floor(mR*(1-dark));mG=Math.floor(mG*(1-dark));mB=Math.floor(mB*(1-dark));
  bR=Math.floor(bR*(1-dark));bG=Math.floor(bG*(1-dark));bB=Math.floor(bB*(1-dark));
  botR=Math.floor(botR*(1-dark));botG=Math.floor(botG*(1-dark));botB=Math.floor(botB*(1-dark));
  g.addColorStop(0,`rgb(${topR},${topG},${topB})`);
  g.addColorStop(0.4,`rgb(${mR},${mG},${mB})`);
  g.addColorStop(0.7,`rgb(${bR},${bG},${bB})`);
  g.addColorStop(1,`rgb(${botR},${botG},${botB})`);
  cx.fillStyle=g;cx.fillRect(0,0,W,H*WL+0.02);
}
function drawStormPremonition(){
  let d=adv.danger;
  let t=performance.now()*0.001;
  // 天空暗化叠加层
  let darkAlpha=Math.min(1,(d-DANGER_PREMONITION)/(DANGER_DOOM-DANGER_PREMONITION))*0.35;
  cx.fillStyle=`rgba(10,10,30,${darkAlpha})`;
  cx.fillRect(0,0,W,H*WL);
  // 乌云
  let cloudCount=Math.floor(3+darkAlpha*8);
  for(let i=0;i<cloudCount;i++){
    let cx0=((t*20+i*W*0.3)%(W+300))-150;
    let cy0=10+Math.sin(i*2.1)*25;
    let w0=80+Math.sin(i*3.7)*50;
    cx.fillStyle=`rgba(20,20,40,${0.2+darkAlpha*0.6})`;
    cx.beginPath();
    cx.ellipse(cx0,cy0,w0,w0*0.4,0,0,Math.PI*2);
    cx.fill();
    cx.ellipse(cx0+35,cy0-8,w0*0.7,w0*0.3,0.2,0,Math.PI*2);
    cx.fill();
  }
  // 闪电 (d>=DANGER_DANGER时概率闪烁)
  if(d>=DANGER_DANGER){
    stormWarn.lightning-=0.016;
    if(stormWarn.lightning<=0){
      stormWarn.lightning=1.5+Math.random()*4;
      stormWarn._flashA=darkAlpha*0.9;
      // 雷声与闪电同步：延迟300-700ms模拟光速快于声速
      let tv=0.4+Math.random()*0.45;
      setTimeout(()=>sfx_thunder(tv),300+Math.random()*400);
    }
    if(stormWarn._flashA>0){
      stormWarn._flashA-=0.03;
      // 画闪电
      let lx=W*(0.2+Math.random()*0.6), ly=H*WL*0.02;
      cx.strokeStyle='rgba(255,255,200,0.9)';
      cx.lineWidth=2+Math.random()*2;
      cx.beginPath();cx.moveTo(lx,ly);
      for(let s=0;s<5;s++){
        lx+=Math.sin(t*40+s)*12-6;
        ly+=H*WL*0.15;
        cx.lineTo(lx,ly);
      }
      cx.stroke();
      // 全屏白光闪烁
      cx.fillStyle=`rgba(255,255,240,${stormWarn._flashA})`;
      cx.fillRect(0,0,W,H);
    }
  }
  // 雨丝 (d>=DANGER_DANGER)
  if(d>=DANGER_DANGER&&!disasterFX.active){
    let rainCount=Math.floor(20+darkAlpha*60);
    cx.strokeStyle=`rgba(180,200,255,${0.15+darkAlpha*0.5})`;
    cx.lineWidth=1;
    for(let i=0;i<rainCount;i++){
      let rx=((i*97+Math.sin(t*3+i)*40)%W+W)%W;
      let ry=((i*73+t*120)%(H*WL+100))-50;
      cx.beginPath();
      cx.moveTo(rx,ry);
      cx.lineTo(rx-2,ry+15);
      cx.stroke();
    }
  }
  // 风线
  if(d>=DANGER_DOOM-5){
    let windCount=Math.floor(4+darkAlpha*12);
    cx.strokeStyle=`rgba(200,200,220,${0.2+darkAlpha*0.4})`;
    cx.lineWidth=1;
    for(let i=0;i<windCount;i++){
      let wx=((t*80+i*W*0.21)%(W+200))-100;
      let wy=H*WL*0.15+i*H*WL*0.12;
      cx.beginPath();
      cx.moveTo(wx,wy);
      cx.quadraticCurveTo(wx+30,wy+3,wx+55,wy-2);
      cx.stroke();
    }
  }
}
function drawSun(){
  let sx=W*0.72,sy=H*0.16;
  let g=cx.createRadialGradient(sx,sy,10,sx,sy,70);
  g.addColorStop(0,'rgba(255,255,200,0.8)');g.addColorStop(0.5,'rgba(255,180,80,0.3)');g.addColorStop(1,'rgba(255,100,30,0)');
  cx.fillStyle=g;cx.beginPath();cx.arc(sx,sy,70,0,Math.PI*2);cx.fill();
  cx.fillStyle='#FFE066';cx.beginPath();cx.arc(sx,sy,25,0,Math.PI*2);cx.fill();
}
function drawMountains(){
  cx.fillStyle='#2C3E50';
  cx.beginPath();cx.moveTo(0,H*WL+0.02);
  cx.lineTo(W*.15,H*.3);cx.lineTo(W*.3,H*WL-0.02);cx.lineTo(W*.5,H*.25);
  cx.lineTo(W*.7,H*WL-0.04);cx.lineTo(W*.85,H*.28);cx.lineTo(W,H*WL-0.01);
  cx.lineTo(W,H*WL+0.02);cx.closePath();cx.fill();
}
function drawWater(){
  let wt=H*WL;
  let g=cx.createLinearGradient(0,wt,0,H);
  g.addColorStop(0,'#1B7BA8');g.addColorStop(0.15,'#154E78');g.addColorStop(0.4,'#0A2A48');g.addColorStop(0.7,'#051830');g.addColorStop(1,'#020C18');
  cx.fillStyle=g;cx.fillRect(0,wt,W,H-wt);
  cx.fillStyle='rgba(255,255,255,0.03)';cx.fillRect(0,wt,W,15);
  cx.strokeStyle='rgba(255,255,255,0.18)';cx.lineWidth=1.5;
  for(let i=0;i<4;i++){cx.beginPath();
    for(let x=0;x<=W;x+=8){let y=wt+3+i*11+Math.sin(x*0.025+ww+i)*2;
      x===0?cx.moveTo(x,y):cx.lineTo(x,y);}cx.stroke();}
}

// ============ 钓点指示器（水面涟漪圆圈） ============
function drawCastTarget(){
  if(G.phase!=='idle'||castRipple<=0)return;
  let r=35-castRipple*25;
  let alpha=castRipple*0.7;
  cx.strokeStyle=`rgba(255,255,255,${alpha})`;cx.lineWidth=2;
  cx.beginPath();cx.arc(castX,castY,r,0,Math.PI*2);cx.stroke();
  cx.strokeStyle=`rgba(255,255,255,${alpha*0.5})`;cx.lineWidth=1;
  cx.beginPath();cx.arc(castX,castY,r*0.65,0,Math.PI*2);cx.stroke();
  cx.fillStyle=`rgba(255,100,100,${alpha*0.8})`;
  cx.beginPath();cx.arc(castX,castY,4,0,Math.PI*2);cx.fill();
}

// ============ 钓点渲染（全屏） ============
function drawSpots(){
  if(G.phase!=='idle')return;
  let t=Date.now()*0.001;
  spots.forEach(s=>{
    if(s.life<=0||s.clicked)return;
    let sz=s.size||20;
    // 淡入 + 快消失时淡出（保持「看不清」的模糊感）
    let fadeIn=Math.min(1,(s.age||0)/0.4);
    let fadeOut=s.life<1.6?s.life/1.6:1;
    let breathe=0.88+0.12*Math.sin(t*1.6+s.pulse);
    let alpha=(s.opacity!==undefined?s.opacity:0.46)*fadeIn*fadeOut*breathe;
    let dir=s.dir||1;
    // 越深水越暗，用一层「水光」光晕保证黑色鱼影在深水里依然看得见
    let dep=Math.max(0,Math.min(1,(s.y-H*WL)/Math.max(1,H-H*WL)));
    let glowA=0.18+0.5*dep;
    cx.save();
    cx.translate(s.x,s.y);
    cx.scale(dir,1);
    cx.globalAlpha=alpha;
    // 1) 水光光晕（只吃亮度，不暴露鱼种）
    let halo=cx.createRadialGradient(0,0,sz*0.2,0,0,sz*2.0);
    halo.addColorStop(0,`rgba(150,212,255,${(0.10+0.20*dep)})`);
    halo.addColorStop(0.55,`rgba(110,180,255,${(0.05+0.11*dep)})`);
    halo.addColorStop(1,'rgba(110,180,255,0)');
    cx.fillStyle=halo;
    cx.beginPath();cx.arc(0,0,sz*2.0,0,Math.PI*2);cx.fill();
    // 2) 模糊黑色鱼影本体（外发光勾出轮廓，内部仍是看不清的死黑）
    cx.globalAlpha=Math.min(1,alpha*2.3); // 本体加深，保证深水里也是「黑影」而不是灰雾
    cx.shadowColor=`rgba(140,205,255,${glowA})`;
    cx.shadowBlur=Math.max(9,sz*0.75);
    cx.fillStyle='rgba(4,9,17,0.98)';
    let bl=sz*0.62,bh=sz*0.4;
    let tailW=(0.24+0.06*Math.sin(t*2.6+s.tailPhase))*sz;
    cx.beginPath();cx.ellipse(0,0,bl,bh,0,0,Math.PI*2);cx.fill();
    // 尾鳍（左右摆动）
    cx.beginPath();
    cx.moveTo(-bl*0.82,0);
    cx.lineTo(-bl*1.05-tailW,-bh*1.05);
    cx.lineTo(-bl*1.18-tailW*0.5,0);
    cx.lineTo(-bl*1.05-tailW,bh*1.05);
    cx.closePath();cx.fill();
    // 背鳍
    cx.beginPath();
    cx.moveTo(-bl*0.32,-bh*0.8);
    cx.lineTo(bl*0.02,-bh*1.65);
    cx.lineTo(bl*0.36,-bh*0.75);
    cx.closePath();cx.fill();
    // 胸鳍
    cx.beginPath();
    cx.ellipse(bl*0.05,bh*0.5,bl*0.24,bh*0.22,0.5,0,Math.PI*2);cx.fill();
    cx.shadowBlur=0;
    // 3) 轮廓细光边
    cx.strokeStyle=`rgba(175,220,255,${(0.10+0.22*dep)*alpha})`;
    cx.lineWidth=1.1;
    cx.beginPath();cx.ellipse(0,0,bl,bh,0,0,Math.PI*2);cx.stroke();
    cx.globalAlpha=alpha;
    cx.restore();

    // 闪光弹揭示：假鱼影红色高亮 + ❌ 标记
    if(s.flashRevealed>0&&s.isFake){
      let fa=Math.min(1,s.flashRevealed/4);
      let flicker=0.7+Math.sin(t*8)*0.3;
      let rr=sz*1.15;
      let fg=cx.createRadialGradient(s.x,s.y,0,s.x,s.y,rr*1.6);
      fg.addColorStop(0,`rgba(255,50,50,${0.6*fa*flicker})`);
      fg.addColorStop(0.5,`rgba(255,30,30,${0.25*fa*flicker})`);
      fg.addColorStop(1,'rgba(0,0,0,0)');
      cx.fillStyle=fg;
      cx.beginPath();cx.arc(s.x,s.y,rr*1.6,0,Math.PI*2);cx.fill();
      cx.strokeStyle=`rgba(255,50,50,${0.85*fa})`;cx.lineWidth=3+flicker;
      cx.beginPath();cx.arc(s.x,s.y,rr,0,Math.PI*2);cx.stroke();
      cx.strokeStyle=`rgba(255,30,30,${0.95*fa})`;cx.lineWidth=4;
      cx.beginPath();cx.moveTo(s.x-rr*0.75,s.y-rr*0.75);cx.lineTo(s.x+rr*0.75,s.y+rr*0.75);cx.stroke();
      cx.beginPath();cx.moveTo(s.x+rr*0.75,s.y-rr*0.75);cx.lineTo(s.x-rr*0.75,s.y+rr*0.75);cx.stroke();
      cx.fillStyle=`rgba(255,255,255,${0.95*fa})`;
      cx.font='bold 12px "Microsoft YaHei"';
      cx.textAlign='center';cx.textBaseline='middle';
      cx.fillText('❌假货',s.x,s.y+rr+12);
    }
  });
}

function roundRect(x,y,w,h,r){
  cx.beginPath();
  cx.moveTo(x+r,y);cx.lineTo(x+w-r,y);
  cx.arcTo(x+w,y,x+w,y+r,r);cx.lineTo(x+w,y+h-r);
  cx.arcTo(x+w,y+h,x+w-r,y+h,r);cx.lineTo(x+r,y+h);
  cx.arcTo(x,y+h,x,y+h-r,r);cx.lineTo(x,y+r);
  cx.arcTo(x,y,x+r,y,r);cx.closePath();
}

function drawBoat(){
  let sx=stick.x, sy=stick.y;
  // 船体
  let bx=sx-75, by=sy+8;
  cx.save();
  // 船底 - 深色木质
  cx.fillStyle='#5D3A1A';
  cx.beginPath();
  cx.moveTo(bx,by);
  cx.quadraticCurveTo(bx+40,by-18,bx+75,by-22);
  cx.quadraticCurveTo(bx+120,by-18,bx+150,by);
  cx.quadraticCurveTo(bx+140,by+28,bx+75,by+24);
  cx.quadraticCurveTo(bx+10,by+28,bx,by);
  cx.closePath();cx.fill();
  // 船身木板纹
  cx.strokeStyle='#4A2A10';cx.lineWidth=1;
  for(let i=1;i<=3;i++){cx.beginPath();cx.moveTo(bx+10,by-2+i*6);cx.lineTo(bx+140,by-12+i*6);cx.stroke();}
  // 船沿
  cx.fillStyle='#7B4B2A';
  cx.beginPath();
  cx.moveTo(bx+5,by-6);
  cx.quadraticCurveTo(bx+75,by-28,bx+145,by-6);
  cx.quadraticCurveTo(bx+140,by,bx+75,by+8);
  cx.quadraticCurveTo(bx+10,by,bx+5,by-6);
  cx.closePath();cx.fill();
  // 桅杆
  cx.strokeStyle='#3E2008';cx.lineWidth=3.5;
  cx.beginPath();cx.moveTo(bx+90,by-16);cx.lineTo(bx+90,sy-60);cx.stroke();
  // 船帆
  cx.fillStyle='#F5F5DC';
  cx.beginPath();
  cx.moveTo(bx+90,sy-58);
  cx.quadraticCurveTo(bx+135,sy-38,bx+90,sy-12);
  cx.closePath();cx.fill();
  cx.strokeStyle='#3E2008';cx.lineWidth=1;
  cx.beginPath();
  cx.moveTo(bx+90,sy-58);
  cx.quadraticCurveTo(bx+135,sy-38,bx+90,sy-12);
  cx.stroke();
  // 小旗子
  cx.fillStyle='#E74C3C';
  cx.beginPath();cx.moveTo(bx+90,sy-58);cx.lineTo(bx+98,sy-54);cx.lineTo(bx+90,sy-49);cx.fill();
  // 船舷装饰
  cx.fillStyle='#8B5E3C';cx.fillRect(bx+115,by-8,3,10);
  cx.restore();
}
function drawStickman(){
  let sx=stick.x, sy=stick.y;
  let bodyLean=0, sw=0, faceType=0;

  if(ceremonyAnim_d){
    if(ceremonyAnim_d.phase===0){
      let t=castTimer_d/0.35;
      if(castTimer_d<0.35)bodyLean=-14*Math.pow(Math.min(1,t),0.7);
      else if(castTimer_d<0.7){let t2=(castTimer_d-0.35)/0.35;bodyLean=18*Math.sin(t2*Math.PI);}
      else bodyLean=8*Math.exp(-(castTimer_d-0.7)*5);
      sw=bodyLean*0.5;faceType=9; // 用力的表情
    }else if(ceremonyAnim_d.phase===1){
      faceType=8; // 期待/惊讶
    }else{faceType=0;}
  }else{
    bodyLean=idleCurLean;sw=idleCurSw;faceType=idleCurFace;
  }

  let leanOff=bodyLean*0.3;
  // 头
  cx.fillStyle='#1a1a1a';cx.beginPath();cx.arc(sx+leanOff,sy-48+sw*0.2+bodyLean*0.1,13,0,Math.PI*2);cx.fill();

  // 脸
  drawFace(faceType,sx+leanOff,sy-48+sw*0.2+bodyLean*0.1);

  // 身体
  cx.strokeStyle='#1a1a1a';cx.lineWidth=4;cx.lineCap='round';
  cx.beginPath();cx.moveTo(sx,sy-35);cx.lineTo(sx+sw,sy);cx.stroke();
  // 腿
  cx.beginPath();cx.moveTo(sx+sw,sy);cx.lineTo(sx-5+sw*0.3,sy+35);cx.moveTo(sx+sw,sy);cx.lineTo(sx+5+sw*0.3,sy+35);cx.stroke();
  // 左臂
  let lhx=sx-16+sw*0.5, lhy=sy-8-sw*0.3;
  // 特殊pose调整左手
  if(!ceremonyAnim_d&&faceType===2)lhx=sx-8; // 伸懒腰: 左手举高
  if(!ceremonyAnim_d&&faceType===5){lhx=sx-8;lhy=sy-24;} // 打哈欠: 左手捂嘴
  if(!ceremonyAnim_d&&faceType===4){lhx=sx-18;lhy=sy+2;} // 俯身: 手扶膝盖
  cx.beginPath();cx.moveTo(sx+sw,sy-23);cx.lineTo(lhx,lhy);cx.stroke();
  // 右臂(持竿)
  let ar=((rodAngle||0)*Math.PI)/180;
  let hx=sx+15+Math.cos(ar)*22, hy=sy-23+Math.sin(ar)*22;
  if(rodBend>0){hy-=rodBend*0.4;hx+=rodBend*0.2;}
  cx.beginPath();cx.moveTo(sx+sw,sy-23);cx.lineTo(hx,hy);cx.stroke();
  stick.handX=hx;stick.handY=hy;
}

function drawFace(type,sx,sy){
  let eyeY=sy-3, mouthY=sy+5, eyeSize=2.2;
  cx.fillStyle='#fff';
  cx.strokeStyle='#1a1a1a';cx.lineWidth=1.8;
  let le=sx-3.5, re=sx+3.5;
  switch(type){
    case 0: // 面无表情
      cx.beginPath();cx.arc(le,eyeY,eyeSize,0,Math.PI*2);cx.arc(re,eyeY,eyeSize,0,Math.PI*2);cx.fill();
      cx.beginPath();cx.moveTo(sx-4,mouthY);cx.lineTo(sx+4,mouthY);cx.stroke();
      break;
    case 1: // 看水发愣
      cx.beginPath();cx.arc(le,eyeY+1,eyeSize,0.2,Math.PI*0.9);cx.arc(re,eyeY+1,eyeSize,0.2,Math.PI*0.9);cx.fill();
      cx.beginPath();cx.moveTo(sx-3,mouthY);cx.lineTo(sx+3,mouthY-1);cx.stroke();
      break;
    case 2: // 闭眼伸懒腰
      cx.beginPath();cx.moveTo(le-2,eyeY-1);cx.quadraticCurveTo(le,eyeY+2,le+2,eyeY-1);cx.stroke();
      cx.beginPath();cx.moveTo(re-2,eyeY-1);cx.quadraticCurveTo(re,eyeY+2,re+2,eyeY-1);cx.stroke();
      cx.beginPath();cx.arc(sx,mouthY+5,5,0.1,Math.PI-0.1);cx.stroke();
      break;
    case 3: // 微笑
      cx.beginPath();cx.arc(le,eyeY,eyeSize,0,Math.PI*2);cx.arc(re,eyeY,eyeSize,0,Math.PI*2);cx.fill();
      cx.beginPath();cx.arc(sx,mouthY,5,0.15,Math.PI-0.15);cx.stroke();
      break;
    case 4: // 专注
      cx.beginPath();cx.arc(le,eyeY,eyeSize*0.7,0,Math.PI*2);cx.arc(re,eyeY,eyeSize*0.7,0,Math.PI*2);cx.fill();
      cx.fillStyle='#1a1a1a';cx.beginPath();cx.arc(le-1,eyeY-0.5,1,0,Math.PI*2);cx.arc(re-1,eyeY-0.5,1,0,Math.PI*2);cx.fill();
      cx.fillStyle='#fff';cx.strokeStyle='#1a1a1a';
      cx.beginPath();cx.moveTo(sx-3,mouthY);cx.lineTo(sx+3,mouthY);cx.stroke();
      break;
    case 5: // 打哈欠
      cx.beginPath();cx.arc(le,eyeY-1,eyeSize*0.6,0,Math.PI*2);cx.arc(re,eyeY-1,eyeSize*0.6,0,Math.PI*2);cx.fill();
      cx.beginPath();cx.arc(sx,mouthY-1,6,0,Math.PI*1.3);cx.stroke();
      break;
    case 6: // 左看
      cx.beginPath();cx.arc(le,eyeY,eyeSize*0.8,0,Math.PI*2);cx.arc(re,eyeY,eyeSize,0,Math.PI*2);cx.fill();
      cx.fillStyle='#1a1a1a';cx.beginPath();cx.arc(le-1,eyeY-0.3,0.8,0,Math.PI*2);cx.arc(re-1,eyeY-0.3,0.8,0,Math.PI*2);cx.fill();
      cx.fillStyle='#fff';cx.strokeStyle='#1a1a1a';
      cx.beginPath();cx.moveTo(sx-4,mouthY);cx.lineTo(sx+4,mouthY);cx.stroke();
      break;
    case 7: // 右看
      cx.beginPath();cx.arc(le,eyeY,eyeSize,0,Math.PI*2);cx.arc(re,eyeY,eyeSize*0.8,0,Math.PI*2);cx.fill();
      cx.fillStyle='#1a1a1a';cx.beginPath();cx.arc(le-1,eyeY-0.3,0.8,0,Math.PI*2);cx.arc(re-1,eyeY-0.3,0.8,0,Math.PI*2);cx.fill();
      cx.fillStyle='#fff';cx.strokeStyle='#1a1a1a';
      cx.beginPath();cx.moveTo(sx-4,mouthY);cx.lineTo(sx+4,mouthY);cx.stroke();
      break;
    case 8: // 期待/惊讶张嘴（仪式等待阶段）
      cx.beginPath();cx.arc(le,eyeY-1,3,0,Math.PI*2);cx.arc(re,eyeY-1,3,0,Math.PI*2);cx.fill();
      cx.fillStyle='#1a1a1a';cx.beginPath();cx.arc(le,eyeY-0.5,1.2,0,Math.PI*2);cx.arc(re,eyeY-0.5,1.2,0,Math.PI*2);cx.fill();
      cx.fillStyle='#fff';cx.strokeStyle='#1a1a1a';
      cx.beginPath();cx.arc(sx,mouthY+3,4.5,0.1,Math.PI-0.1);cx.stroke();
      break;
    case 9: // 用力表情（甩竿）
      cx.beginPath();cx.arc(le,eyeY,eyeSize*0.6,0,Math.PI*2);cx.arc(re,eyeY,eyeSize*0.6,0,Math.PI*2);cx.fill();
      cx.strokeStyle='#1a1a1a';cx.lineWidth=2;
      cx.beginPath();cx.moveTo(sx-5,mouthY-1);cx.lineTo(sx+5,mouthY-1);cx.stroke();
      break;
  }
}

// ============ 青蛙鱼竿（代替鱼竿，小人拿着青蛙） ============
function drawFrogRod(){
  if(!stick.handX&&stick.handX!==0)return;
  let hx=stick.handX, hy=stick.handY;
  let s=Math.min(W,H)/800; // 自适应缩放
  let fw=28*s, fh=22*s; // 青蛙身体尺寸
  let bend=rodBend;

  // === 青蛙状态更新 ===
  frog.bounceP+=deltaTime*4;let bounce=Math.sin(frog.bounceP)*2*s;
  frog.bellySize=lerp(frog.bellySize,frog.targetBelly,14*deltaTime);
  frog.eyeSize=lerp(frog.eyeSize,frog.targetEyeSize,12*deltaTime);
  // 大鱼时青蛙发抖
  if(frog.bellySize>1.7)frog.shakeA=Math.min(frog.shakeA+deltaTime*6, (frog.bellySize-1.7)*2);
  else frog.shakeA=Math.max(frog.shakeA-deltaTime*5,0);
  let shakeX=(Math.random()-0.5)*frog.shakeA*2*s, shakeY=(Math.random()-0.5)*frog.shakeA*2*s;
  frog.eyeDX=lerp(frog.eyeDX,frog.targetEyeDX,6*deltaTime);
  frog.eyeDY=lerp(frog.eyeDY,frog.targetEyeDY,6*deltaTime);
  frog.blinkT-=deltaTime;let blink=frog.blinkT<0.08&&frog.blinkT>0;
  if(frog.blinkT<=0)frog.blinkT=3+Math.random()*5;

  // === 计算青蛙在手中的位置和朝向 ===
  let fx,fy,faceAngle; // 青蛙中心坐标和脸朝向角度
  if(rodAngle!==0){
    // 甩竿时：青蛙随手臂旋转
    let ca=rodAngle*(Math.PI/180);
    let armLen=40*s;
    fx=hx+Math.cos(ca)*armLen;
    fy=hy+Math.sin(ca)*armLen;
    faceAngle=ca;
  }else{
    // 空闲时：手自然持蛙，蛙面朝前方偏下
    fx=hx+42*s+bend*0.2;
    fy=hy-26*s-bend*0.4;
    faceAngle=-0.55; // 约-31度，面朝水面方向
  }
  let fcos=Math.cos(faceAngle),fsin=Math.sin(faceAngle);

  // === 手部连接（手腕到青蛙后背） ===
  let backX=fx-fcos*fw*0.55, backY=fy-fsin*fw*0.55;
  cx.strokeStyle='#1a1a1a';cx.lineWidth=2*s;cx.lineCap='round';
  cx.beginPath();cx.moveTo(hx,hy);cx.lineTo(backX,backY);cx.stroke();

  // === 青蛙嘴位置（竿梢 = rodTip） ===
  let mouthX=fx+fcos*fw*0.6- fsin*fh*0.15;
  let mouthY=fy+fsin*fw*0.6+ fcos*fh*0.15;
  rodTip={x:mouthX, y:mouthY};

  cx.save();cx.translate(fx+shakeX,fy+shakeY);cx.rotate(faceAngle);

  // === 等级光环（Lv.2 起：蓝/绿/紫/金；Lv.1 无光环） ===
  if(frogLv>=2&&!frogRainbow){
    let lc=FROG_CFG[frogLv-1].color;
    let t=performance.now()*0.001;
    let hr=fw*(frogLv>=5?1.0:0.85)+Math.sin(t*3)*2*s;
    let hy=-fh*0.6;
    cx.strokeStyle=lc;cx.lineWidth=frogLv>=5?3*s:2*s;cx.globalAlpha=0.9;
    cx.beginPath();cx.ellipse(0,hy,hr,hr*0.3,0,0,Math.PI*2);cx.stroke();
    cx.globalAlpha=0.25;
    cx.beginPath();cx.ellipse(0,hy,hr+4*s,hr*0.3+3*s,0,0,Math.PI*2);cx.stroke();
    cx.globalAlpha=1;
    // 满级：旋转的金色星点
    if(frogLv>=5){
      for(let i=0;i<4;i++){
        let a=t*2+i*Math.PI/2;
        cx.fillStyle='rgba(255,215,0,'+(0.5+0.5*Math.sin(t*4+i))+')';
        cx.beginPath();cx.arc(Math.cos(a)*hr,hy+Math.sin(a)*hr*0.3,2.5*s,0,Math.PI*2);cx.fill();
      }
    }
  }

  // === 后腿（接近手腕） ===
  cx.fillStyle=frogRainbow?'hsl('+((performance.now()*0.06+40)%360)+',100%,62%)':'#4CAF50';
  cx.strokeStyle=frogRainbow?'rgba(255,255,255,0.6)':'#2E7D32';cx.lineWidth=2*s;
  cx.beginPath();cx.ellipse(-fw*0.5,-fh*0.25,9*s,6*s,-0.3,0,Math.PI*2);cx.fill();cx.stroke();
  cx.beginPath();cx.ellipse(-fw*0.5,fh*0.25,9*s,6*s,0.3,0,Math.PI*2);cx.fill();cx.stroke();
  // 脚趾
  cx.fillStyle=frogRainbow?'hsl('+((performance.now()*0.06+140)%360)+',100%,70%)':'#66BB6A';
  cx.beginPath();cx.arc(-fw*0.65,-fh*0.35,3*s,0,Math.PI*2);cx.fill();
  cx.beginPath();cx.arc(-fw*0.65,fh*0.35,3*s,0,Math.PI*2);cx.fill();

  frog.rewardGrade=lerp(frog.rewardGrade,frog.targetGrade,8*deltaTime);
  let grade=Math.round(frog.rewardGrade); // 0=无, 1=假, 2=N/R, 3=SR, 4=SSR, 5=UR
  let bellyFactor=frog.bellySize;
  let isFake=grade===1;
  let isN_R=grade===2, isSR=grade===3, isSSR=grade===4, isUR=grade===5;
  // === 身体 ===
  let bw=fw*(0.75+bellyFactor*0.25),bh=fh*bellyFactor;
  // 身体颜色按等级变化
  let bodyColor,strokeColor,strokeW,patternColor,bellyColor;
  if(frogRainbow){bodyColor='#FFFFFF';strokeColor='#FFF';strokeW=3*s;patternColor='#FFF';bellyColor='#FFFFFF';}
  else if(isFake){bodyColor='#78909C';strokeColor='#546E7A';strokeW=2*s;patternColor='#607D8B';bellyColor='#B0BEC5';}
  else if(isUR){bodyColor='#AB47BC';strokeColor='#FFD700';strokeW=4*s;patternColor='#8E24AA';bellyColor='#F3E5F5';}
  else if(isSSR){bodyColor='#FFB300';strokeColor='#FF6D00';strokeW=3.5*s;patternColor='#FF8F00';bellyColor='#FFF8E1';}
  else if(isSR){bodyColor='#43A047';strokeColor='#FFD54F';strokeW=3*s;patternColor='#2E7D32';bellyColor='#E8F5E9';}
  else if(isN_R){bodyColor='#66BB6A';strokeColor='#388E3C';strokeW=2.5*s;patternColor='#4CAF50';bellyColor='#C8E6C9';}
  else{bodyColor='#66BB6A';strokeColor='#2E7D32';strokeW=2*s;patternColor='#43A047';bellyColor='#E8F5E9';}
  // 身体轮廓
  cx.fillStyle=bodyColor;
  cx.beginPath();cx.ellipse(0,0,bw*0.48,bh*0.48,0,0,Math.PI*2);cx.fill();
  cx.strokeStyle=strokeColor;cx.lineWidth=strokeW;
  cx.beginPath();cx.ellipse(0,0,bw*0.48,bh*0.48,0,0,Math.PI*2);cx.stroke();
  // 彩虹青蛙：身体用流动彩虹渐变覆盖
  if(frogRainbow){
    let t=performance.now()*0.001;
    let hueShift=(t*60)%360;
    let grad=cx.createLinearGradient(-bw*0.5,-bh*0.5,bw*0.5,bh*0.5);
    grad.addColorStop(0,'hsl('+((hueShift+0)%360)+',100%,62%)');
    grad.addColorStop(0.17,'hsl('+((hueShift+60)%360)+',100%,62%)');
    grad.addColorStop(0.34,'hsl('+((hueShift+120)%360)+',100%,62%)');
    grad.addColorStop(0.51,'hsl('+((hueShift+180)%360)+',100%,62%)');
    grad.addColorStop(0.68,'hsl('+((hueShift+240)%360)+',100%,62%)');
    grad.addColorStop(0.85,'hsl('+((hueShift+300)%360)+',100%,62%)');
    grad.addColorStop(1,'hsl('+((hueShift+360)%360)+',100%,62%)');
    cx.fillStyle=grad;
    cx.beginPath();cx.ellipse(0,0,bw*0.46,bh*0.46,0,0,Math.PI*2);cx.fill();
    // 彩色描边
    let sg=cx.createLinearGradient(-bw*0.5,-bh*0.5,bw*0.5,bh*0.5);
    sg.addColorStop(0,'#FF6B6B');sg.addColorStop(0.2,'#FFD93D');sg.addColorStop(0.4,'#6BCB77');sg.addColorStop(0.6,'#4D96FF');sg.addColorStop(0.8,'#9B59B6');sg.addColorStop(1,'#FF6B6B');
    cx.strokeStyle=sg;cx.lineWidth=3.2*s;
    cx.beginPath();cx.ellipse(0,0,bw*0.48,bh*0.48,0,0,Math.PI*2);cx.stroke();
    // 彩虹背部花纹
    let pg=cx.createLinearGradient(-bw*0.5,0,bw*0.5,0);
    pg.addColorStop(0,'rgba(255,255,255,0.85)');pg.addColorStop(0.5,'rgba(255,255,255,0.35)');pg.addColorStop(1,'rgba(255,255,255,0.85)');
    cx.fillStyle=pg;
    cx.beginPath();cx.ellipse(-bw*0.12,0,bw*0.18,bh*0.4,0.1,0,Math.PI*2);cx.fill();
    cx.beginPath();cx.ellipse(bw*0.1,0,bw*0.14,bh*0.35,-0.1,0,Math.PI*2);cx.fill();
    // 肚皮
    cx.fillStyle='rgba(255,255,255,0.92)';
    cx.beginPath();cx.ellipse(bw*0.05,fh*0.08*bellyFactor,bw*0.35,bh*0.35*bellyFactor,0,0,Math.PI*2);cx.fill();
    cx.fillStyle='rgba(255,255,255,0.55)';
    cx.beginPath();cx.ellipse(bw*0.02,fh*0.02*bellyFactor,bw*0.12,bh*0.12*bellyFactor,-0.3,0,Math.PI*2);cx.fill();
  }else{
    // 背部花纹
    cx.fillStyle=patternColor;
    cx.beginPath();cx.ellipse(-bw*0.12,0,bw*0.18,bh*0.4,0.1,0,Math.PI*2);cx.fill();
    cx.beginPath();cx.ellipse(bw*0.1,0,bw*0.14,bh*0.35,-0.1,0,Math.PI*2);cx.fill();
    // 肚皮
    cx.fillStyle=bellyColor;
    cx.beginPath();cx.ellipse(bw*0.05,fh*0.08*bellyFactor,bw*0.35,bh*0.35*bellyFactor,0,0,Math.PI*2);cx.fill();
    cx.fillStyle='rgba(255,255,255,0.4)';
    cx.beginPath();cx.ellipse(bw*0.02,fh*0.02*bellyFactor,bw*0.12,bh*0.12*bellyFactor,-0.3,0,Math.PI*2);cx.fill();
  }
  // 彩虹青蛙：彩虹光环 + 星光粒子
  if(frogRainbow){
    let t=performance.now()*0.001;
    let rainbow=['rgba(255,80,80,','rgba(255,200,50,','rgba(120,220,90,','rgba(80,160,255,','rgba(180,100,255,'];
    // 旋转彩虹光环
    for(let i=0;i<5;i++){
      let rot=t*0.8+i*Math.PI/5;
      cx.fillStyle=rainbow[i]+'0.14)';
      cx.beginPath();
      cx.ellipse(Math.cos(rot)*bw*0.12,Math.sin(rot)*bw*0.12,bw*(0.62+0.06*Math.sin(t*2+i)),bh*(0.62+0.06*Math.cos(t*1.5+i)),rot*0.5,0,Math.PI*2);
      cx.fill();
    }
    // 星光粒子
    for(let i=0;i<6;i++){
      let a=t*1.2+i*Math.PI/3;
      let px=Math.cos(a)*bw*0.8, py=Math.sin(a)*bh*0.8;
      let tw=0.5+0.5*Math.sin(t*4+i*1.7);
      cx.fillStyle='rgba(255,255,255,'+(0.4+0.5*tw)+')';
      cx.beginPath();cx.arc(px,py,(2+tw*2.5)*s,0,Math.PI*2);cx.fill();
    }
  }else if(isSSR||isUR){
    let glowA=isUR?0.5:0.35;
    cx.fillStyle=`rgba(255,215,0,${glowA})`;
    cx.beginPath();cx.ellipse(0,0,bw*0.7,bh*0.7,0,0,Math.PI*2);cx.fill();
    if(isUR){
      cx.fillStyle='rgba(156,39,176,0.3)';
      cx.beginPath();cx.ellipse(0,0,bw*0.85,bh*0.85,0,0,Math.PI*2);cx.fill();
    }
  }else if(isSR){
    cx.fillStyle='rgba(255,235,150,0.3)';
    cx.beginPath();cx.ellipse(0,0,bw*0.6,bh*0.6,0,0,Math.PI*2);cx.fill();
  }
  // 大鱼胀红
  if(bellyFactor>1.3){
    let redA=Math.min(0.65,(bellyFactor-1.3)*0.55);
    cx.fillStyle=`rgba(255,30,30,${redA})`;
    cx.beginPath();cx.ellipse(bw*0.05,fh*0.06,bw*0.25,bh*0.22,0,0,Math.PI*2);cx.fill();
  }

  // === 前爪（抓握状，在身体前方） ===
  cx.fillStyle='#66BB6A';cx.strokeStyle='#388E3C';cx.lineWidth=1.5*s;
  cx.beginPath();cx.ellipse(bw*0.1,-fh*0.25,5*s,3.5*s,0.3,0,Math.PI*2);cx.fill();cx.stroke();
  cx.beginPath();cx.ellipse(bw*0.1,fh*0.25,5*s,3.5*s,-0.3,0,Math.PI*2);cx.fill();cx.stroke();

  // === 大眼 ===
  let eyeOff=10*s, eyeY=-fh*0.22;
  let eyeR=8*s*frog.eyeSize;
  cx.fillStyle='#FFF';
  cx.beginPath();cx.arc(-eyeOff,eyeY,eyeR,0,Math.PI*2);cx.fill();
  cx.beginPath();cx.arc(eyeOff,eyeY,eyeR,0,Math.PI*2);cx.fill();
  cx.strokeStyle='#1B5E20';cx.lineWidth=2*s;
  cx.beginPath();cx.arc(-eyeOff,eyeY,eyeR,0,Math.PI*2);cx.stroke();
  cx.beginPath();cx.arc(eyeOff,eyeY,eyeR,0,Math.PI*2);cx.stroke();
  // 瞳仁（追踪鼠标）
  if(!blink){
    let pd=3.5*s;
    let px=frog.eyeDX*2*s, py=frog.eyeDY*2*s;
    let maxOff=eyeR-pd-1.5*s;
    let dist=Math.hypot(px,py);if(dist>maxOff){let r=maxOff/dist;px*=r;py*=r;}
    cx.fillStyle='#000';
    cx.beginPath();cx.arc(-eyeOff+px,eyeY+py,pd,0,Math.PI*2);cx.fill();
    cx.beginPath();cx.arc(eyeOff+px,eyeY+py,pd,0,Math.PI*2);cx.fill();
    cx.fillStyle='#FFF';cx.beginPath();cx.arc(-eyeOff+px-1.2*s,eyeY+py-1.5*s,1.2*s,0,Math.PI*2);cx.fill();
    cx.beginPath();cx.arc(eyeOff+px-1.2*s,eyeY+py-1.5*s,1.2*s,0,Math.PI*2);cx.fill();
  }else{
    cx.strokeStyle='#1B5E20';cx.lineWidth=2*s;
    cx.beginPath();cx.moveTo(-eyeOff-5*s,eyeY);cx.lineTo(-eyeOff+5*s,eyeY);cx.stroke();
    cx.beginPath();cx.moveTo(eyeOff-5*s,eyeY);cx.lineTo(eyeOff+5*s,eyeY);cx.stroke();
  }

  // === 嘴 ===
  let mx=fw*0.48, my=-fh*0.05;
  cx.strokeStyle='#2E7D32';cx.lineWidth=2*s;cx.lineCap='round';
  if(frog.catchReact>0){
    if(frog.reactType==='happy'||frog.reactType==='amazed'){
      cx.beginPath();cx.arc(mx,my+2*s,6*s,0.1,Math.PI-0.1);cx.stroke();
    }else if(frog.reactType==='cry'){
      // 哭脸：下弯嘴 + 泪滴
      cx.beginPath();cx.arc(mx,my+5*s,4*s,Math.PI-0.3,0.3);cx.stroke();
      // 小泪滴
      cx.fillStyle='#64B5F6';
      cx.beginPath();cx.arc(mx-12*s,my-15*s,2.5*s,0,Math.PI*2);cx.fill();
      cx.beginPath();cx.moveTo(mx-12*s,my-17.5*s);cx.lineTo(mx-14*s,my-23*s);cx.lineTo(mx-10*s,my-23*s);cx.closePath();cx.fill();
    }else{
      cx.beginPath();cx.arc(mx,my-3*s,4*s,Math.PI+0.3,-0.3);cx.stroke();
    }
  }else if(bellyFactor<0.8){
    cx.beginPath();cx.moveTo(mx-3*s,my+1*s);cx.lineTo(mx+3*s,my+1*s);cx.stroke();
  }else{
    cx.beginPath();cx.moveTo(mx-3*s,my-1*s);
    cx.quadraticCurveTo(mx+1*s,my+3*s,mx+3*s,my-1*s);cx.stroke();
  }

  // === 舌头（空闲时微伸） ===
  if(!ceremonyAnim_d&&G.phase==='idle'){
    let tx=mx+2*s, ty=my+1*s;
    cx.strokeStyle='#FF8A8A';cx.lineWidth=2*s;cx.lineCap='round';
    cx.beginPath();cx.moveTo(tx,ty);
    cx.quadraticCurveTo(tx+8*s,ty+12*s,tx+6*s,ty+18*s+bounce);cx.stroke();
  }

  // === 反应表情 ===
  if(frog.catchReact>0){
    frog.catchReact-=deltaTime;
    if(frog.catchReact>0.3&&frog.catchReact<2){
      let a=Math.min(1,frog.catchReact);cx.globalAlpha=a;
      cx.font=`${22*s}px sans-serif`;cx.textAlign='center';
      let ry=-fh*0.5;
      if(frog.reactType==='happy')cx.fillText('😋',0,ry);
      else if(frog.reactType==='amazed'){
        cx.fillText('🤩',0,ry);
        // UR 顶级：金色星芒环绕
        if(frog.rewardGrade>=4.5){
          let st=performance.now()*0.001;
          for(let i=0;i<5;i++){
            let a=st*3+i*Math.PI*2/5;
            let rr=11*s+3*s*Math.sin(st*5+i);
            cx.fillStyle='rgba(255,215,0,'+(0.4+0.4*Math.sin(st*6+i))+')';
            cx.beginPath();cx.arc(Math.cos(a)*rr,ry+Math.sin(a)*rr,2*s,0,Math.PI*2);cx.fill();
          }
        }
      }
      else if(frog.reactType==='cry')cx.fillText('😭',0,ry);
      else if(frog.reactType==='disgust')cx.fillText('🤢',0,ry);
      else if(frog.reactType==='question')cx.fillText('❓',0,ry);
      cx.globalAlpha=1;
    }
  }

  cx.restore();
}
function drawCeremonyGlow(){
  let glow=RARITY_GLOW[bestRarity_d||'N'];
  let hl=rarityRank(bestRarity_d||'N')+1;
  let inten=ceremonyGlow_d;
  let rad=80+hl*10;
  let g=cx.createRadialGradient(castX,castY,5,castX,castY,rad);
  g.addColorStop(0,`rgba(${hexRGB(glow)},${0.35*inten})`);
  g.addColorStop(0.5,`rgba(${hexRGB(glow)},${0.16*inten})`);
  g.addColorStop(1,'rgba(0,0,0,0)');
  cx.fillStyle=g;
  cx.beginPath();cx.arc(castX,castY,rad,0,Math.PI*2);cx.fill();

  // 旋转光柱（所有稀有度，强度分档）
  cx.save();cx.translate(castX,castY);
  let beams=hl>=4?10:hl>=3?8:5;
  for(let i=0;i<beams;i++){
    let a=(Date.now()*0.002+i*Math.PI*2/beams)%(Math.PI*2);
    cx.globalAlpha=inten*(0.08+hl*0.03);
    cx.strokeStyle=glow;cx.lineWidth=2;
    cx.beginPath();cx.moveTo(Math.cos(a)*15,Math.sin(a)*15);cx.lineTo(Math.cos(a)*(55+hl*8),Math.sin(a)*(55+hl*8));cx.stroke();
  }
  cx.restore();
}

function drawHookLine(){
  if(!ceremonyAnim_d)return;
  if(rodTip.x<=0&&rodTip.y<=0)return;

  // hook 平滑移动到钓点所在水面
  hook.x+=(castX-hook.x)*0.15;hook.y+=(castY-hook.y)*0.15;

  // 青蛙舌头钓线（粉红色弧形）
  let s=Math.min(W,H)/800;
  let tmx=(rodTip.x+hook.x)/2, tmy=Math.min(rodTip.y,hook.y)-25*s;
  cx.strokeStyle='#FF6B6B';cx.lineWidth=3*s;cx.lineCap='round';
  cx.beginPath();cx.moveTo(rodTip.x,rodTip.y);
  cx.quadraticCurveTo(tmx,tmy,hook.x,hook.y);cx.stroke();
  // 舌尖分叉
  cx.strokeStyle='#FF4444';cx.lineWidth=2*s;
  cx.beginPath();cx.moveTo(hook.x,hook.y);cx.lineTo(hook.x-6*s,hook.y-8*s);
  cx.moveTo(hook.x,hook.y);cx.lineTo(hook.x+6*s,hook.y-8*s);cx.stroke();

  // 浮漂
  if(G.phase==='pulling'){
    let bx=hook.x, by=castY-0.005;
    let hl=ceremonyAnim_d&&ceremonyAnim_d.hl?ceremonyAnim_d.hl:1;
    let dip=Math.sin(Date.now()*0.05)*5-8;
    // Phase1: 浮漂随稀有度抖动更剧烈
    if(ceremonyAnim_d&&ceremonyAnim_d.phase===1){
      dip=Math.sin(Date.now()*(0.06+hl*0.02))*(3+hl*1.2)-2;
    }
    // 浮漂主体颜色=即将上钩的鱼稀有度
    let bobCol=RARITY_GLOW[bestRarity_d||'N'];
    cx.shadowColor=bobCol;cx.shadowBlur=ceremonyAnim_d&&ceremonyAnim_d.phase===1?(8+hl*4):0;
    cx.fillStyle=bobCol;cx.beginPath();cx.ellipse(bx,by+dip,5,9,0,0,Math.PI*2);cx.fill();
    cx.shadowBlur=0;
    cx.fillStyle='#FFF';cx.beginPath();cx.arc(bx,by-8+dip,3,0,Math.PI*2);cx.fill();

    if(ceremonyAnim_d&&ceremonyAnim_d.phase===1&&ceremonyGlow_d>0){
      let pulse=ceremonyGlow_d*(0.4+hl*0.1);
      cx.strokeStyle=`rgba(${hexRGB(bobCol)},${pulse})`;cx.lineWidth=2+hl*0.3;
      cx.beginPath();cx.arc(bx,castY,25+hl*3+Math.sin(Date.now()*0.03)*8,0,Math.PI*2);cx.stroke();
    }
  }
}

function drawFishSchool(){
  // 水下永远看不清具体是什么鱼：只留一团团缓慢移动的模糊暗影 + 气泡涟漪
  fishes.forEach(f=>{
    if(!f.alive)return;
    let surfaceY=H*WL;
    // 黄金鱼：底层金色光晕
    if(f.golden){
      cx.save();
      let gr=cx.createRadialGradient(f.x,f.y,0,f.x,f.y,f.size*2.4);
      gr.addColorStop(0,'rgba(255,216,90,0.55)');
      gr.addColorStop(0.6,'rgba(255,200,60,0.22)');
      gr.addColorStop(1,'rgba(255,200,60,0)');
      cx.fillStyle=gr;
      cx.beginPath();cx.arc(f.x,f.y,f.size*2.4,0,Math.PI*2);cx.fill();
      cx.restore();
    }
    let alpha=f.alpha*(1-f.depth)*0.5;
    let rx=Math.max(16,Math.min(f.size*4+12,80));
    cx.save();
    cx.globalAlpha=alpha;
    let g=cx.createRadialGradient(f.x,f.y,0,f.x,f.y,rx);
    g.addColorStop(0,'rgba(3,9,18,0.55)');
    g.addColorStop(0.55,'rgba(3,9,18,0.28)');
    g.addColorStop(1,'rgba(3,9,18,0)');
    cx.fillStyle=g;
    cx.beginPath();
    cx.ellipse(f.x,f.y,rx,rx*0.46,0,0,Math.PI*2);
    cx.fill();
    cx.restore();
    // 水面涟漪（表示水下有东西在动）
    cx.save();cx.globalAlpha=alpha*0.5;
    cx.strokeStyle='rgba(255,255,255,0.4)';cx.lineWidth=1;
    let off=Math.sin(Date.now()*0.003+f.wobble)*5;
    cx.beginPath();cx.arc(f.x+off,surfaceY,3+f.size/5,0,Math.PI*2);cx.stroke();
    cx.restore();
    if(Math.random()>0.9)spawnBubble(f.x+(Math.random()-0.5)*30,surfaceY);
    // 黄金鱼：上升金粒子（冒出金光）
    if(f.golden){
      cx.save();
      for(let k=0;k<5;k++){
        let ph=(f.wobble*3+k*1.256)%(Math.PI*2);
        let py=f.y-((ph/Math.PI)*f.size*2);
        let px=f.x+Math.sin(ph+k)*f.size*0.6;
        let pa=0.75*(1-ph/(Math.PI*2));
        cx.fillStyle='rgba(255,228,120,'+pa.toFixed(3)+')';
        cx.beginPath();cx.arc(px,py,3,0,Math.PI*2);cx.fill();
      }
      cx.restore();
    }
  });
}

function drawParticles(){
  particles.forEach(p=>{
    cx.fillStyle=`rgba(${hexRGB(p.color)},${p.life/p.mLife})`;
    cx.beginPath();cx.arc(p.x,p.y,p.size,0,Math.PI*2);cx.fill();
  });
}
function drawBubbles(){
  bubbles.forEach(b=>{
    cx.strokeStyle=`rgba(200,230,255,${b.op})`;cx.lineWidth=1;
    cx.beginPath();cx.arc(b.x,b.y,b.size,0,Math.PI*2);cx.stroke();
    cx.fillStyle=`rgba(255,255,255,${b.op*0.6})`;
    cx.beginPath();cx.arc(b.x-b.size*0.25,b.y-b.size*0.25,b.size*0.25,0,Math.PI*2);cx.fill();
  });
}
function drawSplashes(){
  splashes.forEach(s=>{
    cx.fillStyle=`rgba(150,200,255,${s.op})`;
    cx.beginPath();cx.arc(s.x,s.y,s.size,0,Math.PI*2);cx.fill();
  });
}

function hexRGB(hex){
  let r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}
function lerp(a,b,t){return a+(b-a)*Math.max(0,Math.min(1,t));}

// ============ 更新循环 ============
function update(ts){
  // 兜底：教程没在显示时，绝不允许聚光灯残留（否则 9999px 阴影会一直把全屏压暗）
  {
    let to=document.getElementById('tutorialOverlay');
    let gt=document.getElementById('gardenTutOverlay');
    let mt=document.getElementById('modeTipOverlay');
    let tutOn=(to&&to.classList.contains('active'))||(gt&&gt.classList.contains('active'))||(mt&&mt.classList.contains('show'));
    if(!tutOn){let sp=document.getElementById('tutSpotlight');if(sp)sp.remove();}
  }
  checkMilestoneWin(); // 一旦达到 100 万 → 立即进入最终剧情（任何情况）
  if(!lastTime)lastTime=ts;
  deltaTime=Math.min((ts-lastTime)/1000,0.1);
  lastTime=ts;
  if(G.paused){lastTime=ts;return;}
  // 岛屿模式：冻结所有钓鱼逻辑，只更新动画时间（时间暂停）
  if(G.islandMode){islandAnimTime+=deltaTime;return;}
  // 种鱼模式：时间照常流动（鱼苗生长依赖全局时钟），只更新池塘界面
  if(G.gardenMode){islandAnimTime+=deltaTime;tickGlobalClock(deltaTime);updateGardenUI();render();return;}

  // ===== 全局时钟推进（参考星露谷流速）=====
  tickGlobalClock(deltaTime);

  ww+=0.02;

  diveUpdate(deltaTime);

  // 冒险模式：危险值随时间和钓鱼累积
  if(adv.active&&!adv.dayEnded&&!adv.gameOver&&G.phase==='idle'){
    adv.danger=Math.min(100,adv.danger+DANGER_TIME*deltaTime*timeScale);
    checkDanger();
    updateAdvHUD();
  }

  // 灾难特效更新
  if(disasterFX.active||disasterFX.paused){
    if(!disasterFX.paused)disasterFX.timer+=deltaTime;
    if(disasterFX.timer>3.2){disasterFX.active=false;disasterFX.paused=false;
      sfx_disaster_ambient_stop();
      if(disasterFX.type==='loss_25_end'||disasterFX.type==='tornado'){
        // 龙卷强制收竿：直接结算并进入下一天（旧代码用 !adv.dayEnded 判断，
        // 而灾难本身已把 dayEnded 置 true，导致这个自动换天永远不触发，只能卡到你手动回家）
        setTimeout(()=>{endDay();},500);
      }
    }
  }

  // 奇遇特效更新
  if(goodEventFX.active){
    goodEventFX.timer+=deltaTime;
    if(goodEventFX.timer>6.7)goodEventFX.active=false;
  }

  // 糖果鸟更新
  if(candyBird.active){
    candyBird.timer+=deltaTime;
    if(candyBird.shakeTimer>0)candyBird.shakeTimer=Math.max(0,candyBird.shakeTimer-deltaTime*3);
    if(candyBird.popTimer>0)candyBird.popTimer=Math.max(0,candyBird.popTimer-deltaTime*3.2);
    if(candyBird.phase==='appearing'){
      candyBird.size=Math.min(1,candyBird.size+deltaTime*4);
      if(candyBird.size>=1)candyBird.phase='waiting';
    }
    // 10秒超时
    if(candyBird.timer>10&&candyBird.phase!=='fleeing'){
      candyBird.phase='fleeing';candyBird.size=1;
      sfx_candy_bird_fail();
      toast('糖果鸟飞走了...下次快一点吧！','red');
    }
    if(candyBird.phase==='fleeing'){
      candyBird.size=Math.max(0.01,candyBird.size-deltaTime*3);
      candyBird.x+=deltaTime*200;
      if(candyBird.size<=0.05)candyBird.active=false;
    }
    if(candyBird.phase==='success'){
      candyBird.size=Math.min(1.5,candyBird.size+deltaTime*2);
      if(candyBird.timer>1.5+candyBird.maxClicks*0.3){
        candyBird.phase='fleeing';
      }
    }
  }

  // 舌头更新
  if(tongueState.active){
    if(tongueState.phase==='extending'){
      tongueState.progress+=deltaTime*6; // 快速伸出
      if(tongueState.progress>=1){
        tongueState.progress=1;
        // 检测是否命中隐藏宝藏
        let hit=null;
        for(let t of hiddenTreasures){
          if(t.collected)continue;
          if(Math.hypot(t.x-tongueState.targetX,t.y-tongueState.targetY)<35*Math.min(W,H)/800){
            hit=t;break;
          }
        }
        if(hit){
          hit.collected=true;
          tongueState.hitTreasure=hit;
          let quality=Math.random();
          let amt,icon,label,color;
          if(quality<0.5){amt=20+Math.floor(Math.random()*31);icon='🪙';label='少许金币';color='#FFD700';}
          else if(quality<0.8){amt=50+Math.floor(Math.random()*51);icon='💎';label='宝石';color='#00E5FF';}
          else if(quality<0.95){amt=100+Math.floor(Math.random()*101);icon='👑';label='王冠';color='#FF6D00';}
          else{amt=200+Math.floor(Math.random()*201);icon='🌟';label='稀有秘宝';color='#FF00FF';}
          recordIncome(amt);
          if(adv.active){
            adv.fishBag.push({name:icon+' 隐藏'+label,rarity:quality<0.8?'R':'SR',value:amt,icon:icon,fishId:''});
          }
          updateUI();
          sfx_treasure_found(quality<0.5?0:quality<0.8?1:2);
          toast(icon+' 发现了隐藏的'+label+'！+'+amt+'💰','gold');
          // 收集动画
          for(let i=0;i<8;i++){
            treasureCollectAnim.push({x:hit.x,y:hit.y,life:0.8+Math.random()*0.5,maxLife:1.3,color:color,icon:icon});
          }
        }
        // 延迟后收回
        setTimeout(()=>{if(tongueState.active&&tongueState.phase==='extending')tongueState.phase='retracting';},250);
      }
    }else if(tongueState.phase==='retracting'){
      tongueState.progress-=deltaTime*8;
      if(tongueState.progress<=0){
        tongueState.progress=0;tongueState.active=false;tongueState.phase='idle';
        tongueState.hitTreasure=null;tongueState.candyLick=false;
      }
    }
  }
  // 收集动画更新
  for(let i=treasureCollectAnim.length-1;i>=0;i--){
    treasureCollectAnim[i].life-=deltaTime;
    if(treasureCollectAnim[i].life<=0)treasureCollectAnim.splice(i,1);
  }
  // 隐藏宝藏刷新
  treasureSpawnTimer+=deltaTime;
  if(treasureSpawnTimer>5+Math.random()*10){
    treasureSpawnTimer=0;
    spawnHiddenTreasure();
  }

  // 奇遇触发检测：每15秒有12%概率触发好事（中等危险值）
  if(adv.active&&!adv.dayEnded&&!adv.gameOver&&G.phase==='idle'&&!goodEventFX.active&&!disasterFX.active&&!disasterFX.paused){
    if(adv.danger>=20&&adv.danger<90){
      goodCheckTimer+=deltaTime;
      if(goodCheckTimer>15&&Math.random()<0.10){
        goodCheckTimer=0;
        triggerGoodEvent();
      }
    }
  }

  // 暴风雨预兆计时
  if(stormWarn._flashA>0)stormWarn._flashA-=deltaTime*1.8;

  fishes.forEach(f=>{f.x+=f.speed*deltaTime;f.wobble+=0.02;});
  maintainFishSchool();

  // 钓点生命周期（连续倒计时）+ 缓慢游动
  levelSpotTimer+=deltaTime;
  spots.forEach(s=>{
    if(!s.clicked&&G.phase==='idle')s.life-=deltaTime;
    s.age=(s.age||0)+deltaTime;
    if(s.minX===undefined)return;
    // 横向缓慢游动，碰到边界折返
    s.x+=(s.vx||0)*deltaTime;
    if(s.x<s.minX){s.x=s.minX;s.vx=Math.abs(s.vx||0);s.dir=1;}
    if(s.x>s.maxX){s.x=s.maxX;s.vx=-Math.abs(s.vx||0);s.dir=-1;}
    // 上下轻轻起伏（像活物一样）
    if(s.baseY!==undefined)s.y=s.baseY+Math.sin(s.age*(s.bobSpeed||0.5)+s.swimPhase)*s.bobAmp;
  });
  if(levelSpotTimer>2.5&&G.phase==='idle'){
    levelSpotTimer=0;
    spawnSpots();
    // 清理过期钓点并刷新
    for(let i=spots.length-1;i>=0;i--){
      if(spots[i].life<=0&&!spots[i].clicked){refreshSpot(spots[i]);}
    }
    // 钓完当前所有钓点 → 提前刷新一批
    if(!spots.some(s=>!s.clicked&&s.life>0)&&spots.length>0){
      spots=spots.filter(s=>s.life>1);
      spawnSpots();
      toast('🐟 鱼群刷新！','blue');
    }
    // 清理已点击的
    spots=spots.filter(s=>!s.clicked||s.life>1);
  }

  // 闪光弹倒计时
  spots.forEach(s=>{if(s.flashRevealed>0)s.flashRevealed-=deltaTime;});
  // 全屏白闪衰减
  if(G.flashAlpha>0)G.flashAlpha=Math.max(0,G.flashAlpha-deltaTime*1.8);
  // 淡化已点击钓点
  spots.forEach(s=>{if(s.clicked){s.life-=deltaTime*3;s.textAlpha=Math.max(0,s.textAlpha-deltaTime*2);}});

  if(ceremonyAnim_d)updateCeremony(deltaTime);
  else updateIdlePose(deltaTime);

  // 钓点涟漪衰减
  if(castRipple>0)castRipple=Math.max(0,castRipple-1.5*deltaTime);

  for(let i=bubbles.length-1;i>=0;i--){let b=bubbles[i];b.y-=b.spd;b.op-=0.007;if(b.op<=0||b.y<H*WL-10)bubbles.splice(i,1);}
  for(let i=splashes.length-1;i>=0;i--){let s=splashes[i];s.x+=s.vx;s.y+=s.vy;s.vy+=0.15;s.op-=0.02;if(s.op<=0)splashes.splice(i,1);}
  for(let i=particles.length-1;i>=0;i--){let p=particles[i];p.x+=p.vx;p.y+=p.vy;p.vy+=0.05;p.life-=0.016;if(p.life<=0)particles.splice(i,1);}
  for(let i=rippleRings.length-1;i>=0;i--){let R=rippleRings[i];R.life+=deltaTime;R.r=6+R.life*70;if(R.life>R.lifeMax)rippleRings.splice(i,1);}

  updateLevelHUD();
  if(!ceremonyAnim_d)rodBend*=(1-3*deltaTime);
  // 青蛙眼睛+肚皮反应
  if(G.phase==='idle'){
    // === 始终追踪鼠标方向（与drawFrogRod保持一致的坐标计算） ===
    let s=Math.min(W,H)/800;
    let hx=stick.handX, hy=stick.handY;
    let fx,fy,faceAngle; // 青蛙世界坐标+朝向
    if(rodAngle!==0){
      faceAngle=rodAngle*(Math.PI/180);
      fx=hx+Math.cos(faceAngle)*40*s;
      fy=hy+Math.sin(faceAngle)*40*s;
    }else{
      faceAngle=-0.55;
      fx=hx+42*s;
      fy=hy-26*s;
    }
    // 世界空间方向 → 青蛙局部空间（逆旋转）
    let edx=mouseX-fx, edy=mouseY-fy, ed=Math.max(1,Math.hypot(edx,edy));
    let cosA=Math.cos(faceAngle), sinA=Math.sin(faceAngle);
    frog.targetEyeDX= cosA*edx/ed + sinA*edy/ed;
    frog.targetEyeDY=-sinA*edx/ed + cosA*edy/ed;

    // 检测悬停鱼影（判定范围随鱼影大小变化）
    let cs=null,cd=0;
    for(let sp of spots){
      if(sp.clicked||sp.life<=0)continue;
      let d=Math.hypot(sp.x-mouseX,sp.y-mouseY);
      let rr=Math.max(62,(sp.size||20)*1.7);
      if(d<rr&&(cs===null||d<cd)){cd=d;cs=sp;}
    }
    if(cs){
      if(cs.isFake){
        // 假钓点：嫌弃
        frog.targetGrade=1; frog.targetBelly=0.3; frog.targetEyeSize=1;
        frog.reactType='disgust';
      }else{
        // 核心设定：青蛙反应精确预告钓点里的鱼等级，鱼越贵反应越夸张
        let rk=rarityRank(cs.fishRarity||'N'); // 0=N 1=R 2=SR 3=SSR 4=UR
        frog.targetGrade=rk<2?2:rk+1; // 2=N/R, 3=SR, 4=SSR, 5=UR（星级越高越华丽）
        // 肚皮: N:1.0 R:1.5 SR:2.1 SSR:2.9 UR:3.8（星级越高鼓得越大）
        frog.targetBelly=[1.0,1.5,2.1,2.9,3.8][rk];
        if(cd<35)frog.targetBelly+=0.2; // 精确瞄准额外鼓
        // 眼睛: N:1.0 R:1.15 SR:1.4 SSR:1.7 UR:2.1
        frog.targetEyeSize=[1,1.15,1.4,1.7,2.1][rk];
        // 表情：UR 疯狂震惊，SSR 震惊，SR/R 开心，N 疑问
        frog.reactType=rk>=4?'amazed':rk>=3?'amazed':rk>=1?'happy':'question';
      }
      frog.catchReact=1; // 持续显示悬停表情
    }else{frog.targetGrade=0; frog.targetBelly=1; frog.targetEyeSize=1;frog.reactType='';frog.catchReact=0;}
    // 操作门控教学：玩家悬停鱼影即完成"看青蛙反应"这一步
    if(document.getElementById('tutorialOverlay').classList.contains('active')){
      if(frog.targetGrade>=3&&!G._tutHinted){
        G._tutHinted=true;
        toast('🐸 看！青蛙在告诉你这条鱼的等级！鱼越贵反应越夸张！','gold');
      }
      tutComplete('hover_spot');
    }
  }
  // 舌头收放
  if(ceremonyAnim_d&&ceremonyAnim_d.phase<=2)frog.tongueExt=1;
  else if(frog.tongueExt>0)frog.tongueExt=Math.max(0,frog.tongueExt-3*deltaTime);
}

function loop(ts){update(ts);render();requestAnimationFrame(loop);}

// ============ 全局目标（100天×100万） ============
// 所有“赚到的钱”统一走这里：现金 + 总收入（判定100万），冒险额外计入当日
function recordIncome(v){
  if(!(v>0))return;
  G.coins+=v;
  G.totalEarned+=v;
  if(adv.active)adv.dayEarned+=v;
  dailyProgress('earn',Math.round(v));
  checkMilestones();
}
// ============ 里程碑系统（100万分 7 阶段，奖励递增）============
const MILESTONES=[
  {at:100000,  title:'初出茅庐', coins:5000,   items:{flash:3}},
  {at:250000,  title:'小有名气', coins:12000,  items:{flash:5, accuracy:1}},
  {at:450000,  title:'渐入佳境', coins:25000,  items:{lucky:3, sandglass:2}},
  {at:650000,  title:'渔场老手', coins:45000,  items:{refresh:2, accuracy:3}},
  {at:820000,  title:'声名鹊起', coins:70000,  items:{flash:5, lucky:3, sandglass:3}},
  {at:950000,  title:'垂钓大师', coins:120000, items:{flash:3, accuracy:3, lucky:3, sandglass:3, refresh:3}},
  {at:1000000, title:'传说达成', coins:200000, ending:true}
];
const MS_ICON={flash:'💣',accuracy:'🎯',lucky:'🍀',refresh:'🐟',sandglass:'⏰'};
function checkMilestones(){
  if(!G.claimedMilestones)G.claimedMilestones={};
  let hit=null;
  for(let i=0;i<MILESTONES.length;i++){
    let m=MILESTONES[i];
    if(G.totalEarned>=m.at && !G.claimedMilestones[i]){
      G.claimedMilestones[i]=true;
      if(m.coins)G.coins+=m.coins;
      if(m.items)for(let k in m.items)G.items[k]=(G.items[k]||0)+m.items[k];
      hit=m; // 多重达成时只弹最新一个
    }
  }
  if(hit){
    if(typeof updateItemShopUI==='function')updateItemShopUI();
    if(typeof updateUI==='function')updateUI();
    saveGame(true);
    showMilestone(hit);
  }
}
function showMilestone(m){
  let ov=document.getElementById('milestoneOverlay');if(!ov)return;
  document.getElementById('msTitle').textContent='🏆 里程碑达成 · '+m.title;
  let r=[];
  if(m.coins)r.push('<span class="ms-r">💰 +'+m.coins.toLocaleString()+' 金币</span>');
  if(m.items)for(let k in m.items)r.push('<span class="ms-r">'+MS_ICON[k]+' '+({flash:'闪光弹',accuracy:'精准雷达',lucky:'强化香饵',refresh:'呼唤鱼群',sandglass:'延时沙漏'}[k]||k)+' ×'+m.items[k]+'</span>');
  if(m.ending)r.push('<span class="ms-r ms-r-rainbow">🌈 彩虹蛙进化 · 解锁「任何愿望」结局</span>');
  document.getElementById('msRewards').innerHTML=r.join('');
  ov.classList.add('active');
  if(typeof sfx_reveal_UR==='function')sfx_reveal_UR();
}
function closeMilestone(){
  let ov=document.getElementById('milestoneOverlay');if(ov)ov.classList.remove('active');
}
// 常驻可拖拽目标 HUD 刷新（剩余天数/进度/还差多少钱）
function updateGoalHUD(){
  let el=document.getElementById('goalHud');if(!el)return;
  el.style.display='flex';
  let remain=Math.max(0,GOAL_DAYS-G.gameDay);
  let gd=document.getElementById('ghDay');
  if(gd){
    let tod=getTimeOfDay(G.gameDay);
    let clockTxt=getTimeEmoji(tod)+' '+getTimeName(tod)+' '+clockStr();
    let dayLine;
    if(remain<=10&&G.gameDay>0)dayLine='⏳ <span class="warn">仅剩 '+remain+' 天！</span> 冲刺 100 万';
    else dayLine='⏳ 剩余 '+remain+' / '+GOAL_DAYS+' 天';
    gd.innerHTML=dayLine+'　<span class="gh-clock">'+clockTxt+'</span>';
  }
  let ge=document.getElementById('ghEarned');if(ge)ge.textContent=G.totalEarned.toLocaleString();
  let gb=document.getElementById('ghBar');if(gb)gb.style.width=Math.min(100,(G.totalEarned/GOAL_TARGET)*100)+'%';
  updateGoalMarks();
  // 进度条下方：显示达成【下一个小目标】还差多少钱（总目标保持在上方 gh-earn）
  let nextM=null;
  for(let i=0;i<MILESTONES.length;i++){ if(G.totalEarned<MILESTONES[i].at){nextM=MILESTONES[i];break;} }
  let gl=document.getElementById('ghLeft');
  if(gl){
    if(!nextM)gl.innerHTML='🎉 所有阶段目标已达成！';
    else{
      let need=Math.max(0,nextM.at-G.totalEarned);
      gl.innerHTML='下一阶段「'+nextM.title+'」还差 <span class="left">'+need.toLocaleString()+'</span> 💰';
    }
  }
}
// 每帧检测：一旦达到 100 万 → 立刻触发胜利（不影响 100 天到期的失败判定）
function checkMilestoneWin(){
  if(G.gameEnded)return false;
  if(G.totalEarned>=GOAL_TARGET)return checkGoal();
  return false;
}
// 进度条上方：阶段金币里程碑刻度（构建一次，之后只切换达成状态）
function updateGoalMarks(){
  let mk=document.getElementById('ghMarks');if(!mk)return;
  if(mk.childElementCount===0){
    MILESTONES.forEach(function(m,i){
      let pct=Math.min(100,(m.at/GOAL_TARGET)*100);
      let div=document.createElement('div');
      div.className='gh-mark'+(i===MILESTONES.length-1?' end':'');
      div.style.left=pct+'%';
      let label=m.at>=GOAL_TARGET?'🏁':(m.at/10000)+'万';
      div.innerHTML='<span class="gh-mark-label">'+label+'</span><span class="gh-mark-tick"></span>';
      mk.appendChild(div);
    });
  }
  // 切换已达成高亮
  for(let i=0;i<mk.childElementCount;i++){
    let div=mk.children[i];
    let reached=G.totalEarned>=MILESTONES[i].at;
    div.classList.toggle('reached',reached);
  }
}
// 目标 HUD 小窗：可拖拽、记住位置、双击复位
function setupGoalHudDrag(){
  let el=document.getElementById('goalHud');if(!el)return;
  let drag=null;
  el.addEventListener('pointerdown',(e)=>{
    if(e.button!==0&&e.pointerType==='mouse')return;
    let r=el.getBoundingClientRect();
    drag={sx:e.clientX,sy:e.clientY,ox:r.left,oy:r.top};
    try{el.setPointerCapture(e.pointerId);}catch(err){}
    el.classList.add('dragging');
  });
  el.addEventListener('pointermove',(e)=>{
    if(!drag)return;
    let nx=Math.min(Math.max(drag.ox+(e.clientX-drag.sx),0),window.innerWidth-el.offsetWidth);
    let ny=Math.min(Math.max(drag.oy+(e.clientY-drag.sy),0),window.innerHeight-el.offsetHeight);
    el.style.left=nx+'px';el.style.top=ny+'px';el.style.right='auto';el.style.bottom='auto';
  });
  const endDrag=()=>{
    if(!drag)return;
    drag=null;
    el.classList.remove('dragging');
    try{localStorage.setItem('goalHudPos',JSON.stringify({left:el.style.left,top:el.style.top}));}catch(err){}
  };
  el.addEventListener('pointerup',endDrag);
  el.addEventListener('pointercancel',endDrag);
  el.addEventListener('dblclick',()=>{
    el.style.left='auto';el.style.top='auto';el.style.right='12px';el.style.bottom='74px';
    try{localStorage.removeItem('goalHudPos');}catch(err){}
  });
  try{
    let s=JSON.parse(localStorage.getItem('goalHudPos'));
    if(s&&s.left&&s.top){el.style.left=s.left;el.style.top=s.top;el.style.right='auto';el.style.bottom='auto';}
  }catch(err){}
}
// 结算时统一判定：达 100 万=赢；超 100 天未达=输
function checkGoal(){
  if(G.gameEnded)return true;
  if(G.totalEarned>=GOAL_TARGET){
    G.gameEnded=true;
    frogRainbow=true;rainbowUnlocked=true;
    if(typeof saveGame==='function')saveGame();
    updateGoalHUD();
    if(adv.active){adv.gameWin=true;adv.gameOver=true;}
    // 无论冒险/闯关/何种状态，一旦达成 100 万立即进入最终剧情
    if(typeof startEndingStory==='function')startEndingStory();
    else showGoalOverlay(true);
    return true;
  }
  if(G.gameDay>=GOAL_DAYS){
    G.gameEnded=true;
    if(adv.active)adv.gameOver=true;
    updateGoalHUD();
    showGoalOverlay(false);
    return true;
  }
  return false;
}
function showGoalOverlay(win){
  let ov=document.getElementById('goalOverlay');if(!ov)return;
  ov.classList.add('active');
  let e=document.getElementById('goalEmoji');
  if(e)e.textContent=win?'🌈':'💔';
  let t=document.getElementById('goalTitle');
  if(t){t.textContent=win?'100 万达成！青蛙彩虹化！':'100 天期限已到…';t.style.color=win?'#FFD700':'#EF5350';}
  let s=document.getElementById('goalSub');
  if(s)s.textContent=win?'恭喜！它在彩虹中展翅，实现愿望的传说青蛙苏醒了':'未能攒够 100 万，传说就此落幕。';
  let ge=document.getElementById('goalEarned2');if(ge)ge.textContent=G.totalEarned.toLocaleString();
  let gd=document.getElementById('goalDays2');if(gd)gd.textContent=Math.min(G.gameDay,GOAL_DAYS);
  let gc=document.getElementById('goalClock');
  if(gc){let tod=getTimeOfDay(G.gameDay);gc.textContent=getTimeEmoji(tod)+' '+getTimeName(tod)+' · '+clockStr();}
  if(win&&typeof sfx_reveal_UR==='function')sfx_reveal_UR();
  else if(typeof sfx_reveal_N==='function')sfx_reveal_N();
}
function resetRun(){
  G.gameDay=0;G.totalEarned=0;G.gameEnded=false;G.levelCleared=0;
  G.coins=500;
  document.getElementById('goalOverlay').classList.remove('active');
  exitToMenu();
  updateGoalHUD();
}

// 主页面 🏝️ 种鱼入口：解锁要求不变（答对海神谜题），未解锁给提示
function openIslandFromHome(){
  if(!G.islandUnlocked){toast('🔒 种鱼需答对【海神的谜题】（冒险中随机出现）后才能解锁','blue');return;}
  if(!adv.active){toast('🌊 前往冒险模式出海，在岛屿上就能种鱼了','blue');return;}
  returnHome();
}

// 闯关失败：消耗 1 天（无论成败都结算一天），关卡不前进、可重试
function levelFailFlow(){
  if(G.gameEnded||adv.active)return;
  if(levelComplete_d)return;
  G.gameDay++;
  resetClockToMorning();
  updateGoalHUD();flashDayRed();
  toast('💔 挑战失败…消耗 1 天，整理心情再战！','red');
  sfx_reveal_N();
  if(checkGoal())return; // 100 天用完仍未达标 → 游戏失败
  document.getElementById('levelCompleteOverlay').classList.remove('active');
  startLevel(levelIdx);
}

// ============ UI更新 ============
function updateUI(){
  updateGoalHUD();
  document.getElementById('hudCoins').textContent=G.coins.toLocaleString();
  document.getElementById('hudPulls').textContent=G.totalPulls;
  document.getElementById('pity4').textContent=Math.max(0,PITY_SR-G.pitySR);
  updateDiveBtn();
  document.getElementById('pity5').textContent=Math.max(0,PITY_SSR-G.pitySSR);
  // 活跃buff显示
  let buffEl=document.getElementById('hudBuffs');
  let buffs=[];
  if(G.buffs.accuracyNext)buffs.push('🎯精准');
  if(G.buffs.luckyBait>0)buffs.push('🍀x'+G.buffs.luckyBait);
  if(G.buffs.frogPower>0)buffs.push('🥤x'+G.buffs.frogPower);
  buffEl.textContent=buffs.length>0?'💠 '+buffs.join(' '):'';
  updateRedDots();
}

function updateButtons(){
  let btns=['btnSingle','btnTen','btnAlbum','btnShop','btnFrogUpgrade','btnDive'];
  if(G.phase!=='idle'||diveState.active||disasterFX.paused){
    btns.forEach(id=>{let el=document.getElementById(id);if(el)el.classList.add('disabled')});
  }else{
    btns.forEach(id=>{let el=document.getElementById(id);if(el)el.classList.remove('disabled')});
  }
}

function disableButtons(){
  ['btnSingle','btnTen','btnAlbum','btnShop','btnFrogUpgrade','btnDive'].forEach(id=>{let el=document.getElementById(id);if(el)el.classList.add('disabled')});
}

function toast(m,cls='gold'){
  let t=document.getElementById('toast');
  t.textContent=m;t.className='toast show '+cls;
  clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),3000);
}

// 关卡HUD更新
function updateLevelHUD(){
  try{
    let cfg=LEVELS[levelIdx];
    let el=document.getElementById('levelProgress');
    if(!el)return;
    let g=cfg.goal;
    let cur=0,total=g.count;
    if(g.type==='fish'){cur=levelProgress.fish;}
    else if(g.type==='zone_cloud'){cur=levelProgress.zone_cloud;}
    else if(g.type==='rarity'){cur=levelProgress[g.rarity]||0;}
    else if(g.type==='zone_rarity'){
      if(g.zone==='mountain')cur=levelProgress.mtn_R||0;
      else cur=levelProgress[g.rarity]||0;
    }
    else if(g.type==='combo'){
      // 显示最少的子目标进度
      let minRat=1,minCur=0,minTot=0;
      g.sub.forEach(s=>{
        let sc=0,st=s.count;
        if(s.type==='rarity')sc=levelProgress[s.rarity]||0;
        else if(s.type==='zone_cloud')sc=levelProgress.zone_cloud;
        let rat=st>0?sc/st:1;
        if(rat<minRat){minRat=rat;minCur=sc;minTot=st;}
      });
      cur=minCur;total=minTot;
    }
    else if(g.type==='endless'){cur=levelProgress.fish;total=99;}
    el.textContent=cur+'/'+total;
    let lc=document.getElementById('levelCasts');if(lc)lc.textContent=levelCasts+'/'+levelMaxCasts;
    // 出竿次数 · 黑暗+高亮提示：剩余越少越亮（warn → danger）
    let chip=document.getElementById('castChip');
    if(chip){
      let remain=levelMaxCasts-levelCasts;
      let ratio=levelMaxCasts>0?remain/levelMaxCasts:0;
      let warn=remain<=3||ratio<=0.25;
      let danger=remain<=1;
      chip.classList.toggle('warn',warn&&!danger);
      chip.classList.toggle('danger',danger);
      chip.title=warn?('⚠ 出竿机会仅剩 '+remain+' 次！谨慎下竿'):'本关出竿次数限制';
    }
  }catch(e){}
}

// ============ 点击画布：全屏选钓点 / 揭示结果 ============
function setupInput(){
  if(inputIsSetup)return;
  inputIsSetup=true;
  cv=document.getElementById('gameCanvas');
  cv.addEventListener('click',(e)=>{
    let r0=cv.getBoundingClientRect();
    let mx0=(e.clientX-r0.left)*(W/r0.width);
    let my0=(e.clientY-r0.top)*(H/r0.height);
    // 小岛：点击水里游的鱼 → 收获（成熟）／提示（未成熟）
    if(G.islandMode){ if(islandWaterClick(mx0,my0))initAudio(); return; }
    if(G.paused)return;
    if(diveState.active||disasterFX.paused)return; // 潜水/灾难冻结屏蔽画布点击
    initAudio();
    let rect=cv.getBoundingClientRect();
    let mx=(e.clientX-rect.left)*(W/rect.width);
    let my=(e.clientY-rect.top)*(H/rect.height);

    // 糖果鸟互动：优先级最高，在任何阶段都可点击
    if(candyBird.active&&candyBird.phase==='waiting'){
      let b=candyBird;
      let dist=Math.hypot(b.x-mx,b.y-my);
      if(dist<65*b.size){
        b.clicks++;
        b.shakeTimer=Math.min(1,b.shakeTimer+0.5);
        sfx_candy_bird_lick();
        lickCandyBird(b);
        spawnParticles(b.x,b.y,'#FFD700',6,2.4,0.7);
        spawnParticles(b.x,b.y,'#FF69B4',6,2.6,0.7);
        spawnParticles(b.x,b.y,'#87CEFA',5,2.2,0.7);
        if(b.clicks>=b.maxClicks){
          b.phase='success';b.timer=0;
          sfx_candy_bird_done();
          let amt=150+Math.floor(Math.random()*201);
          recordIncome(amt);
          if(adv.active){
            adv.fishBag.push({name:'🍬 糖果鸟的馈赠',rarity:'SR',value:amt,icon:'🦜'});
          }
          G.buffs.rareBoost=(G.buffs.rareBoost||0)+3;
          updateUI();
          toast('🦜 糖果鸟吃饱了！奖励'+amt+'💰 + 稀有度提升3次！','gold');
          spawnParticles(b.x,b.y,'#FFD700',25,5,1.0);
          spawnParticles(b.x,b.y,'#FF69B4',14,4.4,1.0);
        }
        return;
      }
    }

    // 庆典动画中：点击继续揭示
    if(ceremonyAnim_d&&ceremonyAnim_d.phase>=1){
      mouseClicked_d=true; return;
    }

    // 空闲状态：检测是否点击了钓点
    if(G.phase==='idle'){
      // 遍历所有活跃鱼影，检测点击（判定范围随鱼影大小变化）
      let hitSpot=null,hitD=0;
      for(let s of spots){
        if(s.clicked||s.life<=0)continue;
        let dist=Math.hypot(s.x-mx,s.y-my);
        let rr=Math.max(28,(s.size||20)*1.5);
        if(dist<rr&&(!hitSpot||dist<hitD)){hitSpot=s;hitD=dist;}
      }
      if(hitSpot){
        castX=hitSpot.x;castY=hitSpot.y;
        castSurfaceY=(hitSpot.zone==='water')?H*WL:hitSpot.y;
        castRipple=1;
        // 延迟一帧投竿
        setTimeout(()=>castAtSpot(hitSpot),50);
        return;
      }
      // 点击非钓点区域 => 伸出舌头探索
      if(!tongueState.active&&G.phase==='idle'){
        let mouth=frogMouthPos();
        let mouthX=mouth.x,mouthY=mouth.y;
        let dist=Math.hypot(mx-mouthX,my-mouthY);
        if(dist<=Math.hypot(W,H)*1.05){ // 允许全屏（含对角）舔，水下也能摸到
          tongueState.active=true;tongueState.phase='extending';
          tongueState.startX=mouthX;tongueState.startY=mouthY;
          tongueState.targetX=mx;tongueState.targetY=my;
          tongueState.progress=0;tongueState.hitTreasure=null;tongueState.candyLick=false;
          sfx_tongue_shoot();
          return;
        }
      }
      // 兼容旧：点水面选点
      if(my>H*WL+10){
        let minX=stick.x+40,maxX=W-40;
        castX=Math.max(minX,Math.min(maxX,mx));
        castY=H*WL;
        castRipple=1;
      }
    }
  });
  // 鼠标移动追踪（青蛙眼睛+肚皮）
  cv.addEventListener('mousemove',(e)=>{
    let rect=cv.getBoundingClientRect();
    mouseX=(e.clientX-rect.left)*(W/rect.width);
    mouseY=(e.clientY-rect.top)*(H/rect.height);
  });
}

// 旧版单抽/十连按钮改为钓点式（保留兼容）
function doPull(count){
  if(G.phase!=='idle')return;
  initAudio();
  let cost=count===10?COST_TEN:COST_SINGLE;
  if(G.coins<cost){toast('💰 金币不足！钓到鱼会自动换成金币','gold');return;}
  if(levelCasts>=levelMaxCasts){levelFailFlow();return;}
  G.coins-=cost;
  // levelCasts 在 castAtSpot 中统一递增，避免重复计数

  // 寻找最近的活跃钓点
  let activeSpots=spots.filter(s=>!s.clicked&&s.life>0);
  let spot;
  if(activeSpots.length>0){
    spot=activeSpots[Math.floor(Math.random()*activeSpots.length)];
    castX=spot.x;castY=spot.y;castSurfaceY=H*WL;
    clickTarget_d=spot;
    if(spot.isFake){
      let results=[{isFake:true,decoy:DECOYS[Math.floor(Math.random()*DECOYS.length)],rarity:'N'}];
      G.pendingPulls=results;
      bestRarity_d='N';
      spot.clicked=true;
      let ceremony={timer:0,phase:0,results,currentIdx:0,bestRarity:'N',isTen:false,spot};
      G.ceremony=ceremony;ceremonyAnim_d=ceremony;
      ceremony.hasHighlight=false;ceremony.hl=1;
    }else{
      let results=[doSinglePull()];
      G.pendingPulls=results;
      G.catches.push(results[0]);
      bestRarity_d=results[0].rarity;
      spot.clicked=true;
      let ceremony={timer:0,phase:0,results,currentIdx:0,bestRarity:results[0].rarity,isTen:false,spot};
      G.ceremony=ceremony;ceremonyAnim_d=ceremony;
      ceremony.hl=rarityRank(results[0].rarity)+1;
      ceremony.hasHighlight=ceremony.hl>=3;
    }
    G.phase='pulling';updateUI();disableButtons();
    isTenPull=false;
    sfx_pull();
    rodBend=8;castTimer_d=0;ceremonyGlow_d=0;mouseClicked_d=false;
    updateUI();
    return;
  }
  // 没有钓点，刷新一批
  spawnSpots();
  toast('🎣 点击水里游动的黑色鱼影来钓鱼','blue');
}

function closeReveal(){
  document.getElementById('revealOverlay').classList.remove('active','dim');
  mouseClicked_d=true;
  if(levelComplete_d)showLevelComplete();
}

function closeResults(){
  document.getElementById('resultsOverlay').classList.remove('active');
  mouseClicked_d=true;
}

// ============ 初始化 ============
window.addEventListener('resize',()=>resize());


function addFrogXp(rarity){let xp=FROG_XP[rarity]||1;frogXp+=xp;while(frogLv<5&&frogXp>=FROG_CFG[frogLv-1].xp){frogXp-=FROG_CFG[frogLv-1].xp;frogLv++;let c=FROG_CFG[frogLv-1];frogXpNext=c.xp;toast('🐸 青蛙升级！'+c.name+' Lv.'+frogLv+' (成功率'+(c.rate*100)+'%)','gold');sfx_reveal_SR();}updateFrogUI();}
function updateFrogUI(){let c=FROG_CFG[frogLv-1];let cx=frogXp,mx=c.xp;if(frogLv>=5){cx=1;mx=1;}let p=Math.min(100,(cx/mx)*100);let b=document.getElementById('frogLvBar');if(b){b.style.width=p+'%';b.className=frogLv>=5?'gtb-frog-xp-bar max':'gtb-frog-xp-bar';}let t=document.getElementById('frogLvTxt');if(t)t.textContent='Lv.'+frogLv;let r=document.getElementById('frogRateTxt');if(r)r.textContent=Math.round(c.rate*100)+'%';let ml=document.getElementById('mpFrogLv');if(ml)ml.textContent='青蛙 Lv.'+frogLv+' '+c.name;let mr=document.getElementById('mpFrogRate');if(mr)mr.textContent='成功率 '+(c.rate*100)+'%';let ub=document.getElementById('btnFrogUpgrade');if(ub){if(frogLv>=5){ub.style.display='none';}else{ub.style.display='inline-block';ub.textContent='🐸 升级青蛙 · '+FROG_UPGRADE_COST[frogLv]+'💰';if(G.coins<FROG_UPGRADE_COST[frogLv])ub.classList.add('disabled');else ub.classList.remove('disabled');}}}
function upgradeFrog(){if(frogLv>=5){toast('🐸 青蛙已达最高等级！','gold');return;}let cost=FROG_UPGRADE_COST[frogLv];if(G.coins<cost){toast('💰 金币不足！需要 '+cost+'💰','gold');return;}G.coins-=cost;frogXp=0;frogLv++;tutComplete('upgrade_frog');let c=FROG_CFG[frogLv-1];frogXpNext=c.xp;toast('🐸 青蛙升级！'+c.name+' Lv.'+frogLv+' (成功率'+(c.rate*100)+'%)','gold');sfx_reveal_SR();saveGame();updateFrogUI();updateUI();}
function checkDanger(){
  if(!adv.active||adv.dayEnded||adv.gameOver)return;
  let d=adv.danger;
  let el=document.getElementById('fhDangerBar');
  if(el)el.style.width=Math.min(100,d)+'%';
  let pc=document.getElementById('fhDangerPct');
  if(pc)pc.textContent=Math.floor(d)+'%';
  // 雷雨环境音与画面同步：下雨时启动雨声，雨停时停止
  if(d>=DANGER_DANGER&&!disasterFX.active){
    if(!rainAmbient)sfx_rain_start(0.06);
    // 预警期间随机远处闷雷（增强暴雨氛围）
    stormWarn._thunderT=(stormWarn._thunderT||0)-1;
    if(stormWarn._thunderT<=0){
      stormWarn._thunderT=220+Math.random()*280; // 约3.7-8.3秒一次
      sfx_thunder(0.2+Math.random()*0.3);
    }
  }else{
    if(rainAmbient)sfx_rain_stop();
    stormWarn._thunderT=0;
  }
  if(d>=DANGER_DOOM){
    if(!disasterFX.active){
      if(Math.random()<DANGER_DISASTER_CHANCE/60*timeScale){
        triggerDisaster();
      }
    }
  }else if(d>=DANGER_PREMONITION&&!adv._warnedDanger){
    adv._warnedDanger=true;
    toast('🌩️ 暴风雨即将来临，天空渐暗...','orange');
  }else if(d>=DANGER_DANGER&&!adv._triggeredDoom){
    adv._triggeredDoom=true;
    toast('⚠️ 危险！海面异常','orange');
  }else if(d>=DANGER_WARN&&!adv._warnedWarn){
    adv._warnedWarn=true;
    toast('⚡ 危险值偏高！小心假货增多','orange');
  }else if(d<DANGER_SAFE){
    adv._warnedWarn=false;adv._warnedDanger=false;adv._triggeredDoom=false;
  }
}
function triggerDisaster(){
  if(disasterFX.active||adv.dayEnded)return;
  // 按权重随机灾难
  let weights={storm:25,tsunami:15,tornado:12,kraken:8,darkfog:20,hail:20};
  let total=0;for(let v of Object.values(weights))total+=v;
  let r=Math.random()*total,acc=0,picked=DISASTERS[0];
  for(let ds of DISASTERS){
    acc+=weights[ds.id]||15;
    if(r<=acc){picked=ds;break;}
  }
  disasterFX.active=true;disasterFX.type=picked.id;disasterFX.timer=0;disasterFX.intensity=0;
  sfx_rain_stop();
  sfx_disaster_ambient_start(picked.id);
  // 灾难专属音效
  switch(picked.id){
    case 'storm':sfx_disaster_storm();break;
    case 'tsunami':sfx_disaster_tsunami();break;
    case 'tornado':sfx_disaster_tornado();break;
    case 'kraken':sfx_disaster_kraken();break;
    case 'darkfog':sfx_disaster_darkfog();break;
    case 'hail':sfx_disaster_hail();break;
  }
  let warning=document.getElementById('fhDangerPct');
  if(warning)warning.textContent=Math.floor(adv.danger)+'%';
  toast(picked.icon+' '+picked.name+'：'+picked.desc,'red');
  // 立即施加效果
  let dmg=0;
  switch(picked.effect){
    case 'loss_20':dmg=Math.floor(adv.dayEarned*0.2);adv.dayEarned=Math.max(0,adv.dayEarned-dmg);G.coins=Math.max(0,G.coins-dmg);adv.penaltyToday+=dmg;break;
    case 'loss_35':dmg=Math.floor(adv.dayEarned*0.35);adv.dayEarned=Math.max(0,adv.dayEarned-dmg);G.coins=Math.max(0,G.coins-dmg);adv.penaltyToday+=dmg;break;
    case 'loss_25_end':dmg=Math.floor(adv.dayEarned*0.25);adv.dayEarned=Math.max(0,adv.dayEarned-dmg);G.coins=Math.max(0,G.coins-dmg);adv.penaltyToday+=dmg;adv.dayEnded=true;break;
    case 'lose_day':dmg=adv.dayEarned;adv.dayEarned=0;G.coins=Math.max(0,G.coins-dmg);adv.penaltyToday+=dmg;break;
    case 'loss_10':dmg=Math.floor(adv.dayEarned*0.1);adv.dayEarned=Math.max(0,adv.dayEarned-dmg);G.coins=Math.max(0,G.coins-dmg);adv.penaltyToday+=dmg;break;
    case 'loss_15_stun':dmg=Math.floor(adv.dayEarned*0.15);adv.dayEarned=Math.max(0,adv.dayEarned-dmg);G.coins=Math.max(0,G.coins-dmg);adv.penaltyToday+=dmg;disasterFX.paused=true;setTimeout(()=>{if(disasterFX.paused){disasterFX.paused=false;disasterFX.timer=2.6;}},3000);break;
  }
  let msg=picked.msg.replace('{amt}',dmg);
  setTimeout(()=>toast(msg,'red'),800);
  updateUI();
  adv.danger=Math.max(0,adv.danger-Math.floor(Math.random()*25+10));
}
function drawDisasterFX(){
  if(!disasterFX.active)return;
  let id=disasterFX.type;
  // 强度先升后降
  if(disasterFX.timer<0.8)disasterFX.intensity=Math.min(1,disasterFX.timer*1.25);
  else if(disasterFX.timer>2.5)disasterFX.intensity=Math.max(0,1-(disasterFX.timer-2.5)*1.5);
  if(disasterFX.timer>3.2){disasterFX.active=false;disasterFX.paused=false;sfx_disaster_ambient_stop();return;}
  let I=disasterFX.intensity;
  // 暗化层
  cx.fillStyle=`rgba(0,0,0,${I*0.45})`;
  cx.fillRect(0,0,W,H);
  // 各灾难独有效果
  switch(id){
    case 'storm':{
      // 狂风 + 暴雨
      cx.fillStyle=`rgba(30,30,60,${I*0.25})`;
      cx.fillRect(0,0,W,H*WL);
      let rainC=Math.floor(40+I*120);
      cx.strokeStyle=`rgba(170,200,255,${0.3+I*0.5})`;
      let st=performance.now()*0.001;
      for(let i=0;i<rainC;i++){
        let rx=((i*97+st*150)%(W+50));
        let ry=((i*73+st*200)%(H+50))-25;
        cx.beginPath();cx.moveTo(rx,ry);cx.lineTo(rx-3,ry+20);cx.stroke();
      }
      // 闪电
      if(Math.random()<0.05*I){
        cx.fillStyle=`rgba(255,255,220,${I*0.7})`;
        cx.fillRect(0,0,W,H);
        cx.strokeStyle='rgba(255,255,200,0.95)';cx.lineWidth=2.5;
        let lx=W*(0.15+Math.random()*0.7);
        cx.beginPath();cx.moveTo(lx,0);
        for(let s=0;s<6;s++){lx+=(Math.random()-0.5)*30;cx.lineTo(lx,H*WL*0.16*s);}
        cx.stroke();
      }
      break;
    }
    case 'tsunami':{
      // 巨浪从右往左
      let waveX=W-(I*W*0.7);
      cx.fillStyle=`rgba(10,40,80,${I*0.7})`;
      cx.beginPath();
      cx.moveTo(waveX,H*WL);
      cx.quadraticCurveTo(waveX-40,H*WL-60,waveX-50,H*WL);
      cx.quadraticCurveTo(waveX-30,H*WL+40,waveX,H*WL+30);
      cx.fill();
      cx.fillStyle=`rgba(140,200,255,${I*0.5})`;
      cx.beginPath();
      cx.arc(waveX-15,H*WL-25,8+I*40,0,Math.PI*2);
      cx.fill();
      break;
    }
    case 'tornado':{
      // 龙卷水柱
      let tx=W*0.55, ty=H*WL*0.6;
      for(let s=0;s<3;s++){
        let ox=Math.sin(disasterFX.timer*8+s*2)*12;
        cx.strokeStyle=`rgba(120,160,200,${I*0.7-s*0.2})`;
        cx.lineWidth=6-s*1.5;
        cx.beginPath();
        cx.moveTo(tx+ox,ty-120);
        for(let j=0;j<30;j++){let p=j/30;cx.lineTo(tx+Math.sin(p*10+disasterFX.timer*5)*10,ty-120+p*200);}
        cx.stroke();
      }
      // 旋风碎屑
      for(let i=0;i<8;i++){
        let a=disasterFX.timer*4+i*0.8;
        let r=20+i*8;
        cx.fillStyle=`rgba(180,200,220,${I*0.5})`;
        cx.beginPath();
        cx.arc(tx+Math.cos(a)*r,ty+Math.sin(a)*r-50,3,0,Math.PI*2);
        cx.fill();
      }
      break;
    }
    case 'kraken':{
      // 触手从水面伸出
      cx.strokeStyle=`rgba(100,60,120,${I*0.9})`;
      cx.lineWidth=12;
      for(let h=0;h<3;h++){
        let tx=W*(0.3+h*0.2);
        cx.beginPath();
        cx.moveTo(tx,H*WL);
        let phase=disasterFX.timer*3+h*2;
        for(let j=0;j<20;j++){let p=j/20;cx.lineTo(tx+Math.sin(phase+p*6)*25+p*15,H*WL-p*40-Math.sin(phase+p*4)*15);}
        cx.stroke();
        // 吸盘
        cx.fillStyle=`rgba(160,100,200,${I*0.6})`;
        for(let s=0;s<4;s++){
          cx.beginPath();
          cx.arc(tx+Math.sin(phase+s)*15-5,H*WL-s*10-5,Math.abs(Math.sin(phase+s))*2+3,0,Math.PI*2);
          cx.fill();
        }
      }
      break;
    }
    case 'darkfog':{
      // 黑雾弥漫
      for(let i=0;i<5;i++){
        let fx=((disasterFX.timer*20+i*W*0.3)%(W+200))-100;
        let fy=H*WL*0.2+i*H*WL*0.15;
        let r=40+i*15;
        cx.fillStyle=`rgba(15,15,25,${I*0.4+i*0.02})`;
        cx.beginPath();
        cx.arc(fx,fy,r,0,Math.PI*2);
        cx.fill();
      }
      cx.fillStyle=`rgba(5,5,15,${I*0.35})`;
      cx.fillRect(0,0,W,H);
      break;
    }
    case 'hail':{
      // 冰雹下落
      cx.fillStyle=`rgba(20,30,50,${I*0.3})`;
      cx.fillRect(0,0,W,H*WL);
      for(let i=0;i<20;i++){
        let hx=(i*W*0.09+disasterFX.timer*20)%W;
        let hy=((i*53+disasterFX.timer*250)%(H+30))-15;
        cx.fillStyle=`rgba(220,235,255,${I*0.8})`;
        cx.beginPath();
        cx.arc(hx,hy,4+Math.random()*6,0,Math.PI*2);
        cx.fill();
        cx.strokeStyle='rgba(255,255,255,0.6)';
        cx.beginPath();cx.arc(hx-2,hy-2,2,0,Math.PI*2);cx.stroke();
      }
      if(disasterFX.paused&&disasterFX.timer<3){
        // 冻结效果 - 蓝白色调
        cx.fillStyle=`rgba(100,180,255,${I*0.2})`;
        cx.fillRect(0,0,W,H);
      }
      break;
    }
  }
}
function triggerGoodEvent(){
  if(goodEventFX.active||disasterFX.active||candyBird.active||!adv.active||adv.dayEnded||G.phase!=='idle')return;
  let weights={diamond_rain:18,fish_surge:16,mermaid:10,rainbow:8,seagull:20,treasure_chest:18,candy_bird:10};
  let total=0;for(let v of Object.values(weights))total+=v;
  let r=Math.random()*total,acc=0,picked=GOOD_EVENTS[0];
  for(let ge of GOOD_EVENTS){acc+=weights[ge.id]||15;if(r<=acc){picked=ge;break;}}
  if(picked.id==='candy_bird'){
    // 糖果鸟是互动事件，不走着普通奇遇流程
    candyBird.active=true;candyBird.timer=0;candyBird.clicks=0;
    candyBird.x=W*0.3+Math.random()*W*0.4;
    candyBird.y=H*0.15+Math.random()*H*0.2;
    candyBird.phase='appearing';candyBird.size=0.01;candyBird.shakeTimer=0;candyBird.popTimer=0;
    toast(picked.icon+' '+picked.name+'：'+picked.desc,'gold');
    sfx_candy_bird_appear();
    return;
  }
  goodEventFX.active=true;goodEventFX.type=picked.id;goodEventFX.timer=0;goodEventFX.intensity=0;
  toast(picked.icon+' '+picked.name+'：'+picked.desc,'gold');
  let amt=0;
  switch(picked.effect){
    case 'bonus_80_150':amt=80+Math.floor(Math.random()*71);break;
    case 'bonus_50_120':amt=50+Math.floor(Math.random()*71);break;
    case 'bonus_30_60':amt=30+Math.floor(Math.random()*31);break;
    case 'bonus_60_100':amt=60+Math.floor(Math.random()*41);break;
    case 'rare_boost':G.buffs.rareBoost=(G.buffs.rareBoost||0)+3;break;
    case 'next_ur':G.buffs.nextUR=true;break;
  }
  if(amt>0){recordIncome(amt);setTimeout(()=>toast(picked.msg.replace('{amt}',amt),'gold'),800);updateUI();}
  switch(picked.id){
    case 'diamond_rain':case 'treasure_chest':sfx_good_diamonds();break;
    case 'mermaid':case 'rainbow':sfx_good_mermaid();break;
    default:sfx_good_bonus();break;
  }
}
function drawGoodEventFX(){
  if(!goodEventFX.active)return;
  let id=goodEventFX.type;
  if(goodEventFX.timer<0.5)goodEventFX.intensity=Math.min(1,goodEventFX.timer*2);
  else if(goodEventFX.timer>6)goodEventFX.intensity=Math.max(0,1-(goodEventFX.timer-6)*1.5);
  if(goodEventFX.timer>6.7){goodEventFX.active=false;return;}
  let I=goodEventFX.intensity;
  // 温暖光层
  cx.fillStyle=`rgba(255,220,140,${I*0.12})`;
  cx.fillRect(0,0,W,H);
  switch(id){
    case 'diamonds':{
      // 闪光钻石从天空下落
      let diamC=Math.floor(15+I*15);
      let st=performance.now()*0.001;
      for(let i=0;i<diamC;i++){
        let dx=((i*83+st*60)%(W+40))-20;
        let dy=((i*71-st*180)%(H*WL+20));
        cx.fillStyle=`rgba(200,240,255,${I*0.6+i%3*0.15})`;
        cx.beginPath();
        // 菱形
        let s=4+I*6;
        cx.moveTo(dx,dy-s);cx.lineTo(dx+s*0.7,dy);cx.lineTo(dx,dy+s);cx.lineTo(dx-s*0.7,dy);
        cx.closePath();cx.fill();
        cx.strokeStyle=`rgba(255,255,255,${I*0.4})`;
        cx.lineWidth=0.8;cx.stroke();
      }
      break;
    }
    case 'fish_surge':{
      // 鱼群跃出水面
      let st=performance.now()*0.001;
      for(let i=0;i<12;i++){
        let fx=((i*97+st*40)%W);
        let fy=H*WL-15-Math.abs(Math.sin(st*3+i))*H*WL*0.2*I;
        cx.fillStyle=`rgba(120,200,255,${I*0.7})`;
        cx.save();cx.translate(fx,fy);
        cx.rotate(Math.sin(st*5+i)*0.3);
        cx.beginPath();cx.ellipse(0,0,10,5,0,0,Math.PI*2);cx.fill();
        // 尾巴
        cx.beginPath();cx.moveTo(-10,0);cx.lineTo(-18,-6);cx.lineTo(-18,6);cx.closePath();cx.fill();
        cx.restore();
      }
      // 水花
      for(let i=0;i<6;i++){
        let sx=i*W/6+st*20%60;
        cx.fillStyle=`rgba(180,220,255,${I*0.5})`;
        cx.beginPath();cx.arc(sx,H*WL-3,4+I*3,0,Math.PI*2);cx.fill();
      }
      break;
    }
    case 'mermaid':{
      // 美人鱼剪影 + 音符
      let mx=W*0.5;
      cx.fillStyle=`rgba(255,180,220,${I*0.5})`;
      cx.beginPath();cx.arc(mx,H*WL-40-I*20,18,0,Math.PI*2);cx.fill();
      cx.fillStyle=`rgba(255,140,200,${I*0.4})`;
      cx.beginPath();cx.ellipse(mx,H*WL-10-I*10,10,25,0,0,Math.PI*2);cx.fill();
      // 音符粒子
      for(let i=0;i<8;i++){
        let nx=mx-30+Math.sin(performance.now()*0.002+i)*20;
        let ny=H*WL-80-I*60+i*10;
        cx.fillStyle=`rgba(255,220,255,${I*0.5})`;
        cx.font='18px sans-serif';
        cx.fillText('♪',nx,ny);
      }
      break;
    }
    case 'rainbow':{
      // 彩虹弧线
      let colors=['#FF4444','#FF8800','#FFDD00','#44DD44','#4488FF','#8844FF'];
      for(let c=0;c<6;c++){
        cx.strokeStyle=colors[c];
        cx.lineWidth=6+c*0.8;
        cx.globalAlpha=I*(0.3+c*0.1);
        cx.beginPath();
        cx.arc(W*0.5,H*WL-5,H*WL*0.5+c*12,Math.PI*1.05,Math.PI*1.9);
        cx.stroke();
      }
      cx.globalAlpha=1;
      break;
    }
    case 'seagull':{
      // 海鸥飞过
      let gx=(performance.now()*0.08)%(W+100)-50;
      cx.fillStyle=`rgba(255,255,240,${I*0.8})`;
      cx.save();cx.translate(gx,H*0.2-Math.sin(performance.now()*0.005)*15);
      // 身体
      cx.beginPath();cx.ellipse(0,0,12,5,0,0,Math.PI*2);cx.fill();
      // 翅膀
      cx.beginPath();cx.moveTo(-5,0);cx.lineTo(-22,-12);cx.lineTo(-8,-2);cx.fill();
      cx.beginPath();cx.moveTo(5,0);cx.lineTo(22,-12);cx.lineTo(8,-2);cx.fill();
      cx.restore();
      // 掉落的金币
      for(let i=0;i<3;i++){
        let cy=H*0.3+(performance.now()*0.001+i*0.4)%10*8;
        cx.fillStyle='#FFD700';
        cx.beginPath();cx.arc(gx+10+i*8,cy,4,0,Math.PI*2);cx.fill();
      }
      break;
    }
    case 'chest':{
      // 宝箱从右方漂来
      let bx=W-50-(goodEventFX.timer*90)%(W+60);
      let by=H*WL-20+Math.sin(performance.now()*0.004)*8;
      cx.fillStyle=`rgba(160,100,40,${I*0.9})`;
      cx.fillRect(bx-15,by-10,30,20);
      cx.fillStyle=`rgba(200,140,50,${I*0.9})`;
      cx.fillRect(bx-15,by-10,30,5);
      cx.strokeStyle=`rgba(255,215,0,${I*0.6})`;
      cx.lineWidth=2;
      cx.strokeRect(bx-15,by-10,30,20);
      // 光芒
      cx.fillStyle=`rgba(255,215,0,${I*0.4})`;
      cx.beginPath();cx.arc(bx,by-5,20,0,Math.PI*2);cx.fill();
      break;
    }
  }
}
// 青蛙嘴的位置（伸舌头的起点）
function frogMouthPos(){
  let sc=Math.min(W,H)/800;
  return {x:rodTip?rodTip.x:stick.handX+42*sc, y:rodTip?rodTip.y:stick.handY-26*sc};
}
// 点糖果鸟 → 青蛙真的把舌头甩出去舔一口（视觉反馈）
function lickCandyBird(b){
  let mouth=frogMouthPos();
  tongueState.active=true;tongueState.phase='extending';
  tongueState.startX=mouth.x;tongueState.startY=mouth.y;
  tongueState.targetX=b.x;tongueState.targetY=b.y;
  tongueState.progress=0;tongueState.hitTreasure=null;tongueState.candyLick=true;
  b.popTimer=1;
  sfx_tongue_shoot();
  treasureCollectAnim.push({x:b.x,y:b.y-6,life:0.9,maxLife:0.9,color:'#FF69B4',icon:'💋'});
}

function drawCandyBird(){
  if(!candyBird.active)return;
  let b=candyBird;
  // 糖果鸟主体
  let s=b.size;
  let x=b.x,y=b.y;
  let shakeX=b.shakeTimer>0?Math.sin(b.shakeTimer*60)*8*b.shakeTimer:0;
  x+=shakeX;
  // 被舔到时的弹起+膨胀反馈
  let pop=b.popTimer>0?b.popTimer:0;
  y-=Math.sin(pop*Math.PI)*14*pop;
  s*=1+0.14*pop;

  // 翅膀飘动
  let wingAngle=Math.sin(performance.now()*0.005)*0.35;

  // 尾巴 (彩虹色羽毛，先画在底层)
  for(let t=0;t<5;t++){
    let ta=t-2;
    cx.fillStyle=`hsla(${t*60},80%,65%,0.9)`;
    cx.save();cx.translate(x-20,y+5);
    cx.rotate(ta*0.25+wingAngle*0.6);
    cx.beginPath();cx.ellipse(-12,0,18,7,0,0,Math.PI*2);cx.fill();
    cx.restore();
  }

  // 左翅膀 - 糖果条纹
  cx.save();cx.translate(x-10,y-8);
  cx.rotate(-0.2+wingAngle);
  cx.fillStyle='#FF69B4';
  cx.beginPath();cx.ellipse(-12,0,22,12,0.3,0,Math.PI*2);cx.fill();
  // 棒棒糖纹路
  cx.strokeStyle='#FFD700';cx.lineWidth=2;
  for(let i=0;i<5;i++){
    cx.beginPath();cx.arc(-12,0,5+i*4,-Math.PI*0.5,Math.PI*0.5);
    cx.stroke();
  }
  cx.restore();

  // 右翅膀
  cx.save();cx.translate(x+10,y-8);
  cx.rotate(0.2-wingAngle);
  cx.fillStyle='#87CEEB';
  cx.beginPath();cx.ellipse(12,0,22,12,-0.3,0,Math.PI*2);cx.fill();
  cx.strokeStyle='#FFD700';cx.lineWidth=2;
  for(let i=0;i<5;i++){
    cx.beginPath();cx.arc(12,0,5+i*4,-Math.PI*0.5,Math.PI*0.5);
    cx.stroke();
  }
  cx.restore();

  // 身体 - 棉花糖质感
  let bodyGrad=cx.createRadialGradient(x,y-5,2,x,y,28*s);
  bodyGrad.addColorStop(0,'#FFE4E1');
  bodyGrad.addColorStop(0.4,'#FFB6C1');
  bodyGrad.addColorStop(0.8,'#FF69B4');
  bodyGrad.addColorStop(1,'#C71585');
  cx.fillStyle=bodyGrad;
  cx.beginPath();cx.ellipse(x,y,26*s,22*s,0,0,Math.PI*2);cx.fill();
  cx.strokeStyle='rgba(255,255,255,0.5)';cx.lineWidth=2;
  cx.stroke();

  // 糖果糖霜斑点
  for(let i=0;i<12;i++){
    let sx=x-18+Math.random()*36*s;
    let sy=y-15+Math.random()*30*s;
    cx.fillStyle=`hsla(${Math.random()*360},90%,70%,0.8)`;
    cx.beginPath();cx.arc(sx,sy,3+Math.random()*2,0,Math.PI*2);cx.fill();
  }

  // 头
  cx.fillStyle='#FFB6C1';
  cx.beginPath();cx.arc(x,y-18*s,16*s,0,Math.PI*2);cx.fill();
  cx.strokeStyle='rgba(255,255,255,0.5)';cx.lineWidth=2;cx.stroke();

  // 眼睛
  cx.fillStyle='#FFF';cx.beginPath();cx.arc(x-6*s,y-20*s,6*s,0,Math.PI*2);cx.fill();
  cx.beginPath();cx.arc(x+6*s,y-20*s,6*s,0,Math.PI*2);cx.fill();
  cx.fillStyle='#1a1a2e';cx.beginPath();cx.arc(x-5*s,y-20*s,3*s,0,Math.PI*2);cx.fill();
  cx.beginPath();cx.arc(x+7*s,y-20*s,3*s,0,Math.PI*2);cx.fill();
  // 眼神高光
  cx.fillStyle='#FFF';cx.beginPath();cx.arc(x-4*s,y-22*s,1.5*s,0,Math.PI*2);cx.fill();
  cx.beginPath();cx.arc(x+8*s,y-22*s,1.5*s,0,Math.PI*2);cx.fill();

  // 喙 (糖果棒)
  cx.fillStyle='#FF6347';
  cx.beginPath();cx.moveTo(x+14*s,y-17*s);cx.lineTo(x+26*s,y-12*s);cx.lineTo(x+14*s,y-7*s);cx.closePath();cx.fill();
  cx.fillStyle='#FFD700';cx.beginPath();cx.arc(x+18*s,y-12*s,4*s,0,Math.PI*2);cx.fill();

  // 皇冠/羽毛冠
  cx.fillStyle='#FFD700';
  for(let i=0;i<3;i++){
    let fx=x+(i-1)*8*s;
    cx.beginPath();cx.moveTo(fx-3*s,y-30*s);
    cx.lineTo(fx,y-38*s-4*i*s);
    cx.lineTo(fx+3*s,y-30*s);cx.closePath();cx.fill();
  }

  // 点击提示文字
  if(b.phase==='waiting'){
    let remaining=b.maxClicks-b.clicks;
    cx.fillStyle=`rgba(255,255,255,${0.7+b.shakeTimer})`;
    cx.font=`bold ${16*s}px sans-serif`;
    cx.textAlign='center';
    let hintText;
    if(remaining===3)hintText='舔我3下！';
    else if(remaining===2)hintText='再舔2下！';
    else hintText='最后一下！';
    cx.fillText(hintText,x,y-50*s);
    cx.textAlign='start';
  }

  // 进度指示器
  if(b.phase==='waiting'){
    for(let i=0;i<b.maxClicks;i++){
      let ix=x-20+(i*20);
      let iy=y+38*s;
      if(i<b.clicks){
        cx.fillStyle='#FFD700';
        cx.beginPath();cx.arc(ix,iy,5,0,Math.PI*2);cx.fill();
      }else{
        cx.fillStyle='rgba(255,255,255,0.3)';
        cx.beginPath();cx.arc(ix,iy,5,0,Math.PI*2);cx.fill();
        cx.strokeStyle='rgba(255,255,255,0.5)';cx.lineWidth=1;cx.stroke();
      }
    }
  }
}
function drawTongue(){
  if(!tongueState.active&&treasureCollectAnim.length===0)return;
  let s=Math.min(W,H)/800;
  // 绘制收集动画（飞出金币/宝物进入背包）
  for(let i=treasureCollectAnim.length-1;i>=0;i--){
    let a=treasureCollectAnim[i];
    let p=1-a.life/a.maxLife;
    let ex=a.x;
    // 金币飞向屏幕上方
    let fy=a.y-p*H*0.3;
    let ax=(Math.sin(p*8))*30*s;
    cx.globalAlpha=1-p;
    cx.fillStyle=a.color||'#FFD700';
    cx.font=`bold ${14*s}px sans-serif`;cx.textAlign='center';
    cx.fillText(a.icon||'💰',ex+ax,fy);
    cx.textAlign='start';
    cx.globalAlpha=1;
    a.life-=deltaTime;
    if(a.life<=0)treasureCollectAnim.splice(i,1);
  }
  if(!tongueState.active||tongueState.phase==='idle')return;
  let p=tongueState.progress;
  let sx=tongueState.startX, sy=tongueState.startY;
  let tx=tongueState.targetX, ty=tongueState.targetY;
  // 贝塞尔曲线：舌头伸出有自然弧度
  let midX=(sx+tx)/2, midY=Math.min(sy,ty)-30*s*(1-Math.abs(p-0.5)*2);
  let t;
  if(tongueState.phase==='extending'){
    t=Math.min(p,0.3)/0.3; // 0→1 快
    cx1=sx+(midX-sx)*t;cy1=sy+(midY-sy)*t;
  }else{
    t=p; // retract: 1→0
    cx1=sx+(tx-sx)*(1-t);cy1=sy+(ty-sy)*(1-t);
  }
  // 舌头主体（红色粗线）
  cx.strokeStyle='#E53935';cx.lineWidth=5*s;cx.lineCap='round';
  cx.beginPath();cx.moveTo(sx,sy);
  cx.quadraticCurveTo(midX,midY,Math.min(p,1)*tx+(1-Math.min(p,1))*sx,Math.min(p,1)*ty+(1-Math.min(p,1))*sy);
  cx.stroke();
  // 舌头尖端（粉色分叉）
  let tipX=sx+(tx-sx)*Math.min(p,1), tipY=sy+(ty-sy)*Math.min(p,1);
  if(p>0.1){
    let tipS=Math.min(1,(p-0.1)*5);
    cx.fillStyle='#FF6B6B';
    cx.beginPath();cx.arc(tipX,tipY-3*s,4*s*tipS,0,Math.PI*2);cx.fill();
    cx.beginPath();cx.arc(tipX+3*s,tipY,3*s*tipS,0,Math.PI*2);cx.fill();
    cx.beginPath();cx.arc(tipX-3*s,tipY,3*s*tipS,0,Math.PI*2);cx.fill();
  }
}
function drawHiddenTreasures(){
  if(hiddenTreasures.length===0)return;
  let s=Math.min(W,H)/800;
  let now=performance.now()*0.001;
  for(let t of hiddenTreasures){
    if(t.collected)continue;
    // 微弱闪烁提示——不明显的微光
    let sparkAlpha=0.1+Math.abs(Math.sin(now*3+t._seed))*0.15;
    let sparkSize=(2+Math.abs(Math.sin(now*2.5+t._seed+1))*2)*s;
    cx.fillStyle=`rgba(255,215,0,${sparkAlpha})`;
    cx.beginPath();cx.arc(t.x,t.y,sparkSize,0,Math.PI*2);cx.fill();
    // 极小的星形闪烁
    if(Math.sin(now*4+t._seed)>0.7){
      cx.strokeStyle=`rgba(255,255,200,${sparkAlpha+0.2})`;cx.lineWidth=1*s;
      let r=sparkSize+2*s;
      for(let k=0;k<4;k++){
        let a=k*Math.PI/2;
        cx.beginPath();cx.moveTo(t.x+Math.cos(a)*r,t.y+Math.sin(a)*r);
        cx.lineTo(t.x+Math.cos(a+0.4)*r*0.4,t.y+Math.sin(a+0.4)*r*0.4);
        cx.stroke();
      }
    }
  }
}
function spawnHiddenTreasure(){
  if(hiddenTreasures.length>=4||G.phase!=='idle')return;
  if(!adv.active&&gameMode!=='free')return;
  let s=Math.min(W,H)/800;
  let x=30*s+Math.random()*(W-60*s);
  let y=30*s+Math.random()*(H*0.7);
  for(let sp of spots){
    if(sp.clicked)continue;
    if(Math.hypot(sp.x-x,sp.y-y)<50*s)return;
  }
  hiddenTreasures.push({x,y,collected:false,_seed:Math.random()*1000});
}
function endDay(){if(!adv.active||adv.gameOver)return;adv.dayEnded=true;
  if(checkGoal())return; // 已赚到 100 万 → 立即胜利
  let pe=adv.dayEarned;adv.day++;G.gameDay=Math.max(G.gameDay,adv.day);resetClockToMorning();adv.dayEarned=0;adv.dayCasts=0;levelCasts=0;adv.penaltyToday=0;adv.danger=Math.max(0,adv.danger*0.3);diveState.sessionsLeft=3;updateDiveBtn();adv.dayEnded=false;adv._warnedWarn=false;adv._warnedDanger=false;adv._triggeredDoom=false;spots=[];levelSpotTimer=0;hiddenTreasures=[];treasureSpawnTimer=0;treasureCollectAnim=[];tongueState.active=false;tongueState.phase='idle';adv.fishBag=[];adv.plantedVeg=adv.plantedVeg||[];adv.plantedFish=adv.plantedFish||[];processIslandHarvest();
  if(checkGoal())return; // 已用满 100 天仍未达标 → 失败
  let todEmoji=getTimeEmoji(adv.timeOfDay);toast(todEmoji+' 第'+adv.day+'天 (+'+pe.toLocaleString()+'💰) 开始！还差'+Math.max(0,Math.ceil((GOAL_TARGET-G.totalEarned)/10000))+'万','gold');sfx_reveal_R();updateAdvHUD();updateGoalHUD();updateUI();updateButtons();flashDayRed();}

// ============ 种鱼模式（Fish Farm）============
// 解锁条件：第一次钓鱼（至少1条）回来小岛后，由 maybeUnlockGardenOnIsland 置位
function isGardenUnlocked(){return !!G.gardenUnlocked;}
function findFishById(id){return FISH_POOL.find(f=>f.id===id)||null;}
// 钓到鱼 → 获得 1 颗对应鱼苗
function grantSeedling(fish){
  if(!fish||!fish.id)return;
  G.seedlings[fish.id]=(G.seedlings[fish.id]||0)+1;
}
// 钓鱼过程中不再立即解锁；解锁统一在"第一次钓鱼回来小岛"时触发
function checkGardenUnlock(){ updateGardenCardUI(); }
// 第一次钓鱼（至少钓到 1 条鱼）回来小岛后，解锁种鱼模式并弹出玩法教学
function maybeUnlockGardenOnIsland(){
  if(G.gardenUnlocked)return;
  if(G.totalCaught<1)return; // 至少钓到 1 条鱼
  G.gardenUnlocked=true;
  G.gardenTutPending=true;
  toast('🐠 种鱼模式已解锁！回小岛点「🐠 种鱼」，把钓到的鱼种下去生钱～','gold');
  sfx_reveal_R();
  updateGardenCardUI();updateRedDots();
  if(typeof updateIslandTabUI==='function')updateIslandTabUI(); // 立刻刷新小岛按钮，否则仍显示锁定
  saveGame(true);
  setTimeout(()=>{ if(G.islandMode)openGardenTutorial(true); },700);
}
// ===== 种鱼模式教学（解锁引导 / 随时可重看）=====
function openGardenTutorial(fromButton){
  let ov=document.getElementById('gardenTutOverlay');
  if(!ov)return;
  if(!isGardenUnlocked()&&!fromButton){
    toast('🔒 种鱼模式还没解锁哦','blue');return;
  }
  G.gardenTutStep=0;G.gardenTutSeen=true;
  ov.classList.add('active');
  renderGardenTutStep();
  let gb=document.getElementById('gardenGuideBtn');
  if(gb)gb.classList.remove('blink');
  updateRedDots();saveGame(true);
}
function renderGardenTutStep(){
  let i=Math.max(0,Math.min(gardenTutorialSteps.length-1,G.gardenTutStep||0));
  let st=gardenTutorialSteps[i];
  let ic=document.getElementById('gtutIcon');if(ic)ic.textContent=st.icon;
  let ti=document.getElementById('gtutTitle');if(ti)ti.textContent=st.title;
  let de=document.getElementById('gtutDesc');if(de)de.innerHTML=st.desc+(st.hint?'<div class="gtut-hint">🎯 操作任务：'+st.hint+'</div>':'');
  if(typeof tutApplyHighlight==='function')tutApplyHighlight(st.highlight);
  let dots=document.getElementById('gtutDots');
  if(dots){dots.innerHTML=gardenTutorialSteps.map((_,k)=>`<div class="gdot${k===i?' active':''}"></div>`).join('');}
  let nb=document.getElementById('gtutNextBtn');
  if(nb){
    let last=i>=gardenTutorialSteps.length-1;
    if(st.action==='start'){
      nb.disabled=false;nb.style.opacity=1;nb.textContent='✅ 开始种鱼！';
    }else if(!G._gtutDone){
      nb.disabled=true;nb.style.opacity=0.4;nb.textContent='⏳ 请先完成上面的操作…';
    }else{
      nb.disabled=false;nb.style.opacity=1;nb.textContent=last?'✅ 开始种鱼！':'继续 ➡️';
    }
  }
}
function nextGardenTut(){
  G._gtutDone=false;
  if((G.gardenTutStep||0)>=gardenTutorialSteps.length-1){closeGardenTut();return;}
  G.gardenTutStep=(G.gardenTutStep||0)+1;
  renderGardenTutStep();
}
function skipGardenTut(){closeGardenTut();}
function closeGardenTut(){
  let ov=document.getElementById('gardenTutOverlay');if(ov)ov.classList.remove('active');
  G.gardenTutPending=false;G.gardenTutSeen=true;
  let gb=document.getElementById('gardenGuideBtn');if(gb)gb.classList.remove('blink');
  updateRedDots();saveGame(true);
}
// 生长时间：越贵的鱼需要种的时间越久（单位：游戏内分钟）
function growMinForFish(fish){
  let v=(fish&&typeof fish.v==='number')?fish.v:100;
  return Math.max(30,Math.round(20+v*0.14));
}
function seedlingList(){
  return Object.keys(G.seedlings).map(id=>({fish:findFishById(id),count:G.seedlings[id]}))
    .filter(x=>x.fish&&x.count>0).sort((a,b)=>(a.fish.r||0)-(b.fish.r||0));
}
function gardenProgress(plot){
  if(!plot||!plot.growMin)return 1;
  return Math.max(0,Math.min(1,(G.worldTime-plot.plantTime)/plot.growMin));
}
function gardenReady(plot){return gardenProgress(plot)>=1;}
function gardenRemainText(plot){
  let left=Math.max(0,plot.growMin-(G.worldTime-plot.plantTime)); // 剩余游戏内分钟
  if(left<=0)return '已成熟';
  let real=left/CLOCK_MIN_PER_SEC; // 折算为真实秒
  let mm=Math.floor(real/60),ss=Math.round(real%60);
  return mm>0?(mm+'分'+String(ss).padStart(2,'0')+'秒'):(ss+'秒');
}
// 种植：把一颗鱼苗放入空鱼塘
function gardenPlant(fishId){
  if(!isGardenUnlocked())return;
  if(!G.seedlings[fishId]){toast('没有该鱼苗','red');return;}
  if(G.gardenPlots.length>=GARDEN_PLOTS){toast('鱼塘已满，请先收获','red');return;}
  let fish=findFishById(fishId);if(!fish)return;
  G.seedlings[fishId]--;
  if(G.seedlings[fishId]<=0)delete G.seedlings[fishId];
  G.gardenPlots.push({fishId:fishId,plantTime:G.worldTime,growMin:growMinForFish(fish),_shownReady:false});
  sfx_reveal_N();
  toast('🌱 '+fish.e+' '+fish.n+' 放入小岛水里啦！成熟后点击它即可收获','blue');
  gardenBuild();
  if(typeof refreshSeedlingPanel==='function')refreshSeedlingPanel();
  updateUI();
}
// 收获：成熟后获得金币（只进 coins，不计入百万目标，与岛上种鱼一致）
function gardenHarvest(idx){
  let plot=G.gardenPlots[idx];if(!plot||!gardenReady(plot))return;
  let fish=findFishById(plot.fishId);
  let reward=fish?Math.max(10,Math.round((fish.v||100)*(1+0.4*(plot.growMin/240)))):50;
  G.coins+=reward;
  toast('🐠 收获 '+(fish?fish.e+' '+fish.n:'鱼')+'，+'+reward.toLocaleString()+'💰','gold');
  gtutComplete('harvest');
  sfx_reveal_SR();
  G.gardenPlots.splice(idx,1);
  updateUI();gardenBuild();
}
// 主菜单卡片：未解锁显示灰色问号（神秘模式），解锁后显示种鱼模式
function updateGardenCardUI(){
  let card=document.getElementById('mpGardenCard');if(!card)return;
  let icon=card.querySelector('.mp-icon');
  let title=card.querySelector('.mp-card-title');
  let desc=document.getElementById('mpGardenDesc');
  let features=document.getElementById('mpGardenFeatures');
  if(isGardenUnlocked()){
    card.classList.remove('mp-mystery');card.classList.add('mp-garden');
    if(icon)icon.textContent='🐠';
    if(title)title.textContent='种鱼模式';
    if(desc)desc.textContent='种下鱼苗 · 越贵的鱼成熟越慢';
    if(features)features.innerHTML='<span>✓</span> 钓到的鱼变鱼苗<br><span>✓</span> 成熟后收获金币<br><span>✓</span> 时间随全局时钟流动<br><span>✓</span> 与冒险/闯关并行'
      +(G.gardenTutSeen?'':'<br><span>🎓</span> <b style="color:#FFD700">新玩法教学待查看</b>');
    if(typeof updateRedDots==='function')updateRedDots();
  }else{
    card.classList.add('mp-mystery');card.classList.remove('mp-garden');
    if(icon)icon.textContent='❓';
    if(title)title.textContent='神秘模式';
    if(desc)desc.textContent='??? 未知的模式';
    if(features)features.innerHTML='<span>🔒</span> 成功钓鱼 '+GARDEN_UNLOCK_CAUGHT+' 次后解锁<br><span>🔒</span> 当前进度 '+Math.min(G.totalCaught,GARDEN_UNLOCK_CAUGHT)+' / '+GARDEN_UNLOCK_CAUGHT;
  }
}
function openGardenMode(){
  if(!isGardenUnlocked()){
    toast('🔒 神秘模式：在冒险或闯关模式成功钓鱼 '+GARDEN_UNLOCK_CAUGHT+' 次后解锁（'+G.totalCaught+'/'+GARDEN_UNLOCK_CAUGHT+'）','blue');
    return;
  }
  adv.active=false; // 进入种鱼模式即脱离冒险休整态，避免状态冲突
  G.gardenMode=true;G.islandMode=false;
  if(G.paused){G.paused=false;let po=document.getElementById('pauseOverlay');if(po)po.classList.remove('active');lastTime=0;}
  // 收起小岛 / 模式选择等所有遮罩，只留种鱼界面（否则小岛会盖在上面让玩家"没反应"）
  ['modePick','islandOverlay','levelSelectOverlay','revealOverlay','resultsOverlay','dailyOverlay','diveOverlay','gardenTutOverlay'].forEach(id=>{let e=document.getElementById(id);if(e){e.classList.remove('active');e.classList.add('hidden');e.style.display='';}});
  let its=document.getElementById('islandTimeStop');if(its)its.style.display='none';
  let mb=document.getElementById('menuBackBtn');if(mb)mb.classList.add('show');
  let fh=document.getElementById('fishingHud');if(fh)fh.classList.remove('active');
  let bb=document.getElementById('bottomBar');if(bb)bb.classList.add('hidden');
  let li=document.getElementById('levelIndicator');if(li)li.style.display='none';
  let pd=document.getElementById('pityDisplay');if(pd)pd.style.display='none';
  let hb=document.getElementById('hudBuffs');if(hb)hb.style.display='none';
  let gt=document.getElementById('gameTitle');if(gt)gt.style.display='none';
  adv.timeOfDay=getTimeOfDay();
  // 只加 hidden 类、不写 inline display:none，避免离开种鱼后 startAdventure 只移除 class 仍被 inline 样式挡住
  let gui=document.getElementById('gameUI');if(gui){gui.classList.add('hidden');gui.style.display='';}
  // 补充装饰性游鱼（若从菜单进入则鱼群为空）
  if(!fishes.length){for(let i=0;i<8;i++){let f=FISH_POOL[Math.floor(Math.random()*FISH_POOL.length)];let dir=Math.random()>0.5?1:-1;fishes.push({fish:f,dir:dir,speed:(28+Math.random()*152)*dir,size:f.w[0]+Math.random()*(f.w[1]-f.w[0])*0.5,color:f.c,emoji:f.e,y:H*WL+H*0.04+Math.random()*H*0.3,x:Math.random()*W,alive:true,wobble:Math.random()*Math.PI*2,depth:0.3+Math.random()*0.7,alpha:0.3+Math.random()*0.4});}}
  let ov=document.getElementById('gardenOverlay');
  if(ov){ov.classList.remove('hidden');ov.style.display='';ov.classList.add('active');} // 必须清掉 hidden（display:none!important 会盖住 active）
  gardenBuild();updateGardenUI();
  // 首次进入（或刚解锁）自动弹玩法教学
  if(!G.gardenTutSeen||G.gardenTutPending){
    setTimeout(()=>{if(G.gardenMode)openGardenTutorial(true);},420);
  }
}
function closeGardenMode(){
  G.gardenMode=false;
  let to=document.getElementById('gardenTutOverlay');if(to)to.classList.remove('active');
  let ov=document.getElementById('gardenOverlay');if(ov)ov.classList.remove('active');
  let mb=document.getElementById('menuBackBtn');if(mb)mb.classList.remove('show');
  let gt=document.getElementById('gameTitle');if(gt)gt.style.display='';
  updateGardenCardUI();updateUI();
  openIslandHome(); // 关闭种鱼模式 → 回到小岛（主界面枢纽）
}
// 构建鱼塘 + 鱼苗背包 DOM
function gardenBuild(){
  let plotsEl=document.getElementById('gardenPlots');
  if(plotsEl){
    plotsEl.innerHTML='';
    for(let i=0;i<GARDEN_PLOTS;i++){
      let plot=G.gardenPlots[i];
      let div=document.createElement('div');div.className='gplot';div.id='gplot'+i;
      div.addEventListener('mouseenter',()=>gtutComplete('hover_plot'));
      if(plot){
        let fish=findFishById(plot.fishId);
        let p=gardenProgress(plot),ready=p>=1;
        plot._shownReady=ready;
        if(ready)div.classList.add('ready');
        div.style.setProperty('--swim',(3.2+(i%3)*0.6).toFixed(1)+'s');
        let bubbles='';
        for(let b=0;b<3;b++){
          bubbles+='<div class="gplot-bubble" style="left:'+(18+b*28)+'%;--bd:'+(2.4+b*0.5).toFixed(1)+'s;animation-delay:'+(b*0.8).toFixed(1)+'s"></div>';
        }
        div.innerHTML='<div class="gplot-pond"><div class="gplot-emoji">'+(fish?fishImgHtml(fish,'gplot-fish-img'):'🐟')+'</div>'+bubbles+'</div>'
          +'<div class="gplot-name">'+(fish?fish.n:'???')+'</div>'
          +'<div class="gplot-bar"><div class="gplot-fill" id="gplotFill'+i+'" style="width:'+(p*100).toFixed(1)+'%"></div></div>'
          +'<div class="gplot-time" id="gplotTime'+i+'">'+(ready?'✅ 可收获':('⏳ '+gardenRemainText(plot)))+'</div>';
        if(ready)div.onclick=()=>gardenHarvest(i);
      }else{
        div.classList.add('empty');
        div.innerHTML='<div class="gplot-emoji">➕</div><div class="gplot-name">空鱼塘</div><div class="gplot-time">点击右侧鱼苗种下</div>';
        div.onclick=()=>toast('点右侧的鱼苗即可种下','blue');
      }
      plotsEl.appendChild(div);
    }
  }
  let seedsEl=document.getElementById('gardenSeeds');
  if(seedsEl){
    seedsEl.innerHTML='';
    let list=seedlingList();
    if(!list.length){
      seedsEl.innerHTML='<div class="garden-empty">还没有鱼苗～<br>去冒险 / 闯关模式钓鱼，<br>每条鱼都会变成鱼苗！</div>';
    }else{
      list.forEach(item=>{
        let need=Math.ceil((GARDEN_PLOTS-G.gardenPlots.length)>0?1:0);
        let d=document.createElement('div');d.className='gseed';
        d.innerHTML='<span class="gseed-emoji">'+fishImgHtml(item.fish,'gseed-fish-img')+'</span><span class="gseed-name">'+item.fish.n+'</span><span class="gseed-count">×'+item.count+'</span>';
        d.title='成熟约需 '+growMinForFish(item.fish)+' 游戏分钟';
        d.onclick=()=>{gardenPlant(item.fish.id);gtutComplete('plant');};
        seedsEl.appendChild(d);
      });
    }
  }
}
// 每帧刷新（进度条 / 时钟 / 金币），结构变化时重建
function updateGardenUI(){
  let ov=document.getElementById('gardenOverlay');
  if(!ov||!ov.classList.contains('active'))return;
  let gc=document.getElementById('gardenClock');if(gc){let hm=clockHM();gc.textContent=getTimeEmoji(getTimeOfDay())+' '+hm.label;}
  let gcoin=document.getElementById('gardenCoins');if(gcoin)gcoin.textContent=G.coins.toLocaleString()+' 💰';
  let dirty=false;
  G.gardenPlots.forEach((plot,i)=>{
    let p=gardenProgress(plot),ready=p>=1;
    let fill=document.getElementById('gplotFill'+i);
    let tm=document.getElementById('gplotTime'+i);
    if(fill)fill.style.width=(p*100).toFixed(1)+'%';
    if(tm&&!ready)tm.textContent='⏳ '+gardenRemainText(plot);
    if(ready!==!!plot._shownReady){plot._shownReady=ready;dirty=true;}
  });
  if(dirty)gardenBuild();
}

// ===== 小岛「水塘」：种下的鱼在小岛下方的水里游动，点击收获后该鱼消失 =====
function islandFishPos(i,t){
  let bandTop=H*0.72, bandBot=H*0.93;
  let n=Math.max(1,GARDEN_PLOTS);
  let laneH=(bandBot-bandTop)/n;
  let p=G.gardenPlots[i];
  let f=p?findFishById(p.fishId):null;
  // 行为习性：大鱼慢、小鱼快（用最大体型 w[1] 推导速度系数）
  let speedF=1;
  if(f&&f.w){let maxW=f.w[1]||60;speedF=Math.max(0.45,Math.min(2.2,64/maxW));}
  let seed=(f&&f.w)?f.w[0]:(i*37);
  let phase=i*1.7+seed*0.013;
  // 每条鱼有独立活动中心与游动幅度，避免整齐划一
  let cx0=W*(0.20+0.60*((i*0.41+0.13)%1));
  let amp=W*(0.07+0.10*((i*0.27+0.07)%1));
  let swimSpd=0.18+0.22*speedF;
  let dir=(i%2===0)?1:-1;
  let tri=Math.sin(t*swimSpd*dir+phase);
  let x=cx0+tri*amp;
  // 自由起伏：两条不同频率正弦叠加，模拟自然上下浮动
  let vertSpd=0.5+0.7*speedF;
  let y=bandTop+laneH*(i+0.5)
      +Math.sin(t*vertSpd+phase*1.7)*laneH*0.20
      +Math.sin(t*vertSpd*0.47+phase)*laneH*0.10;
  // 当前横向速度方向（用于翻转朝向）
  let vx=Math.cos(t*swimSpd*dir+phase)*swimSpd*dir;
  let fdir=vx>=0?1:-1;
  let size=Math.max(22,Math.min(46,laneH*0.92));
  // 自由摆动（摆尾）：随游动轻微旋转 + 上下微摆
  let tail=Math.sin(t*vertSpd*2.2+phase)*0.12+Math.sin(t*swimSpd*3*dir+phase)*0.05;
  return {x:x,y:y,dir:fdir,size:size,tail:tail};
}
function drawIslandPondFish(){
  if(!G.gardenPlots||!G.gardenPlots.length)return;
  let t=islandAnimTime;
  for(let i=0;i<G.gardenPlots.length;i++){
    let p=G.gardenPlots[i];if(!p)continue;
    let f=findFishById(p.fishId);if(!f)continue;
    let pos=islandFishPos(i,t);
    let ready=gardenReady(p),prog=gardenProgress(p);
    cx.save();
    if(ready){cx.shadowColor='rgba(255,215,0,0.95)';cx.shadowBlur=20;}
    cx.font=Math.round(pos.size)+'px serif';
    cx.textAlign='center';cx.textBaseline='middle';
    cx.translate(pos.x,pos.y);
    if(pos.dir<0)cx.scale(-1,1);
    cx.rotate(pos.tail||0); // 自由摆动（摆尾）
    cx.fillText(f.e||'🐟',0,0);
    cx.restore();
    if(ready){
      cx.save();
      cx.font='bold '+Math.round(pos.size*0.5)+'px sans-serif';
      cx.textAlign='center';cx.textBaseline='bottom';
      cx.fillText('✅',pos.x,pos.y-pos.size*0.55);
      cx.fillStyle='#FFD700';cx.font='bold '+Math.round(pos.size*0.3)+'px sans-serif';
      cx.fillText('点我收获',pos.x,pos.y+pos.size*0.95);
      cx.restore();
    }else{
      let bw=pos.size*1.2,bh=5,bx=pos.x-bw/2,by=pos.y+pos.size*0.62;
      cx.save();
      cx.fillStyle='rgba(0,0,0,0.45)';cx.fillRect(bx,by,bw,bh);
      cx.fillStyle='#4FC3F7';cx.fillRect(bx,by,bw*prog,bh);
      cx.strokeStyle='rgba(255,255,255,0.5)';cx.lineWidth=1;cx.strokeRect(bx,by,bw,bh);
      cx.restore();
    }
  }
}
// 点击水里游的鱼：成熟则收获（收获后消失），未成熟则提示剩余时间
function islandWaterClick(mx,my){
  if(!G.gardenPlots||!G.gardenPlots.length)return false;
  let t=islandAnimTime;
  for(let i=0;i<G.gardenPlots.length;i++){
    let p=G.gardenPlots[i];if(!p)continue;
    let pos=islandFishPos(i,t);
    let r=Math.max(26,pos.size*0.65);
    if(Math.abs(mx-pos.x)<=r&&Math.abs(my-pos.y)<=r){
      if(gardenReady(p))gardenHarvest(i);
      else{let f=findFishById(p.fishId);toast('🐠 '+(f?f.n:'这条鱼')+' 还没成熟，还需 '+gardenRemainText(p),'blue');}
      return true;
    }
  }
  return false;
}

// ============ 岛屿渲染 ============
function renderIsland(){
  let t=islandAnimTime;
  let w=W,h=H;
  let tod=adv.timeOfDay||getTimeOfDay(adv.day||1); // morning/noon/evening/night
  
  // ===== 1. 天空 - 根据时间变化 =====
  let skyG=cx.createLinearGradient(0,0,0,h*0.65);
  if(tod==='morning'){
    // 🌅 早晨：粉紫渐变到金色
    skyG.addColorStop(0,'#7c3aed');
    skyG.addColorStop(0.2,'#a78bfa');
    skyG.addColorStop(0.4,'#f9a8d4');
    skyG.addColorStop(0.6,'#fbbf24');
    skyG.addColorStop(0.85,'#fde68a');
    skyG.addColorStop(1,'#fdf4b0');
  }else if(tod==='noon'){
    // ☀️ 正午：明亮蓝天
    skyG.addColorStop(0,'#1e8fff');
    skyG.addColorStop(0.25,'#38bdf8');
    skyG.addColorStop(0.5,'#7dd3fc');
    skyG.addColorStop(0.75,'#bae6fd');
    skyG.addColorStop(1,'#e0f2fe');
  }else if(tod==='afternoon'){
    // 🌤️ 下午：偏暖的蓝天，金色渐强
    skyG.addColorStop(0,'#1e7fd6');
    skyG.addColorStop(0.25,'#38a8e8');
    skyG.addColorStop(0.5,'#7cc5f0');
    skyG.addColorStop(0.75,'#c8e6a0');
    skyG.addColorStop(1,'#fde9a0');
  }else if(tod==='evening'){
    // 🌆 傍晚：橙红金黄
    skyG.addColorStop(0,'#7c2d12');
    skyG.addColorStop(0.2,'#c2410c');
    skyG.addColorStop(0.4,'#ea580c');
    skyG.addColorStop(0.6,'#f97316');
    skyG.addColorStop(0.8,'#fb923c');
    skyG.addColorStop(1,'#fbbf24');
  }else{
    // 🌙 夜晚：深蓝紫
    skyG.addColorStop(0,'#0f0f3d');
    skyG.addColorStop(0.25,'#1a1055');
    skyG.addColorStop(0.5,'#1e1b6b');
    skyG.addColorStop(0.75,'#1e3a5f');
    skyG.addColorStop(1,'#1e4a6f');
  }
  cx.fillStyle=skyG;
  cx.fillRect(0,0,w,h*0.65);
  
  // ===== 2. 太阳/月亮 =====
  if(tod==='night'){
    // 夜晚：画月亮和星星
    let mx=w*0.45,my=h*0.2,mr=Math.min(w,h)*0.07;
    // 月光辉
    let moonG=cx.createRadialGradient(mx,my,mr*0.3,mx,my,mr*2.5);
    moonG.addColorStop(0,'rgba(255,255,240,0.5)');
    moonG.addColorStop(0.4,'rgba(200,200,230,0.2)');
    moonG.addColorStop(0.7,'rgba(150,170,220,0.05)');
    moonG.addColorStop(1,'rgba(0,0,0,0)');
    cx.fillStyle=moonG;
    cx.beginPath();cx.arc(mx,my,mr*2.5,0,Math.PI*2);cx.fill();
    // 月亮本体
    cx.fillStyle='#fef9c3';
    cx.beginPath();cx.arc(mx,my,mr,0,Math.PI*2);cx.fill();
    cx.fillStyle='#fef08a';
    cx.beginPath();cx.arc(mx+mr*0.15,my-mr*0.1,mr*0.85,0,Math.PI*2);cx.fill();
    // 星星
    for(let si=0;si<35;si++){
      let sx=(si*73+31)%w,sy=(si*47+19)%(h*0.5);
      let twinkle=0.4+Math.sin(t*2+si*1.7)*0.35;
      cx.fillStyle=`rgba(255,255,240,${twinkle})`;
      cx.beginPath();cx.arc(sx,sy,0.8+Math.random()*1.2,0,Math.PI*2);cx.fill();
      // 大星星有十字光芒
      if(si%7===0){
        cx.strokeStyle=`rgba(255,255,240,${twinkle*0.5})`;cx.lineWidth=0.5;
        cx.beginPath();cx.moveTo(sx-3,sy);cx.lineTo(sx+3,sy);cx.stroke();
        cx.beginPath();cx.moveTo(sx,sy-3);cx.lineTo(sx,sy+3);cx.stroke();
      }
    }
  }else{
    // 白天：画太阳
    let sx,sy;
    if(tod==='morning'){sx=w*0.22,sy=h*0.28;} // 早晨太阳在东边低处
    else if(tod==='noon'){sx=w*0.5,sy=h*0.16;} // 正午太阳在头顶
    else if(tod==='afternoon'){sx=w*0.62,sy=h*0.2;} // 下午太阳偏西
    else{sx=w*0.72,sy=h*0.25;} // 傍晚太阳在西边低处
    let sr=Math.min(w,h)*0.1;
    let sunG=cx.createRadialGradient(sx,sy,sr*0.2,sx,sy,sr*2.2);
    if(tod==='morning'){
      sunG.addColorStop(0,'rgba(255,240,200,0.95)');
      sunG.addColorStop(0.3,'rgba(255,200,130,0.7)');
      sunG.addColorStop(0.6,'rgba(255,150,80,0.2)');
      sunG.addColorStop(1,'rgba(255,120,50,0)');
    }else if(tod==='noon'){
      sunG.addColorStop(0,'rgba(255,255,255,0.95)');
      sunG.addColorStop(0.25,'rgba(255,255,230,0.7)');
      sunG.addColorStop(0.6,'rgba(200,230,255,0.15)');
      sunG.addColorStop(1,'rgba(150,200,255,0)');
    }else if(tod==='afternoon'){
      sunG.addColorStop(0,'rgba(255,250,220,0.95)');
      sunG.addColorStop(0.3,'rgba(255,220,150,0.7)');
      sunG.addColorStop(0.6,'rgba(255,170,90,0.2)');
      sunG.addColorStop(1,'rgba(220,120,40,0)');
    }else{
      sunG.addColorStop(0,'rgba(255,220,150,0.95)');
      sunG.addColorStop(0.3,'rgba(255,180,100,0.7)');
      sunG.addColorStop(0.6,'rgba(255,130,50,0.2)');
      sunG.addColorStop(1,'rgba(200,80,20,0)');
    }
    cx.fillStyle=sunG;
    cx.beginPath();cx.arc(sx,sy,sr*2.2,0,Math.PI*2);cx.fill();
    let sunCore= tod==='noon'?'rgba(255,255,250,0.9)':tod==='morning'?'rgba(255,245,200,0.85)':tod==='afternoon'?'rgba(255,248,210,0.85)':'rgba(255,230,170,0.85)';
    cx.fillStyle=sunCore;
    cx.beginPath();cx.arc(sx,sy,sr,0,Math.PI*2);cx.fill();
  }
  
  // ===== 3. 云彩 =====
  let cloudAlpha=tod==='night'?0.08:tod==='evening'?0.35:tod==='morning'?0.45:0.55;
  let cloudColor=tod==='night'?'rgba(200,200,220,':tod==='evening'?'rgba(255,220,180,':'rgba(255,255,255,';
  function drawCloud(cx2,cy2,cs){
    cx.fillStyle=cloudColor+cloudAlpha+')';
    cx.beginPath();cx.arc(cx2,cy2,cs*0.45,0,Math.PI*2);cx.fill();
    cx.beginPath();cx.arc(cx2+cs*0.5,cy2-cs*0.15,cs*0.35,0,Math.PI*2);cx.fill();
    cx.beginPath();cx.arc(cx2-cs*0.45,cy2+cs*0.05,cs*0.32,0,Math.PI*2);cx.fill();
    cx.beginPath();cx.arc(cx2+cs*0.2,cy2+cs*0.15,cs*0.28,0,Math.PI*2);cx.fill();
  }
  if(tod!=='night'){
    drawCloud(w*0.15+Math.sin(t*0.3)*15,h*0.12,Math.min(w,h)*0.08);
    drawCloud(w*0.65+Math.cos(t*0.25)*20,h*0.08,Math.min(w,h)*0.07);
    drawCloud(w*0.5+Math.sin(t*0.35)*18,h*0.18,Math.min(w,h)*0.06);
    drawCloud(w*0.85+Math.cos(t*0.4)*12,h*0.15,Math.min(w,h)*0.055);
  }
  
  // 4. 远山背景
  cx.fillStyle='rgba(120,160,140,0.4)';
  cx.beginPath();cx.moveTo(0,h*0.55);
  cx.quadraticCurveTo(w*0.2,h*0.4,w*0.35,h*0.47);
  cx.quadraticCurveTo(w*0.5,h*0.38,w*0.65,h*0.46);
  cx.quadraticCurveTo(w*0.8,h*0.42,w,h*0.5);
  cx.lineTo(w,h*0.65);cx.lineTo(0,h*0.65);cx.fill();
  
  // ===== 5. 海洋 =====
  let waterY=h*0.58;
  let ocnG=cx.createLinearGradient(0,waterY,0,h);
  if(tod==='night'){
    ocnG.addColorStop(0,'#1a3a5c');
    ocnG.addColorStop(0.15,'#122a4a');
    ocnG.addColorStop(0.4,'#0a1a33');
    ocnG.addColorStop(0.7,'#060f22');
    ocnG.addColorStop(1,'#040a18');
  }else if(tod==='evening'){
    ocnG.addColorStop(0,'#7c9bc0');
    ocnG.addColorStop(0.15,'#5b7fa5');
    ocnG.addColorStop(0.4,'#3b5d8a');
    ocnG.addColorStop(0.7,'#1e3a5f');
    ocnG.addColorStop(1,'#0f2440');
  }else if(tod==='morning'){
    ocnG.addColorStop(0,'#7dd3fc');
    ocnG.addColorStop(0.15,'#38bdf8');
    ocnG.addColorStop(0.4,'#0ea5e9');
    ocnG.addColorStop(0.7,'#0284c7');
    ocnG.addColorStop(1,'#0369a1');
  }else{
    ocnG.addColorStop(0,'#38bdf8');
    ocnG.addColorStop(0.15,'#0ea5e9');
    ocnG.addColorStop(0.4,'#0284c7');
    ocnG.addColorStop(0.7,'#0369a1');
    ocnG.addColorStop(1,'#075985');
  }
  cx.fillStyle=ocnG;
  cx.fillRect(0,waterY,w,h-waterY);
  
  // 波浪（夜晚更暗）
  let waveAlpha=tod==='night'?0.06:tod==='evening'?0.12:0.18;
  cx.strokeStyle=`rgba(255,255,255,${waveAlpha})`;
  cx.lineWidth=1.5;
  for(let i=0;i< w;i+=35){
    let wx=i+t*20%35;
    cx.beginPath();
    for(let x=wx;x<wx+45;x+=4){
      let wy=waterY+Math.sin(x*0.06+t*2+i*0.05)*5;
      if(x===wx)cx.moveTo(x,wy);else cx.lineTo(x,wy);
    }
    cx.stroke();
  }
  
  // 海浪泡沫线
  let foamAlpha=tod==='night'?0.08:tod==='evening'?0.18:0.25;
  cx.strokeStyle=`rgba(255,255,255,${foamAlpha})`;
  cx.lineWidth=2;
  cx.beginPath();
  for(let x=0;x<=w;x+=3){
    let fy=waterY+Math.sin(x*0.04+t*1.8)*3+Math.sin(x*0.1+t*3)*2;
    if(x===0)cx.moveTo(x,fy);else cx.lineTo(x,fy);
  }
  cx.stroke();
  
  // 海面闪光（夜晚少）
  let sparkCount=tod==='night'?4:12;
  for(let i=0;i<sparkCount;i++){
    let spx=(i*83+t*8)%w,spy=waterY+5+(i*13%45);
    let alpha=(tod==='night'?0.1:0.3)+Math.sin(t*3+i)*0.2;
    cx.fillStyle=`rgba(255,255,255,${alpha})`;
    cx.fillRect(spx,spy,2+Math.random()*3,1);
  }
  
  // ===== 6. 沙滩 =====
  let beachY=h*0.64;
  let sandG=cx.createLinearGradient(0,beachY,0,beachY+65);
  if(tod==='night'){
    sandG.addColorStop(0,'#4a4a3a');
    sandG.addColorStop(0.3,'#3a3a2a');
    sandG.addColorStop(0.7,'#2a2a1a');
    sandG.addColorStop(1,'#1a1a0a');
  }else if(tod==='evening'){
    sandG.addColorStop(0,'#e8c16e');
    sandG.addColorStop(0.3,'#d4a03a');
    sandG.addColorStop(0.7,'#b87820');
    sandG.addColorStop(1,'#8a5a0a');
  }else{
    sandG.addColorStop(0,'#fde68a');
    sandG.addColorStop(0.3,'#fcd34d');
    sandG.addColorStop(0.7,'#f59e0b');
    sandG.addColorStop(1,'#d97706');
  }
  cx.fillStyle=sandG;
  cx.beginPath();
  cx.moveTo(0,beachY+15);
  cx.quadraticCurveTo(w*0.15,beachY-8,w*0.3,beachY);
  cx.quadraticCurveTo(w*0.45,beachY+8,w*0.55,beachY+5);
  cx.quadraticCurveTo(w*0.7,beachY-5,w*0.82,beachY+10);
  cx.quadraticCurveTo(w*0.92,beachY+5,w,beachY);
  cx.lineTo(w,beachY+65);cx.lineTo(0,beachY+65);cx.fill();
  
  // 沙滩纹理
  let sandTexAlpha=tod==='night'?0.1:0.3;
  cx.fillStyle=`rgba(251,191,36,${sandTexAlpha})`;
  for(let i=0;i<30;i++){
    let bx=(i*97)%w,by=beachY+10+(i*31%55);
    cx.beginPath();cx.ellipse(bx,by,12,2,Math.sin(i)*0.2,0,Math.PI*2);cx.fill();
  }
  
  // ===== 7. 草地 =====
  let grassY=beachY-5;
  let grassG=cx.createLinearGradient(0,grassY-20,0,grassY+10);
  if(tod==='night'){
    grassG.addColorStop(0,'#2d5a1e');
    grassG.addColorStop(0.5,'#1e3d14');
    grassG.addColorStop(1,'#12280a');
  }else if(tod==='evening'){
    grassG.addColorStop(0,'#3a9a3a');
    grassG.addColorStop(0.5,'#228b22');
    grassG.addColorStop(1,'#1a6b1a');
  }else{
    grassG.addColorStop(0,'#4ade80');
    grassG.addColorStop(0.5,'#22c55e');
    grassG.addColorStop(1,'#16a34a');
  }
  cx.fillStyle=grassG;
  cx.beginPath();
  cx.moveTo(w*0.3,beachY);
  cx.quadraticCurveTo(w*0.35,grassY-8,w*0.42,grassY+2);
  cx.quadraticCurveTo(w*0.5,grassY-12,w*0.55,grassY);
  cx.quadraticCurveTo(w*0.6,grassY-5,w*0.68,grassY+4);
  cx.quadraticCurveTo(w*0.72,grassY-3,w*0.8,beachY);
  cx.lineTo(w*0.3,beachY);cx.fill();
  
  // 小草丛
  let grassRMin=tod==='night'?60:34,grassRMax=tod==='night'?80:74;
  let grassGMin=tod==='night'?140:180,grassGMax=tod==='night'?160:240;
  let grassBMin=tod==='night'?30:60,grassBMax=tod==='night'?50:100;
  for(let i=0;i<40;i++){
    let gx=w*0.3+(i*0.012*w),gy=grassY-2+Math.sin(i*1.7)*8;
    cx.strokeStyle=`rgba(${grassRMin+Math.random()*(grassRMax-grassRMin)},${grassGMin+Math.random()*(grassGMax-grassGMin)},${grassBMin+Math.random()*(grassBMax-grassBMin)},0.7)`;
    cx.lineWidth=1.2;
    cx.beginPath();cx.moveTo(gx,gy);cx.quadraticCurveTo(gx-3+Math.sin(i)*3,gy-10,gx+1,gy-14+Math.sin(t*2+i)*3);cx.stroke();
  }
  
  // ===== 8. 小木屋 =====
  let hutX=w*0.42,hutY=grassY-50,hutW=50,hutH=38;
  // 屋身
  cx.fillStyle=tod==='night'?'#5a2a0a':'#92400e';
  cx.fillRect(hutX,hutY,hutW,hutH);
  cx.fillStyle=tod==='night'?'#6a300a':'#b45309';
  cx.fillRect(hutX+1,hutY+1,hutW-2,hutH-2);
  // 木纹
  cx.strokeStyle='rgba(146,64,14,0.4)';
  cx.lineWidth=1;
  for(let ly=hutY+5;ly<hutY+hutH;ly+=8){
    cx.beginPath();cx.moveTo(hutX,ly);cx.lineTo(hutX+hutW,ly);cx.stroke();
  }
  // 屋顶
  cx.fillStyle=tod==='night'?'#3a1a0a':'#7c2d12';
  cx.beginPath();cx.moveTo(hutX-8,hutY);cx.lineTo(hutX+hutW/2,hutY-22);cx.lineTo(hutX+hutW+8,hutY);cx.fill();
  // 屋顶纹理
  cx.strokeStyle='rgba(0,0,0,0.2)';
  let roofPeakX=hutX+hutW/2, roofPeakY=hutY-22;
  for(let rx=hutX-6;rx<hutX+hutW+8;rx+=7){
    let roofY=rx<=roofPeakX?hutY+(roofPeakY-hutY)*(rx-(hutX-8))/(roofPeakX-(hutX-8)):roofPeakY+(hutY-roofPeakY)*(rx-roofPeakX)/((hutX+hutW+8)-roofPeakX);
    cx.beginPath();cx.moveTo(rx,roofY);cx.lineTo(rx+2,roofY+2);cx.stroke();
  }
  // 烟囱
  cx.fillStyle='#78716c';
  cx.fillRect(hutX+30,hutY-18,8,18);
  // 烟
  for(let sm=0;sm<3;sm++){
    let sax=hutX+34+Math.cos(t+sm)*3,say=hutY-20-sm*8+Math.sin(t*1.3+sm)*4;
    cx.fillStyle=`rgba(180,180,180,${0.25-sm*0.07})`;
    cx.beginPath();cx.arc(sax,say,4+sm*2,0,Math.PI*2);cx.fill();
  }
  // 窗户 — 夜晚有温暖光晕
  if(tod==='night'){
    let windowGlow=cx.createRadialGradient(hutX+14,hutY+15,2,hutX+14,hutY+15,22);
    windowGlow.addColorStop(0,'rgba(255,200,100,0.7)');
    windowGlow.addColorStop(0.5,'rgba(255,180,50,0.3)');
    windowGlow.addColorStop(1,'rgba(255,150,20,0)');
    cx.fillStyle=windowGlow;
    cx.beginPath();cx.arc(hutX+14,hutY+15,22,0,Math.PI*2);cx.fill();
    cx.fillStyle='#fef08a';
  }else{
    cx.fillStyle='#fef3c7';
  }
  cx.fillRect(hutX+8,hutY+8,12,14);
  cx.strokeStyle=tod==='night'?'#fbbf24':'#7c2d12';cx.lineWidth=2;
  cx.strokeRect(hutX+8,hutY+8,12,14);
  cx.strokeRect(hutX+14,hutY+8,0,14);
  // 门
  cx.fillStyle='#78350f';
  cx.fillRect(hutX+28,hutY+12,14,hutH-12);
  cx.strokeStyle='#451a03';
  cx.strokeRect(hutX+28,hutY+12,14,hutH-12);
  cx.fillStyle='#fbbf24'; // 门把手
  cx.beginPath();cx.arc(hutX+38,hutY+28,2,0,Math.PI*2);cx.fill();
  
  // 9. 码头
  let dockX=w*0.6,dockY=beachY-2;
  cx.fillStyle='#78350f';
  cx.fillRect(dockX,dockY,18,50);
  cx.fillRect(dockX+20,dockY+8,18,42);
  cx.fillRect(dockX+40,dockY+16,14,34);
  // 码头木纹
  cx.strokeStyle='rgba(0,0,0,0.25)';
  cx.lineWidth=1;
  [dockX,dockX+20,dockX+40].forEach(dx=>{
    let dl=dockY+(dx===dockX?0:dx<=dockX+20?8:16),
        dh=dx===dockX?50:dx<=dockX+20?42:34;
    for(let y=dl+5;y<dl+dh;y+=7){cx.beginPath();cx.moveTo(dx,y);cx.lineTo(dx+(dx<dockX+30?18:14),y);cx.stroke();}
  });
  // 码头柱
  cx.fillStyle='#451a03';
  cx.fillRect(dockX-2,dockY+46,4,12);
  cx.fillRect(dockX+16,dockY+46,4,12);
  cx.fillRect(dockX+20-2,dockY+46,4,10);
  cx.fillRect(dockX+38,dockY+46,4,10);
  
  // 10. 棕榈树
  function drawPalm(px,py,ps){
    // 树干
    let trunkW=ps*0.15;
    cx.fillStyle='#92400e';
    cx.beginPath();
    cx.moveTo(px-trunkW,py+ps*1.1);
    cx.quadraticCurveTo(px-trunkW*0.6,py-trunkW*0.5,px,py-ps*0.4);
    cx.quadraticCurveTo(px+trunkW*0.6,py-trunkW*0.5,px+trunkW,py+ps*1.1);
    cx.fill();
    // 树干纹理
    cx.strokeStyle='rgba(120,60,10,0.5)';cx.lineWidth=1;
    for(let i=0;i<6;i++){
      let sy2=py+ps*0.5+i*ps*0.1;
      let sw=trunkW*(1-(i/8));
      cx.beginPath();cx.moveTo(px-sw,sy2);cx.lineTo(px+sw,sy2);cx.stroke();
    }
    // 树叶（椰子树冠）
    let leafY=py-ps*0.38;
    for(let l=0;l<6;l++){
      let angle=l*Math.PI/3+Math.sin(t*1.5+l)*0.12;
      let leafLen=ps*0.45;
      cx.strokeStyle='#22c55e';cx.lineWidth=2.5;
      cx.beginPath();
      cx.moveTo(px,leafY);
      let mx=px+Math.cos(angle)*leafLen*0.6;
      let my=leafY+Math.sin(angle)*leafLen*0.5-leafLen*0.15;
      let ex=px+Math.cos(angle)*leafLen;
      let ey=leafY+Math.sin(angle)*leafLen-leafLen*0.3;
      cx.quadraticCurveTo(mx,my,ex,ey);
      cx.stroke();
      // 小叶片
      cx.strokeStyle='#4ade80';cx.lineWidth=1;
      for(let s=0.2;s<1;s+=0.15){
        let lx=px+Math.cos(angle)*leafLen*s;
        let ly=leafY+Math.sin(angle)*leafLen*s-leafLen*0.2*s;
        cx.beginPath();
        cx.moveTo(lx,ly);
        cx.lineTo(lx+Math.cos(angle+1)*7,ly+Math.sin(angle+1)*7);
        cx.stroke();
      }
    }
    // 椰子
    cx.fillStyle='#78350f';
    cx.beginPath();cx.arc(px+2,leafY+4,ps*0.07,0,Math.PI*2);cx.fill();
    cx.beginPath();cx.arc(px-3,leafY+6,ps*0.06,0,Math.PI*2);cx.fill();
  }
  drawPalm(w*0.22,beachY-15,38);
  drawPalm(w*0.28,beachY-2,30);
  drawPalm(w*0.72,beachY+5,34);
  
  // 11. 小树/灌木
  function drawBush(bx2,by2,bs2){
    for(let c=0;c<3;c++){
      cx.fillStyle=`rgba(${34+c*15},${180+c*15},${70+c*20},0.8)`;
      cx.beginPath();
      cx.arc(bx2+(c-1)*bs2*0.3,by2-bs2*0.35+c*bs2*0.12,bs2*(0.35-c*0.08),0,Math.PI*2);
      cx.fill();
    }
  }
  drawBush(w*0.38,grassY-8,20);
  drawBush(w*0.58,grassY-5,16);
  drawBush(w*0.64,grassY-10,22);
  drawBush(w*0.24,grassY-3,14);
  
  // 12. 花朵
  for(let fl=0;fl<12;fl++){
    let fx=w*0.32+fl*0.03*w,fy=grassY-4+Math.sin(fl*2.1)*10;
    cx.fillStyle=['#f43f5e','#fbbf24','#ec4899','#f97316','#ef4444'][fl%5];
    cx.beginPath();cx.arc(fx,fy,2.5,0,Math.PI*2);cx.fill();
    cx.fillStyle='#fef08a';
    cx.beginPath();cx.arc(fx,fy,1,0,Math.PI*2);cx.fill();
  }
  
  // ===== 13. 海鸟（夜晚不飞）=====
  if(tod!=='night'){
    for(let b=0;b<4;b++){
      let bx3=(w*0.5+b*80+t*25)%(w+200)-100,by3=h*0.15+b*20+Math.sin(t+b)*8;
      let birdAlpha=tod==='evening'?0.35:0.5;
      cx.strokeStyle=`rgba(30,30,30,${birdAlpha})`;cx.lineWidth=1.5;
      let wingAngle=Math.sin(t*3+b)*0.4;
      cx.beginPath();cx.moveTo(bx3-5,by3);cx.quadraticCurveTo(bx3-3,by3-3-wingAngle*6,bx3,by3);cx.stroke();
      cx.beginPath();cx.moveTo(bx3+5,by3);cx.quadraticCurveTo(bx3+3,by3-3-wingAngle*6,bx3,by3);cx.stroke();
    }
  }
  
  // 14. 路径（小屋到码头）
  cx.fillStyle='rgba(217,169,110,0.5)';
  cx.beginPath();
  cx.moveTo(hutX+hutW/2,hutY+hutH);
  cx.quadraticCurveTo((hutX+hutW/2+dockX+9)/2,grassY+25,dockX+9,grassY+18);
  cx.lineTo(dockX+27,grassY+14);
  cx.quadraticCurveTo((hutX+hutW/2+dockX+9)/2,grassY+18,hutX+hutW/2,hutY+hutH);
  cx.fill();
  
  // 15. 小篱笆
  cx.strokeStyle='rgba(120,80,20,0.6)';cx.lineWidth=2;
  for(let fi=0;fi<5;fi++){
    let fx2=w*0.31+fi*5, fy2=grassY+2+fi*2;
    cx.beginPath();cx.moveTo(fx2,fy2);cx.lineTo(fx2,fy2-9);cx.stroke();
  }
  cx.beginPath();cx.moveTo(w*0.31,grassY-4);cx.lineTo(w*0.31+24,grassY-2);cx.stroke();
  
  // ===== 16. 标题文字 =====
  let titleAlpha=tod==='night'?0.6:0.9;
  cx.fillStyle=`rgba(255,255,255,${titleAlpha})`;
  cx.font=`bold ${Math.min(w*0.055,28)}px "Microsoft YaHei","PingFang SC",sans-serif`;
  cx.textAlign='center';
  cx.shadowColor='rgba(0,0,0,0.6)';cx.shadowBlur=8;
  let titleText=tod==='night'?'🌙 夜色小岛':tod==='morning'?'🌅 晨曦小岛':tod==='afternoon'?'🌤️ 午后小岛':tod==='evening'?'🌆 黄昏小岛':'🏝️ 钓鱼小岛';
  cx.fillText(titleText,w*0.5,h*0.07);
  cx.shadowBlur=0;
  
  // ===== 17. 小屋前的标牌 =====
  cx.fillStyle='rgba(101,67,33,0.9)';
  cx.fillRect(w*0.44,grassY-14,16,8);
  cx.fillStyle='#fff';
  cx.font='6px sans-serif';
  cx.fillText('家',w*0.44+8,grassY-7);
  
  // ===== 18. 夜晚暗色覆盖层 =====
  if(tod==='night'){
    cx.fillStyle='rgba(5,5,30,0.35)';
    cx.fillRect(0,0,w,h);
  }
}

// ============ 岛屿休整系统 ============
function returnHome(){
  if(!adv.active||adv.gameOver)return;
  G.islandMode=true;
  // 如果游戏暂停了，先取消暂停并隐藏暂停遮罩
  if(G.paused){
    G.paused=false;
    let po=document.getElementById('pauseOverlay');if(po)po.classList.remove('active');
    lastTime=0;
  }
  // 隐藏所有钓鱼UI和可能遮挡画面的遮罩（安全取值，null检查）
  let po2=document.getElementById('pauseOverlay');if(po2)po2.classList.remove('active');
  let bb=document.getElementById('bottomBar');if(bb)bb.classList.add('hidden');
  let ah=document.getElementById('fishingHud');if(ah)ah.classList.remove('active');
  let pd=document.getElementById('pityDisplay');if(pd)pd.style.display='none';
  let hb=document.getElementById('hudBuffs');if(hb)hb.style.display='none';
  let gt=document.getElementById('gameTitle');if(gt)gt.style.display='none';
  let gui=document.getElementById('gameUI');if(gui){gui.classList.add('hidden');gui.style.display='none';}
  let ro=document.getElementById('resultsOverlay');if(ro)ro.classList.remove('active');
  let li=document.getElementById('levelIndicator');if(li)li.style.display='none';
  // 更新当日时间
  adv.timeOfDay=getTimeOfDay(adv.day);
  // 显示岛屿界面
  let its=document.getElementById('islandTimeStop');if(its)its.style.display='block';
  let iol=document.getElementById('islandOverlay');if(iol)iol.classList.add('active');
  let idd=document.getElementById('islandDay');if(idd)idd.textContent=adv.day;
  let itd=document.getElementById('islandTimeOfDay');if(itd)itd.textContent=getTimeEmoji(adv.timeOfDay)+' '+getTimeName(adv.timeOfDay);
  let icn=document.getElementById('islandCoins');if(icn)icn.textContent=G.coins.toLocaleString();
  let icl=document.getElementById('islandClock');if(icl)icl.textContent={morning:'06:00',noon:'12:00',afternoon:'15:00',evening:'18:00',night:'22:00'}[adv.timeOfDay]||'12:00';
  adv.islandTab='';
  refreshIslandUI();
  updateIslandTabUI();
  configureIslandHomeButtons();
  maybeUnlockGardenOnIsland();
}

function closeIsland(){
  G.islandMode=false;
  let its2=document.getElementById('islandTimeStop');if(its2)its2.style.display='none';
  let iol2=document.getElementById('islandOverlay');if(iol2)iol2.classList.remove('active');
  // 恢复所有钓鱼UI（安全取值）
  let bb2=document.getElementById('bottomBar');if(bb2)bb2.classList.remove('hidden');
  let ah2=document.getElementById('fishingHud');if(ah2)ah2.classList.add('active');
  let gui2=document.getElementById('gameUI');if(gui2){gui2.classList.remove('hidden');gui2.style.display='';}
  let gtm=document.getElementById('gtbModeTitle');if(gtm)gtm.textContent='🎣 冒险模式';
  let li2=document.getElementById('levelIndicator');if(li2)li2.style.display='';
}

// ============ 小岛 = 主界面（高自由 hub）============
// 主界面就是小岛：可种菜/出海钓鱼/啥也不干；时间暂停
function openIslandHome(){
  G.islandMode=true;
  G.gardenMode=false;
  gameMode='';
  if(G.paused){G.paused=false;let po=document.getElementById('pauseOverlay');if(po)po.classList.remove('active');lastTime=0;}
  // 收起所有游戏内 UI 与遮罩
  // ⚠ 关键：靠 .active 显示的遮罩【绝不能加 hidden】—— .hidden 是 display:none!important，
  //    一旦加上，之后即使 add('active') 也永远显示不出来（选关页/揭示卡/图鉴/商店都会变成"点了没反应"）
  ['gardenOverlay','levelSelectOverlay','revealOverlay','resultsOverlay','albumOverlay',
   'itemShopOverlay','dailyOverlay','gardenTutOverlay','diveOverlay','fishingHud'].forEach(function(id){
    let e=document.getElementById(id);if(e){e.classList.remove('active');e.classList.remove('hidden');e.style.display='';}
  });
  // 这几个靠 .hidden 隐藏 / 靠 inline display 控制，保持原样
  ['gameUI','bottomBar','modePick'].forEach(function(id){
    let e=document.getElementById(id);if(e){e.classList.add('hidden');e.style.display='';}
  });
  let li=document.getElementById('levelIndicator');if(li)li.style.display='none';
  let pd=document.getElementById('pityDisplay');if(pd)pd.style.display='none';
  let hb=document.getElementById('hudBuffs');if(hb)hb.style.display='none';
  let fh=document.getElementById('fishingHud');if(fh)fh.classList.remove('active');
  let gt=document.getElementById('gameTitle');if(gt){gt.style.display='';gt.textContent='🎣 Next Bigger Catch';}
  // 显示小岛（时间暂停）
  let its=document.getElementById('islandTimeStop');if(its)its.style.display='block';
  let iol=document.getElementById('islandOverlay');if(iol)iol.classList.add('active');
  let idd=document.getElementById('islandDay');if(idd)idd.textContent='🏝️';
  let itd=document.getElementById('islandTimeOfDay');if(itd)itd.textContent='⏸ 时间暂停';
  let icn=document.getElementById('islandCoins');if(icn)icn.textContent=G.coins.toLocaleString();
  let ibc=document.getElementById('islandBagCount');if(ibc)ibc.textContent=(adv.fishBag?adv.fishBag.length:0);
  adv.islandTab='';
  refreshIslandUI();
  updateIslandTabUI();
  configureIslandHomeButtons();
  maybeUnlockGardenOnIsland();
}
// 小岛底部按钮：主界面显示「出海钓鱼」，冒险中显示「休息·回船上」
function configureIslandHomeButtons(){
  let home=!adv.active;
  let go=document.getElementById('islandGoFish');
  let rest=document.getElementById('islandRestBtn');
  let close=document.querySelector('#islandOverlay .island-close-btn');
  if(go)go.style.display=''; // 出海钓鱼入口常驻（保证回到小岛仍能进入钓鱼模式）
  if(rest)rest.style.display=home?'none':'';
  if(close)close.style.display=home?'none':'';
}
// 出海钓鱼：打开模式选择（默认推荐新手教学）
function goFishingFromIsland(){
  let iol=document.getElementById('islandOverlay');if(iol)iol.classList.remove('active');
  let its=document.getElementById('islandTimeStop');if(its)its.style.display='none';
  G.islandMode=false;
  let mp=document.getElementById('modePick');if(mp)mp.classList.remove('hidden');
  if(typeof updateGardenCardUI==='function')updateGardenCardUI();
}
// 小岛「种鱼」按钮：打开鱼苗面板，把钓到的鱼放进小岛下方的水里
function openIslandGarden(){
  if(!isGardenUnlocked()){
    toast('🔒 种鱼：在冒险或闯关模式成功钓鱼 '+GARDEN_UNLOCK_CAUGHT+' 次后解锁（'+G.totalCaught+'/'+GARDEN_UNLOCK_CAUGHT+'）','blue');
    return;
  }
  switchIslandTab('fishplant');
}
// 鱼苗面板：列出"钓到什么鱼就能种什么鱼"
function refreshSeedlingPanel(){
  let slots=document.getElementById('fishPlantSlots');if(!slots)return;
  slots.innerHTML='';
  if(!isGardenUnlocked()){
    slots.innerHTML='<div class="island-bag-info">🔒 还没解锁种鱼<br>去冒险 / 闯关钓到 1 条鱼，回小岛即可解锁</div>';
    return;
  }
  let list=seedlingList();
  if(!list.length){
    slots.innerHTML='<div class="island-bag-info">还没有鱼苗～<br>每钓到一条鱼都会变成一颗鱼苗！</div>';
    return;
  }
  let full=G.gardenPlots.length>=GARDEN_PLOTS;
  for(let item of list){
    let f=item.fish;if(!f)continue;
    let div=document.createElement('div');
    div.className='plant-slot';
    div.innerHTML='<span class="plant-slot-icon">'+(f.e||'🐟')+'</span>'
      +'<span class="plant-slot-info"><span class="plant-slot-name">'+f.n+' ×'+item.count+'</span>'
      +'<span class="plant-slot-desc">成熟约 '+growMinForFish(f)+' 游戏分钟</span></span>'
      +'<span class="plant-slot-cost">鱼苗</span>'
      +'<button class="plant-btn" '+(full?'disabled':'')+' onclick="gardenPlant(\''+f.id+'\')">'+(full?'水里满了':'🌊 放入水里')+'</button>';
    slots.appendChild(div);
  }
}
// 🏠 返回小岛（主界面）
function returnToIsland(){
  if(adv.active){ returnHome(); return; } // 冒险中：回家休整（保留进度）
  openIslandHome();
}

function processIslandHarvest(){
  // 处理种植收获
  let vegHarvest=0;
  adv.plantedVeg=adv.plantedVeg||[];
  let newVeg=[];
  for(let v of adv.plantedVeg){
    if(adv.day>=v.harvestDay){
      let reward=Math.floor(v.cost*1.5);
      G.coins+=reward;
      vegHarvest+=reward;
    }else{newVeg.push(v);}
  }
  adv.plantedVeg=newVeg;
  // 处理种鱼收获
  let fishHarvest=0;
  adv.plantedFish=adv.plantedFish||[];
  let newFish=[];
  for(let f of adv.plantedFish){
    if(adv.day>=f.harvestDay){
      G.coins+=f.value;
      fishHarvest+=f.value;
    }else{newFish.push(f);}
  }
  adv.plantedFish=newFish;
  let totalHarvest=vegHarvest+fishHarvest;
  if(totalHarvest>0)toast('🌿 岛上作物收获了！+'+totalHarvest.toLocaleString()+'💰','gold');
}

function switchIslandTab(tab){
  // 点击已激活的tab就关闭面板，否则切换
  if(tab&&adv.islandTab===tab){adv.islandTab='';}
  else adv.islandTab=tab||'';
  updateIslandTabUI();
  refreshIslandUI();
}

function updateIslandTabUI(){
  let detail=document.getElementById('islandDetail');
  let titles={'plant':'🌱 种菜','fishplant':'🐠 种鱼'};
  // 操作按钮
  ['plant','fishplant'].forEach(t=>{
    let btn=document.getElementById('islandAct'+(t==='fishplant'?'FishPlant':t.charAt(0).toUpperCase()+t.slice(1)));
    if(btn)btn.classList.toggle('active',adv.islandTab===t);
  });
  // 详情面板
  if(adv.islandTab){
    if(detail)detail.classList.add('show');
    let titleEl=document.getElementById('islandDetailTitle');
    if(titleEl)titleEl.textContent=titles[adv.islandTab]||'';
  }else{
    if(detail)detail.classList.remove('show');
  }
  // 面板显示/隐藏
  document.getElementById('panelPlant').classList.toggle('hidden',adv.islandTab!=='plant');
  document.getElementById('panelFishPlant').classList.toggle('hidden',adv.islandTab!=='fishplant');
  // 种鱼模式解锁状态（与种鱼模式统一：成功钓鱼 GARDEN_UNLOCK_CAUGHT 次解锁）
  let unlocked=isGardenUnlocked();
  let lock=document.getElementById('islandFishLock');
  if(lock)lock.style.display=unlocked?'none':'';
  let fishBtn=document.getElementById('islandActFishPlant');
  if(fishBtn){
    // 未解锁也保持可点击：点了给解锁提示，避免出现"点了没反应"
    if(!unlocked){fishBtn.style.opacity='0.55';fishBtn.style.pointerEvents='auto';}
    else{fishBtn.style.opacity='1';fishBtn.style.pointerEvents='auto';}
  }
  let fishInfo=document.getElementById('fishPlantInfo');
  if(fishInfo){
    fishInfo.innerHTML=isGardenUnlocked()
      ? '🐠 把鱼苗放进<b>小岛下方的水里</b>，它们会自己游动；<b>成熟后点击那条鱼即可收获</b>，收获后它会消失。'
      : '🔒 出海钓到 1 条鱼并回到小岛后解锁种鱼';
  }
}

function refreshIslandUI(){
  document.getElementById('islandCoins').textContent=G.coins.toLocaleString();
  // 背包鱼数
  let bagCount=adv.fishBag?adv.fishBag.length:0;
  document.getElementById('islandBagCount').textContent=bagCount;
  if(adv.islandTab==='plant')refreshPlantPanel();
  else if(adv.islandTab==='fishplant')refreshSeedlingPanel();
}



function refreshPlantPanel(){
  let slots=document.getElementById('plantSlots');
  let plants=[
    {id:'carrot',icon:'🥕',name:'胡萝卜',cost:100,desc:'2天后收获150💰',days:2,reward:150},
    {id:'corn',icon:'🌽',name:'玉米',cost:250,desc:'3天后收获400💰',days:3,reward:400},
    {id:'tomato',icon:'🍅',name:'番茄',cost:500,desc:'4天后收获800💰',days:4,reward:800},
  ];
  slots.innerHTML='';
  for(let p of plants){
    let div=document.createElement('div');
    div.className='plant-slot';
    // 检查是否已种植
    let planted=adv.plantedVeg.find(v=>v.type===p.id);
    if(planted){
      let remaining=planted.harvestDay-adv.day;
      let pct=Math.floor((1-remaining/p.days)*100);
      div.innerHTML='<span class="plant-slot-icon">'+p.icon+'</span><span class="plant-slot-info"><span class="plant-slot-name">'+p.name+'</span><span class="plant-slot-state">⏳ '+remaining+'天后收获</span><div class="plant-progress"><div class="plant-progress-bar" style="width:'+pct+'%"></div></div></span>';
    }else{
      let canAfford=G.coins>=p.cost;
      div.innerHTML='<span class="plant-slot-icon">'+p.icon+'</span><span class="plant-slot-info"><span class="plant-slot-name">'+p.name+'</span><span class="plant-slot-desc">'+p.desc+'</span></span><span class="plant-slot-cost">'+p.cost+'💰</span><button class="plant-btn" '+(canAfford?'':'disabled')+' onclick="plantVeg(\''+p.id+'\')">🌱 种植</button>';
    }
    slots.appendChild(div);
  }
}

function refreshFishPlantPanel(){
  if(!G.islandUnlocked)return;
  let slots=document.getElementById('fishPlantSlots');
  let fishPlants=[
    {id:'koi',icon:'🐟',name:'锦鲤鱼苗',cost:300,needFish:true,days:3,value:600,desc:'3天后收获600💰'},
    {id:'eel',icon:'🪸',name:'稀有鱼苗',cost:600,needFish:true,days:4,value:1200,desc:'4天后收获1200💰'},
  ];
  slots.innerHTML='';
  for(let f of fishPlants){
    let div=document.createElement('div');
    div.className='plant-slot';
    let planted=adv.plantedFish.find(p=>p.type===f.id);
    if(planted){
      let remaining=planted.harvestDay-adv.day;
      let pct=Math.floor((1-remaining/f.days)*100);
      div.innerHTML='<span class="plant-slot-icon">'+f.icon+'</span><span class="plant-slot-info"><span class="plant-slot-name">'+f.name+'</span><span class="plant-slot-state">⏳ '+remaining+'天后收获</span><div class="plant-progress"><div class="plant-progress-bar" style="width:'+pct+'%"></div></div></span>';
    }else{
      let canAfford=G.coins>=f.cost&&adv.fishBag&&adv.fishBag.length>0;
      div.innerHTML='<span class="plant-slot-icon">'+f.icon+'</span><span class="plant-slot-info"><span class="plant-slot-name">'+f.name+'</span><span class="plant-slot-desc">'+f.desc+'</span></span><span class="plant-slot-cost">'+f.cost+'💰 + 🐟</span><button class="plant-btn" '+(canAfford?'':'disabled')+' onclick="plantFishPlant(\''+f.id+'\')">🐠 种植</button>';
    }
    slots.appendChild(div);
  }
}

function plantVeg(type){
  let plants={carrot:{id:'carrot',cost:100,days:2,reward:150},corn:{id:'corn',cost:250,days:3,reward:400},tomato:{id:'tomato',cost:500,days:4,reward:800}};
  let p=plants[type];
  if(!p)return;
  if(G.coins<p.cost){toast('💰 金币不足！','gold');return;}
  G.coins-=p.cost;
  adv.plantedVeg.push({type:p.id,cost:p.cost,plantedDay:adv.day,harvestDay:adv.day+p.days,reward:p.reward});
  updateUI();
  refreshIslandUI();
  toast('🌱 '+type+'已种植！'+p.days+'天后可收获！','gold');
  gtutComplete('plant_veg');
  sfx_reveal_R();
}

function plantFishPlant(type){
  if(!G.islandUnlocked){toast('🔒 答对海神的谜题后解锁','blue');return;}
  let plants={koi:{id:'koi',cost:300,days:3,value:600},eel:{id:'eel',cost:600,days:4,value:1200}};
  let p=plants[type];
  if(!p)return;
  if(G.coins<p.cost){toast('💰 金币不足！','gold');return;}
  if(!adv.fishBag||adv.fishBag.length===0){toast('🐟 需要消耗至少一条鱼！','blue');return;}
  G.coins-=p.cost;
  // 消耗鱼包里最小的那条鱼
  adv.fishBag.sort((a,b)=>a.value-b.value);
  adv.fishBag.shift();
  adv.plantedFish.push({type:p.id,cost:p.cost,plantedDay:adv.day,harvestDay:adv.day+p.days,value:p.value});
  updateUI();
  refreshIslandUI();
  toast('🐠 鱼苗已种植！'+p.days+'天后可收获！','gold');
  gtutComplete('plant');
  sfx_reveal_SR();
}

function restAndNextDay(){
  G.islandMode=false;
  let its3=document.getElementById('islandTimeStop');if(its3)its3.style.display='none';
  let iol3=document.getElementById('islandOverlay');if(iol3)iol3.classList.remove('active');
  // 恢复钓鱼UI
  let bb3=document.getElementById('bottomBar');if(bb3)bb3.classList.remove('hidden');
  let ah3=document.getElementById('fishingHud');if(ah3)ah3.classList.add('active');
  let gui3=document.getElementById('gameUI');if(gui3){gui3.classList.remove('hidden');gui3.style.display='';}
  let gtm3=document.getElementById('gtbModeTitle');if(gtm3)gtm3.textContent='🎣 冒险模式';
  let li3=document.getElementById('levelIndicator');if(li3)li3.style.display='';
  endDay();
  // 如果游戏结束，显示结算
  if(adv.gameOver){
    if(adv.gameWin)showAdventureResult(true);
    else showAdventureResult(false);
  }
}

// ============ 暂停系统 ============
function togglePause(){
  G.paused=!G.paused;
  let ov=document.getElementById('pauseOverlay');
  if(G.paused){
    ov.classList.add('active');
    document.getElementById('pauseBtn').textContent='▶️';
    // 暂停图标随机换成一条鱼
    let pi=document.getElementById('pauseIcon');
    if(pi){ let f=FISH_POOL[Math.floor(Math.random()*FISH_POOL.length)]; pi.textContent=f.e; }
  }else{
    ov.classList.remove('active');
    document.getElementById('pauseBtn').textContent='⏸️';
    lastTime=0; // 重置时间防止跳帧
  }
}


// ============ 新手教程 ============
let tutorialSteps=[
  {icon:'👋',title:'欢迎来到《下一条鱼会更大》！',desc:'女神托付给你的魔力青蛙，要赚够 <b>100 万金币</b> 才能进化成<b>彩虹蛙</b>。<br>下面跟着提示亲手操作一遍就好～',action:'start'},
  {icon:'🖤',title:'水里有模糊的黑色鱼影',desc:'水面漂着缓慢游动的模糊黑鱼影，<b>点击鱼影即可抛竿</b>。鱼影大小只是倾向，不是答案，而且会一直游走，犹豫就没了。',action:'cast',hint:'🖱️ 现在点击水里的任意一个黑色鱼影，抛一竿试试！',highlight:'#gameCanvas'},
  {icon:'🌈',title:'落水水花预告稀有度',desc:'抛竿后<b>落水水花的颜色</b>就是鱼等级的最终预告：<br>'+
    '<span class="tt-chip" style="background:#4FC3F7">◆ 普通 ★★</span>'+
    '<span class="tt-chip" style="background:#AB47BC">◆ 稀有 ★★★</span>'+
    '<span class="tt-chip" style="background:#FFD700">◆ 珍贵 ★★★★</span>'+
    '<span class="tt-chip" style="background:#FF8F00">◆ 史诗 ★★★★★</span>'+
    '<span class="tt-chip" style="background:#EC407A">◆ 传说 ★★★★★★</span><br>'+
    '水花越亮、浮漂抖得越猛，鱼就越高级！',action:'start'},
  {icon:'🐸',title:'⭐核心：看青蛙反应预判鱼价！',desc:'把鼠标移到鱼影上，青蛙会"估价"告诉你这条鱼贵不贵：<br>'+
    '<span class="tt-chip" style="background:#78909C">❓ 疑问=普通货</span>'+
    '<span class="tt-chip" style="background:#66BB6A">😋 开心=不错</span>'+
    '<span class="tt-chip" style="background:#AB47BC">🤩 震惊=超贵！</span><br>'+
    '鱼越贵，青蛙的<b>肚子鼓得越大、眼睛瞪得越圆</b>！遇到 🤢 嫌弃表情的钓点千万别碰，那是假货！',action:'hover_spot',hint:'🖱️ 把鼠标移到水里游动的黑色鱼影上，看青蛙的估价反应！',highlight:'#gameCanvas'},
  {icon:'🔮',title:'青蛙头顶光环=等级',desc:'青蛙头顶的光环代表它的等级：<br>'+
    '<span class="tt-chip" style="background:#4FC3F7">Lv.2 蓝环</span>'+
    '<span class="tt-chip" style="background:#66BB6A">Lv.3 绿环</span>'+
    '<span class="tt-chip" style="background:#AB47BC">Lv.4 紫环</span>'+
    '<span class="tt-chip" style="background:#FFD700">Lv.5 金环</span><br>'+
    '<b>Lv.1 没有光环</b>。等级越高成功率越高，<b>满级青蛙 100% 成功</b>，任何鱼都能抓到！',action:'start'},
  {icon:'🎒',title:'道具：鼠标放上去就展开使用',desc:'<b>把鼠标放到「🎒 道具」按钮上</b>，会<b>自动展开</b>快捷面板，点「使用」立刻生效，没库存的可以直接「买」。<br>'+
    '常用道具：闪光弹💣（照亮所有假鱼影）、精准雷达🎯、强化香饵🍀、延时沙漏⏰……点按钮本身还能打开完整商店。',action:'start',highlight:'#btnShop'},
  {icon:'🏝️',title:'钓到鱼直接赚金币！',desc:'钓到的鱼会自动折算金币进入钱包，无需回岛卖鱼！鱼还会放进背包，可以种菜种鱼继续生钱！',action:'start'},
  {icon:'🌱',title:'钓到的鱼 = 鱼苗，能种！',desc:'每钓到一种鱼，都会收进背包并<b>自动变成一颗🌱鱼苗</b>。<br>回到小岛点「🐠 种鱼」，把鱼苗种进鱼塘，成熟就能收获更多金币——<b>钓到什么鱼就能种什么鱼！</b>',action:'start'},
  {icon:'📖',title:'钓到新鱼 → 图鉴领奖励！',desc:'每钓到一种<b>新鱼</b>，图鉴会自动收录，并生成一笔<b>待领取</b>的收录奖励，越稀有越多。<br>'+
    '这时 <b>📖 图鉴</b> 按钮会亮起 <b>红点</b> —— 点进去按 <b>「一键领取」</b> 或单独领取。',action:'start',highlight:'#btnAlbum'},
  {icon:'🚀',title:'准备好了，出发吧！',desc:'跟着青蛙的反应、善用道具，钓上更大的鱼，赚够 100 万让青蛙进化成彩虹蛙！',action:'start',hint:'🎣 点"开始冒险"正式开局！'},
];

// ============ 模式专属教学（与新手基础教程分开）============
// 冒险模式：初次进入时讲「危险值」
let advTutorialSteps=[
  {icon:'⚠️',title:'冒险模式 · 注意「危险值」',desc:'看屏幕上方中间的 <b>⚠ 危险条</b>：每天钓鱼都会累积危险值，<b>危险值越高越容易触发灾难</b>（暴雨、暴风会打乱钓点）。<br>钓错假鱼、乱用竿涨得更快，注意别让它冲满 100%！',action:'cast',hint:'🎣 抛一竿，留意顶部 ⚠ 危险条的变化～',highlight:'#fhDanger'},
];
// 闯关模式：初次进入时讲「通关条件」
let lvlTutorialSteps=[
  {icon:'🎯',title:'闯关模式 · 看懂「通关条件」',desc:'看屏幕上方中间的<b>关卡面板</b>：<br><b>目标</b>是本关要达到的条件（比如钓到 4 条某种鱼），<b>剩余</b>是你这关还剩多少次出竿机会。<br>在竿数用完前达成目标就通关，竿数耗光判负、消耗 1 天。',action:'cast',hint:'🎣 抛一竿，看看关卡面板的「目标 / 剩余」怎么变～',highlight:'#levelIndicator'},
];

// 弹出模式专属提示（每个模式只弹一次，记录在 G 里并随存档持久化）
let modeTipShowing=false;
function isTutorialDone(){ return G.tutorial>=tutorialSteps.length; }
function showModeTip(kind){
  let steps=kind==='adventure'?advTutorialSteps:lvlTutorialSteps;
  let st=steps[0]; if(!st)return;
  let ov=document.getElementById('modeTipOverlay'); if(!ov)return;
  let ic=document.getElementById('mtIcon');if(ic)ic.textContent=st.icon;
  let ti=document.getElementById('mtTitle');if(ti)ti.textContent=st.title;
  let de=document.getElementById('mtDesc');if(de)de.innerHTML=st.desc;
  ov.classList.add('show'); modeTipShowing=true;
  if(kind==='adventure'){ G.advTutShown=true; let dh=document.getElementById('fhDanger'); if(dh)dh.classList.add('tut-danger-hl'); }
  else G.lvlTutShown=true;
  // 高亮对应的位置（聚光灯），让玩家一眼看到该看哪
  if(typeof tutApplyHighlight==='function')tutApplyHighlight(st.highlight);
  saveGame(true);
}
function closeModeTip(){
  let ov=document.getElementById('modeTipOverlay'); if(ov)ov.classList.remove('show');
  let dh=document.getElementById('fhDanger'); if(dh)dh.classList.remove('tut-danger-hl');
  if(typeof tutClearHighlight==='function')tutClearHighlight();
  modeTipShowing=false;
}
// 基础新手教学是否正在进行（避免模式专属提示与之重叠）
function basicTutActive(){ let t=document.getElementById('tutorialOverlay'); return t&&t.classList.contains('active'); }
// 首次进入冒险模式 → 讲「危险值」（只在基础教程进行中避让，避免重叠）
function maybeAdvTut(){ if(G.advTutShown||modeTipShowing||basicTutActive())return; showModeTip('adventure'); }
// 首次进入闯关模式 → 讲「通关条件」（只在基础教程进行中避让，避免重叠）
function maybeLvlModeTut(){ if(G.lvlTutShown||modeTipShowing||basicTutActive())return; showModeTip('level'); }

// ============ 种鱼模式专用教学（解锁后引导）============
let gardenTutorialSteps=[
  {icon:'🐠',title:'种鱼解锁啦！',desc:'刚才出海钓鱼，你每钓到一种鱼，都会<b>自动变成一颗🌱鱼苗</b>收进背包。<br>'+
    '一句话：<b>钓到什么鱼，就能种什么鱼！</b>把鱼苗放进<b>小岛下方的水里</b>，等它成熟就能收金币。',action:'start',highlight:'#islandActFishPlant'},
  {icon:'🌊',title:'① 把鱼苗放进小岛水里',desc:'点小岛上的 <b>🐠 种鱼</b> 打开鱼苗背包，<b>点一颗鱼苗「🌊 放入水里」</b>，它就会游进小岛下方的水里。<br>'+
    '水里最多同时养 <b>'+GARDEN_PLOTS+' 条</b>。',action:'plant',hint:'🖱️ 打开「🐠 种鱼」，把一颗鱼苗放入水里！',highlight:'#islandActFishPlant'},
  {icon:'⏳',title:'② 越贵的鱼成熟越慢',desc:'入水后鱼下方会显示<b>成长进度条</b>，时间随<b>全局时钟</b>流动（「😴 休息·进入下一天」会大幅推进时间）。<br>'+
    '便宜鱼很快成熟，贵重鱼要等久一点，但收益高得多。',action:'start'},
  {icon:'🪙',title:'③ 成熟后点击那条鱼收获',desc:'成熟后鱼会<b>发金光</b>并冒出 <b>✅</b> 和「点我收获」。<br>'+
    '<b>点击水里那条鱼</b>即可收获金币，<b>收获后它就会消失</b>。',action:'harvest',hint:'🪙 等鱼成熟后，点击水里那条鱼收获一次！'},
  {icon:'🔁',title:'④ 循环起来，钱生钱',desc:'钓鱼 → 拿鱼苗 → 放进小岛水里 → 成熟点击收获金币 → 升级青蛙 / 买道具 → 钓更贵的鱼……<br>'+
    '<b>记得常回小岛看看鱼熟了没！</b>',action:'start',hint:'🌱 好啦，开始养鱼吧！'},
];

// ============ 关卡教学（道具课 / 区域课）============
// 进关自动弹出半穿透卡片：玩家真的做出对应操作，教学才完成并消失
let LEVEL_TUT={
  4:{icon:'💣',title:'道具教学 · 闪光弹',
     desc:'假钓点和真钓点长得一模一样！<br>💣 <b>闪光弹</b>会照亮水面 4 秒，<b>假点当场现形</b>，趁这 4 秒安心下竿。',
     action:'use:flash',hint:'鼠标移到底部「🎒 道具」上 → 点「使用」用掉 💣 闪光弹'},
  5:{icon:'☁️',title:'区域教学 · 云朵钓点',
     desc:'水面漂着 <b>☁️ 云朵钓点</b>，云里的鱼又大又值钱。<br>本关<b>只有从云钓点钓起的鱼</b>才算完成目标。',
     action:'catch_cloud',hint:'对准 ☁️ 云朵钓点抛竿，钓上 1 条云鱼'},
  7:{icon:'⛰️',title:'区域教学 · 山岩钓点',
     desc:'<b>⛰️ 山岩钓点</b>藏在岩缝里，出 R 级珍品的概率更高。<br>本关要从山岩钓点钓到 R 级鱼。',
     action:'catch_mountain',hint:'对准 ⛰️ 山岩钓点抛竿，钓上 1 条山岩鱼'},
  11:{icon:'💣',title:'道具课 · 闪光弹',
     desc:'假点超过一半！<b>💣 闪光弹</b>照亮全场 4 秒，<b>假钓点立刻现形</b>。<br>先排雷，再从容下竿。',
     action:'use:flash',hint:'鼠标移到底部「🎒 道具」上 → 点「使用」用掉 💣 闪光弹'},
  12:{icon:'🎯',title:'道具课 · 精准雷达',
     desc:'<b>🎯 精准雷达</b>能让<b>下一个钓点必定是真货</b>，专治假点横行。<br>先开雷达，再抛竿。',
     action:'use:accuracy',hint:'鼠标移到底部「🎒 道具」上 → 使用 🎯 精准雷达'},
  13:{icon:'🍀',title:'道具课 · 强化香饵',
     desc:'<b>🍀 强化香饵</b>让接下来 <b>3 次出竿稀有度 +1</b>（N→R、R→SR）。<br>想钓 SR，先撒香饵。',
     action:'use:lucky',hint:'鼠标移到底部「🎒 道具」上 → 使用 🍀 强化香饵'},
  14:{icon:'🐟',title:'道具课 · 呼唤鱼群',
     desc:'钓点刷得慢？<b>🐟 呼唤鱼群</b>能<b>立刻刷新全部钓点</b>，换一批新货。',
     action:'use:refresh',hint:'鼠标移到底部「🎒 道具」上 → 使用 🐟 呼唤鱼群'},
  15:{icon:'⏰',title:'道具课 · 延时沙漏',
     desc:'竿数不够用？<b>⏰ 延时沙漏</b>直接<b>加 2 次出竿机会</b>，救急神器。',
     action:'use:sandglass',hint:'鼠标移到底部「🎒 道具」上 → 使用 ⏰ 延时沙漏（+2 竿）'}
};
let levelTutActive=null; // 当前正在进行的关卡教学 levelId
function maybeLevelTut(idx){
  let cfg=LEVELS[idx];if(!cfg)return;
  let t=LEVEL_TUT[cfg.id];
  if(!t)return;
  if(G.levelTut&&G.levelTut[cfg.id])return; // 这关的教学已经做过了
  setTimeout(()=>showLevelTut(cfg.id),800);
}
function showLevelTut(lid){
  let t=LEVEL_TUT[lid];if(!t)return;
  levelTutActive=lid;
  let ov=document.getElementById('levelTutOverlay');if(!ov)return;
  let ic=document.getElementById('ltIcon');if(ic)ic.textContent=t.icon;
  let ti=document.getElementById('ltTitle');if(ti)ti.textContent=t.title;
  let de=document.getElementById('ltDesc');if(de)de.innerHTML=t.desc;
  let hi=document.getElementById('ltHint');if(hi){hi.style.display='block';hi.innerHTML='🎯 操作任务：'+t.hint;}
  ov.classList.add('active');
  let bs=document.getElementById('btnShop');if(bs)bs.classList.add('lt-highlight'); // 高亮道具入口
}
function closeLevelTut(save){
  let ov=document.getElementById('levelTutOverlay');if(ov)ov.classList.remove('active');
  let bs=document.getElementById('btnShop');if(bs)bs.classList.remove('lt-highlight');
  if(save&&levelTutActive!=null){
    if(!G.levelTut)G.levelTut={};
    G.levelTut[levelTutActive]=true;
    saveGame(true);
  }
  levelTutActive=null;
}
// 玩家做出对应操作 → 教学完成，卡片立即消失
function levelTutComplete(action){
  if(levelTutActive==null)return;
  let t=LEVEL_TUT[levelTutActive];
  if(!t||t.action!==action)return;
  let icon=t.icon;
  closeLevelTut(true);
  toast(icon+' 学会了！这就是本关的诀窍','gold');
  if(typeof sfx_reveal_SR==='function')sfx_reveal_SR();
}

window.closeLevelTut=closeLevelTut;

// ============ 操作门控教学框架 ============
// 玩家完成某步要求的操作时调用 → 立即进入下一步
function tutComplete(action){
  if(G.tutorial>=tutorialSteps.length)return;
  let s=tutorialSteps[G.tutorial];
  if(!s||s.action!==action)return;
  G._tutDone=true;
  nextTutorial();
}
function gtutComplete(action){
  let i=G.gardenTutStep||0;
  if(i>=gardenTutorialSteps.length)return;
  let s=gardenTutorialSteps[i];
  if(!s||s.action!==action)return;
  G._gtutDone=true;
  nextGardenTut();
}

function showTutorial(){
  if(G.tutorial>=tutorialSteps.length)return;
  let tc=document.getElementById('tutorialOverlay');
  tc.classList.add('active');
  renderTutorialStep();
}

// 主菜单「新手教学」：进第1关场景 + 重放基础引导，方便复习（不强制、可随时退出）
function enterTutorialReview(){
  let mp=document.getElementById('modePick');if(mp)mp.classList.add('hidden');
  G.tutorial=0; G._tutDone=false;
  enterLevelMode(0); // 进第1关场景，引导里的抛竿/悬停等操作都能触发
  showTutorial();
}
function closeTutorialDone(){
  let ov=document.getElementById('tutorialDoneOverlay');if(ov)ov.classList.remove('active');
}
function flashDayRed(){
  ['fhDay','goalHud'].forEach(function(id){
    let el=document.getElementById(id);if(!el)return;
    el.classList.remove('day-flash');void el.offsetWidth;el.classList.add('day-flash');
    setTimeout(function(){el.classList.remove('day-flash');},900);
  });
  sfx_day_pass(); // 一天过去提示音
}

// 新手教程「高光提示」：全场变暗，只有要提示的地方保持明亮（聚光灯）
function tutClearHighlight(){
  let old=document.getElementById('tutSpotlight');if(old)old.remove();
}
function tutApplyHighlight(sel){
  tutClearHighlight();
  if(!sel)return;
  let el=document.querySelector(sel);if(!el)return;
  let r=el.getBoundingClientRect();
  let pad=8; // 光圈比目标稍大一点，避免压住内容
  let sp=document.createElement('div');sp.id='tutSpotlight';
  sp.style.left=(r.left-pad)+'px';
  sp.style.top=(r.top-pad)+'px';
  sp.style.width=(r.width+pad*2)+'px';
  sp.style.height=(r.height+pad*2)+'px';
  document.body.appendChild(sp);
}
// 元素位置会随窗口/布局变化，跟着重算
window.addEventListener('resize',()=>{if(document.getElementById('tutSpotlight')){let s=tutorialSteps[G.tutorial];if(s&&s.highlight)tutApplyHighlight(s.highlight);}});
function renderTutorialStep(){
  let s=tutorialSteps[G.tutorial];
  if(!s)return;
  let tc=document.getElementById('tutorialOverlay');
  document.getElementById('tutorialIcon').textContent=s.icon;
  document.getElementById('tutorialTitle').textContent=s.title;
  document.getElementById('tutorialDesc').innerHTML=s.desc;
  // 操作引导提示 + 演示模式（overlay半透明可穿透，让玩家能实际操作钓点）
  let demoMode=!!s.hint;
  tc.classList.toggle('tutorial-hover-demo',demoMode);
  let hintEl=document.getElementById('tutorialHint');
  if(hintEl){if(s.hint){hintEl.style.display='block';hintEl.innerHTML='🎯 操作任务：'+s.hint;}else hintEl.style.display='none';}
  tutApplyHighlight(s.highlight);
  if(G.tutorial!==3)G._tutHinted=false;
  // 步骤指示器
  let ind=document.getElementById('tutorialStepIndicator');
  ind.innerHTML='';
  for(let i=0;i<tutorialSteps.length;i++){
    let dot=document.createElement('span');
    dot.className='tutorial-dot'+(i===G.tutorial?' active':'');
    ind.appendChild(dot);
  }
  // 操作门控：未完成任务前禁用"继续"按钮，完成后才可进入下一步
  let nb=document.getElementById('tutorialNextBtn');
  let last=G.tutorial>=tutorialSteps.length-1;
  if(s.action==='start'){
    nb.disabled=false; nb.style.opacity=1;
    nb.textContent=last?'开始冒险！🎣':'继续 ➡️';
  }else if(!G._tutDone){
    nb.disabled=true; nb.style.opacity=0.4;
    nb.textContent='⏳ 请先完成上面的操作…';
  }else{
    nb.disabled=false; nb.style.opacity=1;
    nb.textContent=last?'开始冒险！🎣':'继续 ➡️';
  }
}

function nextTutorial(){
  G._tutDone=false;
  G.tutorial++;
  if(G.tutorial>=tutorialSteps.length){
    tutClearHighlight();
    document.getElementById('tutorialOverlay').classList.remove('active');
    G.tutorial=tutorialSteps.length; // 标记已完成
    // 基础教学结束后，若正处于某模式，弹出该模式的专属提示
    if(adv.active)maybeAdvTut();
    else{ let li=document.getElementById('levelIndicator'); if(li&&li.style.display!=='none')maybeLvlModeTut(); }
    let td=document.getElementById('tutorialDoneOverlay');if(td)td.classList.add('active');
    return;
  }
  renderTutorialStep();
}

function skipTutorial(){
  if(typeof tutClearHighlight==='function')tutClearHighlight(); // 必须清除聚光灯，否则全屏持续变暗
  document.getElementById('tutorialOverlay').classList.remove('active');
  G.tutorial=tutorialSteps.length;
}

function startAdventure(){adv.active=true;adv.day=G.gameDay+1;G.clockMin=0;adv.timeOfDay=getTimeOfDay();updateClockHUD();adv.dayCasts=0;adv.dayEarned=0;adv.totalEarned=G.totalEarned;adv.danger=0;adv.dayEnded=false;adv.penaltyToday=0;adv.gameOver=false;adv.gameWin=false;adv._warnedWarn=false;adv._warnedDanger=false;adv._triggeredDoom=false;adv.fishBag=[];adv.islandTab='plant';candyBird.active=false;hiddenTreasures=[];treasureSpawnTimer=0;treasureCollectAnim=[];tongueState.active=false;tongueState.phase='idle';if(G.coins<300)G.coins=300;G.totalPulls=0;G.pitySR=0;G.pitySSR=0;levelCaught=0;levelCasts=0;levelMaxCasts=ADV_CASTS_PER_DAY;levelComplete_d=false;spots=[];levelSpotTimer=0;G.phase='idle';document.getElementById('modePick').classList.add('hidden');document.getElementById('menuBackBtn').classList.add('show');document.getElementById('gameUI').classList.remove('hidden');document.getElementById('fishingHud').classList.add('active');document.getElementById('bottomBar').classList.remove('hidden');document.getElementById('levelIndicator').style.display='none';let bt=document.getElementById('btnTen');if(bt)bt.style.display='none';document.getElementById('pityDisplay').style.display='none';document.getElementById('hudBuffs').style.display='none';let bs=document.getElementById('btnSell');if(bs)bs.style.display='inline-block';let bg=document.getElementById('btnSingle');if(bg)bg.textContent='🎣 垂钓 · '+COST_SINGLE+'💰';let bk=document.getElementById('btnDive');if(bk){bk.style.display='inline-block';updateDiveBtn();}let fu=document.getElementById('btnFrogUpgrade');if(fu)fu.style.display='inline-block';document.getElementById('gameTitle').style.display='none';document.getElementById('gtbModeTitle').textContent='🎣 冒险模式';fishes=[];initGame();updateAdvHUD();updateUI();updateButtons();setTimeout(maybeAdvTut,700);toast('🌊 冒险开始！100天内赚到100万💰！升级青蛙、潜水寻宝来生存！','gold');sfx_reveal_UR();}
function showAdventureResult(win){document.getElementById('advResultOverlay').classList.add('active');let t=document.getElementById('advResultTitle');let d=document.getElementById('advResultDetail');if(win){t.textContent='🎉 冒险成功！';t.style.color='#FFD700';d.textContent='全局总收入 '+G.totalEarned.toLocaleString()+'💰 青蛙: '+FROG_CFG[frogLv-1].name+' Lv.'+frogLv;sfx_reveal_UR();}else{t.textContent='💔 冒险失败…';t.style.color='#EF5350';d.textContent='只赚了 '+G.totalEarned.toLocaleString()+' 💰 距目标还差 '+Math.ceil((GOAL_TARGET-G.totalEarned)/10000)+'万';sfx_reveal_N();}}
function advRestart(){document.getElementById('advResultOverlay').classList.remove('active');adv.active=false;startAdventure();}
function getAdvMultiplier(){if(!adv.active||adv.day<1)return 1;if(adv.day<=3)return 1;if(adv.day<=7)return 1.2;if(adv.day<=12)return 1.5;if(adv.day<=17)return 1.8;if(adv.day<=30)return 2.2;if(adv.day<=50)return 2.5;if(adv.day<=80)return 3.0;return 3.5;}
function exitToMenu(){
  // 🏠 返回小岛（主界面）
  if(adv.active){ returnHome(); return; }
  // 退出当前模式 → 回小岛（主界面），保留已种作物
  gameMode='';G.paused=false;
  spots=[];fishes=[];G.phase='idle';
  adv.active=false;adv.fishBag=[];
  candyBird.active=false;hiddenTreasures=[];treasureSpawnTimer=0;treasureCollectAnim=[];
  tongueState.active=false;tongueState.phase='idle';
  document.getElementById('pauseOverlay').classList.remove('active');
  G.islandMode=false;G.gardenMode=false;
  updateGardenCardUI();
  openIslandHome();
  saveGame();
}
function advQuit(){document.getElementById('advResultOverlay').classList.remove('active');document.getElementById('fishingHud').classList.remove('active');document.getElementById('pityDisplay').style.display='none';document.getElementById('hudBuffs').style.display='none';document.getElementById('levelIndicator').style.display='none';document.getElementById('bottomBar').classList.add('hidden');document.getElementById('gameTitle').style.display='';document.getElementById('gameTitle').textContent='🎣 Next Bigger Catch';G.islandMode=false;document.getElementById('islandOverlay').classList.remove('active');document.getElementById('pauseOverlay').classList.remove('active');G.paused=false;adv.active=false;adv.fishBag=[];adv.plantedVeg=[];adv.plantedFish=[];disasterFX.active=false;disasterFX.paused=false;sfx_disaster_ambient_stop();sfx_rain_stop();candyBird.active=false;hiddenTreasures=[];treasureSpawnTimer=0;treasureCollectAnim=[];tongueState.active=false;tongueState.phase='idle';diveState.sessionsLeft=0;document.getElementById('btnDive').style.display='none';document.getElementById('diveOverlay').classList.remove('active');closeDive();openIslandHome();saveGame();}
function updateAdvHUD(){let m=getAdvMultiplier();let el=document.getElementById('fhDay');if(el){let todEmoji=getTimeEmoji(adv.timeOfDay||'noon');el.textContent=todEmoji+' 第 '+adv.day+'/'+ADV_DAYS+' 天';}let ct=document.getElementById('fhDayCasts');if(ct)ct.textContent=adv.dayCasts;let te=document.getElementById('fhTodayEarned');if(te)te.textContent=adv.dayEarned.toLocaleString();let pc=document.getElementById('fhDangerPct');if(pc)pc.textContent=Math.floor(adv.danger)+'%';let db=document.getElementById('fhDangerBar');if(db)db.style.width=Math.max(0,Math.min(100,adv.danger))+'%';let dm=document.getElementById('fhMultiplier');if(dm){dm.textContent=m+'x';dm.style.color=m>=1.5?'#FFD700':m>=1.2?'#FFC107':'rgba(255,255,255,0.7)';}let bc=document.getElementById('fhBagCount');if(bc)bc.textContent=(adv.fishBag?adv.fishBag.length:0);}
// ============ 闯关模式：选关页 ============
function openLevelSelect(){
  let mp=document.getElementById('modePick');if(mp)mp.classList.add('hidden');
  let ov=document.getElementById('levelSelectOverlay');if(!ov)return;
  renderLevelGrid();
  ov.classList.add('active');
}
function closeLevelSelect(){
  let ov=document.getElementById('levelSelectOverlay');if(ov)ov.classList.remove('active');
  let mp=document.getElementById('modePick');if(mp)mp.classList.remove('hidden');
  if(typeof updateGardenCardUI==='function')updateGardenCardUI();
}
function renderLevelGrid(){
  let grid=document.getElementById('lsGrid');if(!grid)return;
  let total=LEVELS.length;
  let cleared=Math.min(G.levelCleared,total);
  let pro=document.getElementById('lsProgressTxt');
  if(pro)pro.textContent='已通关 '+cleared+' / '+total;
  grid.innerHTML='';
  for(let i=0;i<total;i++){
    let cfg=LEVELS[i]||{name:''};
    let st;
    if(i<cleared)st='cleared';
    else if(i===cleared&&cleared<total)st='current';
    else st='locked';
    let t=document.createElement('div');
    t.className='ls-tile '+st;
    t.innerHTML='<span class="t-flag">'+(st==='cleared'?'✓':st==='current'?'▶':'🔒')+'</span>'
      +'<div class="t-num">'+(i+1)+'</div>'
      +'<div class="t-name">'+cfg.name+'</div>';
    t.title=(st==='locked')?'🔒 通关第'+i+'关后解锁':'第'+(i+1)+'关 · '+cfg.name;
    t.onclick=function(){
      if(st==='locked'){toast('🔒 先通过前面的关卡才能解锁哦','red');return;}
      pickLevel(i);
    };
    grid.appendChild(t);
  }
}
function pickLevel(idx){
  let ov=document.getElementById('levelSelectOverlay');if(ov)ov.classList.remove('active');
  enterLevelMode(idx);
}
function enterLevelMode(idx){
  levelIdx=idx; // 关键：当前进行的关卡 index 必须与所选一致
  gameMode='level';adv.active=false;diveState.sessionsLeft=0;
  document.getElementById('diveOverlay').classList.remove('active');closeDive();
  document.getElementById('btnDive').style.display='none';
  document.getElementById('modePick').classList.add('hidden');
  document.getElementById('levelSelectOverlay').classList.remove('active');
  document.getElementById('gameUI').classList.remove('hidden');
  document.getElementById('bottomBar').classList.remove('hidden');
  document.getElementById('fishingHud').classList.remove('active');
  document.getElementById('pityDisplay').style.display='flex';
  document.getElementById('hudBuffs').style.display='';
  document.getElementById('levelIndicator').style.display='flex';
  document.getElementById('gameTitle').style.display='none';
  document.getElementById('gtbModeTitle').textContent='🎣 闯关模式';
  document.getElementById('menuBackBtn').classList.add('show');
  let fu2=document.getElementById('btnFrogUpgrade');if(fu2)fu2.style.display='inline-block';
  fishes=[];spots=[];temptations=[];trashItems=[];
  initGame();updateUI();updateButtons();
  startLevel(idx);
  setTimeout(maybeLvlModeTut,700); // 首次进闯关：讲通关条件
}
function selectMode(m){
  if(m==='level'){openLevelSelect();}
  else if(m==='adventure'){
    if(adv.active && !adv.gameOver && !adv.gameWin){ closeIsland(); return; } // 休整中再选冒险=继续当前冒险
    gameMode='adventure';fishes=[];spots=[];temptations=[];trashItems=[];startAdventure();
  }
}function saveGame(silent){let d={frogLv:frogLv,frogXp:frogXp,islandUnlocked:G.islandUnlocked,rainbowUnlocked:rainbowUnlocked||frogRainbow,totalCaught:G.totalCaught,seedlings:G.seedlings,gardenUnlocked:G.gardenUnlocked,gardenPlots:G.gardenPlots,gardenTutSeen:G.gardenTutSeen,gardenTutPending:G.gardenTutPending,worldTime:G.worldTime,album:G.album,albumNew:G.albumNew,albumPending:G.albumPending,dailyDate:G.dailyDate,dailyTasks:G.dailyTasks,dailyClaimed:G.dailyClaimed,signInDate:G.signInDate,signInDay:G.signInDay,levelTut:G.levelTut||{},claimedMilestones:G.claimedMilestones||{},advTutShown:!!G.advTutShown,lvlTutShown:!!G.lvlTutShown};try{localStorage.setItem('nbc_save',JSON.stringify(d));if(!silent)toast('💾 已存档','gray');}catch(e){}}
function loadGame(){try{let r=localStorage.getItem('nbc_save');if(!r)return false;let d=JSON.parse(r);frogLv=d.frogLv||1;frogXp=d.frogXp||0;frogXpNext=FROG_CFG[frogLv-1].xp;if(d.islandUnlocked)G.islandUnlocked=true;if(d.rainbowUnlocked){rainbowUnlocked=true;frogRainbow=true;}G.totalCaught=d.totalCaught||0;G.seedlings=d.seedlings||{};G.gardenUnlocked=!!d.gardenUnlocked;G.gardenPlots=d.gardenPlots||[];G.gardenTutSeen=!!d.gardenTutSeen;G.gardenTutPending=!!d.gardenTutPending;G.worldTime=d.worldTime||0;G.clockMin=0;G.album=d.album||{};G.albumNew=d.albumNew||{};G.albumPending=d.albumPending||{};G.dailyDate=d.dailyDate||'';G.dailyTasks=d.dailyTasks||{};G.dailyClaimed=d.dailyClaimed||{};G.signInDate=d.signInDate||'';G.signInDay=d.signInDay||0;G.levelTut=d.levelTut||{};G.claimedMilestones=d.claimedMilestones||{};G.advTutShown=!!d.advTutShown;G.lvlTutShown=!!d.lvlTutShown;return true;}catch(e){return false;}}
function initGame(){resize();setupInput();G.paused=false;G.islandMode=false;document.getElementById('pauseBtn').textContent='⏸️';document.getElementById('pauseOverlay').classList.remove('active');document.getElementById('islandOverlay').classList.remove('active');document.getElementById('tutorialOverlay').classList.remove('active');disasterFX.active=false;disasterFX.paused=false;stormWarn={active:false,timer:0,lightning:0,rainDrops:[],darkAlpha:0,windOff:0};candyBird.active=false;hiddenTreasures=[];treasureSpawnTimer=0;treasureCollectAnim=[];tongueState.active=false;tongueState.phase='idle';for(let i=0;i<8;i++){let f=FISH_POOL[Math.floor(Math.random()*FISH_POOL.length)];let dir=Math.random()>0.5?1:-1;fishes.push({fish:f,dir:dir,speed:(28+Math.random()*152)*dir,size:f.w[0]+Math.random()*(f.w[1]-f.w[0])*0.5,color:f.c,emoji:f.e,y:H*WL+H*0.04+Math.random()*H*0.3,x:Math.random()*W,alive:true,wobble:Math.random()*Math.PI*2,depth:0.3+Math.random()*0.7,alpha:0.3+Math.random()*0.4});}G.phase='idle';}
function init(){resize();loadGame();loadTimeScale();if(typeof setupInput==='function')setupInput(); // 保证小岛也能点击水面（否则画布无点击监听）document.getElementById('modePick').classList.remove('hidden');document.getElementById('gameUI').classList.add('hidden');document.getElementById('fishingHud').classList.remove('active');document.getElementById('bottomBar').classList.add('hidden');document.getElementById('levelIndicator').style.display='none';document.getElementById('pityDisplay').style.display='none';document.getElementById('gameTitle').textContent='🎣 Next Bigger Catch';updateFrogUI();setupGoalHudDrag();if(typeof setupItemHover==='function')setupItemHover();updateGoalHUD();updateGardenCardUI();updateClockHUD();if(typeof ensureDaily==='function')ensureDaily();if(typeof updateRedDots==='function')updateRedDots();setInterval(function(){if(typeof updateRedDots==='function')updateRedDots();},5000);document.addEventListener('click',function(){initAudio();},{once:true});
  // ESC暂停/关闭岛屿；开场剧情：空格/回车继续、ESC跳过
  document.addEventListener('keydown',function(ev){
    if(introStory.active){
      if(ev.key===' '||ev.key==='Enter'){ev.preventDefault();introNext();}
      else if(ev.key==='Escape'){ev.preventDefault();skipIntroStory();}
      return;
    }
    if(ev.key==='Escape'&&G.gardenMode){ev.preventDefault();closeGardenMode();return;}
    if(ev.key==='Escape'&&(gameMode||adv.active)){ev.preventDefault();if(G.islandMode){closeIsland();}else{togglePause();}}
  });
  requestAnimationFrame(loop);
  // 首次进入游戏播放开场剧情；之后主界面=小岛
  try{if(!localStorage.getItem('nbc_intro_seen'))startIntroStory();else if(typeof returnToIsland==='function')returnToIsland();}catch(e){startIntroStory();}
}
window.onload=init;
window.buyItem=buyItem;window.useItem=useItem;window.toggleItemShop=toggleItemShop;
window.startDive=startDive;window.closeDive=closeDive;
window.selectMode=selectMode;window.endDay=endDay;window.saveGame=saveGame;
window.openLevelSelect=openLevelSelect;window.closeLevelSelect=closeLevelSelect;
window.pickLevel=pickLevel;window.enterLevelMode=enterLevelMode;
window.devUnlockAllLevels=devUnlockAllLevels;
window.advRestart=advRestart;window.advQuit=advQuit;
window.upgradeFrog=upgradeFrog;window.exitToMenu=exitToMenu;
window.closeModeTip=closeModeTip;
window.togglePause=togglePause;window.returnHome=returnHome;
window.switchIslandTab=switchIslandTab;
window.closeIsland=closeIsland;window.restAndNextDay=restAndNextDay;
window.openGardenMode=openGardenMode;window.closeGardenMode=closeGardenMode;
window.nextTutorial=nextTutorial;window.skipTutorial=skipTutorial;
window.plantVeg=plantVeg;window.plantFishPlant=plantFishPlant;

// ============ 结局剧情系统（彩虹蛙进化 · 女神 · 战斗） ============
let endingStory={active:false,step:0,script:[],typing:false,charIdx:0,typingT:0,phase:'intro',typingTimer:null,choicesShown:false};
let rainbowUnlocked=false; // 永久解锁彩虹蛙全部功能
let endingDevMode=false; // DEV 模式测试最终剧情：不修改存档

// 对话脚本（与剧情文案一致）
const ENDING_SCRIPT_INTRO=[
  {avatar:'✨',speaker:'',text:'忽然，你的青蛙散发出了七彩的光芒……'},
  {avatar:'🌈',speaker:'',text:'进化！彩虹蛙！！'},
  {avatar:'🧚',speaker:'女神',text:'恭喜你完成了收集到了百万金币！你的蛙成功进化成了可以实现任何愿望的彩虹蛙！'},
  {avatar:'🐸',speaker:'我',text:'噢我的上帝，你是说，我现在可以许任何愿望就能实现吗？'},
  {avatar:'🧚',speaker:'女神',text:'是的，不过还有副作用，把它给我，让我帮你去除吧。'},
];
const ENDING_SCRIPT_GIVE=[
  {avatar:'🧚',speaker:'女神',text:'彩虹蛙！把它变成青蛙！'},
  {avatar:'🐸',speaker:'我',text:'补药啊！！！'},
  {avatar:'🌊',speaker:'',text:'你变成了青蛙……'},
  {avatar:'🧚',speaker:'女神',text:'哦吼吼吼！低贱的凡人可不配拥有此等宝物，看在你帮我打了这么久工的份上，姑且饶你一命。'},
  {avatar:'🦶',speaker:'',text:'说罢一脚把你踢进水里'},
  {avatar:'🌊',speaker:'',text:'从此之后，你成为了一只在大海里游泳的青蛙，再也没有回到小岛上。'},
];
const ENDING_SCRIPT_FIGHT=[
  {avatar:'🐸',speaker:'我',text:'我一眼就看你不是神！'},
  {avatar:'🧚',speaker:'女神',text:'可恶，居然被发现了吗？我才不会告诉你要打败我才能解锁彩虹蛙的全部功能呢！'},
  {avatar:'🐸',speaker:'我',text:'直接来吧！'},
  {avatar:'👾',speaker:'',text:'女神现出原型——青蛙精，战斗时刻！'},
];
const ENDING_SCRIPT_WIN=[
  {avatar:'💥',speaker:'',text:'青蛙精被击败了！'},
  {avatar:'🌈',speaker:'',text:'彩虹蛙的全部功能已解锁！它散发出最璀璨的七彩光芒，你的愿望，尽可实现！'},
];
const ENDING_SCRIPT_LOSE=[
  {avatar:'👾',speaker:'青蛙精',text:'哦吼吼吼！低贱的凡人可不配拥有此等宝物！'},
  {avatar:'🌊',speaker:'',text:'你被变成了青蛙，一脚踢进了大海……'},
  {avatar:'🌊',speaker:'',text:'从此之后，你成为了一只在大海里游泳的青蛙，再也没有回到小岛上。'},
];

// ============ 开场剧情（序章） ============
const INTRO_SCRIPT=[
  {avatar:'🏝️',speaker:'旁白',text:'在遥远的海域，有一座孤岛。岛上只住着一位少年——他每天无忧无虑地钓鱼、晒太阳，日子平静而快乐。'},
  {avatar:'🌑',speaker:'旁白',goddess:true,text:'直到某个夜晚，女神托梦而来……'},
  {avatar:'👁️',speaker:'女神',goddess:true,text:'我赠你一只魔力青蛙——赚够 100 万金币，它便能进化为彩虹蛙，实现你任何愿望。'},
  {avatar:'🌈',speaker:'旁白',text:'一只可以实现任何愿望的传说之蛙……'},
  {avatar:'🧑',speaker:'我',text:'100 万金币……只要一直钓上更大的鱼，就一定做得到吧？'},
  {avatar:'🎣',speaker:'我',text:'下一竿，一定要更大——Next Bigger Catch！'},
  {avatar:'⛵',speaker:'旁白',text:'于是少年登上小船，扬起风帆。轰轰烈烈的大钓鱼时代，就此开幕。'},
  {avatar:'🌊',speaker:'旁白',text:'海上风高浪急，你要记住三件事：不是每个闪光点都藏着真鱼；危险值升高时，暴风雨与深海巨怪会找上门；青蛙等级越低，大鱼越容易脱钩。'},
  {avatar:'🐸',speaker:'你的青蛙',text:'呱！！（它已经等不及了。）'}
];
let introStory={active:false,step:0,typing:false,charIdx:0,timer:null};
function startIntroStory(){
  introStory.active=true;introStory.step=0;
  document.getElementById('introOverlay').classList.add('active');
  showIntroLine(0);
}
function showIntroLine(i){
  introStory.step=i;
  if(i>=INTRO_SCRIPT.length){endIntroStory();return;}
  let line=INTRO_SCRIPT[i];
  let god=!!line.goddess;
  let av=document.getElementById('introAvatar');
  av.textContent=god?'':(line.avatar||'');
  av.classList.toggle('is-goddess',god);
  let gs=document.getElementById('goddessShadow');
  if(gs)gs.classList.toggle('show',god);
  document.getElementById('introSpeaker').textContent=line.speaker||'旁白';
  let textEl=document.getElementById('introText');
  if(textEl)textEl.textContent='';
  let dots=document.getElementById('introDots');
  if(dots)dots.textContent='●'.repeat(i+1)+'○'.repeat(Math.max(0,INTRO_SCRIPT.length-i-1));
  introStory.typing=true;introStory.charIdx=0;
  if(introStory.timer)clearInterval(introStory.timer);
  let full=line.text||'';
  introStory.timer=setInterval(()=>{
    introStory.charIdx++;
    if(textEl&&textEl.textContent.length<full.length)textEl.textContent=full.slice(0,introStory.charIdx);
    if(introStory.charIdx>=full.length){clearInterval(introStory.timer);introStory.timer=null;introStory.typing=false;}
  },32);
}
function introNext(){
  if(!introStory.active)return;
  if(introStory.typing){ // 打字中：立刻显示完整文本
    if(introStory.timer)clearInterval(introStory.timer);
    let line=INTRO_SCRIPT[introStory.step];
    if(line)document.getElementById('introText').textContent=line.text||'';
    introStory.timer=null;introStory.typing=false;
    return;
  }
  showIntroLine(introStory.step+1);
}
function skipIntroStory(){endIntroStory();}
function endIntroStory(){
  introStory.active=false;
  if(introStory.timer){clearInterval(introStory.timer);introStory.timer=null;}
  introStory.typing=false;
  document.getElementById('introOverlay').classList.remove('active');
  try{localStorage.setItem('nbc_intro_seen','1');}catch(e){}
  if(typeof initAudio==='function'){try{initAudio();}catch(e){}}
  if(typeof returnToIsland==='function')returnToIsland(); // 看完开场剧情→回小岛，自由活动
}
function devReplayIntro(){
  try{localStorage.removeItem('nbc_intro_seen');}catch(e){}
  startIntroStory();
}
function startEndingStory(){
  G.paused=true;
  document.getElementById('advResultOverlay').classList.remove('active');
  endingStory.active=true;endingStory.phase='intro';endingStory.step=0;endingStory.choicesShown=false;
  document.getElementById('endingOverlay').classList.add('active');
  // 彩虹进化动画
  let frogEl=document.getElementById('endingFrogEmoji');
  if(frogEl){frogEl.textContent='🐸';setTimeout(()=>{if(endingStory.active)frogEl.textContent='🌈🐸';},1500);}
  endingStory.script=ENDING_SCRIPT_INTRO;
  renderEndingSceneStars();
  showEndingLine(0);
}
function renderEndingSceneStars(){
  let sc=document.getElementById('endingScene');
  if(!sc)return;
  sc.querySelectorAll('.ending-star').forEach(e=>e.remove());
  for(let i=0;i<26;i++){
    let s=document.createElement('div');s.className='ending-star';
    s.style.left=(5+Math.random()*90)+'%';s.style.top=(3+Math.random()*70)+'%';
    s.style.animationDelay=(Math.random()*2.5)+'s';
    sc.appendChild(s);
  }
}
function showEndingLine(i){
  endingStory.step=i;
  let scr=endingStory.script;
  if(i>=scr.length){
    if(endingStory.phase==='intro'){endingShowChoices();}
    else if(endingStory.phase==='give'){endingShowBadEnd();}
    else if(endingStory.phase==='fight'){startBossBattle();}
    else if(endingStory.phase==='win'){endingShowGoodEnd();}
    else if(endingStory.phase==='lose'){endingShowBadEnd();}
    return;
  }
  let line=scr[i];
  document.getElementById('endingSpeakerAvatar').textContent=line.avatar||'';
  document.getElementById('endingSpeaker').textContent=line.speaker||'';
  document.getElementById('endingText').textContent='';
  document.getElementById('endingChoices').innerHTML='';
  document.getElementById('endingNextBtn').style.display='inline-block';
  document.getElementById('endingSkipBtn').style.display='inline-block';
  endingStory.typing=true;endingStory.charIdx=0;endingStory.typingT=0;
  let full=line.text||'';
  endingStory.typingTimer=setInterval(()=>{
    endingStory.charIdx++;
    let el=document.getElementById('endingText');
    if(el&&el.textContent.length<full.length){el.textContent=full.slice(0,endingStory.charIdx);}
    if(endingStory.charIdx>=full.length){clearInterval(endingStory.typingTimer);endingStory.typing=false;}
  },35);
}
function endingNext(){
  if(endingStory.typing){// 打字中：直接显示完整文本
    let scr=endingStory.script;
    if(endingStory.step<scr.length){
      clearInterval(endingStory.typingTimer);
      document.getElementById('endingText').textContent=scr[endingStory.step].text||'';
      endingStory.typing=false;
    }
    return;
  }
  if(endingStory.choicesShown&&endingStory.phase==='intro')return; // 等待选择
  showEndingLine(endingStory.step+1);
}
function endingSkip(){
  // 跳过剧情：直接进入下一阶段（BOSS 战不可跳过，是核心玩法）
  if(!endingStory.active)return;
  if(endingStory.typingTimer)clearInterval(endingStory.typingTimer);
  endingStory.typing=false;
  if(endingStory.phase==='intro'){endingShowChoices();}
  else if(endingStory.phase==='fight'){startBossBattle();}
  else if(endingStory.phase==='win'){endingShowGoodEnd();}
  else{endingShowBadEnd();}
}
function endingShowChoices(){
  endingStory.choicesShown=true;
  document.getElementById('endingNextBtn').style.display='none';
  document.getElementById('endingSkipBtn').style.display='none';
  document.getElementById('endingSpeaker').textContent='';
  document.getElementById('endingSpeakerAvatar').textContent='';
  document.getElementById('endingText').textContent='到底要不要把彩虹蛙交给女神？';
  let c=document.getElementById('endingChoices');
  c.innerHTML='';
  let b1=document.createElement('button');b1.className='ending-choice-btn';b1.textContent='交出彩虹蛙';b1.onclick=()=>endingChoose(0);c.appendChild(b1);
  let b2=document.createElement('button');b2.className='ending-choice-btn danger';b2.textContent='不交！';b2.onclick=()=>endingChoose(1);c.appendChild(b2);
}
function endingChoose(choice){
  endingStory.choicesShown=false;
  document.getElementById('endingChoices').innerHTML='';
  if(choice===0){// 交出 → 坏结局
    endingStory.phase='give';
    endingStory.script=ENDING_SCRIPT_GIVE;
    document.getElementById('endingFrogEmoji').textContent='🐸';
    showEndingLine(0);
  }else{// 不交 → 战斗
    endingStory.phase='fight';
    endingStory.script=ENDING_SCRIPT_FIGHT;
    document.getElementById('endingFrogEmoji').textContent='🐸';
    showEndingLine(0);
  }
}
function hideEndingOverlay(){
  if(endingStory.typingTimer)clearInterval(endingStory.typingTimer);
  document.getElementById('endingOverlay').classList.remove('active');
  endingStory.active=false;
}
function endingShowBadEnd(){
  hideEndingOverlay();
  G.paused=true;
  document.getElementById('endingResultOverlay').classList.add('active');
  let card=document.getElementById('endingResultCard');
  card.classList.add('bad');
  document.getElementById('endingResultIcon').textContent='🐸';
  document.getElementById('endingResultTitle').textContent='坏结局 · 变成青蛙';
  document.getElementById('endingResultDetail').textContent='你成了大海里的一只青蛙，再也没有回到那座孤岛。\n这场寻梦的冒险，终究化作一个泡沫般的谎言……';
  document.getElementById('endingResultMainBtn').textContent=endingDevMode?'✅ 返回开发面板':'🏠 返回主菜单';
  // 战败后提供“不服，再来一次！”选项
  let rb=document.getElementById('endingResultRetryBtn');
  if(rb)rb.style.display='inline-block';
  sfx_reveal_N();
}
// BOSS 战被打败后：不服！再来一次！（直接重开青蛙精战斗）
function battleRetryFromLose(){
  document.getElementById('endingResultOverlay').classList.remove('active');
  endingStory.phase='fight';
  startBossBattle(); // 内部会关闭结局剧情、重置玩家/BOSS 状态
  toast('😤 不服！再来一次！','gold');
  if(typeof sfx_reveal_R==='function')sfx_reveal_R();
}
function endingShowGoodEnd(){
  hideEndingOverlay();
  if(!endingDevMode){
    // DEV 模式测试：不修改存档、不永久解锁
    rainbowUnlocked=true;
    frogRainbow=true;
    // 解锁全部功能：青蛙升至最高等级
    frogLv=5;frogXp=FROG_CFG[4].xp;frogXpNext=FROG_CFG[4].xp;
    if(typeof updateFrogUI==='function')updateFrogUI();
    if(typeof saveGame==='function')saveGame();
  }
  document.getElementById('endingResultOverlay').classList.add('active');
  let card=document.getElementById('endingResultCard');
  card.classList.remove('bad');
  document.getElementById('endingResultIcon').textContent='🌈🐸';
  document.getElementById('endingResultTitle').textContent='🎉 冒险成功！彩虹蛙完全觉醒！';
  let totalEarned=(typeof adv!=='undefined'&&adv)?(adv.totalEarned||0):0;
  document.getElementById('endingResultDetail').textContent=endingDevMode
    ?'你击败了青蛙精，守护住了彩虹蛙！\n（DEV 模式测试 · 存档未修改）'
    :'你击败了青蛙精，守护住了彩虹蛙！\n一路钓上来，总收入 '+totalEarned.toLocaleString()+'💰\n彩虹蛙的全部功能已永久解锁——任何愿望，尽可实现！';
  document.getElementById('endingResultMainBtn').textContent=endingDevMode?'✅ 返回开发面板':'⭐ 太棒了！';
  let rb2=document.getElementById('endingResultRetryBtn');
  if(rb2)rb2.style.display='none'; // 胜利后无需再战
  sfx_reveal_UR();
}
function endingResultContinue(){
  document.getElementById('endingResultOverlay').classList.remove('active');
  G.paused=false;
  if(endingDevMode){
    // DEV 模式：返回开发者面板
    endingDevMode=false;
    document.getElementById('devOverlay').classList.add('active');
    let mp=document.getElementById('modePick');if(mp)mp.classList.add('hidden');
    return;
  }
  advQuit();
}

// ============ Boss 战斗（青蛙精） ============
const BATTLE_PICKUPS=[
  {id:'speed', icon:'⚡', color:'#FFD700', dur:6,  name:'疾风', desc:'移动速度 +60%'},
  {id:'shield',icon:'🛡️',color:'#4fc3f7',dur:8,  name:'护盾', desc:'免疫伤害 8 秒'},
  {id:'power', icon:'🎯', color:'#ff7043',dur:6,  name:'重击', desc:'伤害×2 射程+60%'},
  {id:'heal',  icon:'💚', color:'#81c784',dur:0,  name:'治愈', desc:'恢复 30 生命'},
  {id:'rage',  icon:'⭐', color:'#ffd54f',dur:3,  name:'狂怒', desc:'无敌 + 攻速翻倍'},
];
let battleState={active:false,player:null,boss:null,tongues:[],bullets:[],pickups:[],dmgNums:[],keys:{},mouse:{x:0,y:0,down:false},rafId:0,lastT:0,phaseTextT:0,win:false,shakeT:0,pickupT:2.5};
function startBossBattle(){
  hideEndingOverlay();
  G.paused=true;
  document.getElementById('battleOverlay').classList.add('active');
  let cv=document.getElementById('battleCanvas');
  cv.width=window.innerWidth;cv.height=window.innerHeight;
  let ctx=cv.getContext('2d');
  battleState={active:true,
    player:{x:cv.width/2,y:cv.height*0.8,hp:100,maxHp:100,r:26,speed:320,baseSpeed:320,baseDmg:12,baseRange:460,cd:0,invuln:0,dashCd:0,dashT:0,dashVx:0,dashVy:0,buffs:{speed:0,shield:0,power:0,rage:0}},
    boss:{x:cv.width/2,y:cv.height*0.22,hp:500,maxHp:500,r:60,dir:1,moveT:0,atkT:1.2,phase:1,ang:0,phase2:false,hitFlash:0,hitT:0,charging:false,chargeT:0,chargeVx:0,chargeVy:0,vY:20},
    tongues:[],bullets:[],pickups:[],dmgNums:[],
    keys:{},mouse:{x:cv.width/2,y:0,down:false},
    rafId:0,lastT:performance.now(),phaseTextT:1.6,win:false,shakeT:0,pickupT:2.5};
  battlePhaseText('👾 青蛙精出现了！（右键冲刺）');
  document.getElementById('bossPhaseTag').textContent='';
  let bhpEl=document.getElementById('bossHpFill');if(bhpEl)bhpEl.classList.remove('enraged');
  let br=document.getElementById('battleBuffRow');if(br){br.style.display='none';br.innerHTML='';}
  updateBattleHUD();
  // 键盘监听
  document.addEventListener('keydown',battleKeyDown);
  document.addEventListener('keyup',battleKeyUp);
  cv.addEventListener('mousemove',battleMouseMove);
  cv.addEventListener('mousedown',battleMouseDown);
  cv.addEventListener('mouseup',battleMouseUp);
  cv.addEventListener('contextmenu',battleCtxMenu);
  battleState.rafId=requestAnimationFrame(battleLoop);
}
function battlePhaseText(t){
  let el=document.getElementById('battlePhaseText');
  el.style.display='block';el.textContent=t;
  battleState.phaseTextT=1.6;
}
function battleKeyDown(e){
  if(!battleState.active)return;
  if(e.key===' '){e.preventDefault();battleState.keys[' ']=true;battleFireTongue();}
  battleState.keys[e.key.toLowerCase()]=true;
}
function battleKeyUp(e){if(!battleState.active)return;battleState.keys[e.key.toLowerCase()]=false;battleState.keys[' ']=false;}
function battleMouseMove(e){
  if(!battleState.active)return;
  let cv=document.getElementById('battleCanvas');
  let r=cv.getBoundingClientRect();
  battleState.mouse.x=e.clientX-r.left;battleState.mouse.y=e.clientY-r.top;
}
function battleCtxMenu(e){if(battleState.active){e.preventDefault();}}
function battleMouseDown(e){
  if(!battleState.active)return;
  if(e.button===2){e.preventDefault();battleDash();return;}
  battleState.mouse.down=true;battleFireTongue();
}
function battleMouseUp(e){if(!battleState.active)return;battleState.mouse.down=false;}
function battleDash(){
  let bs=battleState,p=bs.player;
  if(p.dashCd>0)return;
  p.dashCd=0.85;
  let ang=Math.atan2(bs.mouse.y-p.y,bs.mouse.x-p.x);
  p.dashT=0.16;
  p.dashVx=Math.cos(ang)*1550;
  p.dashVy=Math.sin(ang)*1550;
  p.invuln=Math.max(p.invuln,0.25);
  for(let i=0;i<10;i++)spawnBattleParticles(p.x,p.y,'#80d8ff',1);
  sfx_reveal_UR();
}
function battleFireTongue(){
  let bs=battleState,p=bs.player;
  if(p.cd>0)return;
  p.cd=(p.buffs.rage>0)?0.19:0.38;
  // 舌头朝鼠标方向伸出（重击时射程增加）
  let range=p.baseRange*(p.buffs.power>0?1.6:1);
  let ang=Math.atan2(bs.mouse.y-p.y,bs.mouse.x-p.x);
  let len=Math.min(range,Math.hypot(bs.mouse.x-p.x,bs.mouse.y-p.y));
  bs.tongues.push({x:p.x,y:p.y-14,ang,len:0,maxLen:len,speed:1300,alive:true});
  sfx_tongue_shoot();
}
function battleLoop(ts){
  if(!battleState.active)return;
  let dt=Math.min((ts-battleState.lastT)/1000,0.05);
  battleState.lastT=ts;
  battleUpdate(dt);
  battleRender();
  battleState.rafId=requestAnimationFrame(battleLoop);
}
function battleUpdate(dt){
  let bs=battleState,p=bs.player,b=bs.boss;
  if(bs.phaseTextT>0)bs.phaseTextT-=dt;
  if(bs.shakeT>0)bs.shakeT-=dt;
  // Buff 计时
  let bf=p.buffs;
  if(bf.speed>0)bf.speed-=dt;
  if(bf.shield>0)bf.shield-=dt;
  if(bf.power>0)bf.power-=dt;
  if(bf.rage>0)bf.rage-=dt;
  p.speed=p.baseSpeed*(bf.speed>0?1.6:1);
  if(p.dashCd>0)p.dashCd-=dt;
  // 玩家移动（冲刺 / 普通行走）
  if(p.dashT>0){
    p.dashT-=dt;
    p.x+=p.dashVx*dt;p.y+=p.dashVy*dt;
  }else{
    let dx=(bs.keys['d']||bs.keys['arrowright']?1:0)-(bs.keys['a']||bs.keys['arrowleft']?1:0);
    let dy=(bs.keys['s']||bs.keys['arrowdown']?1:0)-(bs.keys['w']||bs.keys['arrowup']?1:0);
    if(dx&&dy){dx*=0.707;dy*=0.707;}
    p.x+=dx*p.speed*dt;p.y+=dy*p.speed*dt;
  }
  p.x=Math.max(p.r,Math.min(window.innerWidth-p.r,p.x));
  p.y=Math.max(p.r+70,Math.min(window.innerHeight-p.r-40,p.y));
  p.cd-=dt;if(p.cd<0)p.cd=0;
  if(p.invuln>0)p.invuln-=dt;
  // 舌头推进
  for(let i=bs.tongues.length-1;i>=0;i--){
    let t=bs.tongues[i];
    t.len+=t.speed*dt;
    let tx=p.x+Math.cos(t.ang)*t.len,ty=p.y-14+Math.sin(t.ang)*t.len;
    if(t.len>=t.maxLen)t.alive=false;
    // 命中 Boss（记录命中位置用于伤害数字）
    if(t.alive&&Math.hypot(tx-b.x,ty-b.y)<b.r+16){
      t.alive=false;
      hitBoss(12,tx,ty);
    }
    // 舌头尖端超出屏幕也消失
    if(tx<-50||tx>window.innerWidth+50||ty<-50||ty>window.innerHeight+50)t.alive=false;
    if(!t.alive)bs.tongues.splice(i,1);
  }
  // Boss 行为（突进 / 巡逻+攻击）
  if(b.charging){
    b.chargeT-=dt;
    b.x+=b.chargeVx*dt;b.y+=b.chargeVy*dt;
    // 撞到边界停下
    if(b.x<b.r||b.x>window.innerWidth-b.r||b.y<b.r+15||b.y>window.innerHeight*0.42){
      b.charging=false;
      b.atkT=Math.max(0.7,1.0-b.phase*0.12);
      spawnBattleParticles(b.x,b.y,'#ff5252',16);
      bs.shakeT=Math.max(bs.shakeT,0.3);
      sfx_reveal_N();
    }
    // 突进本体撞到玩家
    if(b.charging&&p.invuln<=0&&p.buffs.rage<=0&&Math.hypot(b.x-p.x,b.y-p.y)<b.r+p.r){
      if(p.buffs.shield>0){
        p.buffs.shield=0;
        spawnBattleParticles(p.x,p.y,'#4fc3f7',18);
        addBattleDmgNum(p.x,p.y-24,'🛡️ 护盾破碎！','#4fc3f7',1.15);
        b.charging=false;b.atkT=0.8;
        sfx_reveal_UR();
      }else{
        p.hp-=30;p.invuln=1.2;
        spawnBattleParticles(p.x,p.y,'#ff5252',16);
        addBattleDmgNum(p.x,p.y-24,'-30','#ff5252',1.25);
        bs.shakeT=Math.max(bs.shakeT,0.25);
        sfx_reveal_N();
      }
    }
  }else{
    b.moveT-=dt;
    if(b.moveT<=0){b.dir*=-1;b.moveT=1.2+Math.random()*1.2;b.vY=(b.vY||20)+(Math.random()*30-15);}
    b.x+=b.dir*(70+b.phase*30+(b.phase2?35:0))*dt;
    b.x=Math.max(b.r,b.x=Math.min(window.innerWidth-b.r,b.x));
    // 垂直游走：vY 反弹机制，不会卡在顶部下不来
    if(!b.vY)b.vY=20;
    let topB=b.r+15,botB=window.innerHeight*0.42;
    b.y+=b.vY*dt;
    if(b.y<topB){b.y=topB;b.vY=Math.abs(b.vY);}
    if(b.y>botB){b.y=botB;b.vY=-Math.abs(b.vY);}
    b.vY+=Math.sin(performance.now()*0.001)*40*dt;
    // Boss 攻击
    b.atkT-=dt;
    if(b.atkT<=0){
      bossAttack();
      b.atkT=Math.max(0.5,1.05-b.phase*0.12-(b.phase2?0.15:0));
    }
  }
  // 受击硬直（击退）
  if(b.hitT>0){b.hitT-=dt;b.x-=b.dir*90*dt;}
  if(b.hitFlash>0)b.hitFlash-=dt;
  // 二阶段触发：血量低于 50%
  if(!b.phase2&&b.hp<=b.maxHp*0.5){
    b.phase2=true;
    b.r=68;
    bs.shakeT=0.9;
    bs.bullets=[]; // 清屏弹幕给玩家喘息
    battlePhaseText('🔥 青蛙精暴怒了！进入二阶段！');
    document.getElementById('bossPhaseTag').textContent=' · 🔥 二阶段';
    document.getElementById('bossPhaseTag').className='battle-phase-tag';
    let bhpEl2=document.getElementById('bossHpFill');if(bhpEl2)bhpEl2.classList.add('enraged');
    for(let i=0;i<42;i++){spawnBattleParticles(b.x+(Math.random()-0.5)*b.r*2,b.y+(Math.random()-0.5)*b.r*2,'#ff5252',1);}
    sfx_reveal_UR();
    b.atkT=1.6; // 短暂喘息
  }
  // 弹幕更新
  for(let i=bs.bullets.length-1;i>=0;i--){
    let bu=bs.bullets[i];
    if(bu.homing){
      let a=Math.atan2(p.y-bu.y,p.x-bu.x);
      bu.vx=Math.cos(a)*bu.spd;bu.vy=Math.sin(a)*bu.spd;
    }
    bu.x+=bu.vx*dt;bu.y+=bu.vy*dt;bu.life-=dt;
    // 弹幕命中玩家（狂怒无敌 / 护盾格挡）
    if(bu.life>0&&p.invuln<=0&&p.buffs.rage<=0&&Math.hypot(bu.x-p.x,bu.y-p.y)<p.r+bu.r){
      bu.life=0;
      if(p.buffs.shield>0){
        spawnBattleParticles(bu.x,bu.y,'#4fc3f7',14);
        addBattleDmgNum(bu.x,bu.y-20,'🛡️','#4fc3f7',1);
        sfx_reveal_UR();
      }else{
        p.hp-=15;p.invuln=1.2;
        spawnBattleParticles(bu.x,bu.y,'#ff8a80',10);
        addBattleDmgNum(bu.x,bu.y-20,'-15','#ff8a80',1);
        sfx_reveal_N();
      }
    }
    if(bu.life<=0||bu.x<-60||bu.x>window.innerWidth+60||bu.y<-60||bu.y>window.innerHeight+60)bs.bullets.splice(i,1);
  }
  // 拾取物生成与拾取
  bs.pickupT-=dt;
  if(bs.pickupT<=0&&bs.pickups.length<3){
    bs.pickupT=4+Math.random()*3;
    spawnBattlePickup();
  }
  for(let i=bs.pickups.length-1;i>=0;i--){
    let pk=bs.pickups[i];
    pk.life-=dt;
    if(pk.life<=0){bs.pickups.splice(i,1);continue;}
    if(Math.hypot(pk.x-p.x,pk.y-p.y)<p.r+pk.r){
      applyBattlePickup(pk.cfg,pk.x,pk.y);
      spawnBattleParticles(pk.x,pk.y,pk.cfg.color,16);
      bs.pickups.splice(i,1);
      if(typeof sfx_good_bonus==='function')sfx_good_bonus();
    }
  }
  // 伤害数字更新
  for(let i=bs.dmgNums.length-1;i>=0;i--){
    let d=bs.dmgNums[i];
    d.y+=d.vy*dt;d.vy*=Math.pow(0.5,dt);d.life-=dt;
    if(d.life<=0)bs.dmgNums.splice(i,1);
  }
  // 胜负判定
  if(p.hp<=0){p.hp=0;battleLose();return;}
  if(b.hp<=0){b.hp=0;battleWin();return;}
  updateBattleHUD();
}
function bossAttack(){
  let bs=battleState,b=bs.boss;
  b.phase=Math.max(1,Math.min(3,Math.ceil((1-b.hp/b.maxHp)*2.6)));
  if(b.phase2){
    // 二阶段：突进 / 环形弹幕 / 扇形 / 追踪
    let r=Math.random();
    if(r<0.22){bossChargeAttack();}
    else if(r<0.5){bossRingAttack();}
    else if(r<0.75){bossFanAttack();}
    else{bossHomingAttack();}
  }else{
    if(Math.random()<0.55){bossFanAttack();}else{bossHomingAttack();}
  }
}
function bossFanAttack(){
  let bs=battleState,p=bs.player,b=bs.boss;
  let cnt=3+b.phase+(b.phase2?2:0);
  let baseAng=Math.atan2(p.y-b.y,p.x-b.x);
  for(let i=0;i<cnt;i++){
    let a=baseAng+(i-(cnt-1)/2)*0.35;
    bs.bullets.push({x:b.x,y:b.y,vx:Math.cos(a)*(160+b.phase*40+(b.phase2?50:0)),vy:Math.sin(a)*(160+b.phase*40+(b.phase2?50:0)),r:10,life:4,spd:0,homing:false});
  }
  spawnBattleParticles(b.x,b.y,'#b388ff',8);
  sfx_reveal_R();
}
function bossHomingAttack(){
  let bs=battleState,p=bs.player,b=bs.boss;
  let n=b.phase2?2:1;
  for(let i=0;i<n;i++){
    bs.bullets.push({x:b.x,y:b.y,vx:0,vy:0,r:12,life:6,spd:120+b.phase*30+(b.phase2?40:0),homing:true});
  }
  spawnBattleParticles(b.x,b.y,'#b388ff',6);
  sfx_reveal_R();
}
function bossRingAttack(){
  let bs=battleState,b=bs.boss;
  let n=18;
  let spd=170+b.phase*30;
  for(let i=0;i<n;i++){
    let a=(Math.PI*2/n)*i;
    bs.bullets.push({x:b.x,y:b.y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,r:9,life:5,spd:0,homing:false});
  }
  spawnBattleParticles(b.x,b.y,'#ff5252',14);
  sfx_reveal_UR();
}
function bossChargeAttack(){
  let bs=battleState,p=bs.player,b=bs.boss;
  b.charging=true;
  b.chargeT=0.55;
  let a=Math.atan2(p.y-b.y,p.x-b.x);
  b.chargeVx=Math.cos(a)*700;b.chargeVy=Math.sin(a)*700;
  spawnBattleParticles(b.x,b.y,'#ff5252',20);
  if(bs.phaseTextT<=0)battlePhaseText('💥 小心！青蛙精冲过来了！'); // 不覆盖更重要的提示
  sfx_reveal_UR();
}
function hitBoss(dmg,x,y){
  let bs=battleState,b=bs.boss,p=bs.player;
  // 重击翻倍 + 12% 暴击
  let mul=(p.buffs.power>0)?2:1;
  let crit=Math.random()<0.12;
  let total=Math.round(dmg*mul*(crit?2:1));
  b.hp-=total;
  // 受击反馈：闪白 + 硬直 + 微震屏
  b.hitFlash=0.15;
  b.hitT=0.18;
  bs.shakeT=Math.max(bs.shakeT,0.05);
  let col=p.buffs.power>0?'#ff7043':'#ffe082';
  addBattleDmgNum(x,y-16,(crit?'💥暴击 ':'')+total,crit?'#ffd54f':col,crit?1.35:1);
  spawnBattleParticles(x,y,col,10);
  if(crit)spawnBattleParticles(x,y,'#ffd54f',14);
  sfx_reveal_R();
}
function addBattleDmgNum(x,y,text,color,scale){
  let bs=battleState;
  if(!bs.dmgNums)bs.dmgNums=[];
  bs.dmgNums.push({x:x+(Math.random()-0.5)*18,y,text,color,scale:scale||1,life:0.9,vy:-70});
}
function spawnBattlePickup(){
  let bs=battleState;
  let cfg=BATTLE_PICKUPS[Math.floor(Math.random()*BATTLE_PICKUPS.length)];
  let x=0,y=0,ok=false,tries=0;
  while(!ok&&tries<24){
    x=90+Math.random()*(window.innerWidth-180);
    y=70+Math.random()*(window.innerHeight*0.5);
    ok=Math.hypot(x-bs.boss.x,y-bs.boss.y)>220&&Math.hypot(x-bs.player.x,y-bs.player.y)>170;
    tries++;
  }
  bs.pickups.push({x,y,r:20,cfg,life:11,t:Math.random()*6});
  spawnBattleParticles(x,y,cfg.color,10);
}
function applyBattlePickup(cfg,x,y){
  let bs=battleState,p=bs.player;
  if(cfg.id==='speed'){p.buffs.speed=cfg.dur;addBattleDmgNum(x,y-20,'⚡ 疾风！','#FFD700',1.15);}
  else if(cfg.id==='shield'){p.buffs.shield=cfg.dur;addBattleDmgNum(x,y-20,'🛡️ 护盾！','#4fc3f7',1.15);}
  else if(cfg.id==='power'){p.buffs.power=cfg.dur;addBattleDmgNum(x,y-20,'🎯 重击！','#ff7043',1.15);}
  else if(cfg.id==='heal'){p.hp=Math.min(p.maxHp,p.hp+30);addBattleDmgNum(x,y-20,'💚 +30','#81c784',1.15);}
  else if(cfg.id==='rage'){p.buffs.rage=cfg.dur;addBattleDmgNum(x,y-20,'⭐ 狂怒！','#ffd54f',1.15);}
}
function spawnBattleParticles(x,y,color,n){
  let cv=document.getElementById('battleCanvas');
  if(!battleState.parts)battleState.parts=[];
  for(let i=0;i<n;i++){
    let a=Math.random()*Math.PI*2;
    battleState.parts.push({x,y,vx:Math.cos(a)*(80+Math.random()*160),vy:Math.sin(a)*(80+Math.random()*160),life:0.5+Math.random()*0.4,color});
  }
}
function updateBattleHUD(){
  let bs=battleState;
  if(!bs.boss)return;
  let bhp=document.getElementById('bossHpFill'),bhn=document.getElementById('bossHpNum');
  let php=document.getElementById('playerHpFill'),phn=document.getElementById('playerHpNum');
  if(bhp)bhp.style.width=Math.max(0,(bs.boss.hp/bs.boss.maxHp)*100)+'%';
  if(bhn)bhn.textContent=Math.max(0,Math.ceil(bs.boss.hp))+'/'+bs.boss.maxHp;
  if(php)php.style.width=Math.max(0,(bs.player.hp/bs.player.maxHp)*100)+'%';
  if(phn)phn.textContent=Math.max(0,Math.ceil(bs.player.hp))+'/'+bs.player.maxHp;
  // Buff 状态显示
  let p=bs.player,chips=[];
  if(p.buffs.speed>0)chips.push('⚡ 疾风 '+p.buffs.speed.toFixed(1)+'s');
  if(p.buffs.shield>0)chips.push('🛡️ 护盾 '+p.buffs.shield.toFixed(1)+'s');
  if(p.buffs.power>0)chips.push('🎯 重击 '+p.buffs.power.toFixed(1)+'s');
  if(p.buffs.rage>0)chips.push('⭐ 狂怒 '+p.buffs.rage.toFixed(1)+'s');
  let bel=document.getElementById('battleBuffRow');
  if(bel){
    if(chips.length){
      bel.style.display='flex';
      bel.innerHTML=chips.map(c=>'<span class="battle-buff-chip">'+c+'</span>').join('');
    }else{bel.style.display='none';bel.innerHTML='';}
  }
}
function battleWin(){
  battleEnd(true);
}
function battleLose(){
  battleEnd(false);
}
// ============ DEV 开发者模式 ============
function openDevMode(){
  let mp=document.getElementById('modePick');if(mp)mp.classList.add('hidden');
  document.getElementById('devOverlay').classList.add('active');
  updateDevFrogLvTxt();
  if(AC&&AC.state==='suspended')AC.resume().catch(()=>{});
}
function devUnlockAllLevels(){
  // 解锁到最后一关之前，使全部关卡可选；真正的“通关最后一关”仍走正常判定
  G.levelCleared=Math.max(G.levelCleared,LEVELS.length-1);
  toast('🔓 已解锁全部关卡（1 ~ '+LEVELS.length+'）！','gold');
}
// 作弊：一键解锁全部图鉴（奖励挂为待领取，方便验收红点与领取流程）
function devUnlockAllAlbum(){
  let got=0,coins=0;
  if(!G.albumPending)G.albumPending={};
  FISH_POOL.forEach(f=>{
    if(!G.album[f.id]){
      G.album[f.id]=1;got++;
      let rw=(f.easter?ALBUM_REWARD.easter:ALBUM_REWARD[f.r])||0;
      coins+=rw;
      if(rw>0)G.albumPending[f.id]=(G.albumPending[f.id]||0)+rw;
    }
    if(!G.albumNew[f.id])G.albumNew[f.id]=true;
  });
  toast('📖 已解锁全部图鉴 '+got+' 种，'+coins+'💰奖励待领取（点图鉴一键领取）','gold');
  updateUI();updateRedDots();
  let ov=document.getElementById('albumOverlay');
  if(ov&&ov.classList.contains('active'))renderAlbum();
  saveGame(true);
}
function devResetProgress(){
  if(!confirm('⚠️ 确定要重置所有进度吗？\n\n青蛙等级、彩虹蛙、岛屿解锁、金币、道具、图鉴、关卡与 100 天挑战进度将全部清空，且无法恢复！'))return;
  // 1) 清空存档与本地记录
  try{localStorage.removeItem('nbc_save');localStorage.removeItem('nbc_intro_seen');localStorage.removeItem('goalHudPos');}catch(e){}
  // 2) 退出当前模式
  if(adv.active&&typeof advQuit==='function')advQuit();
  if(gameMode&&typeof exitToMenu==='function')exitToMenu();
  // 3) 青蛙养成
  frogLv=1;frogXp=0;frogXpNext=FROG_CFG[0].xp;frogRainbow=false;rainbowUnlocked=false;
  if(typeof updateFrogUI==='function')updateFrogUI();
  // 4) 挑战进度
  G.coins=START_COINS;G.totalEarned=0;G.gameDay=0;G.levelCleared=0;G.gameEnded=false;
  G.pitySR=0;G.pitySSR=0;G.totalPulls=0;G.album={};G.albumNew={};G.albumFilter='all';G.catches=[];
  G.dailyDate='';G.dailyTasks={};G.dailyClaimed={};G.signInDate='';G.signInDay=0;G.redDots={};
  G.islandUnlocked=false;G.tutorial=0;G.phase='idle';
  G.advTutShown=false;G.lvlTutShown=false; // 模式专属提示必须一起重置，否则重置后永远不再弹
  G.totalCaught=0;G.seedlings={};G.gardenPlots=[];G.gardenUnlocked=false;G.gardenMode=false;G.gardenTutSeen=false;G.gardenTutPending=false;G.gardenTutStep=0;G.clockMin=0;G.worldTime=0;
  G.items={flash:3,accuracy:1,lucky:1,sandglass:1,oxygen:1,frogdrink:1};
  G.buffs={accuracyNext:false,luckyBait:0,rareBoost:0,nextUR:false,frogPower:0};
  // 5) 关卡 / 冒险 / 潜水状态
  levelIdx=0;levelCaught=0;levelCasts=0;levelComplete_d=false;
  levelProgress={fish:0,zone_cloud:0,zone_mountain:0,zone_sky:0,zone_sun:0,R:0,SR:0,SSR:0,UR:0,mtn_R:0};
  diveState.active=false;diveState.earned=0;diveState.sessionsLeft=3;
  adv.day=1;adv.dayEarned=0;adv.dayCasts=0;adv.danger=0;adv.gameOver=false;adv.gameWin=false;adv.totalEarned=0;
  adv.fishBag=[];adv.plantedVeg=[];adv.plantedFish=[];
  // 6) 关闭残留弹窗
  ['goalOverlay','levelCompleteOverlay','endingResultOverlay','advResultOverlay','endingOverlay','battleOverlay','gardenOverlay'].forEach(function(id){
    let el=document.getElementById(id);if(el)el.classList.remove('active');
  });
  // 7) 刷新界面
  updateGoalHUD();updateUI();
  if(typeof updateGardenCardUI==='function')updateGardenCardUI();
  if(typeof updateAdvHUD==='function')updateAdvHUD();
  if(typeof updateDiveBtn==='function')updateDiveBtn();
  toast('🗑️ 所有进度已重置！','red');
  // 8) 回到最初的起点：重播开场剧情
  startIntroStory();
}
function devClose(){
  document.getElementById('devOverlay').classList.remove('active');
  let mp=document.getElementById('modePick');if(mp)mp.classList.remove('hidden');
}
function devStartBoss(){
  document.getElementById('devOverlay').classList.remove('active');
  let mp=document.getElementById('modePick');if(mp)mp.classList.add('hidden');
  if(adv.active)advQuit();
  startBossBattle();
  battleState.devMode=true;
  let exitBtn=document.getElementById('battleExitBtn');
  if(exitBtn)exitBtn.style.display='inline-block';
}
function devAddCoins(){
  G.coins+=1000000;
  updateUI();
  saveGame();
  toast('💰 +100万金币（DEV）','gold');
}
function devStartEnding(){
  // DEV 模式测试最终剧情：完整体验 剧情→选择→BOSS战→结局，但不修改存档
  document.getElementById('devOverlay').classList.remove('active');
  if(adv.active)advQuit();
  if(gameMode==='level')exitToMenu();
  let mp=document.getElementById('modePick');if(mp)mp.classList.add('hidden');
  endingDevMode=true;
  startEndingStory();
}
function devReplayTutorial(){
  document.getElementById('devOverlay').classList.remove('active');
  enterTutorialReview();
}
// 作弊：解锁种鱼模式并立刻进入（首次进入会自动弹教学）
function devUnlockGarden(){
  document.getElementById('devOverlay').classList.remove('active');
  G.gardenUnlocked=true;G.gardenTutSeen=false;G.gardenTutPending=true;
  if(!G.seedlings)G.seedlings={};
  // 送几种鱼苗方便试玩
  [FISH_POOL[0],FISH_POOL[5],FISH_POOL[9]].forEach(f=>{if(f)G.seedlings[f.id]=(G.seedlings[f.id]||0)+3;});
  updateGardenCardUI();updateRedDots();saveGame(true);
  toast('🐠 种鱼模式已解锁！马上打开教学','gold');
  setTimeout(()=>openGardenMode(),700);
}
// 作弊：重看种鱼教学（把卡牌/引导都唤醒）
function devReplayGardenTut(){
  document.getElementById('devOverlay').classList.remove('active');
  G.gardenUnlocked=true;G.gardenTutSeen=false;G.gardenTutPending=true;G.gardenTutStep=0;
  updateGardenCardUI();updateRedDots();
  openGardenTutorial(true);
}
function updateDevFrogLvTxt(){
  let el=document.getElementById('devFrogLvTxt');
  if(el)el.textContent='Lv.'+frogLv+' '+FROG_CFG[frogLv-1].name;
}
function devSetFrogLv(lv){
  let target=Math.max(1,Math.min(5,lv));
  frogLv=target;
  frogXp=0;
  frogXpNext=FROG_CFG[frogLv-1].xp;
  updateFrogUI();
  updateUI();
  saveGame();
  updateDevFrogLvTxt();
  toast('🐸 青蛙已设为 Lv.'+frogLv+' '+FROG_CFG[frogLv-1].name+'（DEV）','gold');
}
function battleExit(){
  let bs=battleState;
  if(!bs.active)return;
  bs.active=false;
  cancelAnimationFrame(bs.rafId);
  document.removeEventListener('keydown',battleKeyDown);
  document.removeEventListener('keyup',battleKeyUp);
  let cv=document.getElementById('battleCanvas');
  cv.removeEventListener('mousemove',battleMouseMove);
  cv.removeEventListener('mousedown',battleMouseDown);
  cv.removeEventListener('mouseup',battleMouseUp);
  cv.removeEventListener('contextmenu',battleCtxMenu);
  document.getElementById('battleOverlay').classList.remove('active');
  let exitBtn=document.getElementById('battleExitBtn');
  if(exitBtn)exitBtn.style.display='none';
  G.paused=false;
  if(bs.devMode){
    document.getElementById('devOverlay').classList.add('active');
    toast('🏳️ 已退出 BOSS 战（DEV 模式）','orange');
  }else{
    exitToMenu();
  }
}
function battleEnd(win){
  let bs=battleState;
  if(!bs.active)return;
  bs.active=false;
  cancelAnimationFrame(bs.rafId);
  document.removeEventListener('keydown',battleKeyDown);
  document.removeEventListener('keyup',battleKeyUp);
  let cv=document.getElementById('battleCanvas');
  cv.removeEventListener('mousemove',battleMouseMove);
  cv.removeEventListener('mousedown',battleMouseDown);
  cv.removeEventListener('mouseup',battleMouseUp);
  cv.removeEventListener('contextmenu',battleCtxMenu);
  document.getElementById('battleOverlay').classList.remove('active');
  let exitBtn=document.getElementById('battleExitBtn');
  if(exitBtn)exitBtn.style.display='none';
  G.paused=false;
  if(bs.devMode){
    // DEV 模式：战斗结束直接返回开发面板，不进入结局剧情、不改变存档
    if(win){toast('⚔️ BOSS 战胜利！（DEV 模式）','gold');sfx_good_bonus();}
    else{toast('💀 BOSS 战失败！（DEV 模式）','orange');}
    document.getElementById('devOverlay').classList.add('active');
    return;
  }
  if(win){
    endingStory.phase='win';endingStory.script=ENDING_SCRIPT_WIN;
    document.getElementById('endingOverlay').classList.add('active');
    document.getElementById('endingFrogEmoji').textContent='🌈🐸';
    renderEndingSceneStars();
    showEndingLine(0);
  }else{
    endingStory.phase='lose';endingStory.script=ENDING_SCRIPT_LOSE;
    document.getElementById('endingOverlay').classList.add('active');
    document.getElementById('endingFrogEmoji').textContent='🐸';
    renderEndingSceneStars();
    showEndingLine(0);
  }
}
function battleRender(){
  let cv=document.getElementById('battleCanvas');
  let ctx=cv.getContext('2d');
  let W=cv.width,H=cv.height;
  let bs=battleState;
  if(!bs.player)return;
  ctx.save();
  // 屏幕震动
  if(bs.shakeT>0){
    let s=Math.min(14,bs.shakeT*20);
    ctx.translate((Math.random()-0.5)*s*2,(Math.random()-0.5)*s*2);
  }
  // 背景
  let g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#0b1030');g.addColorStop(0.6,'#12265a');g.addColorStop(1,'#0a3550');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  // 星空
  for(let i=0;i<30;i++){ctx.fillStyle='rgba(255,255,255,'+(0.2+Math.abs(Math.sin(performance.now()*0.001+i))*0.5)+')';ctx.beginPath();ctx.arc((i*97)%W,(i*53)%H,1.5,0,Math.PI*2);ctx.fill();}
  // 水面波纹（底部）
  ctx.strokeStyle='rgba(120,200,255,0.12)';ctx.lineWidth=1;
  for(let i=0;i<8;i++){
    ctx.beginPath();
    let y=H*0.88+i*14;
    for(let x=0;x<=W;x+=20){ctx.lineTo(x,y+Math.sin(x*0.03+performance.now()*0.002+i)*6);}
    ctx.stroke();
  }
  // 粒子
  if(bs.parts){
    for(let i=bs.parts.length-1;i>=0;i--){
      let pt=bs.parts[i];
      pt.x+=pt.vx*0.016;pt.y+=pt.vy*0.016;pt.life-=0.016;
      ctx.globalAlpha=Math.max(0,pt.life);
      ctx.fillStyle=pt.color;
      ctx.beginPath();ctx.arc(pt.x,pt.y,4,0,Math.PI*2);ctx.fill();
      if(pt.life<=0)bs.parts.splice(i,1);
    }
    ctx.globalAlpha=1;
  }
  // 舌头（重击时更粗更红）
  let p=bs.player;
  let power=p.buffs.power>0;
  for(let t of bs.tongues){
    let tx=p.x+Math.cos(t.ang)*t.len,ty=p.y-14+Math.sin(t.ang)*t.len;
    ctx.strokeStyle=power?'#ff8a50':'#FF6B6B';
    ctx.lineWidth=power?10:7;ctx.lineCap='round';
    ctx.shadowColor=power?'#ff7043':'#FF6B6B';ctx.shadowBlur=power?14:0;
    ctx.beginPath();ctx.moveTo(p.x,p.y-14);ctx.lineTo(tx,ty);ctx.stroke();
    ctx.shadowBlur=0;
    ctx.fillStyle='#ff5252';ctx.beginPath();ctx.arc(tx,ty,power?8:6,0,Math.PI*2);ctx.fill();
  }
  // 弹幕
  for(let bu of bs.bullets){
    ctx.fillStyle=bu.homing?'#b388ff':'#4fc3f7';
    ctx.shadowColor=bu.homing?'#b388ff':'#4fc3f7';ctx.shadowBlur=12;
    ctx.beginPath();ctx.arc(bu.x,bu.y,bu.r,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
  }
  // 增益道具
  for(let pk of bs.pickups){
    let tt=pk.t+performance.now()*0.001;
    let pulse=1+Math.sin(tt*4)*0.08;
    let blink=pk.life<2.5?(Math.floor(tt*8)%2===0?0.3:1):1;
    ctx.save();
    ctx.translate(pk.x,pk.y+Math.sin(tt*2.4)*6);
    ctx.shadowColor=pk.cfg.color;ctx.shadowBlur=20;
    ctx.globalAlpha=0.28*blink;
    ctx.fillStyle=pk.cfg.color;
    ctx.beginPath();ctx.arc(0,0,pk.r*pulse,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=blink;
    ctx.strokeStyle=pk.cfg.color;ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(0,0,pk.r+4,0,Math.PI*2);ctx.stroke();
    ctx.font=(pk.r*1.15)+'px serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(pk.cfg.icon,0,0);
    ctx.globalAlpha=1;
    ctx.restore();
  }
  // 伤害数字
  for(let d of bs.dmgNums){
    ctx.globalAlpha=Math.max(0,Math.min(1,d.life*1.8));
    ctx.fillStyle=d.color;
    ctx.font='bold '+Math.round(20*d.scale)+'px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.strokeStyle='rgba(0,0,0,0.6)';ctx.lineWidth=3;
    ctx.strokeText(d.text,d.x,d.y);
    ctx.fillText(d.text,d.x,d.y);
  }
  ctx.globalAlpha=1;
  // Boss 青蛙精
  drawBossFrog(ctx,bs.boss);
  // 玩家青蛙
  drawBattlePlayer(ctx,p);
  ctx.restore();
  // 阶段提示
  if(bs.phaseTextT>0){
    let el=document.getElementById('battlePhaseText');
    el.style.opacity=Math.min(1,bs.phaseTextT);
    if(bs.phaseTextT<=0.3)el.style.opacity=bs.phaseTextT/0.3;
  }else{let el=document.getElementById('battlePhaseText');el.style.display='none';}
}
function drawBossFrog(ctx,b){
  ctx.save();
  ctx.translate(b.x,b.y);
  // 受击抖动
  if(b.hitT>0)ctx.translate((Math.random()-0.5)*8,(Math.random()-0.5)*8);
  let t=performance.now()*0.001;
  // 二阶段愤怒气息
  if(b.phase2){
    for(let i=0;i<6;i++){
      let a=t*2+i*1.05;
      let rr=b.r+16+Math.sin(t*3+i)*6;
      ctx.globalAlpha=0.3+Math.sin(t*5+i*2)*0.15;
      ctx.fillStyle='#ff5252';
      ctx.beginPath();ctx.arc(Math.cos(a)*rr,Math.sin(a)*rr*0.8,6,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
  }
  // 突进蓄力警示圈
  if(b.charging){
    ctx.globalAlpha=0.35+Math.sin(t*20)*0.3;
    ctx.strokeStyle='#ff5252';ctx.lineWidth=5;
    ctx.beginPath();ctx.arc(0,0,b.r+20,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.arc(0,0,b.r+34,0,Math.PI*2);ctx.stroke();
    ctx.globalAlpha=1;
  }
  // 光环（二阶段红色）
  let glowCol=b.phase2?'rgba(255,82,82,0.9)':'rgba(179,136,255,0.8)';
  ctx.shadowColor=glowCol;ctx.shadowBlur=30+(b.phase2?22:0);
  // 身体（二阶段变红）
  let c1=b.phase2?'#ff5252':'#b388ff';
  let c2=b.phase2?'#7a1020':'#6a1b9a';
  let grad=ctx.createRadialGradient(0,-10,10,0,0,b.r);
  grad.addColorStop(0,c1);grad.addColorStop(1,c2);
  ctx.fillStyle=grad;
  ctx.beginPath();ctx.ellipse(0,0,b.r,b.r*0.82,0,0,Math.PI*2);ctx.fill();
  ctx.shadowBlur=0;
  // 二阶段暴怒纹路
  if(b.phase2){
    ctx.strokeStyle='rgba(255,205,130,0.55)';ctx.lineWidth=2.5;
    for(let i=0;i<4;i++){
      let a=i*Math.PI/2+t*2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a)*b.r*0.3,Math.sin(a)*b.r*0.3);
      ctx.lineTo(Math.cos(a)*b.r*0.75,Math.sin(a)*b.r*0.75);
      ctx.stroke();
    }
  }
  // 肚皮
  ctx.fillStyle='rgba(255,255,255,0.15)';
  ctx.beginPath();ctx.ellipse(0,b.r*0.25,b.r*0.55,b.r*0.35,0,0,Math.PI*2);ctx.fill();
  // 后腿
  ctx.fillStyle=b.phase2?'#b71c1c':'#7e57c2';
  ctx.beginPath();ctx.ellipse(-b.r*0.8,b.r*0.45,b.r*0.32,b.r*0.22,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(b.r*0.8,b.r*0.45,b.r*0.32,b.r*0.22,0,0,Math.PI*2);ctx.fill();
  // 眼睛（二阶段红眼发光）
  let lookX=Math.sin(t)*3,lookY=Math.cos(t*1.3)*3;
  if(b.phase2){ctx.shadowColor='#ff5252';ctx.shadowBlur=10;}
  ctx.fillStyle='#fff';
  ctx.beginPath();ctx.ellipse(-b.r*0.35,-b.r*0.5,b.r*0.28,b.r*0.32,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(b.r*0.35,-b.r*0.5,b.r*0.28,b.r*0.32,0,0,Math.PI*2);ctx.fill();
  ctx.shadowBlur=0;
  ctx.fillStyle=b.phase2?'#ff1744':'#1a0a2e';
  ctx.beginPath();ctx.arc(-b.r*0.35+lookX,-b.r*0.5+lookY,b.r*0.13,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(b.r*0.35+lookX,-b.r*0.5+lookY,b.r*0.13,0,Math.PI*2);ctx.fill();
  // 嘴巴（二阶段变成怒吼）
  ctx.strokeStyle=b.phase2?'#4a0000':'#3e1050';ctx.lineWidth=4;ctx.lineCap='round';
  if(b.phase2){
    ctx.beginPath();ctx.arc(0,b.r*0.05,b.r*0.5,-0.15,Math.PI+0.15);ctx.stroke();
    // 尖牙
    ctx.fillStyle='#fff';
    ctx.beginPath();ctx.moveTo(-b.r*0.22,b.r*0.05);ctx.lineTo(-b.r*0.1,b.r*0.32);ctx.lineTo(0,b.r*0.05);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(b.r*0.22,b.r*0.05);ctx.lineTo(b.r*0.1,b.r*0.32);ctx.lineTo(0,b.r*0.05);ctx.closePath();ctx.fill();
  }else{
    ctx.beginPath();ctx.arc(0,b.r*0.1,b.r*0.45,-0.5,Math.PI+0.5);ctx.stroke();
  }
  // 王冠（二阶段碎裂歪斜）
  ctx.save();
  if(b.phase2)ctx.rotate(Math.sin(t*3)*0.14);
  ctx.fillStyle=b.phase2?'#9e9e9e':'#FFD700';
  if(b.phase2){ctx.fillStyle='#bdbdbd';}
  ctx.beginPath();
  ctx.moveTo(-b.r*0.28,-b.r*0.78);
  ctx.lineTo(-b.r*0.28,-b.r*1.05);ctx.lineTo(-b.r*0.12,-b.r*0.88);
  ctx.lineTo(0,-b.r*1.12);ctx.lineTo(b.r*0.12,-b.r*0.88);
  ctx.lineTo(b.r*0.28,-b.r*1.05);ctx.lineTo(b.r*0.28,-b.r*0.78);
  ctx.closePath();ctx.fill();
  if(b.phase2){
    // 碎裂缝隙
    ctx.strokeStyle='#616161';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(-b.r*0.1,-b.r*0.78);ctx.lineTo(-b.r*0.18,-b.r*0.95);ctx.stroke();
    ctx.beginPath();ctx.moveTo(b.r*0.14,-b.r*0.78);ctx.lineTo(b.r*0.22,-b.r*0.92);ctx.stroke();
  }
  ctx.restore();
  // 受击闪白（真正命中瞬间）
  if(b.hitFlash>0){
    ctx.globalAlpha=Math.min(1,b.hitFlash*7);
    ctx.fillStyle='#fff';
    ctx.beginPath();ctx.ellipse(0,0,b.r,b.r*0.82,0,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;
  }
  ctx.restore();
}
function drawBattlePlayer(ctx,p){
  ctx.save();
  ctx.translate(p.x,p.y);
  let t=performance.now()*0.001;
  if(p.invuln>0&&Math.floor(t*12)%2===0)ctx.globalAlpha=0.4;
  // 护盾光圈
  if(p.buffs.shield>0){
    ctx.globalAlpha=0.5+Math.sin(t*6)*0.3;
    ctx.strokeStyle='#4fc3f7';ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(0,0,p.r+13,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='rgba(79,195,247,0.12)';
    ctx.beginPath();ctx.arc(0,0,p.r+13,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;
  }
  // 狂怒金光
  if(p.buffs.rage>0&&Math.floor(t*10)%2===0){
    ctx.globalAlpha=0.5;ctx.fillStyle='#ffd54f';
    ctx.beginPath();ctx.ellipse(0,0,p.r+8,p.r*0.85+8,0,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;
  }
  // 重击红圈
  if(p.buffs.power>0){
    ctx.globalAlpha=0.6;ctx.strokeStyle='#ff7043';ctx.lineWidth=2.5;
    ctx.beginPath();ctx.arc(0,0,p.r+7,0,Math.PI*2);ctx.stroke();
    ctx.globalAlpha=1;
  }
  // 疾风残影
  if(p.buffs.speed>0){
    ctx.globalAlpha=0.45;ctx.fillStyle='#FFD700';
    ctx.beginPath();ctx.arc(-p.r*1.25,0,5,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(-p.r*1.7,-p.r*0.3,3.5,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;
  }
  // 冲刺拖尾
  if(p.dashT>0){
    ctx.globalAlpha=0.35+Math.random()*0.25;
    ctx.fillStyle='#80d8ff';
    ctx.beginPath();ctx.ellipse(-p.r*0.9,0,p.r*0.8,p.r*0.6,0,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;
  }
  // 身体
  let bodyCol=rainbowUnlocked||frogRainbow?'hsl('+((t*80)%360)+',85%,60%)':'#4CAF50';
  ctx.shadowColor=bodyCol;ctx.shadowBlur=18;
  ctx.fillStyle=bodyCol;
  ctx.beginPath();ctx.ellipse(0,0,p.r,p.r*0.85,0,0,Math.PI*2);ctx.fill();
  ctx.shadowBlur=0;
  // 肚皮
  ctx.fillStyle='rgba(255,255,255,0.35)';
  ctx.beginPath();ctx.ellipse(0,p.r*0.25,p.r*0.6,p.r*0.35,0,0,Math.PI*2);ctx.fill();
  // 眼睛
  ctx.fillStyle='#fff';
  ctx.beginPath();ctx.arc(-p.r*0.32,-p.r*0.42,p.r*0.26,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(p.r*0.32,-p.r*0.42,p.r*0.26,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#1b5e20';
  ctx.beginPath();ctx.arc(-p.r*0.32+Math.sin(t*2)*2,-p.r*0.42,p.r*0.11,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(p.r*0.32+Math.sin(t*2)*2,-p.r*0.42,p.r*0.11,0,Math.PI*2);ctx.fill();
  // 嘴巴
  ctx.strokeStyle='#1b5e20';ctx.lineWidth=3;ctx.lineCap='round';
  ctx.beginPath();ctx.arc(0,p.r*0.15,p.r*0.4,0.3,Math.PI-0.3);ctx.stroke();
  ctx.restore();
}

window.startEndingStory=startEndingStory;window.endingNext=endingNext;window.endingChoose=endingChoose;window.endingResultContinue=endingResultContinue;window.battleRetryFromLose=battleRetryFromLose;
window.introNext=introNext;window.skipIntroStory=skipIntroStory;window.startIntroStory=startIntroStory;
window.openDevMode=openDevMode;window.devClose=devClose;window.devStartBoss=devStartBoss;window.devAddCoins=devAddCoins;window.devReplayTutorial=devReplayTutorial;window.devSetFrogLv=devSetFrogLv;window.devStartEnding=devStartEnding;window.endingSkip=endingSkip;window.battleExit=battleExit;
window.devResetProgress=devResetProgress;window.devReplayIntro=devReplayIntro;
