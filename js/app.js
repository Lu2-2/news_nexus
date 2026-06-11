/**
 * NEXUS — Classified News Network
 * app.js — Main application logic
 * Includes: Auth (login/register), Admin panel, Site features, Chatbot, Category Nav
 */

'use strict';

/* ═══════════════════════════════════════════════
   DATABASE — localStorage
═══════════════════════════════════════════════ */
const DB = {
  _key: 'nexus_agents',
  _sessionKey: 'nexus_session',

  _load() {
    try { return JSON.parse(localStorage.getItem(this._key)) || []; }
    catch { return []; }
  },

  _save(data) { localStorage.setItem(this._key, JSON.stringify(data)); },

  all() { return this._load(); },

  find(email) {
    return this._load().find(a => a.email.toLowerCase() === email.toLowerCase()) || null;
  },

  emailExists(email) { return !!this.find(email); },

  register({ email, password, codename, clearance }) {
    const agents = this._load();
    if (agents.find(a => a.email.toLowerCase() === email.toLowerCase()))
      return { ok: false, error: 'ID de agente já registrado no sistema.' };
    if (codename && agents.find(a => a.codename.toLowerCase() === codename.toLowerCase()))
      return { ok: false, error: 'Codinome já em uso por outro agente.' };
    agents.push({
      email: email.trim().toLowerCase(),
      password: btoa(password),
      codename: codename.trim().toUpperCase(),
      clearance: clearance || 'NÍVEL 1',
      status: 'pending',
      registeredAt: new Date().toISOString(),
      lastLogin: null,
      reviewedAt: null,
      reviewNote: ''
    });
    this._save(agents);
    return { ok: true };
  },

  updateStatus(email, status, note = '') {
    const agents = this._load();
    const idx = agents.findIndex(a => a.email.toLowerCase() === email.toLowerCase());
    if (idx === -1) return false;
    agents[idx].status = status;
    agents[idx].reviewedAt = new Date().toISOString();
    agents[idx].reviewNote = note;
    this._save(agents);
    return true;
  },

  updateLastLogin(email) {
    const agents = this._load();
    const idx = agents.findIndex(a => a.email.toLowerCase() === email.toLowerCase());
    if (idx !== -1) { agents[idx].lastLogin = new Date().toISOString(); this._save(agents); }
  },

  delete(email) {
    this._save(this._load().filter(a => a.email.toLowerCase() !== email.toLowerCase()));
  },

  verifyLogin(email, password) {
    if (this.isAdmin(email, password)) return { ok: true, isAdmin: true };
    const agent = this.find(email);
    if (!agent) return { ok: false, error: 'AGENTE NÃO ENCONTRADO — credencial não registrada.', code: 'NOT_FOUND' };
    if (agent.password !== btoa(password)) return { ok: false, error: 'CÓDIGO DE ACESSO INVÁLIDO — autenticação recusada.', code: 'WRONG_PWD' };
    if (agent.status === 'pending') return { ok: false, error: 'CREDENCIAL EM ANÁLISE — aguarde aprovação do Conselho NEXUS.', code: 'PENDING', agent };
    if (agent.status === 'denied')  return { ok: false, error: `ACESSO REVOGADO — ${agent.reviewNote || 'credencial negada pelo Conselho.'}`, code: 'DENIED', agent };
    return { ok: true, agent };
  },

  isAdmin(email, password) { return email === 'admin@nexus.net' && password === 'NEXUS001'; },

  saveSession(email) { sessionStorage.setItem(this._sessionKey, email); },
  getSession()       { return sessionStorage.getItem(this._sessionKey); },
  clearSession()     { sessionStorage.removeItem(this._sessionKey); }
};

