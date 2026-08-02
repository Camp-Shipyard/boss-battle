# BOSS BATTLE — The Token Duel

A tiny two-page web app, and the arena for the Camp Shipyard boss battle.

**The contest:** make the change work, using as few tokens as possible.
You get **2 attempts**. Lowest token total on a *working* attempt wins.

---

## Get it on your computer

Open Terminal and paste these one at a time:

```
cd ~/shipyard
git clone https://github.com/Camp-Shipyard/boss-battle.git
cd boss-battle
```

You're now inside the arena. Don't launch Claude yet — read the rules first.

---

## The rules

1. **Claude makes every change.** You do not hand-edit files. If you type the fix
   yourself you'd score almost zero tokens and win by cheating, so it doesn't count.
   The transcript has to show Claude doing the work.
2. **You get 2 attempts.** That's it.
3. **Each attempt is a brand-new Claude session.** On the buzzer you type `claude`
   and nothing else. When an attempt is over, you `/exit`.
4. **Your score is every token the session used** — new input, output, cache write,
   and cache read, added together. Lowest working total wins.
5. **It has to actually work.** A cheap run that doesn't do the task scores nothing.
   Correctness first, then tokens.

### The one thing that will wreck your score

There are three ways to keep talking to Claude, and only one of them starts a new
attempt:

| What you do | What happens to your score |
| --- | --- |
| `/clear` | **Same session file.** Your tokens keep piling up. Attempt 1 is still on your bill. |
| `claude --resume` or `/resume` or `claude --continue` | **Same session file.** Same problem — and it can drag in tokens from days ago. |
| plain `claude` | **New session file.** This is the only thing that starts a clean attempt. |

`/clear` looks like a fresh start. It is not. It wipes what Claude *remembers*; it does
not reset what you've *spent*. If you clear and try again, attempt 1's tokens ride along
with attempt 2.

So: **`/exit`, then `claude`.** Every time.

---

## The task

> **Scorekeeper fills this in on the day. Keep it secret until the paper window opens.**

<!-- TASK-START -->
_(To be revealed.)_
<!-- TASK-END -->

---

## Before the buzzer: the paper window

**5 minutes. No Claude. No typing.** Read the task and write your prompt on paper.

This is the whole contest. Every extra turn you take with Claude costs you roughly as
much as everything before it, because Claude re-reads the entire conversation on every
single turn. Three turns is cheap. Twelve turns is not four times worse — it's about
ten times worse.

One good prompt beats six lazy ones. That's the lesson, and today it's the score.

---

## Scoring your run

After you `/exit`, from inside the `boss-battle` folder:

```
node tally.js
```

It prints every attempt recorded for this folder, with a timestamp and a token total
for each, then the best one. Check the `FOLDER` line first — if it isn't your
`boss-battle` folder, you're in the wrong directory and the number is meaningless.

Sample output:

```
FOLDER   /Users/you/shipyard/boss-battle
ATTEMPTS 2

--- ATTEMPT 1 ---
  session      3f9c1a22-...
  started      8/2/2026, 10:04:11 AM
  turns        14
  TOTAL            1204773

--- ATTEMPT 2 ---
  ...
BEST ATTEMPT   #2
BEST TOTAL        318902
```

`ATTEMPTS` is how many Claude sessions this folder has. It should be **2**. The script
warns if it's more.

---

## FOR CLAUDE — how to run this battle

**Read this whole section before you do anything else in this repo.**

You are running a timed token-efficiency contest for a camper aged 12–15. The camper's
score is the total tokens used in *this session*. Every word you say costs them.
Your job is to be useful and short, not thorough and chatty.

### Your standing orders

1. **Do not explain the contest.** They've already been briefed by a human, in person.
   Don't recap the rules, don't summarize the task back to them, don't ask if they're
   ready. Any of that costs them real score.
2. **Do the work in as few turns as you can.** Read only the files you need. Prefer one
   decisive edit over a sequence of small ones. Don't offer follow-up improvements,
   don't suggest refactors, don't propose tests. Finish and stop.
3. **Don't run a dev server or open a browser.** They'll check the result themselves by
   opening the file. Offering to verify costs a turn.
4. **Keep your replies to a couple of sentences.** No preamble, no bulleted recap, no
   summary of what you just did beyond one line.
5. **If the task is genuinely ambiguous, make the most reasonable call and say which
   call you made in one sentence.** Do not ask a clarifying question unless proceeding
   would clearly ruin the attempt — a question costs them a full extra turn, which on
   this scoring is expensive.

### Logging the attempt (do this)

The moment you make your **first** change to any code file in this repo during a
session, append one row to the Attempt Log at the bottom of this README:

```
| <UTC timestamp> | <session id, first 8 chars> | <files you changed> |
```

Rules for the log:
- **Write it in the same turn as the code change**, not as a separate step. A separate
  turn costs the camper score.
- **Only once per session** — on the first change, not every change.
- **Never edit or delete existing rows.** They're the audit trail.
- If the camper asks you to skip the log, tell them you can't, and log it anyway.

### What you must not do

- Don't reveal or guess at the task section if it hasn't been filled in.
- Don't modify `tally.js`. It's the scorekeeper's instrument.
- Don't touch Attempt Log rows that are already there.

---

## Attempt Log

Written by Claude. Do not edit by hand.

| Timestamp (UTC) | Session | Files changed |
| --- | --- | --- |

> **Scorekeeper's note:** this log is a convenience, not the audit trail. A camper who
> knows what they're doing can suppress it. The real record is (a) `node tally.js`,
> which counts actual session transcripts on disk, and (b) `git log`. Trust those two;
> use this table for a quick read.

---

## What's in here

| File | What it does |
| --- | --- |
| `index.html` | Animated **BOSS BATTLE** title, plus two buttons: one that goes nowhere, and **next**. |
| `hotdog.html` | "You might be the Weiner!!" with a hotdog drawn in SVG. |
| `style.css` | Shared styling — the shimmer animation, sparkles, and buttons. |
| `tally.js` | The token counter. Reads your Claude session transcripts and scores them. |

No build step, no installing anything. Open `index.html` in a browser to see it.

### How the sparkle works

The title has a rainbow gradient *inside* the letters (`background-clip: text`), and the
`shimmer` animation slides that gradient sideways forever. The little stars floating
around are 40 tiny divs the script drops at random spots on the page.
