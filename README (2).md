# Calculateur Psychrométrique - Documentation

## Vue d'ensemble

**Calculateur Psychrométrique** est une application web interactive en français qui calcule toutes les propriétés thermodynamiques de l'air humide (moist air) à partir de deux variables indépendantes au choix de l'utilisateur.

**© 2025 Mohamed Ayoub Essalami**

---

## Fonctionnalités principales

### 1. **Calcul des propriétés thermodynamiques**
- Entrée : deux variables indépendantes quelconques parmi 9 disponibles
- Sortie : 10 propriétés calculées automatiquement
- Unités : SI (Système International)
- Pression : 1 atm (101325 Pa) — éditable en paramètres avancés

### 2. **Variables indépendantes supportées**
| Symbole | Désignation | Unité |
|---------|-------------|-------|
| **Tdb** | Température sèche | °C |
| **W** | Ratio d'humidité | kg_w/kg_da |
| **RH** | Humidité relative | % |
| **h** | Enthalpie | kJ/kg_da |
| **Twb** | Température humide | °C |
| **Tdp** | Température de rosée | °C |
| **Pv** | Pression de vapeur | Pa |
| **ṁ_da** | Débit masse air sec | kg/s |
| **V̇** | Débit volumétrique | m³/h |

### 3. **Propriétés calculées (sortie)**
| Propriété | Unité | Description |
|-----------|-------|-------------|
| Tdb | °C | Température sèche |
| W | kg_w/kg_da | Ratio d'humidité |
| RH | % | Humidité relative |
| h | kJ/kg_da | Enthalpie |
| Twb | °C | Température humide |
| Tdp | °C | Température de rosée |
| ρ | kg/m³ | Densité |
| ṁ_da | kg/s | Débit masse air sec |
| V̇ | m³/h | Débit volumétrique |
| Pv | Pa | Pression de vapeur |

### 4. **Visualisation interactive**
- **Diagramme psychrométrique** : affichage du point d'état sur une courbe de saturation
- **Tableau de résultats** : résumé lisible de toutes les propriétés
- **Onglets** : basculez entre tableau et graphique
- **Explications** : cliquez sur ℹ️ pour une description détaillée de chaque variable

### 5. **Tests automatiques**
- Validation de l'implémentation avec un jeu de données exemple
- 5 tests comparant les résultats calculés à des valeurs de référence
- Affichage des résultats : ✓ (réussi) ou ✗ (échoué)

### 6. **Interface utilisateur**
- Design responsive (mobile & desktop)
- Palette de couleurs professionnelle (teal/brown)
- Accessibilité : navigation au clavier, contraste élevé
- Précision ajustable : 4, 6, ou 8 chiffres significatifs

---

## Structure des fichiers

```
calculateur-psychrometrique/
├── index.html       # Document HTML principal
├── styles.css       # Feuille de styles (design système)
├── app.js           # Logique métier complète
└── README.md        # Cette documentation
```

### index.html
- Document HTML5 valide
- Contient la structure de l'interface
- Lien vers `styles.css` et `app.js`
- Sections : contrôles d'entrée, résultats, modal d'explications

### styles.css
- Variables CSS pour le thème (couleurs, espacements, typographie)
- Grille responsive (1 colonne sur mobile, 2 colonnes sur desktop)
- Composants : boutons, formulaires, tables, onglets, modal
- Animation et transitions fluides

### app.js
- Module IIFE pour éviter la pollution globale
- Constantes physiques (R_da, c_da, etc.)
- Implémentation complète des formules thermodynamiques
- Solveurs itératifs pour Twb, Tdp, etc.
- Générateur de diagramme psychrométrique (Canvas 2D)
- Gestion d'événements et state management

---

## Formules thermodynamiques implémentées

### 1. **Pression de saturation (Magnus)**
```
p_sat(T) = 611.2 × exp(17.27 × T / (237.7 + T))
```
**Référence:** Lawrence, M. G. (2005). The relationship between relative humidity and the dewpoint temperature in moist air. Bull. Amer. Meteor. Soc., 86(2), 225–233.

**Plage de validité:** −50°C à +200°C

**Constantes:**
- a = 17.27
- b = 237.7 °C
- p_ref = 611.2 Pa (à 0°C)

---

### 2. **Ratio d'humidité**
```
W = 0.622 × Pv / (P_total - Pv)

Pv = P_total × W / (0.622 + W)  [inverse]
```
**Remarque:** Le facteur 0.622 = M_v / M_a = 18.015 / 28.966

---

### 3. **Humidité relative**
```
RH = 100 × Pv / p_sat(Tdb)  [%]
```

---

### 4. **Enthalpie**
```
h(T, W) = c_da × T + W × (h_fg_0 + h_fg_T × T)
```
**Constantes ASHRAE SI:**
- c_da = 1.006 kJ/(kg·K)
- h_fg_0 = 2501 kJ/kg (à 0°C)
- h_fg_T = 1.86 kJ/(kg·K)