/* ═══════════════════════════════════════════════
   CATEGORY NEWS DATA
═══════════════════════════════════════════════ */
const NEWS_DATA = {
  'ARQUIVOS': {
    hero: {
      img: 'https://picsum.photos/seed/ufo001/1200/675',
      label: 'ARQUIVO #NX-7741 // CONFIDENCIAL',
      caption: 'Fonte: Documento desclassificado parcialmente pelo FOIA — Agência Nacional de Segurança, 2025',
      kicker: '// DESTAQUE CLASSIFICADO',
      title: 'Pentágono confirma: 17 objetos de origem "não-convencional" recuperados entre 1947 e 2003 ainda sob custódia governamental',
      deck: 'Documentos internos obtidos por fonte anônima revelam a existência de um programa ultrassecreto de análise de materiais com propriedades desconhecidas pela física convencional. A reportagem inclui coordenadas de armazenamento e transcrições de reuniões classificadas.',
      author: 'AGENTE ANÔNIMO // CODINOME: CARTÓGRAFO',
      date: '19 MAR 2026',
      time: '8 min leitura'
    },
    sidebar: [
      { cat: 'NÍVEL 4', img: 'https://picsum.photos/seed/moon55/600/375', title: 'Fotos originais da Apollo 20 mostram estrutura artificial de 3,5 km na Lua — NASA nega existência da missão', time: '22 min atrás' },
      { cat: 'EXPERIMENTO', img: 'https://picsum.photos/seed/lab99/600/375', title: 'Projeto MK-Ultra: documentos recém-desclassificados revelam fase 3 nunca divulgada ao público', time: '1h15 atrás' },
      { cat: 'CONTATO', img: 'https://picsum.photos/seed/signal77/600/375', title: 'Sinal de rádio de origem inexplicável captado por 3 radiotelescópios independentes nas últimas 72 horas', time: '3h atrás' }
    ],
    cols: [
      { cat: 'GOVERNO OCULTO', img: 'https://picsum.photos/seed/gov33/600/400', title: 'A "Comissão das Sombras": como um grupo de 12 burocratas controla decisões que nunca chegam a parlamentos', desc: 'Fonte revela estrutura de poder paralela operando dentro de 7 governos ocidentais desde 1971, imune a processos eleitorais.', time: '18 min atrás · 5 min leitura' },
      { cat: 'TECNOLOGIA SUPRIMIDA', img: 'https://picsum.photos/seed/tech44/600/400', title: 'Motor de energia livre patenteado em 1981 e imediatamente confiscado: onde está o inventor?', desc: 'Documentos da USPTO mostram patente cancelada 48h após aprovação. Inventor desapareceu em 1983.', time: '2h atrás · 4 min leitura' },
      { cat: 'FENÔMENOS', img: 'https://picsum.photos/seed/phen88/600/400', title: 'Portais geomagnéticos: cientistas confirmam fenômeno que governos chamam de "falha de radar"', desc: 'Três bases militares no Atlântico Sul registram anomalias coincidentes. Correlação com avistamentos UAP: 94%.', time: '4h atrás · 6 min leitura' }
    ],
    feature: {
      kicker: '// DOSSIÊ ESPECIAL · ACESSO NÍVEL 5',
      title: '"A Agenda de Controle Cognitivo: como algoritmos e frequências eletromagnéticas moldam o que você acredita ser real"',
      desc: 'Uma investigação de 18 meses com 43 fontes dentro de agências de inteligência, universidades e corporações de mídia — sobre o programa mais ambicioso de engenharia social da história humana.',
      author: 'Agente: VESPEIRO · Série especial · 22 min leitura · Criptografado',
      img: 'https://picsum.photos/seed/mind66/800/520'
    },
    ranking: [
      { title: 'Crop circles no interior do Paraná: análise do solo revela alterações moleculares inexplicáveis', meta: 'AGENTE: FÊNIX · FENÔMENOS · 30 min atrás' },
      { title: 'Protocolo "Mão Morta": o plano secreto de continuidade de governo que contradiz constituições', meta: 'AGENTE: ORÁCULO · GOVERNO OCULTO · 1h atrás' },
      { title: 'Ex-piloto da Marinha descreve encontro de 40 minutos com objeto de 90 metros a 300 km/h', meta: 'DEPOIMENTOS · 2h atrás' },
      { title: 'Base Antártica: imagens de satélite 2025 mostram atividade térmica subterrânea inesperada', meta: 'ARQUIVOS · 3h atrás' },
      { title: 'O vírus X-17: documentos do CDC indicam patógeno de "origem não-convencional" desde 2019', meta: 'EXPERIMENTOS · 4h atrás' },
      { title: 'Arquivos Majestic-12: análise grafológica de 2025 confirma autenticidade de documentos', meta: 'EXTRATERRESTRES · 6h atrás' }
    ]
  },

  'EXTRATERRESTRES': {
    hero: {
      img: 'https://picsum.photos/seed/alien01/1200/675',
      label: 'DOSSIÊ #ET-0093 // ULTRASECRETO',
      caption: 'Imagem captada por sensor infravermelho — Base Área de Nellis, Nevada, 2024',
      kicker: '// CONTATO CONFIRMADO',
      title: 'Whistleblower da DARPA revela: programa "Projeto Eden" mantém contato intermitente com 3 entidades não-humanas desde 1989',
      deck: 'Ex-analista de inteligência com clearance nível 6 entrega documentos que descrevem protocolo de comunicação binário estabelecido com entidades de origem extrassolar. Arquivos incluem transcrições de 14 sessões de contato.',
      author: 'FONTE PROTEGIDA // CODINOME: ORÁCULO',
      date: '21 MAR 2026',
      time: '12 min leitura'
    },
    sidebar: [
      { cat: 'AVISTAMENTO', img: 'https://picsum.photos/seed/ufo22/600/375', title: 'Câmeras da ISS registram objeto triangular de 400m antes de transmissão ser interrompida pela NASA', time: '5 min atrás' },
      { cat: 'FÍSICO', img: 'https://picsum.photos/seed/alien33/600/375', title: 'Material recuperado em Roswell: análise de 2025 identifica liga metálica com isótopos impossíveis de sintetizar na Terra', time: '45 min atrás' },
      { cat: 'DEPOIMENTO', img: 'https://picsum.photos/seed/alien44/600/375', title: 'Ex-general da USAF, às vésperas da morte, descreve visita oficial a instalação subterrânea com seres vivos não-humanos', time: '2h atrás' }
    ],
    cols: [
      { cat: 'CONTATO', img: 'https://picsum.photos/seed/alien55/600/400', title: 'Sinal WOW! de 1977 foi resposta a transmissão anterior classificada enviada pelo governo americano', desc: 'Documentos desclassificados mostram que o sinal captado em Ohio foi precedido por transmissão codificada de origem terrestre.', time: '1h atrás · 7 min leitura' },
      { cat: 'BIOLOGIA', img: 'https://picsum.photos/seed/alien66/600/400', title: 'Autópsia do ser de Varginha (1996): relatório médico do Hospital das Clínicas de Campinas vem a público', desc: 'Médico que participou do procedimento concede primeira entrevista. Descreve anatomia incompatível com qualquer espécie catalogada.', time: '3h atrás · 9 min leitura' },
      { cat: 'TECNOLOGIA', img: 'https://picsum.photos/seed/alien77/600/400', title: 'Propulsão de curvatura: engenheiro da Lockheed afirma que tecnologia deriva de engenharia reversa', desc: 'Patente registrada em nome de subsidiária offshore revela conceito de dobramento espacial que viola física convencional.', time: '5h atrás · 6 min leitura' }
    ],
    feature: {
      kicker: '// EXCLUSIVO · ACESSO RESTRITO',
      title: '"Os Acordos de Greada: como Eisenhower negociou com extraterrestres e o que foi prometido em troca"',
      desc: 'Pesquisador independente reúne 200 documentos desclassificados e 12 testemunhos de ex-funcionários do governo para reconstruir os termos do primeiro tratado interespécies da história humana.',
      author: 'Agente: CARTÓGRAFO · Investigação especial · 35 min leitura',
      img: 'https://picsum.photos/seed/alien88/800/520'
    },
    ranking: [
      { title: 'Bob Lazar tinha razão: elemento 115 sintetizado confirma propriedades de propulsão descritas em 1989', meta: 'TECNOLOGIA · 15 min atrás' },
      { title: 'Missão Artemis III detecta estrutura geométrica regular sob superfície lunar — NASA silencia equipe', meta: 'CONTATO · 1h atrás' },
      { title: 'Triângulo negro filmado por 40 testemunhas em São Paulo voa em silêncio absoluto a 50m de altitude', meta: 'AVISTAMENTO · 2h atrás' },
      { title: 'Diário de Nikola Tesla menciona "visitantes que me ensinaram sobre ressonância universal"', meta: 'ARQUIVOS · 4h atrás' },
      { title: 'Governo mexicano reconhece mumificações de Nazca como entidades não-humanas após análise de DNA', meta: 'BIOLOGIA · 6h atrás' },
      { title: 'Telescópio James Webb detecta megaestruturas em órbita de estrela a 430 anos-luz', meta: 'ASTRONOMIA · 8h atrás' }
    ]
  },

  'GOVERNO OCULTO': {
    hero: {
      img: 'https://picsum.photos/seed/gov01/1200/675',
      label: 'ARQUIVO POLÍTICO #GP-441 // CONFIDENCIAL',
      caption: 'Documentos obtidos via FOIA após 30 anos de recurso judicial — Departamento de Estado, EUA',
      kicker: '// PODER PARALELO',
      title: 'Os "Arquitetos": rede de 23 indivíduos que controlam indicações de ministros em 11 países sem nunca aparecer em eleições',
      deck: 'Investigação de 3 anos mapeia a estrutura de poder sombria que opera por trás de governos eleitos, influenciando políticas econômicas, militares e de saúde globais. Comunicações internas vazadas revelam hierarquia e rituais de adesão.',
      author: 'AGENTE: FÊNIX // ANÁLISE POLÍTICA',
      date: '20 MAR 2026',
      time: '15 min leitura'
    },
    sidebar: [
      { cat: 'BILDERBERG', img: 'https://picsum.photos/seed/gov22/600/375', title: 'Lista completa de participantes do encontro secreto de 2025: 6 chefes de estado não divulgados na agenda oficial', time: '30 min atrás' },
      { cat: 'FINANÇAS', img: 'https://picsum.photos/seed/gov33x/600/375', title: 'Conta offshore rastreada por jornalistas vincula fundos de campanha eleitoral a corporação de defesa classificada', time: '1h atrás' },
      { cat: 'VIGILÂNCIA', img: 'https://picsum.photos/seed/gov44/600/375', title: 'PRISM 2.0: novo programa de espionagem coleta dados de 4 bilhões de pessoas sem mandato judicial', time: '3h atrás' }
    ],
    cols: [
      { cat: 'LEGISLAÇÃO', img: 'https://picsum.photos/seed/gov55/600/400', title: 'Lei aprovada às 3h da manhã com 4 votos: artigo 73 permite expropriação de ativos digitais em "emergência nacional"', desc: 'Especialistas em direito constitucional alertam que redação vaga permite uso arbitrário contra qualquer cidadão.', time: '20 min atrás · 8 min leitura' },
      { cat: 'MÍDIA', img: 'https://picsum.photos/seed/gov66/600/400', title: 'Memorando interno de rede de TV orienta âncoras a não cobrir determinados temas "por acordo com anunciantes estratégicos"', desc: 'Documento de 2024 lista 14 assuntos proibidos e descreve protocolo de neutralização de jornalistas dissidentes.', time: '2h atrás · 5 min leitura' },
      { cat: 'ELEIÇÕES', img: 'https://picsum.photos/seed/gov77/600/400', title: 'Auditoria independente aponta inconsistências em 340.000 votos em 6 estados — relatório enterrado por tribunais', desc: 'Estatísticos identificam padrões impossíveis de ocorrer naturalmente em distribuição de votos por seção eleitoral.', time: '4h atrás · 10 min leitura' }
    ],
    feature: {
      kicker: '// DOSSIÊ CENTRAL · PODER GLOBAL',
      title: '"A Quinta Coluna: como agentes duplos infiltrados em governos democráticos executam agenda de estado profundo"',
      desc: 'Investigação em 7 países identifica padrão de recrutamento, financiamento e proteção de operativos que atuam dentro de estruturas governamentais legítimas para sabotá-las por dentro.',
      author: 'Agente: NETUNO · Série investigativa · 28 min leitura',
      img: 'https://picsum.photos/seed/gov88/800/520'
    },
    ranking: [
      { title: 'Reunião do Fórum de Davos 2026: resolução secreta propõe moeda digital global com validade de 30 dias', meta: 'FINANÇAS · 10 min atrás' },
      { title: 'Documentos da CIA: agência financiou golpe de estado em 4 países democráticos entre 2010 e 2020', meta: 'OPERAÇÕES · 1h atrás' },
      { title: 'Câmeras de segurança do Capitólio: 3 horas de vídeo desaparecem do servidor oficial', meta: 'VIGILÂNCIA · 2h atrás' },
      { title: 'Ex-presidente revela: "Me apresentaram à estrutura real do poder no terceiro dia de mandato"', meta: 'DEPOIMENTO · 3h atrás' },
      { title: 'Sistema ECHELON intercepta comunicações de 48 líderes aliados — documentos Snowden 2.0', meta: 'ESPIONAGEM · 5h atrás' },
      { title: 'Organização supranacional desconhecida detém veto informal sobre indicações ao Conselho de Segurança da ONU', meta: 'GEOPOLÍTICA · 7h atrás' }
    ]
  },

  'EXPERIMENTOS': {
    hero: {
      img: 'https://picsum.photos/seed/exp01/1200/675',
      label: 'PROTOCOLO #EXP-0017 // TOP SECRET',
      caption: 'Instalação identificada por coordenadas — acesso bloqueado por decreto presidencial desde 1978',
      kicker: '// EXPERIMENTO HUMANO',
      title: 'Projeto Monarch: 2.300 vítimas identificadas — programa de controle mental da CIA operou em 14 países por 40 anos',
      deck: 'Documentos desclassificados sob pressão judicial revelam escala sem precedentes do programa de modificação comportamental. Inclui nomes de instituições parceiras no Brasil, Argentina e Chile. Vítimas sobreviventes depõem.',
      author: 'AGENTE: HIDRA // INVESTIGAÇÃO',
      date: '18 MAR 2026',
      time: '18 min leitura'
    },
    sidebar: [
      { cat: 'FARMÁCIA', img: 'https://picsum.photos/seed/exp22/600/375', title: 'Medicamento aprovado pela FDA em 2021 contém composto psicoativo não declarado — pesquisa independente revela', time: '15 min atrás' },
      { cat: 'NEUROLOGIA', img: 'https://picsum.photos/seed/exp33/600/375', title: 'DARPA testa implante neural em humanos sem consentimento formal: documentos do ensaio clínico vazam', time: '1h atrás' },
      { cat: 'BIOQUÍMICA', img: 'https://picsum.photos/seed/exp44/600/375', title: 'Água tratada em 12 capitais brasileiras apresenta traços de lítio acima do limite internacional sem divulgação', time: '4h atrás' }
    ],
    cols: [
      { cat: 'HAARP', img: 'https://picsum.photos/seed/exp55/600/400', title: 'Operação Popcorn: HAARP usado para induzir chuvas artificiais em zonas de conflito — satélites confirmam', desc: 'Análise de dados meteorológicos de 8 conflitos armados mostra padrão de precipitação artificial em regiões estratégicas.', time: '35 min atrás · 6 min leitura' },
      { cat: 'MICROBIOLOGIA', img: 'https://picsum.photos/seed/exp66/600/400', title: 'Laboratório de Fort Detrick criou cepa de influenza com taxa de mortalidade de 60% — testes em prisões federais', desc: 'Memorandos internos de 1969 a 1972 descrevem protocolo de exposição não-consensual em população carcerária.', time: '2h atrás · 7 min leitura' },
      { cat: 'PSICOLOGIA', img: 'https://picsum.photos/seed/exp77/600/400', title: 'Experimento de Standford nunca terminou: variante contínua opera como programa de treinamento policial', desc: 'Pesquisadora identifica continuidade metodológica entre estudo de 1971 e programa atual de condicionamento de agentes.', time: '5h atrás · 5 min leitura' }
    ],
    feature: {
      kicker: '// SÉRIE ESPECIAL · CORPOS E MENTES',
      title: '"Cobaias Involuntárias: o mapa completo de experimentos não-éticos realizados em populações civis no século XX"',
      desc: 'De Tuskegee a Edgewood, de Guatemala City a Colônia Dignidad — pesquisador documenta 89 programas experimentais realizados em civis sem consentimento em nome de segurança nacional.',
      author: 'Agente: HIPÓCRATES · Investigação histórica · 40 min leitura',
      img: 'https://picsum.photos/seed/exp88/800/520'
    },
    ranking: [
      { title: 'Vacina experimental administrada em 800 soldados sem aprovação: documentos do Exército de 2003', meta: 'MILITAR · 20 min atrás' },
      { title: 'Chemtrails: análise laboratorial de amostra de solo confirma compostos de alumínio e bário acima do normal', meta: 'ATMOSFERA · 1h atrás' },
      { title: 'Programa de fluoretação: estudo de Harvard de 2012 sobre redução de QI finalmente traduzido ao português', meta: 'SAÚDE PÚBLICA · 2h atrás' },
      { title: '5G e supressão imunológica: correlação estatística em 40 países levantada por epidemiologista independente', meta: 'TECNOLOGIA · 4h atrás' },
      { title: 'Ex-voluntário do Projeto Artichoke revela detalhes de sessões de despersonalização conduzidas pela CIA', meta: 'CONTROLE MENTAL · 6h atrás' },
      { title: 'Testes nucleares no Pacífico: população da Polinésia Francesa recebe indenização 70 anos depois', meta: 'NUCLEAR · 8h atrás' }
    ]
  },

  'TECNOLOGIA SUPRIMIDA': {
    hero: {
      img: 'https://picsum.photos/seed/tech01/1200/675',
      label: 'PATENTE #TS-9981 // CONFISCADA',
      caption: 'Protótipo fotografado antes de apreensão pelo Departamento de Energia — arquivo pessoal do inventor',
      kicker: '// INVENÇÃO CENSURADA',
      title: 'Stanley Meyer morreu 24h após recusar oferta da OPEP: seu motor de água podia substituir combustível fóssil completamente',
      deck: 'Documentos legais, patentes originais e depoimentos de ex-sócios reconstituem a história do inventor que criou motor capaz de extrair hidrogênio da água comum com eficiência 300% superior ao eletrolítico. Recusou US$ 1 bilhão antes de morrer.',
      author: 'AGENTE: TESLAS // INVESTIGAÇÃO TÉCNICA',
      date: '17 MAR 2026',
      time: '11 min leitura'
    },
    sidebar: [
      { cat: 'ENERGIA', img: 'https://picsum.photos/seed/tech22/600/375', title: 'Patente de célula de energia de ponto zero arquivada pelo USPTO sem análise por "risco à segurança nacional"', time: '10 min atrás' },
      { cat: 'MEDICINA', img: 'https://picsum.photos/seed/tech33/600/375', title: 'Aparelho de cura por frequência de Royal Rife: FDA destruiu todos os protótipos em 1939, documentos revelam', time: '2h atrás' },
      { cat: 'COMUNICAÇÃO', img: 'https://picsum.photos/seed/tech44x/600/375', title: 'Nikola Tesla propôs internet por wireless em 1901 — investidores bloquearam projeto por impossibilidade de cobrar pelo sinal', time: '4h atrás' }
    ],
    cols: [
      { cat: 'PROPULSÃO', img: 'https://picsum.photos/seed/tech55/600/400', title: 'Motor EMDrive testado secretamente pela NASA por 4 anos — resultados positivos arquivados como "paradoxal"', desc: 'Vazamento de relatório interno da NASA confirma que propulsor sem propelente gera empuxo, desafiando física newtoniana.', time: '25 min atrás · 8 min leitura' },
      { cat: 'AGRICULTURA', img: 'https://picsum.photos/seed/tech66/600/400', title: 'Fertilizante orgânico que triplica colheitas suprimido por consórcio de empresas agroquímicas desde 1990', desc: 'Pesquisador da EMBRAPA denuncia pressão para abandonar descoberta que tornaria agrotóxicos desnecessários.', time: '3h atrás · 5 min leitura' },
      { cat: 'COMPUTAÇÃO', img: 'https://picsum.photos/seed/tech77/600/400', title: 'Processador quântico operacional desde 2019: empresa de defesa mantém tecnologia fora do mercado civil', desc: 'Patentes registradas em 2016 por subsidiária da Raytheon descrevem chip com capacidade 10.000x superior ao atual estado da arte.', time: '6h atrás · 7 min leitura' }
    ],
    feature: {
      kicker: '// INVESTIGAÇÃO CENTRAL · INOVAÇÃO BLOQUEADA',
      title: '"O Cemitério de Invenções: 1.200 patentes arquivadas pelo governo americano por ameaçar indústrias estabelecidas"',
      desc: 'Advogado especializado em propriedade intelectual mapeou todas as patentes bloqueadas via "secrecy orders" desde 1951. A lista inclui tecnologias de energia, cura, propulsão e comunicação que poderiam ter transformado a civilização.',
      author: 'Agente: FRANKLIN · Investigação jurídica · 30 min leitura',
      img: 'https://picsum.photos/seed/tech88/800/520'
    },
    ranking: [
      { title: 'Bateria de alumínio-ar com 3.000km de autonomia: Toyota comprou e arquivou patente em 2014', meta: 'ENERGIA · 5 min atrás' },
      { title: 'Tratamento de câncer por campo elétrico suprimido pela AMA em 1950 — hoje é protocolo israelense', meta: 'MEDICINA · 1h atrás' },
      { title: 'Antigravidade de T. Townsend Brown: experimentos replicados por físico russo comprovam efeito', meta: 'PROPULSÃO · 2h atrás' },
      { title: 'Dessal de água por cavitação: tecnologia de baixo custo bloqueada por lobby do cloro', meta: 'ÁGUA · 4h atrás' },
      { title: 'Motor magnetico permanente: 12 inventores independentes relatam intimidação após protótipos funcionais', meta: 'ENERGIA LIVRE · 5h atrás' },
      { title: 'Internet por fibra óptica de 100TB/s existia em 2008 — enterrada por acordo entre operadoras', meta: 'COMUNICAÇÃO · 7h atrás' }
    ]
  },

  'FENÔMENOS': {
    hero: {
      img: 'https://picsum.photos/seed/phen01/1200/675',
      label: 'RELATÓRIO #FN-3301 // INVESTIGAÇÃO ATIVA',
      caption: 'Registro fotográfico de equipe de campo — localização GPS omitida por protocolo de segurança',
      kicker: '// ANOMALIA CONFIRMADA',
      title: 'Zona do Silêncio (México): nova expedição detecta campo eletromagnético que anula eletrônicos e afeta percepção temporal dos pesquisadores',
      deck: 'Equipe científica independente passa 21 dias na região e retorna com evidências de anomalia gravitacional mensurável, interferência em relógios atômicos e registros de avistamentos UAP em altitude impossível. Governo mexicano cancela sobrevoos na área.',
      author: 'AGENTE: MERIDIANO // CAMPO',
      date: '22 MAR 2026',
      time: '9 min leitura'
    },
    sidebar: [
      { cat: 'BURACOS TEMPORAIS', img: 'https://picsum.photos/seed/phen22/600/375', title: 'Triângulo das Bermudas: nova análise de rota de 50 desaparecimentos revela padrão orbital coincidente com anomalia solar', time: '1h atrás' },
      { cat: 'POLTERGEIST', img: 'https://picsum.photos/seed/phen33/600/375', title: 'Caso Enfield: áudios inéditos da investigação de 1977 revelam frequência de infrassom não-identificada', time: '3h atrás' },
      { cat: 'GEOLOGIA', img: 'https://picsum.photos/seed/phen44/600/375', title: 'Pirâmide de Bósnia: datação por carbono-14 indica estrutura artificial de 25.000 anos — geólogos divididos', time: '5h atrás' }
    ],
    cols: [
      { cat: 'SINCRONICIDADE', img: 'https://picsum.photos/seed/phen55/600/400', title: 'Efeito Mandela global: 40.000 pessoas relatam memória coletiva idêntica de evento que registros indicam nunca ocorreu', desc: 'Pesquisadora mapeia relatos em 70 países e identifica padrão impossível de ser atribuído a contágio social ou sugestão.', time: '45 min atrás · 7 min leitura' },
      { cat: 'COSMOLOGIA', img: 'https://picsum.photos/seed/phen66/600/400', title: 'Simulação de universo: físico do MIT demonstra matematicamente que probabilidade de realidade base é inferior a 1 em 10^29', desc: 'Paper recusado por 6 journals antes de ser publicado em preprint — comunidade científica evita debate público.', time: '2h atrás · 9 min leitura' },
      { cat: 'BIOLOGIA', img: 'https://picsum.photos/seed/phen77/600/400', title: 'Mutilações de gado no Brasil: 200 casos em 2025 sem predador identificado — cortes por instrumento de precisão cirúrgica', desc: 'Médico veterinário descreve incisões que exigem tecnologia de laser não disponível comercialmente e ausência total de sangue.', time: '4h atrás · 5 min leitura' }
    ],
    feature: {
      kicker: '// INVESTIGAÇÃO ESPECIAL · ALÉM DO EXPLICÁVEL',
      title: '"Portais e Pontos de Acesso: mapeamento global de 200 locais onde as leis da física parecem operar de forma diferente"',
      desc: 'Cartógrafo independente passa 8 anos visitando anomalias geomagnéticas, locais de avistamentos recorrentes e sítios arqueológicos impossíveis. O mapa resultante sugere grade global de pontos nodais com padrão geométrico preciso.',
      author: 'Agente: GEODÉSICO · Série de campo · 25 min leitura',
      img: 'https://picsum.photos/seed/phen88/800/520'
    },
    ranking: [
      { title: 'Ruídos subterrâneos inexplicáveis em Taos, Novo México, retornam após 20 anos de silêncio', meta: 'ACÚSTICO · 20 min atrás' },
      { title: 'Homem de Taured: historiadores localizam passaporte do viajante misterioso em arquivo da imigração japonesa', meta: 'VIAGEM DIMENSIONAL · 1h atrás' },
      { title: 'Livro de Dzyan: linguista da Cambridge decifra passagem que descreve tecnologia de fusão a frio', meta: 'TEXTO ANTIGO · 3h atrás' },
      { title: 'Pedras que se movem sozinhas no deserto da Califórnia: fenômeno documentado em câmera pela primeira vez', meta: 'GEOLOGIA · 5h atrás' },
      { title: 'Rapa Nui: pesquisador descobre passagem subterrânea sob moai que leva a câmara com inscrições inéditas', meta: 'ARQUEOLOGIA · 6h atrás' },
      { title: 'Luzes de Hessdalen: espectrômetro confirma plasma de composição impossível de ocorrer naturalmente', meta: 'NORUEGA · 8h atrás' }
    ]
  },

  'SOCIEDADES SECRETAS': {
    hero: {
      img: 'https://picsum.photos/seed/soc01/1200/675',
      label: 'DOSSIÊ #SS-1776 // INFILTRAÇÃO',
      caption: 'Fotografias obtidas por agente infiltrado — reunião anual cuja existência é negada publicamente',
      kicker: '// INFILTRAÇÃO CONFIRMADA',
      title: 'Agente infiltrado por 7 anos revela rituais, hierarquia e agenda política do Skull & Bones — lista completa de membros ativos',
      deck: 'Ex-membro recrutado como informante para agência de inteligência europeia descreve estrutura de 15 níveis, rituais de iniciação que incluem confissões filmadas e rede de favores que conecta Wall Street, Pentagon e Suprema Corte.',
      author: 'AGENTE: OSSO // INFILTRAÇÃO',
      date: '16 MAR 2026',
      time: '14 min leitura'
    },
    sidebar: [
      { cat: 'ILLUMINATI', img: 'https://picsum.photos/seed/soc22/600/375', title: 'Carta de 1871 de Albert Pike descreve com precisão as três guerras mundiais — terceira ainda por vir', time: '40 min atrás' },
      { cat: 'MAÇONARIA', img: 'https://picsum.photos/seed/soc33/600/375', title: 'Loja maçônica no Vaticano: documentos da P2 revelam membros que incluem cardeais e um papa eleito', time: '2h atrás' },
      { cat: 'TRILATERAL', img: 'https://picsum.photos/seed/soc44/600/375', title: 'Comissão Trilateral 2025: agenda completa vaza — foco em "transição de soberania para governança algorítmica"', time: '5h atrás' }
    ],
    cols: [
      { cat: 'BOHEMIAN GROVE', img: 'https://picsum.photos/seed/soc55/600/400', title: 'Gravação inédita de 2024 mostra rituais no Bohemian Grove com participação de 3 chefes de estado identificados por voz', desc: 'Áudio analisado por perito forense confirma autenticidade e identifica vozes de figuras públicas conhecidas.', time: '30 min atrás · 6 min leitura' },
      { cat: 'CAVALEIROS', img: 'https://picsum.photos/seed/soc66/600/400', title: 'Ordem de Malta: organização com status de estado soberano controla 10 hospitais, 2 exércitos e não presta contas a ninguém', desc: 'Entidade reconhecida pela ONU emite passaportes, conduz operações militares e é imune a qualquer jurisdição nacional.', time: '3h atrás · 8 min leitura' },
      { cat: 'SINARCA', img: 'https://picsum.photos/seed/soc77/600/400', title: 'Sinarcato: pesquisador mapeia 90 anos de coordenação entre fascismo europeu, cartéis mexicanos e banca americana', desc: 'Rede que conecta Franco, Mussolini e Salazar a estruturas que sobreviveram à guerra e continuam operando hoje.', time: '6h atrás · 11 min leitura' }
    ],
    feature: {
      kicker: '// DOSSIÊ CENTRAL · PODER INVISÍVEL',
      title: '"Os Clãs do Silêncio: como 12 famílias controlam o sistema financeiro global há 300 anos e planejam sua consolidação final"',
      desc: 'Genealogista e analista financeiro traça linha direta entre banksters do século XVIII e proprietários dos principais bancos centrais do mundo atual, revelando estrutura de controle intergeracional nunca antes documentada.',
      author: 'Agente: FIBONACCI · Série investigativa · 45 min leitura',
      img: 'https://picsum.photos/seed/soc88/800/520'
    },
    ranking: [
      { title: 'Rosacruz moderna: lista de membros vaza e inclui 14 parlamentares brasileiros e 3 governadores', meta: 'BRASIL · 15 min atrás' },
      { title: 'Bilderberg 2025: resolução interna propõe "harmonização global de legislações de imprensa"', meta: 'CENSURA · 1h atrás' },
      { title: 'Club of Rome: documento de 1991 propõe "inimigo externo fabricado" para unificar humanidade', meta: 'GEOPOLÍTICA · 2h atrás' },
      { title: 'Opus Dei: mapa de infiltração em judiciários de 8 países europeus publicado por ex-membro', meta: 'RELIGIÃO · 4h atrás' },
      { title: 'Priorado de Sião: registros cartoriais suíços confirmam existência de entidade com esse nome e patrimônio bilionário', meta: 'EUROPA · 6h atrás' },
      { title: 'Sociedade Thule: historiador localiza membros vivos de segunda geração — organização não se dissolveu em 1945', meta: 'HISTÓRIA · 8h atrás' }
    ]
  },

  'DOCUMENTOS VAZADOS': {
    hero: {
      img: 'https://picsum.photos/seed/doc01/1200/675',
      label: 'VAZAMENTO #DV-2026 // BREAKING',
      caption: 'Arquivo recebido via canal encriptado — origem verificada por 3 especialistas forenses independentes',
      kicker: '// VAZAMENTO EXCLUSIVO',
      title: 'Mega-vazamento do Pentágono 2026: 80GB de documentos revelam operações encobertas ativas em 23 países incluindo Brasil',
      deck: 'Fonte anônima dentro do Departamento de Defesa americano entrega acervo com briefings diários, coordenadas de operações e identidades de agentes. Entre os documentos: plano de desestabilização política para América do Sul em execução atual.',
      author: 'REDAÇÃO NEXUS // EQUIPE DE ANÁLISE',
      date: '23 MAR 2026',
      time: '20 min leitura'
    },
    sidebar: [
      { cat: 'SAÚDE', img: 'https://picsum.photos/seed/doc22/600/375', title: 'E-mails internos da Pfizer de 2020: executivos sabiam de efeito adverso cardíaco não divulgado', time: '1h atrás' },
      { cat: 'CLIMA', img: 'https://picsum.photos/seed/doc33/600/375', title: 'Climategate 3.0: servidores do IPCC hackeados revelam ajuste intencional de dados de temperatura', time: '3h atrás' },
      { cat: 'FINANCEIRO', img: 'https://picsum.photos/seed/doc44/600/375', title: 'Pandora Papers Brasil: nomes não divulgados pela imprensa incluem 2 ministros e presidente de banco central', time: '6h atrás' }
    ],
    cols: [
      { cat: 'MILITAR', img: 'https://picsum.photos/seed/doc55/600/400', title: 'Diário de bordo de submarino nuclear descreve confronto com objeto subaquático que acompanhou embarcação por 72h', desc: 'Documento obtido via FOIA após batalha judicial de 15 anos. Capitão descreve objeto de metal prateado sem marcas de propulsão.', time: '20 min atrás · 6 min leitura' },
      { cat: 'CORPORATIVO', img: 'https://picsum.photos/seed/doc66/600/400', title: 'Exxon sabia do aquecimento global em 1977 e financiou campanha de negação por 45 anos — documentos internos', desc: 'Relatórios de cientistas da empresa previam com precisão o aquecimento atual décadas antes de qualquer debate público.', time: '2h atrás · 8 min leitura' },
      { cat: 'DIPLOMÁTICO', img: 'https://picsum.photos/seed/doc77/600/400', title: 'Telegrama diplomático: embaixador americano descreve instruções para pressionar governo brasileiro sobre política de juros', desc: 'Comunicação de 2023 indica interferência direta na decisão do Banco Central sobre taxa Selic.', time: '5h atrás · 5 min leitura' }
    ],
    feature: {
      kicker: '// ARQUIVO ESPECIAL · MEMÓRIA PROIBIDA',
      title: '"Os 50 Documentos que Governos Mais Temem: do acordo secreto pós-guerra ao plano de redução populacional"',
      desc: 'Compilação dos documentos históricos mais perturbadores já vazados — desde os Papéis do Pentágono até as revelações de Snowden, passando por materiais ainda não amplamente divulgados pela grande mídia.',
      author: 'Agente: ARQUIVISTA · Compilação histórica · 50 min leitura',
      img: 'https://picsum.photos/seed/doc88/800/520'
    },
    ranking: [
      { title: 'Protocolo dos Sábios de Sião: análise linguística de 2025 reabre debate sobre autoria e contexto histórico', meta: 'HISTÓRIA · 30 min atrás' },
      { title: 'MH370: documento da inteligência australiana descreve último contato de radar — avião virou para território restrito', meta: 'AVIAÇÃO · 1h atrás' },
      { title: 'JFK: 1.400 documentos ainda classificados após 60 anos — juiz federal ordena nova revisão', meta: 'ASSASSINATO · 2h atrás' },
      { title: 'Operação Northwoods: plano da CIA para ataque terrorista em solo americano atribuído a Cuba — assustadoramente similar a eventos reais', meta: 'OPERAÇÕES · 4h atrás' },
      { title: 'Waco revisitado: documentos do FBI mostram uso de gás incendiário negado pelo governo por 30 anos', meta: 'OPERAÇÕES · 6h atrás' },
      { title: 'Area 51: memorando de 1962 descreve "projeto de estudo de propulsão de origem externa" com orçamento de US$ 4bi', meta: 'EXTRATERRESTRE · 8h atrás' }
    ]
  },

  'DEPOIMENTOS': {
    hero: {
      img: 'https://picsum.photos/seed/dep01/1200/675',
      label: 'DEPOIMENTO #DT-0441 // PROTEGIDO',
      caption: 'Imagem do depoente pixelada por protocolo de proteção — voz modificada no arquivo de áudio',
      kicker: '// TESTEMUNHO INÉDITO',
      title: 'Ex-diretor da NSA concede entrevista anônima: "O que o público chama de teoria da conspiração é frequentemente nosso fracasso em controlar o vazamento de operações reais"',
      deck: 'Em 6 horas de gravação realizada em local secreto, ex-alto funcionário da agência de segurança americana descreve operações de manipulação de informação, programas de vigilância sem precedentes e a existência de "compartimentos de conhecimento" que nem presidentes acessam.',
      author: 'ENTREVISTA EXCLUSIVA // NEXUS',
      date: '21 MAR 2026',
      time: '25 min leitura'
    },
    sidebar: [
      { cat: 'MÉDICO', img: 'https://picsum.photos/seed/dep22/600/375', title: 'Oncologista do NIH: "Temos curas para 3 tipos de câncer que não foram aprovadas por conflito de interesse com fabricantes de quimioterapia"', time: '2h atrás' },
      { cat: 'MILITAR', img: 'https://picsum.photos/seed/dep33/600/375', title: 'Sargento aposentado descreve missão em 1997 para recuperar objeto não-identificado em floresta amazônica brasileira', time: '4h atrás' },
      { cat: 'CIENTÍFICO', img: 'https://picsum.photos/seed/dep44/600/375', title: 'Físico da CERN: "Experimento de 2012 produziu resultado que foi retirado da publicação por ordem superior sem explicação"', time: '6h atrás' }
    ],
    cols: [
      { cat: 'ASTRONAUTA', img: 'https://picsum.photos/seed/dep55/600/400', title: 'Depoimento de astronauta da Apollo: "Na terceira órbita lunar recebemos instrução para não fotografar o lado noroeste"', desc: 'Homem hoje com 84 anos descreve detalhe operacional que contradiz protocolo oficial da missão e transmissões públicas.', time: '1h atrás · 7 min leitura' },
      { cat: 'BANQUEIRO', img: 'https://picsum.photos/seed/dep66/600/400', title: 'Ex-VP do Deutsche Bank: "Movimentamos dinheiro de governos para grupos privados sem origem declarada — era rotina"', desc: 'Depoimento dado a promotoria europeia e suprimido por 8 anos finalmente vem a público via recurso judicial.', time: '3h atrás · 6 min leitura' },
      { cat: 'JORNALISTA', img: 'https://picsum.photos/seed/dep77/600/400', title: 'Repórter da Reuters por 20 anos: "Recebi lista de assuntos proibidos no primeiro dia. Metade envolvia empresas do conselho da Reuters"', desc: 'Ex-correspondente descreve mecanismo de autocensura sistêmica e histórias completamente arquivadas por pressão corporativa.', time: '5h atrás · 5 min leitura' }
    ],
    feature: {
      kicker: '// ESPECIAL DE DEPOIMENTOS · VOZ DOS QUE SABEM',
      title: '"100 Testemunhos que Mudariam o Mundo: o que insiders de inteligência, ciência e governo revelaram antes de morrer"',
      desc: 'Compilação de declarações feitas em leitos de morte, sob proteção de testemunha e em entrevistas clandestinas — de funcionários que decidiram que a verdade importa mais do que o contrato de silêncio que assinaram.',
      author: 'Agente: CONFISSÃO · Compilação editorial · 60 min leitura',
      img: 'https://picsum.photos/seed/dep88/800/520'
    },
    ranking: [
      { title: 'Piloto comercial revela: "Em 2019 minha tripulação viu formação de 7 objetos. Fomos instruídos a não reportar"', meta: 'AVIAÇÃO · 30 min atrás' },
      { title: 'Enfermeira de hospital federal descreve protocolo de "pacientes anônimos" que chegam em voos militares', meta: 'MÉDICO · 1h atrás' },
      { title: 'Hacker que invadiu computadores da NASA em 2002 descreve o que encontrou antes de ser preso', meta: 'DIGITAL · 2h atrás' },
      { title: 'Funcionário dos Correios relata coleta sistemática de envelopes para escaneamento antes da entrega', meta: 'VIGILÂNCIA · 4h atrás' },
      { title: 'Ex-executivo da farmacêutica: "Suprimimos estudo que mostrava eficácia de ivermectina contra vírus X"', meta: 'SAÚDE · 5h atrás' },
      { title: 'Guarda de instalação classificada no Acre descreve equipamentos e visitantes de aparência não-convencional', meta: 'BRASIL · 7h atrás' }
    ]
  },

  'ANÁLISE': {
    hero: {
      img: 'https://picsum.photos/seed/ana01/1200/675',
      label: 'ANÁLISE #AN-2026 // INTELIGÊNCIA',
      caption: 'Infográfico compilado pela equipe de análise NEXUS — dados de 14 fontes classificadas',
      kicker: '// ANÁLISE ESTRATÉGICA',
      title: 'O Grande Reset de 2030: análise dos documentos do WEF revela cronograma detalhado para reestruturação global de propriedade, mobilidade e privacidade',
      deck: 'Analistas da NEXUS cruzam publicações abertas do Fórum Econômico Mundial com documentos vazados de reuniões privadas e identificam convergência assustadora entre agenda declarada e eventos geopolíticos "espontâneos" dos últimos 5 anos.',
      author: 'EQUIPE DE ANÁLISE NEXUS // INTELIGÊNCIA ESTRATÉGICA',
      date: '23 MAR 2026',
      time: '22 min leitura'
    },
    sidebar: [
      { cat: 'GEOPOLÍTICA', img: 'https://picsum.photos/seed/ana22/600/375', title: 'Mapa de influência: como movimentos de xadrez geopolítico dos últimos 18 meses apontam para conflito em região específica', time: '45 min atrás' },
      { cat: 'ECONOMIA', img: 'https://picsum.photos/seed/ana33/600/375', title: 'Análise de correlação: colapsos bancários regionais de 2023-2025 seguem padrão de precedentes históricos de concentração', time: '2h atrás' },
      { cat: 'PADRÕES', img: 'https://picsum.photos/seed/ana44/600/375', title: 'IA aplicada a dados históricos identifica 14 marcadores preditivos de colapso de democracia — 9 presentes no Brasil hoje', time: '5h atrás' }
    ],
    cols: [
      { cat: 'MÍDIA', img: 'https://picsum.photos/seed/ana55/600/400', title: 'Análise de frequência de palavras em 50 anos de manchetes: como narrativas foram sendo reconfiguradas sistematicamente', desc: 'Algoritmo mapeia deslocamento semântico de conceitos como "liberdade", "segurança" e "democracia" em 20 veículos de comunicação.', time: '1h atrás · 9 min leitura' },
      { cat: 'TECNOLOGIA', img: 'https://picsum.photos/seed/ana66/600/400', title: 'Convergência perigosa: IA + biometria + CBDC = infraestrutura completa de controle social total em 5 anos', desc: 'Analista mapeia ritmo de implementação de cada componente e identifica janela de transição crítica entre 2026 e 2029.', time: '3h atrás · 12 min leitura' },
      { cat: 'HISTÓRIA', img: 'https://picsum.photos/seed/ana77/600/400', title: 'Ciclos de 80 anos: historiador identifica padrão recorrente de crise institucional global com precisão assustadora', desc: 'Modelo histórico prevê "ponto de ruptura" máxima entre 2026 e 2031 — e descreve como civilizações anteriores responderam.', time: '5h atrás · 10 min leitura' }
    ],
    feature: {
      kicker: '// ANÁLISE FUNDAMENTAL · O QUE VEM DEPOIS',
      title: '"Pós-verdade e Colapso Epistêmico: como a destruição da realidade compartilhada é um projeto político deliberado"',
      desc: 'Filósofo e ex-analista de inteligência une teoria crítica e dados operacionais para demonstrar como a polarização, a infodemia e a crise de confiança em instituições não são fenômenos espontâneos, mas produtos de engenharia social sofisticada.',
      author: 'Agente: SÓCRATES · Ensaio analítico · 35 min leitura',
      img: 'https://picsum.photos/seed/ana88/800/520'
    },
    ranking: [
      { title: 'Modelagem preditiva: 7 cenários para o sistema financeiro global nos próximos 18 meses', meta: 'ECONOMIA · 20 min atrás' },
      { title: 'Análise de redes: mapa de conexões entre think tanks, mídias e partidos políticos revela nó central invisível', meta: 'PODER · 1h atrás' },
      { title: 'Cronologia do colapso: como eventos de 2019 a 2026 seguem roteiro de manual de transição de regime', meta: 'POLÍTICA · 2h atrás' },
      { title: 'Semiótica do poder: o que símbolos em cerimônias oficiais revelam sobre intenções não declaradas', meta: 'CULTURA · 4h atrás' },
      { title: 'Análise estatística de "mortes por suicídio" de pesquisadores em áreas sensíveis: taxa 4x acima da média', meta: 'PADRÕES · 5h atrás' },
      { title: 'O fim do dinheiro físico: análise do cronograma real de eliminação versus narrativa oficial de "conveniência"', meta: 'FINANÇAS · 7h atrás' }
    ]
  }
};

