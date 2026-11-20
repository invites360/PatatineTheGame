# 🥔 Gara Patatine

Gioco web (solo HTML/CSS/JS, nessun server) per votare le patatine portate da ogni giocatore. Pensato per il telefono.

## Struttura
```
index.html            pagina unica
css/style.css         tema patatine & salsa
js/config.js          ← URL e chiave Supabase
js/players.js         giocatori e categorie di voto
js/store.js           dati: Supabase (condiviso) o localStorage (prova)
js/toon.js            pupazzetti animati: volto + costume SVG per ogni giocatore (COSTUMES)
js/app.js             schermate
img/faces/            volti ritagliati (generati dai png in img/)
audio/fighter_select.mp3  musica della selezione personaggio
supabase/schema.sql   tabelle, sicurezza e funzioni
```

## 1. Configurare Supabase (serve per condividere i voti)
1. Crea un progetto gratuito su https://supabase.com
2. **SQL Editor → New query**: incolla tutto `supabase/schema.sql` e premi **Run**.
3. **Project Settings → API**: copia *Project URL* e *anon public key* in `js/config.js`.

Senza configurazione il gioco va in **modalità locale**: funziona, ma i dati restano sul singolo telefono.

Tutti gli oggetti creati hanno il prefisso `gp_` (`gp_chips`, `gp_votes`, `gp_bonus`, `gp_settings` e le funzioni `gp_*`), così il gioco può stare in un database che ha già altre tabelle senza toccarle.

### Volti
I volti in `img/faces/` sono scontornati da `tools/cut_faces.py` (Python + rembg, modello `birefnet-portrait`).
Per rigenerarli: `pip install "rembg[cpu]" pillow` e poi `python tools/cut_faces.py .`

### Sicurezza
- La password admin (`Patatine4ever`) sta **solo** nelle funzioni SQL: non è nel codice del sito.
- La tabella `bonus` non è leggibile dal sito: si vede solo **chi** ha votato, non **a chi**, finché l'admin non rivela.
- Non c'è login: ognuno sceglie il proprio personaggio (gioco tra amici, si va sulla fiducia).

## 2. Pubblicare su GitHub Pages
1. Crea un repository e carica tutti i file.
2. **Settings → Pages → Deploy from a branch** → `main` / root.
3. Apri `https://<utente>.github.io/<repo>/` dal telefono.

## Punteggio
- Ogni giocatore vota le patatine degli altri (non le proprie) in 8 categorie, da 1 a 10.
- Punteggio di gara = somma di **tutti i voti ricevuti** (8 categorie × ogni votante).
- Le statistiche invece usano le medie.
- Bonus **Patatina preferita**: +10 punti per ogni bonus ricevuto, sommati quando l'admin li rivela.

## Link diretti
`?v=summary`, `?v=stats`, `?v=bonus`, `?v=admin` aprono direttamente una schermata (dopo aver scelto il personaggio).