---

### 5. **Température humide (Twb)**
Résolu itérativement via bisection en trouvant Twb tel que :
```
h(Twb, W_sat(Twb)) = h(Tdb, W)
```

---

### 6. **Température de rosée (Tdp)**
Inverse de la pression de saturation :
```
Pv = p_sat(Tdp)
=> Tdp = temperatureFromSaturationPressure(Pv)
```

---

### 7. **Densité de l'air humide**
```
ρ = P_total / (R_mix × T_K)

R_mix = R_da × (1 + 1.6078 × W) / (1 + W)
```
**Constantes:**
- R_da = 287.058 J/(kg·K)
- 1.6078 = M_v / M_a

---

### 8. **Débit volumétrique**
```
V̇ = (ṁ_da / ρ) × 3.6  [m³/h]
```
Le facteur 3.6 convertit m³/s en m³/h.

---

## Paires de variables implémentées

| Var 1 | Var 2 | État | Algorithme |
|-------|-------|------|-----------|
| Tdb | RH | ✓ | Direct |
| Tdb | W | ✓ | Direct |
| Tdb | h | ✓ | Bisection sur W |
| Tdb | Twb | ✓ | Bisection sur W |
| Tdb | Tdp | ✓ | Direct |
| Tdb | Pv | ✓ | Direct |
| W | h | ✓ | Bisection sur Tdb |
| RH | W | ✓ | Direct |

**Note:** Toute paire non répertoriée génère un message d'erreur explicite.

---

## Guide d'utilisation

### Démarrage rapide

1. **Ouvrir l'application**
   - Double-cliquez sur `index.html` dans l'explorateur
   - Ou servez les fichiers avec un serveur web local

2. **Saisir les données**
   - Sélectionnez Variable 1 (ex. Température sèche)
   - Entrez la Valeur 1 (ex. 25 °C)
   - Sélectionnez Variable 2 (ex. Humidité relative)
   - Entrez la Valeur 2 (ex. 50 %)

3. **Cliquer sur "Calculer"**
   - Les résultats s'affichent dans le tableau
   - Un diagramme psychrométrique montre le point d'état

4. **Explorer les résultats**
   - Changez la précision affichée (4, 6, 8 chiffres)
   - Cliquez sur ℹ️ pour une explication détaillée
   - Basculez vers l'onglet "Diagramme" pour la visualisation

### Exemple prédéfini

Cliquez sur le bouton **"Exemple"** pour charger automatiquement :
- **Tdb = 40.227 °C**
- **RH = 50.456 %**

Résultats attendus :
- W = 0.0241 kg_w/kg_da
- h ≈ 102.59 kJ/kg_da
- Twb ≈ 30.59 °C
- Tdp ≈ 27.95 °C

---

## Paramètres avancés

Cliquez sur **"⚙️ Paramètres avancés"** pour accéder à :

### Pression totale (P_total)
- **Défaut:** 101325 Pa (1 atm au niveau de la mer)
- **Plage:** 50000 — 150000 Pa
- **Impact:** Affecte tous les calculs d'humidité et enthalpie

### Débit masse air sec (référence)
- **Défaut:** 1.0 kg/s
- **Utilisé:** Si W ou ṁ_da ne font pas partie des deux variables d'entrée
- **Calcul de V̇:** V̇ = (ṁ_da / ρ) × 3.6

---

## Tests d'acceptation

Au chargement de la page et en cliquant sur **"Exemple"**, 5 tests automatiques se lancent :

### Test 1 : Tdb + RH → W
```
Entrée : Tdb = 40.227 °C, RH = 50.456 %
Attendu : W = 0.024140 kg_w/kg_da
Tolérance : ±0.001
```

### Test 2 : Tdb + RH → h
```
Entrée : Tdb = 40.227 °C, RH = 50.456 %
Attendu : h = 102.590 kJ/kg_da
Tolérance : ±2.0 kJ/kg_da
```

### Test 3 : Tdb + RH → Twb
```
Entrée : Tdb = 40.227 °C, RH = 50.456 %
Attendu : Twb = 30.589 °C
Tolérance : ±1.0 °C
```

### Test 4 : Tdb + RH → Tdp
```
Entrée : Tdb = 40.227 °C, RH = 50.456 %
Attendu : Tdp = 27.950 °C
Tolérance : ±1.0 °C
```

### Test 5 : Tdb + W → RH
```
Entrée : Tdb = 40.227 °C, W = 0.024140 kg_w/kg_da
Attendu : RH = 50.456 %
Tolérance : ±2.0 %
```

**Résultats affichés:**
- ✓ Vert = Réussi
- ✗ Rouge = Échoué ou erreur

---

## Architecture et code quality