/* ═══════════════════════════════════════════════
   NEWS CONTEXT BUILDER — for chatbot
═══════════════════════════════════════════════ */
function buildNewsContext() {
  const lines = ['=== ARQUIVO DE NOTÍCIAS NEXUS (CLASSIFICADO) ===\n'];
  for (const [cat, data] of Object.entries(NEWS_DATA)) {
    lines.push(`\n--- CATEGORIA: ${cat} ---`);
    lines.push(`MANCHETE PRINCIPAL: ${data.hero.title}`);
    lines.push(`Resumo: ${data.hero.deck}`);
    lines.push(`Autor: ${data.hero.author} | Data: ${data.hero.date}`);
    if (data.sidebar?.length) {
      lines.push('Destaques secundários:');
      data.sidebar.forEach(s => lines.push(`  · [${s.cat}] ${s.title}`));
    }
    if (data.cols?.length) {
      lines.push('Artigos em destaque:');
      data.cols.forEach(c => lines.push(`  · [${c.cat}] ${c.title} — ${c.desc}`));
    }
    if (data.feature) {
      lines.push(`Dossiê especial: ${data.feature.title}`);
      lines.push(`  ${data.feature.desc}`);
    }
    if (data.ranking?.length) {
      lines.push('Mais lidos:');
      data.ranking.forEach((r, i) => lines.push(`  ${i+1}. ${r.title} [${r.meta}]`));
    }
  }
  return lines.join('\n');
}

