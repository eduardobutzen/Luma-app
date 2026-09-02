-- ============================================================================
-- Luma — Migration 24: conteúdo das receitas curadas
--
-- 150 receitas do acervo do app, distribuídas em: café da manhã, shakes,
-- proteína animal, vegetarianas/veganas, acompanhamentos, saladas, snacks,
-- pós-treino, doces fit, low carb/keto e bulking.
--
-- Rode DEPOIS da 23_curated_recipes.sql. É idempotente: rodar de novo atualiza
-- as receitas existentes (casadas pelo título) em vez de duplicar.
--
-- Macros são POR PORÇÃO. `image_url` fica null: sem foto, o app usa o
-- placeholder do cartão. Para ilustrar depois, basta um UPDATE por título —
-- nenhuma mudança no aplicativo é necessária.
-- ============================================================================

do $$
declare rid uuid;
begin

  rid := public.add_curated_recipe(
    'Ovos mexidos clássicos',
    'Café da manhã básico, rápido e redondo em proteína.',
    null,
    1, 220, 18, 2, 15,
    array[
    'Bata 3 ovos com sal e pimenta.',
    'Leve à frigideira antiaderente em fogo baixo, mexendo sem parar até cremoso.',
    'Sirva na hora.'
  ]);

  rid := public.add_curated_recipe(
    'Omelete de claras com espinafre',
    'Alto em proteína, baixo em gordura, ótimo para cutting.',
    null,
    1, 150, 24, 3, 3,
    array[
    'Bata 5 claras.',
    'Refogue espinafre picado na frigideira.',
    'Adicione as claras e cozinhe dobrando ao meio.'
  ]);

  rid := public.add_curated_recipe(
    'Aveia overnight com banana',
    'Prático: prepara à noite e come de manhã.',
    null,
    1, 340, 12, 55, 8,
    array[
    'Misture 50g de aveia, 200ml de leite, 1 banana amassada e canela num pote.',
    'Leve à geladeira de um dia para o outro.'
  ]);

  rid := public.add_curated_recipe(
    'Panqueca de banana e ovo',
    'Simples, sem farinha, gostosa. Só dois ingredientes.',
    null,
    1, 260, 14, 30, 9,
    array[
    'Amasse 1 banana e misture com 2 ovos.',
    'Frite pequenas porções em frigideira antiaderente até dourar dos dois lados.'
  ]);

  rid := public.add_curated_recipe(
    'Tapioca com ovo',
    'Clássico brasileiro fit.',
    null,
    1, 250, 15, 30, 8,
    array[
    'Espalhe goma de tapioca na frigideira quente.',
    'Quando firmar, vire.',
    'Recheie com ovo mexido e dobre.'
  ]);

  rid := public.add_curated_recipe(
    'Pão integral com pasta de amendoim e banana',
    'Combinação de carboidrato complexo e gordura boa.',
    null,
    1, 320, 10, 40, 14,
    array[
    'Torre 2 fatias de pão integral.',
    'Passe 1 colher de sopa de pasta de amendoim.',
    'Cubra com rodelas de banana.'
  ]);

  rid := public.add_curated_recipe(
    'Iogurte grego com granola e frutas vermelhas',
    'Rápido, sem cozinhar, rico em proteína.',
    null,
    1, 280, 20, 30, 8,
    array[
    'Misture 200g de iogurte grego natural com 30g de granola e um punhado de frutas vermelhas.'
  ]);

  rid := public.add_curated_recipe(
    'Mingau de aveia com whey',
    'Aveia clássica turbinada em proteína.',
    null,
    1, 350, 30, 40, 6,
    array[
    'Cozinhe 40g de aveia com água ou leite até engrossar.',
    'Desligue o fogo e misture 1 scoop de whey.'
  ]);

  rid := public.add_curated_recipe(
    'Wrap de ovo com queijo cottage',
    'Café da manhã salgado prático.',
    null,
    1, 230, 20, 4, 14,
    array[
    'Faça um ovo em formato de panqueca fina na frigideira.',
    'Recheie com cottage e enrole.'
  ]);

  rid := public.add_curated_recipe(
    'Smoothie bowl de frutas vermelhas',
    'Refrescante, ótimo pré ou pós-treino leve.',
    null,
    1, 300, 15, 45, 6,
    array[
    'Bata frutas vermelhas congeladas, 1 scoop de whey e um pouco de leite até virar creme espesso.',
    'Sirva em tigela com os toppings de sua preferência.'
  ]);

  rid := public.add_curated_recipe(
    'Torrada de abacate com ovo poché',
    'Gordura boa com proteína.',
    null,
    1, 310, 16, 25, 17,
    array[
    'Amasse meio abacate sobre uma torrada integral.',
    'Tempere com limão e sal.',
    'Cubra com ovo poché.'
  ]);

  rid := public.add_curated_recipe(
    'Panqueca de aveia e banana',
    'Panqueca proteica sem açúcar refinado. Rende 2 unidades.',
    null,
    1, 280, 14, 40, 7,
    array[
    'Bata no liquidificador 1 banana, 2 ovos e 40g de aveia.',
    'Frite porções pequenas em frigideira antiaderente.'
  ]);

  rid := public.add_curated_recipe(
    'Vitamina de banana com aveia e whey',
    'Café da manhã líquido, para quem tem pressa.',
    null,
    1, 330, 28, 40, 5,
    array[
    'Bata no liquidificador 1 banana, 200ml de leite, 30g de aveia e 1 scoop de whey.'
  ]);

  rid := public.add_curated_recipe(
    'Cuscuz nordestino com ovo',
    'Café da manhã regional rico em carboidrato.',
    null,
    1, 280, 14, 40, 6,
    array[
    'Hidrate o cuscuz com água quente e sal.',
    'Cozinhe no vapor por 5 minutos.',
    'Sirva com ovo frito ou mexido por cima.'
  ]);

  rid := public.add_curated_recipe(
    'Iogurte natural com chia e mel',
    'Simples, rico em fibras.',
    null,
    1, 200, 12, 25, 6,
    array[
    'Misture 1 colher de sopa de chia no iogurte e deixe descansar 10 minutos.',
    'Finalize com mel.'
  ]);

  rid := public.add_curated_recipe(
    'Ovos cozidos com abacate amassado',
    'Zero panela, para o dia corrido.',
    null,
    1, 280, 16, 8, 20,
    array[
    'Cozinhe 2 ovos por 8 minutos.',
    'Descasque e sirva com meio abacate amassado e sal.'
  ]);

  rid := public.add_curated_recipe(
    'Panqueca americana proteica',
    'Textura fofinha, macros balanceados. Rende 3 panquecas.',
    null,
    1, 320, 25, 35, 8,
    array[
    'Misture 1 scoop de whey, 1 ovo, 50g de aveia em pó e fermento.',
    'Frite em fogo baixo até dourar.'
  ]);

  rid := public.add_curated_recipe(
    'Sanduíche de peito de peru com queijo branco',
    'Café da manhã salgado rápido.',
    null,
    1, 260, 22, 28, 6,
    array[
    'Monte com 2 fatias de pão integral, 2 fatias de peito de peru e 1 fatia de queijo branco.'
  ]);

  rid := public.add_curated_recipe(
    'Chia pudding com leite de coco',
    'Baixo carboidrato, rico em fibra e gordura boa.',
    null,
    1, 240, 6, 18, 16,
    array[
    'Misture 3 colheres de chia com 200ml de leite de coco.',
    'Deixe na geladeira de um dia para o outro.'
  ]);

  rid := public.add_curated_recipe(
    'Crepioca',
    'Tapioca fit com ovo já incorporado na massa.',
    null,
    1, 220, 16, 18, 9,
    array[
    'Bata 1 ovo com 1 colher de sopa de goma de tapioca.',
    'Despeje na frigideira e cozinhe dos dois lados como uma panqueca.'
  ]);

  rid := public.add_curated_recipe(
    'Shake de whey com banana',
    'Pós-treino clássico e rápido.',
    null,
    1, 280, 28, 30, 4,
    array[
    'Bata no liquidificador 1 scoop de whey, 1 banana, 200ml de água ou leite e gelo.'
  ]);

  rid := public.add_curated_recipe(
    'Smoothie verde detox',
    'Leve, rico em fibras e micronutrientes.',
    null,
    1, 150, 5, 25, 3,
    array[
    'Bata couve, maçã, gengibre e água de coco até ficar homogêneo.'
  ]);

  rid := public.add_curated_recipe(
    'Shake de morango e whey',
    'Refrescante, ótimo pós-treino no verão.',
    null,
    1, 260, 27, 25, 3,
    array[
    'Bata 1 scoop de whey sabor baunilha com 150g de morango congelado e água.'
  ]);

  rid := public.add_curated_recipe(
    'Vitamina de abacate com whey',
    'Densa em calorias, ideal para bulking.',
    null,
    1, 520, 30, 35, 28,
    array[
    'Bata meio abacate, 1 scoop de whey, 200ml de leite integral e 1 colher de mel.'
  ]);

  rid := public.add_curated_recipe(
    'Smoothie de manga e iogurte',
    'Tropical, rico em vitamina C.',
    null,
    1, 240, 12, 40, 4,
    array[
    'Bata manga congelada, 150g de iogurte natural e um pouco de água.'
  ]);

  rid := public.add_curated_recipe(
    'Shake de café com whey',
    'Proteico e estimulante, ótimo pré-treino matinal.',
    null,
    1, 220, 26, 15, 4,
    array[
    'Bata 1 shot de café frio, 1 scoop de whey, gelo e leite desnatado.'
  ]);

  rid := public.add_curated_recipe(
    'Smoothie de abacaxi com hortelã',
    'Refrescante e digestivo.',
    null,
    1, 160, 3, 38, 1,
    array[
    'Bata abacaxi picado, folhas de hortelã e água de coco.'
  ]);

  rid := public.add_curated_recipe(
    'Shake para ganho de massa',
    'Mass gainer caseiro, substitui os industrializados.',
    null,
    1, 650, 35, 70, 20,
    array[
    'Bata 1 scoop de whey, 1 banana, 3 colheres de aveia, 1 colher de pasta de amendoim e 300ml de leite integral.'
  ]);

  rid := public.add_curated_recipe(
    'Smoothie de beterraba com maçã',
    'Pré-treino natural, rico em nitrato.',
    null,
    1, 140, 3, 32, 1,
    array[
    'Bata beterraba crua ralada, maçã e água.'
  ]);

  rid := public.add_curated_recipe(
    'Shake de chocolate com pasta de amendoim',
    'Sobremesa proteica em formato líquido.',
    null,
    1, 380, 30, 25, 16,
    array[
    'Bata 1 scoop de whey sabor chocolate, 1 colher de pasta de amendoim, leite e gelo.'
  ]);

  rid := public.add_curated_recipe(
    'Frango grelhado com batata doce',
    'Clássico do fitness: simples e redondo.',
    null,
    1, 420, 45, 40, 8,
    array[
    'Tempere o peito de frango com sal, pimenta e alho.',
    'Grelhe por 5 a 6 minutos de cada lado.',
    'Asse a batata doce em cubos a 200°C por 25 minutos.'
  ]);

  rid := public.add_curated_recipe(
    'Frango ao curry com arroz integral',
    'Sabor mais elaborado, ainda simples de fazer.',
    null,
    2, 480, 38, 45, 12,
    array[
    'Refogue cebola e alho.',
    'Adicione cubos de frango e tempere com curry.',
    'Junte leite de coco light e cozinhe por 15 minutos.',
    'Sirva com arroz integral.'
  ]);

  rid := public.add_curated_recipe(
    'Carne moída com abóbora',
    'Prato caseiro rico em ferro.',
    null,
    2, 380, 30, 25, 15,
    array[
    'Refogue carne moída magra com cebola e alho.',
    'Adicione abóbora em cubos e cozinhe até ficar macia.'
  ]);

  rid := public.add_curated_recipe(
    'Salmão grelhado com aspargos',
    'Rico em ômega-3, elegante e rápido.',
    null,
    1, 400, 35, 8, 24,
    array[
    'Tempere o salmão com limão e ervas.',
    'Grelhe por 4 minutos de cada lado.',
    'Salteie os aspargos na mesma frigideira com azeite.'
  ]);

  rid := public.add_curated_recipe(
    'Tilápia assada com legumes',
    'Peixe branco leve, baixa gordura.',
    null,
    1, 280, 32, 15, 8,
    array[
    'Tempere a tilápia.',
    'Leve ao forno com abobrinha e tomate cereja a 200°C por 20 minutos.'
  ]);

  rid := public.add_curated_recipe(
    'Filé mignon ao molho de mostarda',
    'Prato mais sofisticado, para ocasiões especiais.',
    null,
    2, 420, 40, 5, 22,
    array[
    'Sele o filé na frigideira e reserve.',
    'Na mesma panela, faça o molho com mostarda, caldo de carne e um fio de creme de leite light.'
  ]);

  rid := public.add_curated_recipe(
    'Frango desfiado com quinoa',
    'Prático para preparar a semana inteira.',
    null,
    2, 400, 35, 40, 8,
    array[
    'Cozinhe o peito de frango em água com louro e desfie.',
    'Misture com quinoa cozida e temperos a gosto.'
  ]);

  rid := public.add_curated_recipe(
    'Almôndegas de frango ao molho de tomate',
    'Alternativa leve às almôndegas tradicionais.',
    null,
    2, 350, 32, 20, 14,
    array[
    'Misture frango moído, ovo, aveia e temperos.',
    'Faça bolinhas e doure.',
    'Finalize cozinhando no molho de tomate caseiro.'
  ]);

  rid := public.add_curated_recipe(
    'Peito de peru recheado com espinafre e ricota',
    'Prato de domingo, versão fit.',
    null,
    3, 320, 38, 5, 15,
    array[
    'Abra o peito de peru em bife.',
    'Recheie com espinafre refogado e ricota.',
    'Enrole, amarre e asse por 40 minutos.'
  ]);

  rid := public.add_curated_recipe(
    'Camarão salteado com abobrinha em fitas',
    'Baixo carboidrato, rápido de preparar.',
    null,
    1, 260, 30, 8, 12,
    array[
    'Salteie o camarão com alho e azeite por 3 minutos.',
    'Adicione a abobrinha em fitas e cozinhe por mais 2 minutos.'
  ]);

  rid := public.add_curated_recipe(
    'Carne de panela com legumes',
    'Prato de marmita tradicional.',
    null,
    3, 380, 32, 30, 14,
    array[
    'Doure a carne em cubos.',
    'Adicione cenoura, batata e temperos.',
    'Cozinhe em fogo baixo por 40 minutos com um pouco de água.'
  ]);

  rid := public.add_curated_recipe(
    'Frango à parmegiana fit',
    'Versão saudável do clássico, empanada no forno.',
    null,
    1, 420, 40, 25, 16,
    array[
    'Empane o frango com farinha de aveia e ovo.',
    'Asse até dourar.',
    'Cubra com molho de tomate e queijo e volte ao forno para gratinar.'
  ]);

  rid := public.add_curated_recipe(
    'Atum grelhado com purê de batata doce',
    'Rico em proteína, sabor intenso.',
    null,
    1, 380, 38, 30, 10,
    array[
    'Sele o atum rapidamente dos dois lados, deixando mal passado por dentro.',
    'Sirva com purê de batata doce amassada com um fio de azeite.'
  ]);

  rid := public.add_curated_recipe(
    'Frango com brócolis no shoyu',
    'Estilo oriental, rápido no wok.',
    null,
    2, 320, 34, 15, 10,
    array[
    'Salteie tiras de frango no wok.',
    'Adicione brócolis, shoyu light e gengibre.',
    'Cozinhe até o brócolis ficar al dente.'
  ]);

  rid := public.add_curated_recipe(
    'Bife acebolado com arroz e feijão',
    'O clássico prato brasileiro, em versão fit.',
    null,
    1, 450, 35, 45, 12,
    array[
    'Grelhe o bife.',
    'Refogue cebola em rodelas à parte.',
    'Sirva com arroz e feijão.'
  ]);

  rid := public.add_curated_recipe(
    'Coxa e sobrecoxa assada com ervas',
    'Simples, econômico e saboroso.',
    null,
    2, 380, 32, 5, 22,
    array[
    'Tempere com alho, alecrim e limão.',
    'Asse a 200°C por 40 minutos até dourar.',
    'Retire a pele antes de servir para reduzir a gordura.'
  ]);

  rid := public.add_curated_recipe(
    'Peixe ao molho de coco com legumes',
    'Sabor tropical, prato completo.',
    null,
    2, 350, 30, 20, 15,
    array[
    'Cozinhe filés de peixe branco em molho de leite de coco light, tomate e pimentão por 15 minutos.'
  ]);

  rid := public.add_curated_recipe(
    'Hambúrguer caseiro de carne magra',
    'Burger sem industrializados.',
    null,
    1, 380, 35, 20, 16,
    array[
    'Modele o hambúrguer com carne moída magra e temperos.',
    'Grelhe e sirva em pão integral com salada.'
  ]);

  rid := public.add_curated_recipe(
    'Frango xadrez fit',
    'Versão caseira do prato oriental clássico.',
    null,
    2, 360, 32, 30, 10,
    array[
    'Salteie cubos de frango com pimentão, cebola e castanha de caju.',
    'Tempere com shoyu light e um toque de mel.'
  ]);

  rid := public.add_curated_recipe(
    'Costela suína magra assada com legumes',
    'Prato de fim de semana com controle de porção.',
    null,
    2, 420, 35, 15, 22,
    array[
    'Tempere a carne e asse coberta com papel alumínio a 180°C por 1 hora.',
    'Retire o papel e finalize dourando por 15 minutos com os legumes ao lado.'
  ]);

  rid := public.add_curated_recipe(
    'Omelete de forno com legumes e frango',
    'Rende porções para a semana toda.',
    null,
    4, 220, 22, 6, 12,
    array[
    'Bata 8 ovos.',
    'Misture frango desfiado e legumes picados.',
    'Despeje em forma untada e asse a 180°C por 25 minutos.',
    'Corte em fatias.'
  ]);

  rid := public.add_curated_recipe(
    'Peixe empanado na aveia',
    'Alternativa crocante sem fritura.',
    null,
    1, 320, 32, 20, 12,
    array[
    'Empane o filé de peixe em aveia triturada e ovo.',
    'Leve ao forno preaquecido a 200°C por 20 minutos, virando na metade do tempo.'
  ]);

  rid := public.add_curated_recipe(
    'Frango ao molho de iogurte e ervas',
    'Estilo grego: leve e refrescante.',
    null,
    2, 300, 34, 8, 12,
    array[
    'Marine o frango em iogurte natural, limão e ervas por 1 hora.',
    'Depois grelhe até dourar.'
  ]);

  rid := public.add_curated_recipe(
    'Picadinho de carne com legumes',
    'Prato de panela única, ótimo para marmita.',
    null,
    3, 340, 30, 20, 14,
    array[
    'Refogue cubos de carne magra com cebola.',
    'Adicione cenoura e chuchu em cubos.',
    'Cozinhe em fogo baixo até ficar macio.'
  ]);

  rid := public.add_curated_recipe(
    'Kafta de carne assada',
    'Toque árabe, fácil de fazer em grande quantidade.',
    null,
    2, 360, 32, 8, 20,
    array[
    'Misture carne moída com cebola ralada, salsinha e especiarias.',
    'Modele os espetos e asse a 200°C por 20 minutos.'
  ]);

  rid := public.add_curated_recipe(
    'Tofu grelhado com legumes salteados',
    'Fonte vegetal de proteína completa.',
    null,
    1, 280, 20, 15, 16,
    array[
    'Corte o tofu em cubos e tempere com shoyu.',
    'Grelhe até dourar.',
    'Salteie legumes variados na mesma panela.'
  ]);

  rid := public.add_curated_recipe(
    'Grão de bico ao curry',
    'Chana masala: rico em fibras e proteína vegetal.',
    null,
    2, 320, 15, 45, 8,
    array[
    'Refogue cebola, tomate e especiarias.',
    'Adicione grão de bico cozido e um pouco de água.',
    'Cozinhe por 15 minutos.'
  ]);

  rid := public.add_curated_recipe(
    'Lentilha refogada com legumes',
    'Prato completo, rico em ferro vegetal.',
    null,
    2, 300, 18, 40, 5,
    array[
    'Cozinhe a lentilha.',
    'Refogue com cebola, alho, cenoura e tomate.'
  ]);

  rid := public.add_curated_recipe(
    'Hambúrguer de feijão preto',
    'Substituto vegetal para o burger tradicional.',
    null,
    2, 260, 14, 35, 6,
    array[
    'Amasse feijão preto cozido.',
    'Misture com aveia, cebola picada e temperos.',
    'Modele e grelhe dos dois lados.'
  ]);

  rid := public.add_curated_recipe(
    'Quinoa com legumes assados',
    'Prato colorido, com proteína vegetal completa.',
    null,
    2, 340, 12, 50, 10,
    array[
    'Asse abobrinha, pimentão e berinjela com azeite.',
    'Misture com quinoa cozida.'
  ]);

  rid := public.add_curated_recipe(
    'Omelete vegana de grão de bico',
    'Sem ovo, com textura parecida.',
    null,
    1, 220, 14, 25, 7,
    array[
    'Misture farinha de grão de bico com água até virar uma massa líquida.',
    'Tempere e frite como uma omelete.'
  ]);

  rid := public.add_curated_recipe(
    'Espaguete de abobrinha com molho de tomate',
    'Baixo carboidrato, prato leve.',
    null,
    1, 180, 5, 20, 8,
    array[
    'Corte a abobrinha em espiral.',
    'Salteie rapidamente e sirva com molho de tomate caseiro.'
  ]);

  rid := public.add_curated_recipe(
    'Tofu ao molho agridoce',
    'Sabor oriental, rico em proteína vegetal.',
    null,
    2, 300, 18, 30, 12,
    array[
    'Doure cubos de tofu empanados em amido de milho.',
    'Finalize com molho agridoce caseiro de tomate, vinagre e mel.'
  ]);

  rid := public.add_curated_recipe(
    'Salada morna de grão de bico',
    'Combina crocância com maciez.',
    null,
    1, 320, 14, 40, 12,
    array[
    'Asse legumes variados.',
    'Misture com grão de bico cozido.',
    'Tempere com azeite e limão.'
  ]);

  rid := public.add_curated_recipe(
    'Berinjela recheada com quinoa',
    'Prato bonito, ótimo para o jantar.',
    null,
    2, 260, 10, 35, 8,
    array[
    'Corte a berinjela ao meio e retire parte da polpa.',
    'Recheie com quinoa refogada e legumes.',
    'Asse por 25 minutos.'
  ]);

  rid := public.add_curated_recipe(
    'Feijoada vegana light',
    'Versão mais leve do clássico brasileiro.',
    null,
    3, 320, 16, 45, 8,
    array[
    'Cozinhe feijão preto com cogumelos defumados, cebola e alho.',
    'Tempere bem e sirva.'
  ]);

  rid := public.add_curated_recipe(
    'Panqueca de grão de bico com espinafre',
    'Salgada, sem farinha de trigo.',
    null,
    1, 240, 14, 30, 6,
    array[
    'Misture farinha de grão de bico com água e tempere.',
    'Adicione espinafre picado e frite em porções.'
  ]);

  rid := public.add_curated_recipe(
    'Curry de legumes com leite de coco',
    'Prato completo e reconfortante.',
    null,
    2, 300, 8, 35, 14,
    array[
    'Refogue legumes variados.',
    'Adicione leite de coco light e curry.',
    'Cozinhe até apurar.'
  ]);

  rid := public.add_curated_recipe(
    'Salada de lentilha com limão',
    'Leve, ótima para o verão.',
    null,
    1, 280, 16, 35, 6,
    array[
    'Misture lentilha cozida fria com pepino, tomate e cebola roxa.',
    'Tempere com azeite e limão.'
  ]);

  rid := public.add_curated_recipe(
    'Wrap vegano de grão de bico e homus',
    'Prático para levar de marmita.',
    null,
    1, 320, 14, 40, 10,
    array[
    'Espalhe homus na tortilha.',
    'Adicione grão de bico temperado, alface e tomate.',
    'Enrole.'
  ]);

  rid := public.add_curated_recipe(
    'Arroz integral simples',
    'Base para praticamente qualquer prato fitness.',
    null,
    4, 180, 4, 38, 1,
    array[
    'Refogue o arroz em um fio de azeite.',
    'Adicione água na proporção de duas partes para uma de arroz.',
    'Cozinhe até secar.'
  ]);

  rid := public.add_curated_recipe(
    'Purê de batata doce',
    'Alternativa mais nutritiva ao purê tradicional.',
    null,
    3, 150, 2, 32, 1,
    array[
    'Cozinhe a batata doce até ficar macia.',
    'Amasse com um fio de azeite e sal.'
  ]);

  rid := public.add_curated_recipe(
    'Chips de batata doce assada',
    'Crocante, sem fritura.',
    null,
    2, 160, 2, 35, 1,
    array[
    'Corte a batata doce em rodelas finas.',
    'Tempere com azeite e páprica.',
    'Asse a 200°C por 25 minutos, virando na metade.'
  ]);

  rid := public.add_curated_recipe(
    'Quinoa cozida temperada',
    'Base proteica vegetal para qualquer prato.',
    null,
    3, 170, 6, 30, 3,
    array[
    'Lave bem a quinoa.',
    'Cozinhe em água na proporção de duas partes para uma por 15 minutos.',
    'Tempere com azeite e limão.'
  ]);

  rid := public.add_curated_recipe(
    'Farofa fit de aveia',
    'Substitui a farofa tradicional com menos gordura.',
    null,
    4, 140, 4, 20, 5,
    array[
    'Refogue cebola em azeite.',
    'Adicione aveia em flocos e mexa até dourar levemente.'
  ]);

  rid := public.add_curated_recipe(
    'Legumes assados no forno',
    'Acompanhamento colorido e versátil.',
    null,
    3, 100, 2, 15, 4,
    array[
    'Corte abobrinha, berinjela, pimentão e cebola.',
    'Tempere com azeite e ervas.',
    'Asse a 200°C por 25 minutos.'
  ]);

  rid := public.add_curated_recipe(
    'Arroz de couve-flor',
    'Substituto de baixo carboidrato para o arroz.',
    null,
    3, 60, 3, 8, 2,
    array[
    'Triture a couve-flor crua no processador até virar uma farofa fina.',
    'Refogue em azeite por 5 minutos.'
  ]);

  rid := public.add_curated_recipe(
    'Feijão carioca temperado',
    'Base proteica clássica da mesa brasileira.',
    null,
    4, 130, 8, 22, 1,
    array[
    'Cozinhe o feijão na panela de pressão.',
    'Refogue com alho e cebola.',
    'Tempere a gosto.'
  ]);

  rid := public.add_curated_recipe(
    'Mandioca cozida com alho',
    'Carboidrato tradicional, saciante.',
    null,
    3, 180, 1, 40, 1,
    array[
    'Cozinhe a mandioca até ficar macia.',
    'Refogue rapidamente com alho e azeite.'
  ]);

  rid := public.add_curated_recipe(
    'Salada de grãos',
    'Quinoa, grão de bico e milho: acompanhamento rico em fibras.',
    null,
    3, 220, 9, 35, 5,
    array[
    'Misture os grãos cozidos.',
    'Tempere com azeite, limão e ervas frescas.'
  ]);

  rid := public.add_curated_recipe(
    'Salada Caesar fit',
    'Clássico americano com frango grelhado e menos calorias.',
    null,
    1, 320, 35, 10, 15,
    array[
    'Monte alface romana, frango grelhado fatiado e croutons integrais.',
    'Finalize com molho caesar light.'
  ]);

  rid := public.add_curated_recipe(
    'Salada de atum com grão de bico',
    'Prática, sem cozinhar nada além do grão.',
    null,
    1, 300, 28, 25, 10,
    array[
    'Misture atum em lata drenado, grão de bico cozido, tomate e cebola roxa.',
    'Tempere com azeite e limão.'
  ]);

  rid := public.add_curated_recipe(
    'Salada caprese fit',
    'Simples, fresca, rica em cálcio.',
    null,
    1, 220, 14, 8, 15,
    array[
    'Intercale fatias de tomate e muçarela de búfala light.',
    'Finalize com manjericão e azeite.'
  ]);

  rid := public.add_curated_recipe(
    'Salada de folhas com morango e cottage',
    'Combinação doce e salgada.',
    null,
    1, 180, 15, 15, 6,
    array[
    'Monte a base de folhas verdes.',
    'Adicione morangos fatiados e cottage.',
    'Tempere com azeite balsâmico.'
  ]);

  rid := public.add_curated_recipe(
    'Salada de quinoa com legumes crus',
    'Refrescante, textura crocante.',
    null,
    1, 260, 9, 35, 8,
    array[
    'Misture quinoa cozida fria com pepino, cenoura ralada e tomate.',
    'Tempere com limão.'
  ]);

  rid := public.add_curated_recipe(
    'Salada de frango com maçã verde',
    'Doce e salgado, textura crocante.',
    null,
    1, 300, 30, 20, 10,
    array[
    'Misture frango desfiado, maçã verde picada, folhas verdes e nozes.',
    'Tempere com iogurte e mostarda.'
  ]);

  rid := public.add_curated_recipe(
    'Salada mediterrânea com feta',
    'Rica em sabor e gorduras boas.',
    null,
    1, 320, 14, 30, 16,
    array[
    'Misture grão de bico, pepino, tomate, azeitona e queijo feta.',
    'Tempere com azeite e orégano.'
  ]);

  rid := public.add_curated_recipe(
    'Salada de camarão com abacate',
    'Elegante e nutritiva.',
    null,
    1, 340, 28, 12, 20,
    array[
    'Misture camarão grelhado, abacate em cubos e folhas verdes.',
    'Tempere com limão e azeite.'
  ]);

  rid := public.add_curated_recipe(
    'Salada de ovos com espinafre',
    'Reforçada em proteína e sabor.',
    null,
    1, 320, 22, 6, 22,
    array[
    'Misture espinafre, ovos cozidos picados e bacon magro grelhado picado.',
    'Tempere com azeite e mostarda.'
  ]);

  rid := public.add_curated_recipe(
    'Tabule fit com quinoa',
    'Versão com menos carboidrato do tabule tradicional.',
    null,
    2, 200, 6, 28, 6,
    array[
    'Misture quinoa cozida com salsinha picada, tomate, cebola e hortelã.',
    'Tempere com limão e azeite.'
  ]);

  rid := public.add_curated_recipe(
    'Ovo cozido',
    'O snack mais simples e prático que existe. Porção de 2 unidades.',
    null,
    1, 140, 12, 1, 10,
    array[
    'Cozinhe os ovos em água fervente por 8 a 10 minutos.',
    'Resfrie e descasque.'
  ]);

  rid := public.add_curated_recipe(
    'Mix de castanhas',
    'Snack denso em energia, ótimo para levar na bolsa. Porção de 30g.',
    null,
    1, 180, 5, 6, 16,
    array[
    'Misture castanha-do-pará, amêndoas e castanha de caju em um potinho.'
  ]);

  rid := public.add_curated_recipe(
    'Palitos de cenoura com homus',
    'Crocante e saciante.',
    null,
    1, 150, 5, 18, 6,
    array[
    'Corte a cenoura em palitos.',
    'Sirva com 3 colheres de sopa de homus.'
  ]);

  rid := public.add_curated_recipe(
    'Iogurte com frutas picadas',
    'Rápido e refrescante.',
    null,
    1, 160, 10, 22, 3,
    array[
    'Misture iogurte natural com frutas picadas da sua preferência.'
  ]);

  rid := public.add_curated_recipe(
    'Barrinha de proteína caseira',
    'Substitui as industrializadas, sem conservantes.',
    null,
    6, 160, 10, 18, 6,
    array[
    'Misture aveia, whey, pasta de amendoim e mel.',
    'Prense numa forma e leve à geladeira por 2 horas antes de cortar.'
  ]);

  rid := public.add_curated_recipe(
    'Rocambole de frango fit',
    'Snack salgado prático para o pós-treino.',
    null,
    4, 180, 20, 10, 6,
    array[
    'Bata frango moído com ovo e temperos.',
    'Espalhe em uma assadeira forrada e asse.',
    'Enrole ainda quente.'
  ]);

  rid := public.add_curated_recipe(
    'Chips de batata doce no forno',
    'Crocante, sem óleo em excesso.',
    null,
    1, 140, 2, 30, 1,
    array[
    'Fatie a batata doce bem fina.',
    'Tempere com sal e páprica.',
    'Asse a 200°C até ficar crocante.'
  ]);

  rid := public.add_curated_recipe(
    'Bolinho de banana com aveia',
    'Doce natural, sem açúcar adicionado. Só dois ingredientes.',
    null,
    6, 90, 3, 15, 2,
    array[
    'Amasse bananas maduras e misture com aveia.',
    'Faça bolinhas e asse a 180°C por 20 minutos.'
  ]);

  rid := public.add_curated_recipe(
    'Pipoca sem óleo',
    'Snack leve para assistir série. Porção de 30g de milho.',
    null,
    1, 110, 3, 22, 1,
    array[
    'Coloque o milho em um saco de papel.',
    'Feche e leve ao micro-ondas até parar de estourar.'
  ]);

  rid := public.add_curated_recipe(
    'Queijo cottage com tomate cereja',
    'Rápido, salgado, rico em proteína.',
    null,
    1, 130, 14, 6, 5,
    array[
    'Misture 100g de cottage com tomate cereja cortado ao meio.',
    'Tempere com orégano.'
  ]);

  rid := public.add_curated_recipe(
    'Torrada integral com atum',
    'Snack salgado prático.',
    null,
    1, 200, 20, 20, 4,
    array[
    'Torre o pão integral.',
    'Cubra com atum drenado e temperado com limão.'
  ]);

  rid := public.add_curated_recipe(
    'Trail mix de frutas secas e castanhas',
    'Denso em calorias, bom para bulking. Porção de 30g.',
    null,
    1, 150, 4, 15, 9,
    array[
    'Misture uva passa, damasco seco e castanhas variadas.'
  ]);

  rid := public.add_curated_recipe(
    'Muffin de proteína',
    'Doce proteico assado, prático para levar.',
    null,
    6, 130, 10, 12, 5,
    array[
    'Misture whey, aveia em pó, ovo, fermento e leite.',
    'Despeje em forminhas e asse a 180°C por 20 minutos.'
  ]);

  rid := public.add_curated_recipe(
    'Pepino com cottage e páprica',
    'Baixíssima caloria, ótimo para cutting.',
    null,
    1, 90, 10, 5, 2,
    array[
    'Fatie o pepino.',
    'Cubra com cottage e polvilhe páprica.'
  ]);

  rid := public.add_curated_recipe(
    'Protein balls de cacau',
    'Doce sem açúcar refinado.',
    null,
    8, 90, 6, 8, 4,
    array[
    'Misture tâmaras processadas, cacau em pó, whey e aveia.',
    'Faça bolinhas e leve à geladeira.'
  ]);

  rid := public.add_curated_recipe(
    'Rolinho de peito de peru com queijo',
    'Snack sem carboidrato, prático. Porção de 3 rolinhos.',
    null,
    1, 150, 18, 1, 8,
    array[
    'Enrole fatias de peito de peru com queijo branco dentro.'
  ]);

  rid := public.add_curated_recipe(
    'Edamame no vapor',
    'Snack asiático rico em proteína vegetal. Porção de 100g.',
    null,
    1, 120, 11, 9, 5,
    array[
    'Cozinhe as vagens de edamame no vapor por 5 minutos.',
    'Tempere com sal.'
  ]);

  rid := public.add_curated_recipe(
    'Iogurte grego com cacau e canela',
    'Doce sem açúcar, rico em proteína.',
    null,
    1, 180, 18, 12, 6,
    array[
    'Misture iogurte grego com 1 colher de cacau 100% e canela.'
  ]);

  rid := public.add_curated_recipe(
    'Espetinho de frutas com iogurte',
    'Visual bonito, ótimo lanche da tarde.',
    null,
    1, 140, 4, 28, 1,
    array[
    'Monte espetos com frutas variadas.',
    'Sirva com um potinho de iogurte para mergulhar.'
  ]);

  rid := public.add_curated_recipe(
    'Pão de queijo fit de tapioca',
    'Versão mais leve do clássico mineiro.',
    null,
    6, 90, 4, 12, 3,
    array[
    'Misture goma de tapioca hidratada com queijo ralado e ovo.',
    'Modele bolinhas e asse a 200°C até dourar.'
  ]);

  rid := public.add_curated_recipe(
    'Arroz com frango e clara de ovo',
    'Carboidrato rápido com proteína magra: combinação clássica de pós-treino.',
    null,
    1, 420, 45, 45, 5,
    array[
    'Cozinhe o arroz normalmente.',
    'Grelhe o frango temperado.',
    'Cozinhe as claras separadamente e sirva tudo junto.'
  ]);

  rid := public.add_curated_recipe(
    'Batata inglesa cozida com atum',
    'Recuperação rápida pós-treino.',
    null,
    1, 340, 30, 40, 4,
    array[
    'Cozinhe a batata em cubos.',
    'Misture com atum drenado e temperos.'
  ]);

  rid := public.add_curated_recipe(
    'Shake de whey com dextrose',
    'Reposição rápida de glicogênio para bulking.',
    null,
    1, 350, 28, 55, 2,
    array[
    'Bata 1 scoop de whey, 30g de dextrose e água ou leite desnatado.'
  ]);

  rid := public.add_curated_recipe(
    'Wrap de frango com arroz',
    'Prático para levar já pronto para a academia.',
    null,
    1, 400, 35, 45, 8,
    array[
    'Recheie uma tortilha com frango grelhado desfiado e arroz temperado.',
    'Enrole.'
  ]);

  rid := public.add_curated_recipe(
    'Panqueca de banana pós-treino',
    'Doce, rica em carboidrato de rápida absorção. Rende 2 unidades.',
    null,
    1, 300, 15, 45, 6,
    array[
    'Bata banana, ovo e aveia.',
    'Frite em porções pequenas.'
  ]);

  rid := public.add_curated_recipe(
    'Omelete com batata doce',
    'Proteína com carboidrato complexo.',
    null,
    1, 380, 24, 35, 14,
    array[
    'Cozinhe a batata doce em cubos antes.',
    'Misture na omelete ao final da fritura.'
  ]);

  rid := public.add_curated_recipe(
    'Iogurte grego com mel e banana',
    'Recuperação rápida e prática, sem cozinhar.',
    null,
    1, 300, 20, 45, 4,
    array[
    'Misture iogurte grego com banana fatiada e 1 colher de mel.'
  ]);

  rid := public.add_curated_recipe(
    'Sanduíche de frango pós-treino',
    'Carboidrato de fácil digestão com proteína magra.',
    null,
    1, 400, 35, 45, 8,
    array[
    'Monte com pão branco, frango grelhado fatiado e um fio de mostarda.'
  ]);

  rid := public.add_curated_recipe(
    'Vitamina de mamão com whey',
    'Leve e de fácil digestão, ótima para pós-treino noturno.',
    null,
    1, 260, 26, 30, 3,
    array[
    'Bata mamão, 1 scoop de whey e água.'
  ]);

  rid := public.add_curated_recipe(
    'Arroz doce proteico',
    'Sobremesa funcional para depois do treino.',
    null,
    2, 320, 18, 45, 6,
    array[
    'Cozinhe arroz com leite desnatado e canela.',
    'Ao final, fora do fogo, misture 1 scoop de whey.'
  ]);

  rid := public.add_curated_recipe(
    'Mousse de chocolate fit',
    'Cremoso, sem açúcar refinado, à base de abacate.',
    null,
    2, 220, 5, 20, 14,
    array[
    'Bata abacate, cacau em pó, mel e um pouco de leite até virar um creme homogêneo.'
  ]);

  rid := public.add_curated_recipe(
    'Brigadeiro fit de whey',
    'Doce brasileiro com menos açúcar e mais proteína.',
    null,
    10, 60, 4, 6, 2,
    array[
    'Misture leite condensado light, cacau e whey em fogo baixo até desgrudar da panela.',
    'Enrole em bolinhas.'
  ]);

  rid := public.add_curated_recipe(
    'Bolo de caneca proteico',
    'Pronto em 2 minutos, porção individual.',
    null,
    1, 260, 20, 30, 6,
    array[
    'Misture whey, aveia em pó, ovo, fermento e leite numa caneca.',
    'Leve ao micro-ondas por 90 segundos.'
  ]);

  rid := public.add_curated_recipe(
    'Cheesecake fit de cottage',
    'Versão leve da sobremesa clássica.',
    null,
    4, 220, 14, 18, 10,
    array[
    'Bata cottage, ovo, adoçante e essência de baunilha.',
    'Despeje sobre uma base de aveia e asse a 180°C por 30 minutos.'
  ]);

  rid := public.add_curated_recipe(
    'Banana grelhada com canela',
    'Sobremesa simples, sem açúcar adicionado.',
    null,
    1, 120, 1, 28, 0,
    array[
    'Corte a banana ao meio.',
    'Grelhe com canela até caramelizar levemente.'
  ]);

  rid := public.add_curated_recipe(
    'Pudim de chia com cacau',
    'Cremoso, rico em fibras e ômega-3.',
    null,
    1, 220, 8, 20, 12,
    array[
    'Misture chia, leite, cacau em pó e adoçante.',
    'Deixe na geladeira por 4 horas.'
  ]);

  rid := public.add_curated_recipe(
    'Sorvete de banana',
    'Nice cream: um ingrediente só, textura de sorvete.',
    null,
    1, 100, 1, 25, 0,
    array[
    'Bata banana congelada no processador até virar creme.',
    'Sirva na hora.'
  ]);

  rid := public.add_curated_recipe(
    'Cookies proteicos de aveia',
    'Crocante por fora, macio por dentro.',
    null,
    8, 100, 6, 12, 3,
    array[
    'Misture aveia, whey, banana amassada e gotas de chocolate 70%.',
    'Asse a 180°C por 12 minutos.'
  ]);

  rid := public.add_curated_recipe(
    'Pavê fit de morango',
    'Sobremesa em camadas, leve.',
    null,
    4, 200, 10, 25, 6,
    array[
    'Alterne camadas de iogurte grego, morango picado e biscoito integral triturado.'
  ]);

  rid := public.add_curated_recipe(
    'Trufa de whey com pasta de amendoim',
    'Doce concentrado em proteína.',
    null,
    8, 80, 6, 6, 4,
    array[
    'Misture whey, pasta de amendoim e um pouco de leite até virar uma massa.',
    'Faça bolinhas e leve à geladeira.'
  ]);

  rid := public.add_curated_recipe(
    'Gelatina proteica',
    'Sobremesa leve para bater a meta de proteína.',
    null,
    2, 90, 12, 5, 1,
    array[
    'Prepare a gelatina zero açúcar conforme a embalagem.',
    'Misture 1 scoop de whey antes de gelar.'
  ]);

  rid := public.add_curated_recipe(
    'Bolo de cenoura fit',
    'Clássico brasileiro com farinha integral.',
    null,
    8, 180, 6, 25, 6,
    array[
    'Bata cenoura, ovos e óleo no liquidificador.',
    'Misture com farinha integral e fermento.',
    'Asse a 180°C por 35 minutos.'
  ]);

  rid := public.add_curated_recipe(
    'Manjar de coco fit',
    'Sobremesa tradicional com menos açúcar.',
    null,
    4, 160, 5, 20, 6,
    array[
    'Cozinhe leite desnatado com leite de coco light e amido de milho até engrossar.',
    'Gele em forminhas.'
  ]);

  rid := public.add_curated_recipe(
    'Barra de cereal caseira',
    'Substitui as versões industrializadas.',
    null,
    8, 120, 4, 18, 4,
    array[
    'Misture aveia, mel, castanhas picadas e frutas secas.',
    'Prense em forma e leve ao forno por 15 minutos.'
  ]);

  rid := public.add_curated_recipe(
    'Torta de maçã fit',
    'Versão simplificada da torta clássica, sem massa.',
    null,
    4, 180, 4, 30, 5,
    array[
    'Fatie as maçãs bem finas.',
    'Disponha em camadas com canela numa forma.',
    'Asse a 180°C por 30 minutos.'
  ]);

  rid := public.add_curated_recipe(
    'Frango com molho de queijo e brócolis',
    'Keto: rico em gordura boa, quase zero carboidrato.',
    null,
    1, 480, 40, 6, 32,
    array[
    'Grelhe o frango.',
    'Sirva com brócolis no vapor e um molho cremoso de queijo com creme de leite.'
  ]);

  rid := public.add_curated_recipe(
    'Ovos recheados',
    'Deviled eggs: snack keto clássico. Porção de 4 metades.',
    null,
    1, 160, 12, 1, 12,
    array[
    'Cozinhe os ovos e corte ao meio.',
    'Misture as gemas com maionese e mostarda.',
    'Recheie as claras.'
  ]);

  rid := public.add_curated_recipe(
    'Salmão com manteiga de ervas',
    'Alto em gordura boa, zero carboidrato.',
    null,
    1, 450, 35, 1, 34,
    array[
    'Grelhe o salmão.',
    'Finalize com manteiga derretida com ervas frescas por cima.'
  ]);

  rid := public.add_curated_recipe(
    'Panqueca keto de queijo e ovo',
    'Sem farinha, base cetogênica.',
    null,
    1, 320, 24, 3, 24,
    array[
    'Bata ovo e queijo ralado.',
    'Frite como uma panqueca fina.'
  ]);

  rid := public.add_curated_recipe(
    'Bacon com abacate',
    'Combinação clássica de gordura boa.',
    null,
    1, 380, 12, 10, 34,
    array[
    'Grelhe o bacon até ficar crocante.',
    'Sirva com meio abacate fatiado.'
  ]);

  rid := public.add_curated_recipe(
    'Couve-flor gratinada',
    'Mac and cheese keto: substitui o macarrão com queijo.',
    null,
    2, 320, 18, 10, 24,
    array[
    'Cozinhe a couve-flor al dente.',
    'Misture com molho de queijo cremoso e gratine no forno.'
  ]);

  rid := public.add_curated_recipe(
    'Costela suína com repolho refogado',
    'Prato low carb farto e saciante.',
    null,
    1, 520, 38, 6, 38,
    array[
    'Asse a costela temperada por 1 hora.',
    'Sirva com repolho refogado na manteiga.'
  ]);

  rid := public.add_curated_recipe(
    'Frango com bacon e queijo',
    'Keto bowl de alta densidade calórica.',
    null,
    1, 500, 42, 4, 34,
    array[
    'Grelhe o frango.',
    'Misture com bacon picado e cubra com queijo derretido.'
  ]);

  rid := public.add_curated_recipe(
    'Sopa creme de abóbora com gengibre',
    'Reconfortante e leve em carboidrato.',
    null,
    2, 180, 4, 20, 8,
    array[
    'Cozinhe a abóbora com caldo de legumes e gengibre.',
    'Bata até virar creme.'
  ]);

  rid := public.add_curated_recipe(
    'Rolinho de berinjela com ricota',
    'Keto: substitui a lasanha tradicional.',
    null,
    2, 280, 18, 8, 18,
    array[
    'Fatie a berinjela e grelhe.',
    'Recheie com ricota temperada e enrole.',
    'Leve ao forno com molho de tomate por cima.'
  ]);

  rid := public.add_curated_recipe(
    'Macarrão à bolonhesa hipercalórico',
    'Denso em carboidrato e proteína, ideal para ganho de massa.',
    null,
    1, 700, 40, 80, 22,
    array[
    'Cozinhe o macarrão.',
    'Prepare o molho bolonhesa com carne moída e azeite extra.',
    'Finalize com queijo ralado por cima.'
  ]);

  rid := public.add_curated_recipe(
    'Arroz, feijão, ovo frito e banana',
    'Prato brasileiro tradicional de alta caloria.',
    null,
    1, 650, 25, 90, 20,
    array[
    'Sirva arroz e feijão com um ovo frito.',
    'Acompanhe com rodelas de banana fritas na manteiga.'
  ]);

  rid := public.add_curated_recipe(
    'Sanduíche gigante de bulking',
    'Refeição prática e densa em calorias.',
    null,
    1, 750, 45, 70, 30,
    array[
    'Monte com pão integral, frango grelhado, queijo, abacate, ovo e maionese.'
  ]);

  rid := public.add_curated_recipe(
    'Batata assada com carne moída e queijo',
    'Refeição farta, alta em carboidrato e proteína.',
    null,
    1, 680, 35, 65, 28,
    array[
    'Asse as batatas em palitos.',
    'Cubra com carne moída refogada e queijo derretido por cima.'
  ]);

  rid := public.add_curated_recipe(
    'Panqueca americana de bulking',
    'Café da manhã calórico para fase de ganho de massa. Rende 3 panquecas.',
    null,
    1, 620, 25, 75, 24,
    array[
    'Prepare a massa de panqueca tradicional e frite.',
    'Sirva empilhada com pasta de amendoim e mel entre as camadas.'
  ]);

end $$;