### Modularité
- **IIFE:** Aucune variable globale, tout est encapsulé
- **Fonctions ségrégées:** Chaque formule a sa propre fonction
- **Pas de dépendances:** JavaScript pur, pas de framework

### Performance
- **Canvas 2D:** Rendu immédiat du diagramme
- **Bisection:** Convergence garantie (50 itérations max)
- **Tolerance:** 1e-6 pour les calculs numériques

### Accessibilité
- **ARIA labels:** Inputs bien étiquetés
- **Contraste:** 4.5:1 minimum
- **Clavier:** Navigation Tab complète
- **Focus:** Visible sur tous les éléments interactifs

### Documentation
- Commentaires détaillés au-dessus de chaque fonction
- Références scientifiques en-ligne
- Explications des constantes physiques

---

## Limitations et extensions futures

### Limitations actuelles
1. Pression fixée à 1 atm (éditable en avancé)
2. Pas de saturation au-delà de 100% RH (génère erreur)
3. Formule Magnus (valide −50…+200 °C)
4. Pas de phase solide (givre)
5. Diagramme limité à −10…+50 °C

### Extensions possibles
- [ ] **IAPWS :** Intégration de la formule IAPWS-IF97 pour plus de précision
- [ ] **Processus:** Ajout des processus CVC (chauffage, refroidissement, humidification)
- [ ] **Export:** Génération de PDF ou d'images du diagramme
- [ ] **Multi-langue:** Support de l'anglais, de l'espagnol, etc.
- [ ] **WebGL:** Diagramme 3D interactif
- [ ] **Stockage local:** Sauvegarde des calculs récents
- [ ] **API REST:** Accès aux calculs sans interface web

---

## Installation et déploiement

### Localement
```bash
# Option 1: Double-clic sur index.html
# (fonctionne directement)

# Option 2: Serveur Python simple
python -m http.server 8000
# Accédez à http://localhost:8000

# Option 3: Serveur Node.js
npx http-server
```

### Sur un serveur web
1. Transférez `index.html`, `styles.css`, `app.js` sur votre serveur
2. Aucune compilation, aucune dépendance
3. HTTPS recommandé (mais HTTP suffit)

### ZIP pour distribution
```bash
# Créez un dossier
mkdir calculateur-psychrometrique

# Copiez les 3 fichiers
cp index.html styles.css app.js calculateur-psychrometrique/
cp README.md calculateur-psychrometrique/

# Compressez
zip -r calculateur-psychrometrique.zip calculateur-psychrometrique/
```

---

## Support et signalement de bugs

### Contacts
- **Développeur:** Mohamed Ayoub Essalami
- **Email:** [À remplir selon vos besoins]
- **GitHub:** [À remplir selon vos besoins]

### Problèmes courants

**"État physiquement impossible"**
→ Vous avez saisie une combinaison d'états non réalisable
→ Ex. RH = 110% à Tdb = 20°C

**"Paire non implémentée"**
→ La combinaison des deux variables n'est pas encore programmée
→ Consultez le tableau "Paires de variables implémentées"

**Diagramme vide**
→ Votre navigateur ne supporte pas Canvas 2D
→ Mettez à jour votre navigateur (Chrome, Firefox, Safari récents)

**Tests échouent**
→ Vérifiez que `CONSTANTS` n'a pas été modifié
→ Vérifiez que le fichier `app.js` n'a pas été endommagé

---

## Licence et attribution

**© 2025 Mohamed Ayoub Essalami**

Cette application utilise :
- **Formule Magnus** (Lawrence, 2005)
- **Données ASHRAE** (Fundamentals Handbook)
- **Normes ISO/IEC** pour les définitions

---

## Références scientifiques

1. **Lawrence, M. G.** (2005). The relationship between relative humidity and the dewpoint temperature in moist air: A simple conversion and applications. *Bull. Amer. Meteor. Soc.*, 86(2), 225–233.
   - https://doi.org/10.1175/BAMS-86-2-225

2. **ASHRAE Fundamentals Handbook — SI Edition** (2021).
   - Chapter 1: Psychrometrics
   - American Society of Heating, Refrigerating and Air-Conditioning Engineers

3. **ISO 4677:2018** — *Humidity-controlled environments — Definitions and measurements* (International Organization for Standardization)

4. **IAPWS-IF97** — *Industrial Formulation 1997 for the Thermodynamic Properties of Water and Steam*
   - https://www.iapws.org/

---

## Changelog

### v1.0.0 (2025-12-11)
- ✓ Implémentation initiale complète
- ✓ 8 paires de variables solvables
- ✓ Diagramme psychrométrique interactif
- ✓ Explications détaillées de chaque variable
- ✓ Tests automatiques d'acceptation
- ✓ Interface multilingue (français)
- ✓ Design responsive et accessible

---

**Merci d'utiliser le Calculateur Psychrométrique !**

*Pour toute question, amélioration ou correction, n'hésitez pas à nous contacter.*