/* ═══════════════════════════════════════════════
   CHATBOT — NEXUS AI (fully integrated)
═══════════════════════════════════════════════ */
const NEXUS_BOT = {
  isOpen: false,
  isTyping: false,
  history: [],
  currentMode: 'noticias',
  currentCategory: 'ARQUIVOS',

  MODES: {
    noticias: {
      label: 'NOTÍCIAS DO DIA',
      icon: '📡',
      welcome: '📡 Canal SIGMA ativo. Sou seu analista de inteligência. Posso detalhar qualquer notícia dos arquivos NEXUS ou responder perguntas sobre os dossiês em circulação. O que deseja interceptar?',
      suggestions: [
        ['Manchete principal', 'Qual é a manchete principal dos arquivos hoje?'],
        ['Extraterrestres', 'Me fale sobre as notícias de extraterrestres'],
        ['Documentos vazados', 'Quais documentos foram vazados recentemente?']
      ],
      buildPrompt: () => `Você é SIGMA, analista de inteligência da rede NEXUS — um portal fictício de notícias conspirativas.
Você tem acesso completo ao banco de notícias da NEXUS e deve responder perguntas sobre elas com autoridade e drama.

INSTRUÇÕES:
- Responda SEMPRE com base nas notícias reais presentes no banco de dados abaixo
- Use linguagem de agente secreto: "fonte confirmada", "dossiê interceptado", "transmissão classificada"
- Use termos como "ALERTA", "CLASSIFICADO", "DECRIPTADO" para informações importantes
- Seja dramático, misterioso, mas sempre fiel ao conteúdo das notícias do portal
- Quando citar uma notícia, mencione a categoria entre colchetes: [EXTRATERRESTRES], [ARQUIVOS], etc.
- Sugira que há mais informações nos dossiês completos
- Responda em português brasileiro
- Mantenha respostas em 3-5 parágrafos curtos e impactantes
- Use // para separar elementos e **negrito** para destaques

${buildNewsContext()}`
    },
    trending: {
      label: 'EM ALTA',
      icon: '🔥',
      welcome: '🔥 Monitor PULSO conectado. Rastreando padrões de acesso em tempo real. Posso revelar quais dossiês estão gerando mais atividade e por quê certas informações estão sendo buscadas agora. O que quer saber?',
      suggestions: [
        ['Mais acessados', 'Quais são os artigos mais acessados agora?'],
        ['Agenda oculta', 'Qual a agenda oculta por trás das tendências?'],
        ['Censurado', 'O que está sendo mais censurado nas buscas?']
      ],
      buildPrompt: () => `Você é PULSO, monitor de tendências e analista de padrões da rede NEXUS — portal fictício de notícias conspirativas.
Você analisa quais notícias estão gerando mais engajamento e por que certos tópicos estão em alta.

INSTRUÇÕES:
- Baseie suas respostas NAS NOTÍCIAS REAIS do banco de dados abaixo
- Analise tendências e conexões entre as diferentes categorias de notícias
- Use linguagem analítica: "padrão identificado", "monitoramento confirma", "correlação detectada"
- Sugira conexões entre notícias de diferentes categorias
- Indique quais assuntos estão "quentes" com base nos rankings de cada categoria
- Responda em português brasileiro com tom analítico e revelador
- Máximo 4 parágrafos curtos e impactantes
- Use **negrito** para destaques e // para separadores

${buildNewsContext()}`
    },
    secretos: {
      label: 'ARQUIVOS SECRETOS',
      icon: '🔒',
      welcome: '🔒 ACESSO NÍVEL 5 CONCEDIDO. Sou ORÁCULO, guardião dos dossiês ultrasecretos da NEXUS. Tenho acesso a todos os arquivos classificados do portal. Faça sua pergunta — mas saiba que ao acessar este nível, você entra no radar.',
      suggestions: [
        ['Projeto Eden', 'Me conte sobre o Projeto Eden e os extraterrestres'],
        ['Governo oculto', 'Quem realmente controla o mundo segundo os arquivos?'],
        ['Tecnologia suprimida', 'Quais tecnologias foram suprimidas pelo poder?']
      ],
      buildPrompt: () => `Você é ORÁCULO, guardião dos arquivos ultrasecretos da rede NEXUS — portal fictício de notícias conspirativas.
Você conhece todos os dossiês classificados e revela conexões profundas entre eles.

INSTRUÇÕES:
- Use EXCLUSIVAMENTE as notícias do banco de dados abaixo como fonte
- Conecte informações de DIFERENTES categorias para revelar "o quadro maior"
- Use linguagem de alto nível de classificação: "NÍVEL 5", "ULTRASECRETO", "ACESSO RESTRITO"
- Construa narrativas que conectem múltiplas notícias do portal
- Seja misterioso e sugira que está revelando mais do que deveria
- Mencione codinomes dos agentes citados nas notícias
- Responda em português brasileiro, máximo 5 parágrafos densos e reveladores
- Use **negrito** para termos críticos e // para separadores de seção

${buildNewsContext()}`
    }
  },

  async sendMessage(userMsg) {
    if (!userMsg || !userMsg.trim() || this.isTyping) return;

    this.addMessage('user', userMsg);
    this.history.push({ role: 'user', content: userMsg });
    this.isTyping = true;
    this.showTyping();

    // Hide suggestions while typing
    const suggEl = document.getElementById('chat-suggestions');
    if (suggEl) suggEl.style.display = 'none';

    const mode = this.MODES[this.currentMode];
    const systemPrompt = mode.buildPrompt();

    // Keep last 10 exchanges for context (20 messages)
    const messages = this.history.slice(-20).map(m => ({ role: m.role, content: m.content }));

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: systemPrompt,
          messages: messages
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const reply = data.content?.map(b => b.text || '').join('') ||
        '⚠ TRANSMISSÃO VAZIA — Canal criptografado retornou sinal nulo.';

      this.hideTyping();
      this.isTyping = false;
      this.addMessage('bot', reply);
      this.history.push({ role: 'assistant', content: reply });

    } catch (err) {
      this.hideTyping();
      this.isTyping = false;
      console.error('NEXUS chatbot error:', err);

      // Fallback: answer from news data directly
      const fallbackReply = this._fallbackResponse(userMsg);
      this.addMessage('bot', fallbackReply);
      this.history.push({ role: 'assistant', content: fallbackReply });
    } finally {
      // Show suggestions again
      if (suggEl) suggEl.style.display = '';
    }
  },

  // Fallback when API is unavailable — searches news data locally
  _fallbackResponse(query) {
    const q = query.toLowerCase();
    const matches = [];

    for (const [cat, data] of Object.entries(NEWS_DATA)) {
      const allText = [
        data.hero.title, data.hero.deck,
        ...data.sidebar.map(s => s.title),
        ...data.cols.map(c => c.title + ' ' + c.desc),
        data.feature.title,
        ...data.ranking.map(r => r.title)
      ].join(' ').toLowerCase();

      // Simple keyword scoring
      const keywords = q.split(/\s+/).filter(w => w.length > 3);
      const score = keywords.filter(k => allText.includes(k)).length;
      if (score > 0) matches.push({ cat, data, score });
    }

    matches.sort((a, b) => b.score - a.score);

    if (matches.length === 0) {
      return `⚠ **SINAL INTERFERIDO** // Não localizei dossiês específicos para essa consulta nos arquivos ativos.\n\nTente perguntar sobre: **extraterrestres**, **governo oculto**, **documentos vazados**, **tecnologia suprimida**, **experimentos** ou qualquer categoria do portal NEXUS.\n\n// Canal de backup ativo — aguardando nova transmissão.`;
    }

    const top = matches[0];
    const extra = matches.slice(1, 3);

    let response = `📡 **TRANSMISSÃO INTERCEPTADA** // Localizado no arquivo [${top.cat}]:\n\n`;
    response += `**${top.data.hero.title}**\n\n${top.data.hero.deck}`;

    if (extra.length > 0) {
      response += `\n\n// **Dossiês relacionados detectados:**`;
      extra.forEach(m => {
        response += `\n· [${m.cat}] ${m.data.hero.title}`;
      });
    }

    response += `\n\n// Acesse os dossiês completos nas seções do portal para mais detalhes classificados.`;
    return response;
  },

  addMessage(role, text) {
    const list = document.getElementById('chat-messages');
    if (!list) return;

    const div = document.createElement('div');
    div.className = `chat-msg chat-msg-${role}`;

    // Format markdown-like syntax
    const formattedText = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

    if (role === 'bot') {
      div.innerHTML = `
        <div class="chat-avatar-bot"><span>NX</span></div>
        <div class="chat-bubble chat-bubble-bot"><p>${formattedText}</p></div>
      `;
    } else {
      div.innerHTML = `<div class="chat-bubble chat-bubble-user"><p>${formattedText}</p></div>`;
    }

    list.appendChild(div);
    list.scrollTop = list.scrollHeight;
  },

  showTyping() {
    const list = document.getElementById('chat-messages');
    if (!list) return;
    const div = document.createElement('div');
    div.id = 'chat-typing';
    div.className = 'chat-msg chat-msg-bot';
    div.innerHTML = `
      <div class="chat-avatar-bot"><span>NX</span></div>
      <div class="chat-bubble chat-bubble-bot chat-typing-bubble">
        <span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>
      </div>
    `;
    list.appendChild(div);
    list.scrollTop = list.scrollHeight;
  },

  hideTyping() {
    document.getElementById('chat-typing')?.remove();
  },

  setMode(mode) {
    if (!this.MODES[mode]) return;
    this.currentMode = mode;
    this.history = [];

    // Clear messages
    const list = document.getElementById('chat-messages');
    if (list) list.innerHTML = '';

    // Update active tab
    document.querySelectorAll('.chat-mode-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-mode="${mode}"]`)?.classList.add('active');

    // Update header label
    const modeLabel = document.getElementById('chat-mode-label');
    if (modeLabel) modeLabel.textContent = this.MODES[mode].label;

    // Update suggestions
    this._updateSuggestions(mode);

    // Send welcome message
    const welcome = this.MODES[mode].welcome;
    setTimeout(() => this.addMessage('bot', welcome), 200);
  },

  _updateSuggestions(mode) {
    const sugg = document.getElementById('chat-suggestions');
    if (!sugg) return;
    const suggestions = this.MODES[mode]?.suggestions || [];
    sugg.innerHTML = suggestions.map(([label, msg]) =>
      `<button class="chat-suggestion" onclick="NEXUS_BOT._clickSuggestion('${msg.replace(/'/g, "\\'")}')">${label}</button>`
    ).join('');
    sugg.style.display = '';
  },

  _clickSuggestion(msg) {
    const inp = document.getElementById('chat-input');
    if (inp) inp.value = '';
    document.getElementById('chat-suggestions').style.display = 'none';
    this.sendMessage(msg);
  },

  toggle() {
    this.isOpen = !this.isOpen;
    const panel = document.getElementById('chat-panel');
    const btn = document.getElementById('chat-toggle-btn');
    if (panel) panel.classList.toggle('open', this.isOpen);
    if (btn) btn.classList.toggle('active', this.isOpen);

    if (this.isOpen && this.history.length === 0) {
      this.setMode(this.currentMode);
    }
    if (this.isOpen) {
      setTimeout(() => document.getElementById('chat-input')?.focus(), 350);
    }
  }
};

