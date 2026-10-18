# humanize-writing

Your reader has a built-in AI detector. It fires on "delve", on em dashes, on the third perfectly balanced paragraph. Then they stop reading.

`humanize` is a writing skill for Claude Code and other agents. It bans the machine vocabulary, breaks the symmetric structure, and checks the statistical tells: sentence-length variance, hedging density, predictable word choice. Concrete rules, then a 15-point checklist before anything ships.

No tricks. No homoglyphs, no invisible characters, no planted typos. The stance is authentic writing: if a draft only passes because of a trick, it failed.

## Install

Claude Code:

```bash
git clone https://github.com/marian-kamenistak/humanize-writing.git
mkdir -p ~/.claude/skills
cp -r humanize-writing ~/.claude/skills/humanize
```

Then ask Claude to "humanize" a draft. It also triggers on its own when you write external copy.

Any other agent: load `SKILL.md` into the system prompt or as a tool description. Plain markdown, zero dependencies.

## What's inside

- A banned-word table with human swaps, plus banned phrases, openers, closers, and transitions
- Structure rules: paragraph asymmetry, list shape, punctuation rhythm
- Statistical tells: burstiness, predictability, hedging cap, specificity
- A grep-able self-verification checklist. 15 checks. Pass all or state which one you bent and why.

## Works under a voice layer

`humanize` covers what makes any text sound machine-made. Your personal voice (positions, stories, numbers, register) sits on top as its own skill. Keep the two separate and the universal layer stays reusable across people and brands.

This README was written under the skill's own rules. That was the hard part.

---

by [Marian Kamenistak](https://www.marian.coach/), engineering-leadership mentor. Also his [Engineering Leadership MCP toolkit](https://www.marian.coach/mcp).

MIT licensed. Take it, adapt it, ship it.
