# Notes consolidées — IA appliquée et progression pratique

## Contexte

Ces notes sont issues d'une discussion d'une heure avec Flavien Chervet.

## Introduction

Les grands points d’entrée pour l’IA appliquée (applied AI) sont :

- **Context engineering**
- **RAG**
- **Harness engineering**
- **Workflow agentique**

Tous les concepts plus détaillés d'IA appliquée se rattachent à l’un de ces axes ou en découlent.

La sécurité est un sujet transversal à travailler séparément.

Ces différents axes n’ont pas tous la même nature :

- Le **context engineering** et le **harness engineering** relèvent surtout de la structuration et de la conception système. Ils reposent principalement sur la manière de concevoir le système, d’écrire des procédures et de cadrer l’IA.
- Le **RAG** et le **workflow agentique** sont plus techniques : Le RAG demande une vraie compréhension technique. Le workflow agentique demande également de concevoir et d’implémenter des enchaînements d’étapes IA exploitables dans une application.

# Les grands points d'entrée

## Context engineering

Le **context engineering** est un point d’entrée majeur de l’IA appliquée.
Il s’agit surtout d’un enjeu de réflexion système et de conception.
L’idée est de bien structurer le système et le contexte fourni à l’IA afin qu’elle puisse produire un résultat utile et cadré.
Ce sujet repose beaucoup sur des prompts en langage naturel, mais l’enjeu principal n’est pas technique : il est surtout dans la manière de concevoir et d’organiser le système.

## RAG

Le **RAG** est un autre point d’entrée important.
Contrairement au context engineering, c’est un sujet beaucoup plus technique.
C’est même une affaire de spécialiste lorsqu’on cherche à obtenir un système réellement robuste.

### Ce qu’il faut avoir vu

Pour être crédible, il faut avoir pratiqué un minimum le RAG.
Il faut notamment avoir vu :

- ce qu’est une base de données vectorielle ;
- ce qu’est le chunking ;
- comment découper un document de façon pertinente ;
- ce qu’est le Graph RAG.
  L’objectif n’est pas de devenir spécialiste du RAG, mais d’en avoir une compréhension suffisante et de l’avoir expérimenté au moins une fois.

### Chunking

Le **chunking** consiste à découper un document en morceaux exploitables.
La difficulté est de découper le document de façon pertinente.
En lisant quelques ressources ciblées et en le pratiquant une fois, on peut déjà acquérir une première compréhension suffisante pour avancer.

### Niveau de difficulté

Il est assez facile d’obtenir de bons résultats avec un RAG dans environ 80 % des cas.
En revanche, atteindre un niveau **production-ready**, avec une fiabilité beaucoup plus élevée, est beaucoup plus difficile.
Le passage de 80 % à 99 % est une vraie spécialisation et peut devenir très complexe.

### RAG et grandes fenêtres de contexte

Le RAG est aujourd’hui concurrencé par l’augmentation des fenêtres de contexte.
Certaines approches permettent désormais d’utiliser des contextes très larges, de l’ordre de 12 à 15 millions de tokens.
Cela signifie qu’une solution qui aurait nécessité du RAG auparavant peut parfois être implémentée plus simplement avec une grande fenêtre de contexte.
Cette approche peut permettre d’obtenir de bons résultats plus facilement qu’avec un RAG.
Cependant, ces solutions reposent souvent sur des modèles très puissants et donc coûteux à l’usage.
Le RAG conserve donc un intérêt, notamment pour maîtriser les coûts au runtime.

## Harness engineering

Le **harness engineering** est un autre point d’entrée important.
Il peut être vu comme une sorte de harnais autour du système, ou comme un OS qui encadre la production de code assistée par IA.

### Pourquoi un harness est nécessaire

La production de code assistée par IA est non déterministe.
L’IA peut produire du code utile, mais elle peut aussi interpréter les consignes de manière imprévisible.
Le harness sert donc à encadrer l’IA pour qu’elle applique les modifications demandées de la manière attendue.
L’idée est similaire aux procédures que l’on met en place dans une entreprise pour guider le travail des salariés.

### Objectif du harness

L’objectif est que l’IA fasse, dans la grande majorité des cas :

- ce qui est demandé ;
- de la manière attendue ;
- en suivant les procédures définies.
  Un bon harness permet par exemple d’utiliser Codex ou Claude Code pour produire du code assisté par IA avec un haut niveau de conformité aux attentes.

### Construction progressive

Le harness se construit progressivement en pratiquant.
Il peut émerger notamment en :