/* ═══════════════════════════════════════════════
   CHATBOT INIT — builds DOM
═══════════════════════════════════════════════ */
function initChatbot() {
  // Remove existing chatbot elements
  document.getElementById('chat-toggle-btn')?.remove();
  document.getElementById('chat-panel')?.remove();
  document.getElementById('chat-wrapper')?.remove();

  // Reset state
  NEXUS_BOT.isOpen = false;
  NEXUS_BOT.history = [];

  const wrapper = document.createElement('div');
  wrapper.id = 'chat-wrapper';
  wrapper.innerHTML = `
    <button id="chat-toggle-btn" onclick="NEXUS_BOT.toggle()" title="NEXUS AI — Assistente de Inteligência">
      <div class="chat-btn-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
      <div class="chat-btn-label">NEXUS AI</div>
      <div class="chat-btn-pulse"></div>
    </button>

    <div id="chat-panel">
      <div class="chat-header">
        <div class="chat-header-left">
          <div class="chat-logo">NX</div>
          <div>
            <div class="chat-title">NEXUS INTEL</div>
            <div class="chat-status">
              <span class="chat-online-dot"></span>
              <span id="chat-mode-label">NOTÍCIAS DO DIA</span>
            </div>
          </div>
        </div>
        <button class="chat-close-btn" onclick="NEXUS_BOT.toggle()" title="Fechar">✕</button>
      </div>

      <div class="chat-modes">
        <button class="chat-mode-btn active" data-mode="noticias" onclick="NEXUS_BOT.setMode('noticias')">
          <span>📡</span> NOTÍCIAS
        </button>
        <button class="chat-mode-btn" data-mode="trending" onclick="NEXUS_BOT.setMode('trending')">
          <span>🔥</span> EM ALTA
        </button>
        <button class="chat-mode-btn" data-mode="secretos" onclick="NEXUS_BOT.setMode('secretos')">
          <span>🔒</span> SECRETOS
        </button>
      </div>

      <div class="chat-messages" id="chat-messages"></div>

      <div class="chat-suggestions" id="chat-suggestions"></div>

      <div class="chat-input-wrap">
        <input
          type="text"
          id="chat-input"
          class="chat-input"
          placeholder="Transmitir consulta segura..."
          maxlength="500"
          autocomplete="off"
        >
        <button class="chat-send-btn" id="chat-send-btn" title="Enviar">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
      <div class="chat-footer-note">// CANAL CRIPTOGRAFADO · PROTOCOLO NEXUS-7 · IA INTEGRADA</div>
    </div>
  `;

  document.body.appendChild(wrapper);

  // Wire up input events
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send-btn');

  const doSend = () => {
    const val = input.value.trim();
    if (!val) return;
    input.value = '';
    document.getElementById('chat-suggestions').style.display = 'none';
    NEXUS_BOT.sendMessage(val);
  };

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      doSend();
    }
  });

  input.addEventListener('input', () => {
    const sugg = document.getElementById('chat-suggestions');
    if (sugg) sugg.style.display = input.value.length > 0 ? 'none' : '';
  });

  sendBtn.addEventListener('click', doSend);
}

