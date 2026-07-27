'use strict';
const ENHANCEMENT_CONFIG = {
  storageKeys: { favorites:'rk_favorites_v1', streak:'rk_streak_v1', badges:'rk_badges_v1', adaptive:'rk_adaptive_v1', daily:'rk_daily_v1' },
  dailyCount: 10,
  badges: [
    {id:'first', icon:'🌟', name:'Eerste stap', text:'Maak je eerste oefenblad', test:s=>s.totalWorksheets>=1},
    {id:'perfect', icon:'💯', name:'Foutloos', text:'Maak een foutloos oefenblad', test:s=>s.perfectSheets>=1},
    {id:'hundred', icon:'🏆', name:'Honderd goed', text:'Beantwoord 100 sommen goed', test:s=>s.totalGood>=100},
    {id:'streak3', icon:'🔥', name:'Driedaagse reeks', text:'Oefen 3 dagen achter elkaar', test:s=>s.streak>=3},
    {id:'explorer', icon:'🧭', name:'Ontdekker', text:'Oefen 5 verschillende onderdelen', test:s=>s.usedCategories>=5},
    {id:'master', icon:'👑', name:'Rekenmeester', text:'Behaal 90% na minstens 100 sommen', test:s=>s.total>=100 && s.percent>=90}
  ]
};
