const BASIC = {
  '人體解剖學與實驗': ['解剖','骨','關節','韌帶','肌肉','肌腱','神經','血管','起點','止點','附著','椎骨','顱骨','胸骨','肋骨','肩胛','肱骨','橈骨','尺骨','股骨','脛骨','腓骨','蹠骨','跗骨','腕骨','器官','腦室'],
  '人體生理學與實驗': ['生理','細胞膜','動作電位','鈉','鉀','荷爾蒙','內分泌','腎臟','腎上腺','血液','血壓','心輸出量','呼吸','肺泡','神經傳導','體溫調節','酸鹼'],
  '運動生理學與實驗': ['最大攝氧','攝氧量','vo2','乳酸','乳酸閾值','無氧閾值','atp','能量系統','磷酸肌酸','心率','運動強度','耗氧','有氧','無氧','運動後過攝氧','ecoc','肌纖維'],
  '運動營養學': ['營養','碳水','醣類','蛋白質','脂肪','肝醣','維生素','礦物質','補水','水分','電解質','膳食','飲食','熱量','卡路里'],
  '運動生物力學': ['生物力學','運動學','動力學','力矩','力臂','槓桿','地面反作用力','重心','角速度','角加速度','動量','衝量','牛頓','摩擦力','質心'],
  '運動心理學': ['心理','焦慮','動機','喚醒','自信','目標設定','意象','注意力','壓力','人格','團隊凝聚'],
  '運動保健之經營與管理': ['經營','管理','組織','法規','法律','倫理','紀錄','行政','保險','風險管理','防護室','器材管理','責任'],
  '健康管理': ['健康管理','慢性病','糖尿病','高血壓','肥胖','代謝症候群','健康促進','危險因子','體脂','身體組成']
};

const PROFESSIONAL = {
  '運動傷害防護學與實驗': ['扭傷','拉傷','挫傷','骨折','脫臼','傷害機轉','組織癒合','發炎','韌帶損傷','肌肉拉傷','骨裂','應力性骨折','過度使用'],
  '運動處方': ['運動處方','fitt','頻率','強度','時間','型態','復健運動','治療性運動','伸展處方','回場'],
  '運動貼紮與實驗': ['貼紮','包紮','taping','tape','anchor','heel lock','figure-8','basketweave','彈性繃帶','白貼'],
  '運動傷害防護儀器之運用': ['冷療','熱療','電療','超音波','短波','紅外線','雷射','水療','冰敷','熱敷','tens','ifc','儀器'],
  '運動推拿指壓學': ['推拿','按摩','指壓','effleurage','petrissage','friction','揉捏','摩擦按摩'],
  '運動傷害評估學': ['特殊測試','test','徒手肌力','mmt','關節活動度','rom','觸診','評估','陽性','anterior drawer','lachman','mcmurray','thompson','valgus','varus'],
  '運動保健學': ['急救','腦震盪','熱中暑','熱衰竭','低體溫','休克','cpr','aed','脊椎固定','緊急處置','環境疾病','運動前評估'],
  '運動體能訓練': ['肌力訓練','體能訓練','爆發力','增強式','plyometric','速度訓練','敏捷','週期化','阻力訓練','1rm','深蹲','硬舉']
};

function scoreMap(text, map) {
  const t = String(text || '').toLowerCase();
  const scored = [];
  for (const [subject, words] of Object.entries(map)) {
    let score = 0;
    for (const word of words) {
      if (t.includes(word.toLowerCase())) score += word.length >= 4 ? 2 : 1;
    }
    if (score > 0) scored.push({ subject, score });
  }
  scored.sort((a,b) => b.score - a.score);
  return scored;
}

export function classifySubject(text, group) {
  const map = group === '運動防護專業科學' ? PROFESSIONAL : BASIC;
  const scored = scoreMap(text, map);
  if (!scored.length) return { subject: '未分類（待人工複核）', confidence: 0, classification: 'system' };
  const top = scored[0];
  const second = scored[1]?.score || 0;
  const confidence = Math.min(1, Math.max(0.25, (top.score - second + 1) / (top.score + 2)));
  return { subject: top.subject, confidence: Number(confidence.toFixed(2)), classification: 'system' };
}