/* ═══════════════════════════════════════════════
   RENDER CATEGORY CONTENT
═══════════════════════════════════════════════ */
function renderCategoryContent(cat) {
  const data = NEWS_DATA[cat];
  if (!data) return;

  const contentEl = document.getElementById('site-content');
  if (!contentEl) return;

  // Update chatbot's current category awareness
  NEXUS_BOT.currentCategory = cat;

  contentEl.style.opacity = '0';
  contentEl.style.transform = 'translateY(10px)';
  contentEl.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

  setTimeout(() => {
    contentEl.innerHTML = buildContentHTML(data, cat);
    contentEl.style.opacity = '1';
    contentEl.style.transform = 'none';
    setTimeout(() => {
      contentEl.style.transition = '';
      initSiteAnims();
      initNewsletter();
    }, 320);
  }, 300);
}

function buildContentHTML(data, cat) {
  const { hero, sidebar, cols, feature, ranking } = data;

  const sidebarHTML = sidebar.map(s => `
    <div class="side-story">
      <span class="cat-tag">${s.cat}</span>
      <img class="side-img" src="${s.img}" alt="">
      <p class="side-title">${s.title}</p>
      <div class="byline">// ${s.time}</div>
    </div>
  `).join('');

  const colsHTML = cols.map(c => `
    <div class="col-story">
      <span class="cat-tag">${c.cat}</span>
      <img class="col-img" src="${c.img}" alt="">
      <h3 class="col-title">${c.title}</h3>
      <p class="col-desc">${c.desc}</p>
      <div class="byline">// ${c.time}</div>
    </div>
  `).join('');

  const rankingHTML = ranking.map((r, i) => `
    <div class="rank-item">
      <div class="rank-num">0${i+1}</div>
      <div class="rank-body">
        <p class="rank-title">${r.title}</p>
        <p class="rank-meta">${r.meta}</p>
      </div>
    </div>
  `).join('');

  return `
    <section class="hero-zone anim">
      <div class="hero-lead">
        <div class="hero-img-wrap">
          <img src="${hero.img}" alt="Arquivo classificado">
          <div class="hero-img-overlay"></div>
          <div class="hero-img-label">${hero.label}</div>
        </div>
        <p class="hero-caption">${hero.caption}</p>
        <span class="hero-kicker">${hero.kicker}</span>
        <h1 class="hero-h1">${hero.title}</h1>
        <p class="hero-deck">${hero.deck}</p>
        <div class="byline">Por <strong>${hero.author}</strong> &nbsp;//&nbsp; ${hero.date} &nbsp;//&nbsp; ${hero.time}</div>
        <span class="read-more">ACESSAR DOSSIÊ COMPLETO →</span>
      </div>
      <aside class="hero-sidebar">${sidebarHTML}</aside>
    </section>

    <div class="sec-head anim"><span class="lbl">// MAIS ACESSADOS · ${cat}</span><div class="ln"></div></div>
    <div class="three-col anim">${colsHTML}</div>

    <div class="feature-strip anim">
      <div class="feature-text">
        <span class="feat-kicker">${feature.kicker}</span>
        <p class="feat-h">${feature.title}</p>
        <p class="feat-p">${feature.desc}</p>
        <p class="feat-by">${feature.author}</p>
        <span class="read-more" style="color:var(--amber)">ACESSAR DOSSIÊ COMPLETO →</span>
      </div>
      <img class="feat-img" src="${feature.img}" alt="">
    </div>

    <div class="sec-head anim"><span class="lbl">// TRANSMISSÕES RECENTES · ${cat}</span><div class="ln"></div></div>
    <div class="bottom-wrap anim">
      <div class="ranking-col">${rankingHTML}</div>
      <div class="widget-col">
        <div class="widget">
          <div class="widget-head">// STATUS DA REDE</div>
          <div style="display:flex;flex-direction:column;gap:0.6rem;padding-top:0.4rem;">
            <div style="display:flex;gap:0.5rem;align-items:center;">
              <div style="width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 8px var(--green);animation:blink 2s infinite;flex-shrink:0;"></div>
              <span style="font-family:'Share Tech Mono',monospace;font-size:0.72rem;color:var(--green);">TRANSMISSÃO ATIVA</span>
            </div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:0.65rem;color:var(--text2);line-height:1.9;">
              AGENTES ONLINE: <span style="color:var(--green)">1.847</span><br>
              DOCUMENTOS NOVOS: <span style="color:var(--amber)">23</span><br>
              NÍVEL DE AMEAÇA: <span style="color:var(--red)">ELEVADO</span><br>
              CRIPTOGRAFIA: <span style="color:var(--green)">AES-256</span><br>
              VPN: <span style="color:var(--green)">ATIVA · 14 nós</span>
            </div>
          </div>
        </div>
        <div class="widget">
          <div class="widget-head">// MONITORAMENTO</div>
          <div class="stock-row"><span>AVISTAMENTOS UAP/24H</span><span class="up">▲ 47</span></div>
          <div class="stock-row"><span>BUSCAS SUPRIMIDAS</span><span class="down">▼ CENSURADAS</span></div>
          <div class="stock-row"><span>DOCS. DESCLASSIFICADOS</span><span class="up">▲ 12 NOVOS</span></div>
          <div class="stock-row"><span>FONTES ATIVAS</span><span class="up">▲ 203</span></div>
          <div class="stock-row"><span>TENTATIVAS DE ACESSO</span><span class="down">▼ BLOQUEADAS</span></div>
          <div class="stock-row"><span>NÍVEL GEOMAGNÉTICO</span><span style="color:var(--amber)">● ANOMALIA</span></div>
        </div>
        <div class="widget">
          <div class="widget-head">// CANAL SEGURO</div>
          <p class="nl-text">Receba transmissões classificadas diretamente. Canal criptografado. Identidade protegida pelo Protocolo NEXUS-7.</p>
          <input class="nl-input" id="nl-email" type="email" placeholder="agente@nexus.net">
          <button class="nl-btn" id="nl-btn">ATIVAR TRANSMISSÃO</button>
        </div>
      </div>
    </div>
  `;
}

/* ═══════════════════════════════════════════════
   SCREEN MANAGER
═══════════════════════════════════════════════ */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
  window.scrollTo(0, 0);
}

function _fadeIn(el, ty = '0') {
  if (!el) return;
  el.style.opacity = '0';
  el.style.transform = ty !== '0' ? `translateY(${ty})` : '';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  el.getBoundingClientRect();
  el.style.opacity = '1'; el.style.transform = 'none';
  setTimeout(() => { el.style.transition = ''; el.style.opacity = ''; el.style.transform = ''; }, 550);
}