- utilisant Codex ;
- utilisant Claude Code ;
- mettant en place le setup du monorepo ;
- écrivant des procédures métier en langage naturel ;
- formalisant les règles que l’IA doit suivre.
  Ces procédures métier sont une partie importante du harness engineering.

## Workflow agentique

Le **workflow agentique** est le quatrième grand point d’entrée.
Il désigne un enchaînement d’étapes dans lequel plusieurs appels à l’IA se succèdent et se nourrissent les uns les autres.

### Principe

Dans une application IA, il peut y avoir plusieurs étapes successives.
Chaque étape peut produire une sortie qui devient l’entrée de l’étape suivante.
C’est cette logique d’enchaînement qui constitue un workflow agentique.

### Workflows “always on”

Il existe aussi des workflows agentiques dits **always on**.
Des exemples évoqués sont :

- OpenClaw ;
- Ernest Agent.
  Le terme “always on” peut être trompeur.
  Il ne signifie pas nécessairement que l’IA tourne en permanence.
  Il s’agit plutôt de systèmes qui se déclenchent sur des événements ou sur des crons, ce qui donne l’impression qu’ils sont toujours actifs.

### Sorties structurées

Dans un workflow agentique, il est souvent nécessaire que l’output de l’IA soit exploitable par le programme.
On peut par exemple demander une sortie dans un format précis :

- un JSON ;
- un objet typé ;
- une structure particulière.
  Cela permet, dans un fonctionnement non déterministe, de récupérer malgré tout un objet manipulable de façon déterministe.

### Harness à l’intérieur du workflow

Il existe aussi une forme de harness à l’intérieur du workflow agentique.
Il faut s’assurer que l’IA ne déraille pas au fil des étapes.
Cela passe par un ensemble de procédures, de vérifications et de garde-fous pour que l’IA reste dans la direction attendue, sur le fond comme sur la forme.

# Sécurité

La sécurité est un sujet à travailler séparément des grands points d’entrée.
Ce n’est pas un point d’entrée en tant que tel, mais c’est un sujet important pour être crédible.

### Prompt injection

Il faut notamment savoir ce qu’est la **prompt injection**.
L’analogie est la même qu’avec la **SQL injection** dans les applications classiques.
Lorsqu’on développe des applications IA, il faut connaître ce type de risque et comprendre comment il peut affecter le comportement du système.

### Culture sécurité minimale

Il faut avoir suffisamment de culture sécurité pour savoir comment sécuriser globalement une application IA.
L’objectif n’est pas nécessairement de devenir spécialiste sécurité IA, mais d’avoir travaillé le sujet suffisamment pour être crédible.

# Création d'un POC / projet perso

Pour progresser, il faut surtout pratiquer sur un projet concret.

Mon POC _Northstar_ peut servir de support pour découvrir naturellement ces notions :

- structurer le contexte ;
- expérimenter le RAG ;
- construire un harness ;
- concevoir un workflow agentique ;
- intégrer du human in the loop ;
- produire du code avec Codex ou Claude Code ;
- expérimenter le vibe coding ;
- acquérir une culture minimale de sécurité IA.

Northstar peut être conçu selon deux approches principales.

### Approche par prompt cadre

La première approche consiste à créer un gros prompt cadre.
Ce prompt agit comme un framework global qui indique à l’IA comment accompagner l’utilisateur.
L’expérience ressemble alors à un chat encadré.
Dans cette approche, on délègue largement à l’IA l’autonomie pour guider l’utilisateur et l’aider à atteindre les objectifs fixés.

### Approche par workflow agentique

La deuxième approche consiste à concevoir Northstar comme un workflow agentique.
Il s’agit de lister les étapes ou les éléments nécessaires, puis de mettre en place un workflow qui suit une structure plus déterministe.
Cette approche permet de construire une interface utilisateur plus riche, car chaque étape peut être découpée et traitée sur mesure.

### Choix retenu

L’approche retenue pour Northstar est celle du **workflow agentique**.
La particularité de Northstar est que le **human in the loop** y est très présent.
L’utilisateur intervient à de nombreux moments du workflow.

# Vibe coding

Un conseil important est de ne pas chercher à lire le code produit par Codex.
Une règle possible serait de faire tout le projet sans lire une seule ligne de code générée par l’IA.
L’objectif est de prendre conscience de la dimension et de la puissance du **vibe coding**.
Cela implique de piloter le projet autrement, en s’appuyant sur :

- les consignes données à l’IA ;
- les procédures ;
- les résultats observés ;
- les validations ;
- le comportement final du système.

# Annexe

### Récap brut dicté par Gabriel (moi) à l'issue de l'entretien :