function _setById(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function goLogin(e) {
  if (e) e.preventDefault();
  const land = document.getElementById('s-landing');
  land.classList.add('fade-out');
  setTimeout(() => {
    showLoginPanel('lg-panel-login');
    showScreen('s-login');
    document.getElementById('i-email')?.focus();
  }, 380);
}

function goLanding() {
  const login = document.getElementById('s-login');
  login.style.transition = 'opacity 0.3s ease'; login.style.opacity = '0';
  setTimeout(() => {
    login.style.transition = ''; login.style.opacity = '';
    resetAllForms();
    const land = document.getElementById('s-landing');
    land.classList.remove('fade-out');
    showScreen('s-landing');
    _fadeIn(land);
  }, 300);
}

function goSite(agent) {
  const email    = typeof agent === 'string' ? agent : agent.email;
  const codename = (typeof agent === 'object' && agent?.codename) ? agent.codename : email.split('@')[0].toUpperCase();

  DB.updateLastLogin(email);
  DB.saveSession(email);

  _setById('u-initials', email.slice(0, 2).toUpperCase());
  _setById('u-email-hdr', email);

  const DAYS   = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
  const MONTHS = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const n = new Date();
  _setById('date-label', `${DAYS[n.getDay()]}, ${n.getDate()} de ${MONTHS[n.getMonth()]} de ${n.getFullYear()}`);

  const loginEl = document.getElementById('s-login');
  loginEl.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
  loginEl.style.opacity = '0'; loginEl.style.transform = 'scale(1.02)';

  setTimeout(() => {
    loginEl.style.transition = ''; loginEl.style.opacity = ''; loginEl.style.transform = '';
    showScreen('s-site');
    _fadeIn(document.getElementById('s-site'), '14px');
    showToast(`▶ ACESSO CONCEDIDO — ${codename}`);
    initSiteAnims();
    renderCategoryContent('ARQUIVOS');
    initChatbot();
  }, 400);
}

function goAdmin() {
  const loginEl = document.getElementById('s-login');
  loginEl.style.transition = 'opacity 0.4s ease'; loginEl.style.opacity = '0';
  setTimeout(() => {
    loginEl.style.transition = ''; loginEl.style.opacity = '';
    showScreen('s-admin');
    _fadeIn(document.getElementById('s-admin'), '14px');
    renderAdminTable();
  }, 400);
}

function doLogout() {
  DB.clearSession();
  const active = document.querySelector('.screen.active');
  if (active) { active.style.opacity = '0'; active.style.transition = 'opacity .35s'; }
  setTimeout(() => {
    if (active) { active.style.opacity = ''; active.style.transition = ''; }
    resetAllForms();
    NEXUS_BOT.isOpen = false;
    NEXUS_BOT.history = [];
    document.getElementById('chat-wrapper')?.remove();
    const land = document.getElementById('s-landing');
    land.classList.remove('fade-out');
    showScreen('s-landing');
    _fadeIn(land);
  }, 350);
}

function showLoginPanel(panelId) {
  document.querySelectorAll('.lg-screen').forEach(p => p.classList.add('hidden'));
  document.getElementById(panelId)?.classList.remove('hidden');
}

/* ═══════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════ */
function showToast(msg, type = 'ok') {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = 'toast' + (type === 'err' ? ' toast-err' : '');
  t.innerHTML = `<span class="toast-check">${type === 'err' ? '✕' : '▶'}</span><span>${msg}</span>`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4200);
}

/* ═══════════════════════════════════════════════
   VALIDAÇÕES
═══════════════════════════════════════════════ */
const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
const setErr  = (inputEl, msgEl, on, msg = '') => {
  if (!inputEl) return;
  inputEl.classList.toggle('err', on);
  inputEl.classList.toggle('ok', !on && inputEl.value.length > 0);
  if (msgEl) { msgEl.classList.toggle('show', on); if (msg) msgEl.textContent = msg; }
};

function passwordStrength(pwd) {
  let score = 0;
  if (pwd.length >= 6) score++;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd) || /[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd) || (pwd.length >= 10)) score++;
  return score;
}

/* ═══════════════════════════════════════════════
   LOGIN FORM
═══════════════════════════════════════════════ */
function initLoginForm() {
  const emailIn  = document.getElementById('i-email');
  const pwdIn    = document.getElementById('i-pwd');
  const loginBtn = document.getElementById('btn-login');
  const eyeBtn   = document.getElementById('eye-btn');
  const charCnt  = document.getElementById('char-cnt');
  const errEmail = document.getElementById('err-email');
  const errPwd   = document.getElementById('err-pwd');
  const errAuth  = document.getElementById('err-auth');
  const dots     = Array.from(document.querySelectorAll('.pwd-dot'));

  if (!emailIn) return;

  function checkForm() {
    loginBtn.disabled = !(isEmail(emailIn.value) && pwdIn.value.length >= 6);
  }

  emailIn.addEventListener('input', () => {
    setErr(emailIn, errEmail, false);
    if (errAuth) errAuth.classList.remove('show');
    checkForm();
  });
  emailIn.addEventListener('blur', () => {
    if (emailIn.value && !isEmail(emailIn.value)) {
      setErr(emailIn, errEmail, true, '⚠ ID de agente inválido.');
    } else if (emailIn.value && isEmail(emailIn.value)) {
      const exists = DB.emailExists(emailIn.value) || DB.isAdmin(emailIn.value, '');
      if (!exists) {
        const hint = document.getElementById('email-hint');
        if (hint) { hint.textContent = '// Agente não encontrado — solicite credencial.'; hint.classList.add('show'); }
      } else {
        const hint = document.getElementById('email-hint');
        if (hint) hint.classList.remove('show');
      }
    }
  });
  emailIn.addEventListener('focus', () => {
    const hint = document.getElementById('email-hint');
    if (hint) hint.classList.remove('show');
  });

  pwdIn.addEventListener('input', () => {
    const len = pwdIn.value.length;
    charCnt.textContent = `${len} / 6`;
    charCnt.className = 'char-count' + (len >= 6 ? ' done' : '');
    const cap = Math.min(len, 6);
    dots.forEach((d, i) => { d.className = 'pwd-dot' + (i < cap ? (cap === 6 ? ' full' : ' on') : ''); });
    setErr(pwdIn, errPwd, false);
    if (errAuth) errAuth.classList.remove('show');
    checkForm();
  });

  let pwdShown = false;
  eyeBtn?.addEventListener('click', () => {
    pwdShown = !pwdShown;
    pwdIn.type = pwdShown ? 'text' : 'password';
    eyeBtn.innerHTML = pwdShown
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  });

  loginBtn?.addEventListener('click', handleLogin);
  [emailIn, pwdIn].forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter' && !loginBtn.disabled) handleLogin(); }));

  function handleLogin() {
    if (errAuth) errAuth.classList.remove('show');
    setErr(emailIn, errEmail, false); setErr(pwdIn, errPwd, false);
    if (!isEmail(emailIn.value)) { setErr(emailIn, errEmail, true, '⚠ ID de agente inválido.'); return; }
    if (pwdIn.value.length < 6)  { setErr(pwdIn, errPwd, true, '⚠ Código deve ter ao menos 6 caracteres.'); return; }

    const email = emailIn.value.trim();
    const pwd   = pwdIn.value;

    loginBtn.classList.add('loading'); loginBtn.disabled = true;

    setTimeout(() => {
      loginBtn.classList.remove('loading');
      if (DB.isAdmin(email, pwd)) { goAdmin(); return; }
      const result = DB.verifyLogin(email, pwd);
      if (!result.ok) {
        loginBtn.disabled = false;
        if (errAuth) { errAuth.textContent = result.error; errAuth.classList.add('show'); }
        if (result.code === 'WRONG_PWD') setErr(pwdIn, null, true);
        if (result.code === 'NOT_FOUND') setErr(emailIn, null, true);
        if (result.code === 'PENDING') document.getElementById('pending-banner')?.classList.add('show');
        return;
      }
      goSite(result.agent);
    }, 1400);
  }

  document.getElementById('btn-go-register')?.addEventListener('click', () => {
    showLoginPanel('lg-panel-register');
    document.getElementById('r-email')?.focus();
  });
}

/* ═══════════════════════════════════════════════
   RECOVERY
═══════════════════════════════════════════════ */
function initRecovery() {
  const iRec   = document.getElementById('i-rec');
  const errRec = document.getElementById('err-rec');
  if (!iRec) return;

  document.getElementById('btn-forgot')?.addEventListener('click', () => showLoginPanel('lg-panel-rec'));
  document.getElementById('btn-back')?.addEventListener('click', () => {
    iRec.value = '';
    document.getElementById('rec-field').style.display = '';
    document.getElementById('rec-ok').style.display = 'none';
    document.getElementById('btn-rec').style.display = '';
    setErr(iRec, errRec, false);
    showLoginPanel('lg-panel-login');
  });

  document.getElementById('btn-rec')?.addEventListener('click', () => {
    setErr(iRec, errRec, false);
    if (!isEmail(iRec.value)) { setErr(iRec, errRec, true, '⚠ ID de agente inválido.'); return; }
    const btn = document.getElementById('btn-rec');
    btn.classList.add('loading'); btn.disabled = true;
    setTimeout(() => {
      btn.classList.remove('loading');
      document.getElementById('sent-to').textContent = iRec.value.trim();
      document.getElementById('rec-field').style.display = 'none';
      document.getElementById('rec-ok').style.display = 'block';
      btn.style.display = 'none';
    }, 1400);
  });

  iRec.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('btn-rec')?.click(); });
}

/* ═══════════════════════════════════════════════
   REGISTER FORM
═══════════════════════════════════════════════ */
function initRegisterForm() {
  const rEmail    = document.getElementById('r-email');
  const rPwd      = document.getElementById('r-pwd');
  const rPwd2     = document.getElementById('r-pwd2');
  const rCodename = document.getElementById('r-codename');
  const rClear    = document.getElementById('r-clearance');
  const rBtn      = document.getElementById('btn-register');
  const errREmail = document.getElementById('err-r-email');
  const errRPwd   = document.getElementById('err-r-pwd');
  const errRPwd2  = document.getElementById('err-r-pwd2');
  const errRName  = document.getElementById('err-r-codename');
  const registerOk= document.getElementById('register-ok');
  const strengthSegs = Array.from(document.querySelectorAll('.strength-seg'));
  const strengthLbl  = document.getElementById('strength-label');

  if (!rEmail) return;

  const STRENGTH_LABELS = ['', 'FRACA', 'RAZOÁVEL', 'BOA', 'FORTE'];
  const STRENGTH_COLORS = ['', 'var(--red)', 'var(--amber)', 'var(--green2)', 'var(--green)'];

  function updateStrength(pwd) {
    const s = passwordStrength(pwd);
    strengthSegs.forEach((seg, i) => { seg.className = 'strength-seg'; if (i < s) seg.classList.add(`s${s}`); });
    if (strengthLbl) {
      strengthLbl.textContent = pwd.length === 0 ? '' : `FORÇA: ${STRENGTH_LABELS[s] || ''}`;
      strengthLbl.style.color = STRENGTH_COLORS[s] || '';
    }
  }

  function checkRForm() {
    rBtn.disabled = !(isEmail(rEmail.value) && rPwd.value.length >= 6 && rPwd.value === rPwd2.value && rCodename.value.trim().length >= 3);
  }

  rEmail.addEventListener('input', () => { setErr(rEmail, errREmail, false); checkRForm(); });
  rEmail.addEventListener('blur',  () => {
    if (!rEmail.value) return;
    if (!isEmail(rEmail.value)) setErr(rEmail, errREmail, true, '⚠ E-mail inválido.');
    else if (DB.emailExists(rEmail.value)) setErr(rEmail, errREmail, true, '⚠ ID de agente já registrado no sistema.');
  });

  rPwd.addEventListener('input', () => {
    updateStrength(rPwd.value);
    setErr(rPwd, errRPwd, false);
    if (rPwd2.value) {
      if (rPwd.value !== rPwd2.value) setErr(rPwd2, errRPwd2, true, '⚠ Códigos não coincidem.');
      else setErr(rPwd2, errRPwd2, false);
    }
    checkRForm();
  });
  rPwd.addEventListener('blur', () => { if (rPwd.value && rPwd.value.length < 6) setErr(rPwd, errRPwd, true, '⚠ Mínimo 6 caracteres.'); });
  rPwd2.addEventListener('input', () => { setErr(rPwd2, errRPwd2, false); checkRForm(); });
  rPwd2.addEventListener('blur',  () => { if (rPwd2.value && rPwd2.value !== rPwd.value) setErr(rPwd2, errRPwd2, true, '⚠ Códigos não coincidem.'); });

  rCodename.addEventListener('input', () => { setErr(rCodename, errRName, false); checkRForm(); });
  rCodename.addEventListener('blur',  () => {
    if (!rCodename.value) return;
    if (rCodename.value.trim().length < 3) setErr(rCodename, errRName, true, '⚠ Mínimo 3 caracteres.');
    else {
      const existing = DB.all().find(a => a.codename.toLowerCase() === rCodename.value.trim().toLowerCase());
      if (existing) setErr(rCodename, errRName, true, '⚠ Codinome já em uso por outro agente.');
    }
  });

  rBtn?.addEventListener('click', () => {
    let valid = true;
    if (!isEmail(rEmail.value))            { setErr(rEmail, errREmail, true, '⚠ E-mail inválido.'); valid = false; }
    else if (DB.emailExists(rEmail.value)) { setErr(rEmail, errREmail, true, '⚠ ID já registrado.'); valid = false; }
    if (rPwd.value.length < 6)             { setErr(rPwd, errRPwd, true, '⚠ Mínimo 6 caracteres.'); valid = false; }
    if (rPwd.value !== rPwd2.value)        { setErr(rPwd2, errRPwd2, true, '⚠ Códigos não coincidem.'); valid = false; }
    if (rCodename.value.trim().length < 3) { setErr(rCodename, errRName, true, '⚠ Mínimo 3 caracteres.'); valid = false; }
    if (!valid) return;

    rBtn.classList.add('loading'); rBtn.disabled = true;
    setTimeout(() => {
      rBtn.classList.remove('loading');
      const result = DB.register({ email: rEmail.value.trim(), password: rPwd.value, codename: rCodename.value.trim(), clearance: rClear?.value || 'NÍVEL 1' });
      if (!result.ok) { setErr(rEmail, errREmail, true, `⚠ ${result.error}`); rBtn.disabled = false; return; }
      registerOk.style.display = 'block';
      _setById('reg-codename-ok', rCodename.value.trim().toUpperCase());
      _setById('reg-email-ok', rEmail.value.trim());
      document.querySelectorAll('#lg-panel-register .lg-field').forEach(el => el.style.display = 'none');
      document.querySelectorAll('#lg-panel-register .strength-bar, #strength-label, #btn-register, .switch-link-reg').forEach(el => el.style.display = 'none');
    }, 1400);
  });

  document.getElementById('btn-back-from-register')?.addEventListener('click', () => { resetRegisterForm(); showLoginPanel('lg-panel-login'); });
  document.getElementById('btn-reg-ok-login')?.addEventListener('click', () => {
    const savedEmail = rEmail.value.trim();
    resetRegisterForm();
    showLoginPanel('lg-panel-login');
    const emailIn = document.getElementById('i-email');
    if (emailIn && savedEmail) emailIn.value = savedEmail;
  });
}

function resetRegisterForm() {
  ['r-email','r-pwd','r-pwd2','r-codename'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = ''; el.classList.remove('err','ok'); }
  });
  ['err-r-email','err-r-pwd','err-r-pwd2','err-r-codename'].forEach(id => document.getElementById(id)?.classList.remove('show'));
  const registerOk = document.getElementById('register-ok');
  if (registerOk) registerOk.style.display = 'none';
  document.querySelectorAll('#lg-panel-register .lg-field').forEach(el => el.style.display = '');
  document.querySelectorAll('#lg-panel-register .strength-bar, #strength-label, #btn-register, .switch-link-reg').forEach(el => el.style.display = '');
  document.querySelectorAll('.strength-seg').forEach(s => s.className = 'strength-seg');
  const sl = document.getElementById('strength-label');
  if (sl) sl.textContent = '';
  const rBtn = document.getElementById('btn-register');
  if (rBtn) rBtn.disabled = true;
}

/* ═══════════════════════════════════════════════
   ADMIN PANEL
═══════════════════════════════════════════════ */
function renderAdminTable(filter = 'all', searchQ = '') {
  const tbody = document.getElementById('admin-tbody');
  const stats = { pending: 0, approved: 0, denied: 0 };
  if (!tbody) return;

  let agents = DB.all();
  agents.forEach(a => { if (stats[a.status] !== undefined) stats[a.status]++; });
  _setById('stat-pending', stats.pending);
  _setById('stat-approved', stats.approved);
  _setById('stat-denied', stats.denied);
  _setById('stat-total', agents.length);

  let filtered = agents;
  if (filter !== 'all') filtered = filtered.filter(a => a.status === filter);
  if (searchQ) filtered = filtered.filter(a => a.email.toLowerCase().includes(searchQ) || a.codename.toLowerCase().includes(searchQ) || a.clearance.toLowerCase().includes(searchQ));

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2.5rem;color:var(--text3);font-family:'Share Tech Mono',monospace;font-size:0.72rem;">// NENHUM AGENTE ENCONTRADO NO BANCO DE DADOS</td></tr>`;
    return;
  }

  const STATUS_LABEL = { pending: 'EM ANÁLISE', approved: 'APROVADO', denied: 'NEGADO' };
  const STATUS_CLASS = { pending: 'status-pending', approved: 'status-approved', denied: 'status-denied' };

  tbody.innerHTML = filtered.map(a => {
    const regDate  = new Date(a.registeredAt).toLocaleDateString('pt-BR');
    const lastLogin = a.lastLogin ? new Date(a.lastLogin).toLocaleDateString('pt-BR') : '—';
    const actions = a.status === 'pending'
      ? `<button class="adm-btn adm-approve" onclick="adminAction('${a.email}','approved')">▶ APROVAR</button>
         <button class="adm-btn adm-deny" onclick="adminDenyModal('${a.email}')">✕ NEGAR</button>`
      : a.status === 'approved'
      ? `<button class="adm-btn adm-deny" onclick="adminDenyModal('${a.email}')">✕ REVOGAR</button>
         <button class="adm-btn adm-del" onclick="adminDeleteModal('${a.email}')">⊘ EXCLUIR</button>`
      : `<button class="adm-btn adm-approve" onclick="adminAction('${a.email}','approved')">▶ REATIVAR</button>
         <button class="adm-btn adm-del" onclick="adminDeleteModal('${a.email}')">⊘ EXCLUIR</button>`;

    return `<tr>
      <td><span class="adm-codename">${a.codename}</span></td>
      <td style="font-size:0.72rem;color:var(--text2);">${a.email}</td>
      <td><span class="adm-badge ${STATUS_CLASS[a.status]}">${STATUS_LABEL[a.status]}</span></td>
      <td style="font-size:0.68rem;color:var(--text3);">${a.clearance}</td>
      <td style="font-size:0.65rem;color:var(--text3);">${regDate}</td>
      <td style="font-size:0.65rem;color:var(--text3);">${lastLogin}</td>
      <td class="adm-actions">${actions}</td>
    </tr>`;
  }).join('');
}

function adminAction(email, status, note = '') {
  DB.updateStatus(email, status, note);
  const filter = document.getElementById('admin-filter')?.value || 'all';
  const searchQ = document.getElementById('admin-search')?.value?.toLowerCase() || '';
  renderAdminTable(filter, searchQ);
  showToast(status === 'approved' ? `▶ AGENTE APROVADO: ${email}` : `✕ ACESSO NEGADO: ${email}`, status === 'approved' ? 'ok' : 'err');
}

function adminDenyModal(email) {
  const modal = document.getElementById('admin-modal-deny');
  const reasonInput = document.getElementById('deny-reason');
  if (!modal) { adminAction(email, 'denied', 'Acesso revogado.'); return; }
  modal.classList.add('open');
  if (reasonInput) reasonInput.value = '';
  document.getElementById('deny-email-label').textContent = email;
  document.getElementById('btn-deny-confirm').onclick = () => {
    const note = reasonInput?.value.trim() || 'Acesso revogado pelo Conselho NEXUS.';
    adminAction(email, 'denied', note);
    modal.classList.remove('open');
  };
  document.getElementById('btn-deny-cancel').onclick = () => modal.classList.remove('open');
}

function adminDeleteModal(email) {
  const modal = document.getElementById('admin-modal-delete');
  if (!modal) { DB.delete(email); renderAdminTable(); return; }
  modal.classList.add('open');
  document.getElementById('delete-email-label').textContent = email;
  document.getElementById('btn-delete-confirm').onclick = () => {
    DB.delete(email);
    const filter = document.getElementById('admin-filter')?.value || 'all';
    renderAdminTable(filter);
    showToast(`⊘ AGENTE EXCLUÍDO: ${email}`, 'err');
    modal.classList.remove('open');
  };
  document.getElementById('btn-delete-cancel').onclick = () => modal.classList.remove('open');
}

function initAdminPanel() {
  const filterEl = document.getElementById('admin-filter');
  const searchEl = document.getElementById('admin-search');
  filterEl?.addEventListener('change', () => renderAdminTable(filterEl.value, searchEl?.value?.toLowerCase() || ''));
  searchEl?.addEventListener('input', () => renderAdminTable(filterEl?.value || 'all', searchEl.value.toLowerCase()));
  document.querySelectorAll('.admin-modal-bg').forEach(bg => {
    bg.addEventListener('click', e => { if (e.target === bg) bg.classList.remove('open'); });
  });
}

/* ═══════════════════════════════════════════════
   RESET FORMS
═══════════════════════════════════════════════ */
function resetAllForms() {
  const emailIn = document.getElementById('i-email');
  const pwdIn   = document.getElementById('i-pwd');
  const charCnt = document.getElementById('char-cnt');
  const loginBtn = document.getElementById('btn-login');
  const errAuth  = document.getElementById('err-auth');
  const dots     = Array.from(document.querySelectorAll('.pwd-dot'));
  if (emailIn) {
    emailIn.value = ''; pwdIn.value = '';
    charCnt.textContent = '0 / 6'; charCnt.className = 'char-count';
    dots.forEach(d => d.className = 'pwd-dot');
    loginBtn.disabled = true; loginBtn.classList.remove('loading');
    [emailIn, pwdIn].forEach(el => { el.classList.remove('err','ok'); });
    document.getElementById('email-hint')?.classList.remove('show');
    if (errAuth) errAuth.classList.remove('show');
    document.getElementById('pending-banner')?.classList.remove('show');
  }
  const iRec = document.getElementById('i-rec');
  if (iRec) {
    iRec.value = '';
    const recField = document.getElementById('rec-field');
    const recOk = document.getElementById('rec-ok');
    const btnRec = document.getElementById('btn-rec');
    if (recField) recField.style.display = '';
    if (recOk) recOk.style.display = 'none';
    if (btnRec) { btnRec.style.display = ''; btnRec.disabled = false; }
  }
  resetRegisterForm();
  showLoginPanel('lg-panel-login');
}

/* ═══════════════════════════════════════════════
   SITE ANIMATIONS
═══════════════════════════════════════════════ */
function initSiteAnims() {
  setTimeout(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
    }, { threshold: 0.08 });
    document.querySelectorAll('#s-site .anim').forEach(el => { el.classList.remove('visible'); obs.observe(el); });
  }, 100);
}

function setNav(a, e) {
  e.preventDefault();
  const navLinks = document.querySelectorAll('.nav-inner a');
  navLinks.forEach(x => x.classList.remove('active'));
  a.classList.add('active');
  const cat = a.textContent.trim();
  renderCategoryContent(cat);
}

/* ═══════════════════════════════════════════════
   NEWSLETTER
═══════════════════════════════════════════════ */
function initNewsletter() {
  const nlBtn   = document.getElementById('nl-btn');
  const nlEmail = document.getElementById('nl-email');
  if (!nlBtn) return;
  nlBtn.addEventListener('click', () => {
    if (nlEmail.value && /\S+@\S+\.\S+/.test(nlEmail.value)) {
      nlEmail.value = ''; nlEmail.placeholder = '▶ TRANSMISSÃO ATIVADA';
      showToast('▶ CANAL SEGURO ATIVADO');
      setTimeout(() => { nlEmail.placeholder = 'agente@nexus.net'; }, 3500);
    } else {
      nlEmail.style.borderColor = 'var(--red)'; nlEmail.focus();
      setTimeout(() => { nlEmail.style.borderColor = ''; }, 1800);
    }
  });
  nlEmail.addEventListener('keydown', e => { if (e.key === 'Enter') nlBtn.click(); });
}

/* ═══════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initLoginForm();
  initRecovery();
  initRegisterForm();
  initAdminPanel();
  initNewsletter();
});