> Je fais le point et je résume la discussion que je viens d'avoir avec Flavien Chervet au sujet de l'IA appliquée et de ma progression. Je vais partager une longue liste de notions d'IA appliquées en le disant, j'ai un sentiment de vertige et j'ai besoin de savoir quels sont vraiment les points d'entrée, qu'est-ce que je vais découvrir naturellement en le pratiquant et qu'est-ce qui est vraiment inévitable. Donc en termes de points d'entrée qu'il m'a donné, il y a numéro 1, le contexte engineering, sachant qu'il m'a dit que c'est plutôt un enjeu de réflexion de système, de conception de système, de façon ingénieure, qu'un enjeu tech. Puisque c'est beaucoup de promptes en langage naturel et l'enjeu c'est de bien structurer le système, il n'y a pas d'enjeu technique là-dessus. Il m'a parlé du RAG comme étant une technique avec, à l'inverse, beaucoup de technicité et c'est même une affaire de spécialiste. C'est en pratiquant, un petit peu comme un artisans, on arrive vraiment à faire des RAGs qui fonctionnent bien, mais en même temps, c'est une notion incontournable. Il faut en avoir fait un petit peu pour être crédible. Maintenant, il est totalement illusoire de vouloir tout maîtriser et de devenir un spécialiste du RAG également. C'est une spécialisation. Donc il m'a dit concernant le RAG, il faut, il faut bien avoir vu ce qu'est une BDD vectorielle. Il faut maîtriser le chunking, c'est-à-dire comment on découpe de façon pertinente un document. Mais il m'a dit, voilà, en ayant lu deux articles, on a déjà une notion et en l'ayant fait une fois, on a déjà une notion suffisante. Il m'a dit, il y a le RAG en graph, ça, il faut avoir vu. Il est assez facile en RAG d'obtenir de bons résultats dans 80% des cas, mais pour être prod-ready, il faut aller à 99%, virgule, etc. Et là, c'est vraiment une affaire de spécialiste et c'est une grosse galère. Donc le deuxième point d'entrée, c'était le RAG. Le troisième point d'entrée, c'est le harness engineering. C'est un petit peu un espèce d'OS qui va encadrer complètement la production de code assistée par l'IA. C'est-à-dire que si on a une production de code assistée par l'IA, si on a une production de code assistée par l'IA, si on a une production de code assistée par l'IA, si on a une production de code assistée par l'IA, si on a une production de code assistée par l'IA, si on a une production de code assistée par l'IA, si on a une production de code assistée par l'IA, comme créer du code assisté par l'IA, c'est non déterministe, puisqu'il y a l'IA en jeu dans énormément de choses, de la même façon que dans une entreprise, on fait tout un tas de procédures pour les salariés, là, on fait également tout un tas de procédures pour guider l'IA et qu'elle applique bien les modifications que l'on veut de la manière dont on veut qu'on le fasse. de la manière dont on veut qu'on le fasse. de la manière dont on veut qu'on le fasse. De la manière dont on veut qu'on le fasse. Donc c'est vraiment un harnais autour du système pour maintenir le système dans une sorte de standardisation. Et tout ça c'est pour faire face au fait que les IA sont imprévisibles et qu'elles sont par nature non déterministes. Donc c'est en utilisant Codex, c'est en utilisant CloudCode, c'est en utilisant CloudCode, c'est en utilisant CloudCode, en faisant le setup de mon monorepo, que petit à petit je vais me créer mon harness engineering. Et le bon harness c'est, j'utilise par exemple Codex pour faire de la production de code assistée par l'IA et dans 99 % des cas, l'IA fait ce que je veux, de la manière que je veux, en suivant mes procédures. Et donc ça s'appuie sur des techniques que je vais découvrir en détail, en le faisant, notamment tout un tas de skills qui sont en fait des procédures métier écrites en langage naturel. Et voilà ce qu'est le harness engineering. Le quatrième point d'entrée, c'est le workflow agentique. Lorsqu'on utilise des IA, il va y avoir une notion d'étape et donc de promptes successives qui se nourrissent les uns les autres. C'est ce qu'on appelle un workflow agentique. On peut aussi noter qu'il existe des workflows agentiques nommés entre guillemets, always on. C'est le cas d'Open Claw ou de Ernest Agent. En fait, always on, c'est un petit peu trompeur. C'est une IA qui se déclenche sur des événements, sur des crônes. Ce n'est pas vraiment always on, mais ça donne l'impression que c'est always on. Mais ça, c'est juste un cas particulier. Le workflow agentique, c'est quand on conçoit son application et qu'au sein de l'application, il y a des appels successifs. On appelle ça un workflow agentique. Il y a des notions très importantes que je vais découvrir en le faisant. Par exemple, on a souvent besoin que l'output de l'API soit dans un format vraiment exploitable, un JSON particulier avec un type particulier. Ça permet dans un fonctionnement non déterministe de récupérer quand même un objet qui est manipulable de façon déterministe. Donc ça, c'est un nom. Mais voilà, c'est du bon sens et c'est une technique qui va juste découler du fait que je travaille sur un workflow agentique. Il y a aussi une notion un petit peu de harness à l'intérieur du workflow agentique. C'est dans tout ce process, comment je garantis que l'IA ne déraille jamais, qu'elle aille vraiment dans le fond et la forme vers ce que je veux qu'elle fasse. Et là, il y a une notion de harness avec énormément de procédures métier, de vérifications. C'est un mélange de tout un tas de choses qu'on met en place pour que l'IA reste dans sa voie. Et enfin, on peut rajouter non pas un point d'entrée, mais un sujet à travailler. C'est le sujet de la sécurité. Par exemple, il faut savoir ce qu'est le prompt injection au même titre que quand on fait des applications classiques, on sait ce qu'est une SQL injection. Et donc en sécurité, je pense qu'il faut avoir suffisamment de culture de sécurité pour savoir comment sécuriser grosso modo une application. Il faut avoir un petit peu travaillé ça. Avant d'arriver en entretien pour être crédible. Mais ce n'est pas un point d'entrée en tant que tel. Je rajouterai quelques éléments par rapport au RAG qu'il faudra recontextualiser à l'intérieur du début de la discussion qui parlait du RAG. C'est que la technique du RAG aujourd'hui est concurrencée par les fenêtres de contexte qui sont de plus en plus larges avec des techniques de compression et des nouvelles applications. Ce sont des approches qui permettent d'avoir 12, 15 millions de tokens par contexte. Après, ça reste des approches qui utilisent des IA avec un très très grand nombre de paramètres et qui sont donc très chères à l'usage. Donc le RAG peut avoir un objectif de maîtrise des coûts au runtime. Au-delà du fait qu'il est probablement possible aujourd'hui puisque les contextes sont beaucoup plus gros qu'avant, une solution qui aurait nécessité du RAG hier peut être peut être implémentée simplement via une fenêtre de contexte beaucoup plus grande. Ce qui permet aussi d'avoir de meilleurs résultats beaucoup plus facilement qu'en mettant en place un RAG. Maintenant, je change de sujet pour parler de Northstar qui est mon proof of concept sur lequel je travaille. En fait, Northstar m'a décrit deux approches possibles pour mettre en place. Un très gros prompt cadre qui est comme un framework global qui dit à l'IA comment accompagner l'utilisateur. Et là, il y a un échange qui se produit avec l'utilisateur. C'est comme un chat encadré. Et donc, on délègue totalement à l'IA l'autonomie pour guider l'utilisateur et lui permettre d'atteindre les objectifs fixés. Donc ça, c'est la technique du prompt cadre. L'autre technique, c'est plutôt une technique de workflow agentique. Donc, c'est de lister toutes les étapes ou les éléments nécessaires et de mettre en place le workflow agentique qui va suivre une façon un petit peu déterminante. Un peu déterministe de faire. Mais qui va permettre de construire une interface utilisateur beaucoup plus riche. Puisqu'on peut découper chaque étape et faire du sur mesure étape par étape. Et c'est cette approche que je vais utiliser. Sachant que la particularité de Northstar, c'est que le human in the loop est extrêmement présent, à énormément de moments de ce workflow agentique. Si je reviens maintenant au point d'entrée. Il y a des points d'entrée qui sont plus, comme le contexte engineering, je l'ai dit, une façon de structurer. Mais il n'y a pas d'enjeu technique. Au sens, il n'y a pas besoin de maîtriser des librairies, des langages, des memoirs, des je ne sais pas quoi. C'est essentiellement de la conception de systèmes. C'est également le cas du harness engineering. C'est essentiellement des procédures. Et donc c'est là aussi une conception de système. A l'inverse, le RAG est vraiment un sujet technique. Avec une forme d'art qu'on développe au fur et à mesure qu'on le pratique. Ainsi que le workflow agentique. Enfin je terminerai avec un conseil que m'a donné Flavien, qui est de ne pas chercher à lire le code produit par Codex. Et je peux me fixer une règle. Je dois faire tout ce projet sans avoir lu une seule ligne de code. Et c'est là qu'on prend vraiment conscience de la dimension et de la puissance du vibe coding.
